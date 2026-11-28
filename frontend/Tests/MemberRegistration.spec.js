import { test, expect } from "@playwright/test";
import { expectActionIcon } from "./ActionIconAssertions.js";

const email = "target+members@example.test";
async function fixture(page, { admin = true, existingMemberRole = false, dashboard = false, accountError = false } = {}) {
  const members = dashboard ? [{ id: 7, account_email: email, first_name: "Existing", last_name: "Member", age_group: "18-45",
    member_email: "existing@example.test", membership_category: "Adult", membership_date: "2026-01-01" }] : [];
  const state = { writes: [], members, roles: [{ id: 1, account_role: "Non-member" }], error: "", errorStatus: 409, networkError: false, lookupError: false, accountError, accountReads: 0, memberReadError: false, gate: null };
  if (existingMemberRole) state.roles.push({ id: 2, account_role: "Member" });
  await page.addInitScript((roles) => sessionStorage.setItem("loginSession", JSON.stringify({
    expiry: Math.floor(Date.now() / 1000) + 3600, roles,
  })), [admin ? "Administrator" : "Non-member"]);
  await page.route(/^https:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|use\.fontawesome\.com)\//, (route) => route.abort());
  await page.route("http://localhost:3000/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname), method = route.request().method();
    if (["POST", "PUT", "DELETE"].includes(method)) {
      const body = method === "DELETE" ? null : route.request().postDataJSON(); state.writes.push({ path, body });
      if (state.gate) await state.gate;
      if (state.networkError) return route.abort("failed");
      if (state.error) return route.fulfill({ status: state.errorStatus, json: { Status: false, Error: state.error } });
      if (method === "DELETE" && path === "/account/members/7") state.members = state.members.filter((member) => member.id !== 7);
      else if (method === "PUT" && path === "/account/members/7") Object.assign(state.members[0], body);
      else if (path === "/account/registerMember") {
        state.members.push({ ...body, id: state.members.length + 1, membership_date: "2026-11-24" });
        if (!state.roles.some((role) => role.account_role === "Member")) state.roles.push({ id: 2, account_role: "Member" });
      } else if (path === "/auth/addAccountRole/") state.roles.push({ id: 3, account_role: body.account_role });
      else throw new Error(`Unexpected member registration write: ${path}`);
      return route.fulfill({ json: { Status: true, Result: { id: 1 } } });
    }
    if (state.lookupError && path === "/account/ageGroups") return route.fulfill({ status: 503, json: { Status: false, Error: "Member options are temporarily unavailable." } });
    if (path === `/account/accountDetails/${email}`) {
      state.accountReads += 1;
      if (state.accountError) return route.fulfill({ status: 503, json: { Status: false, Error: "Account details are temporarily unavailable." } });
    }
    if (state.memberReadError && path === "/account/members/7") return route.fulfill({ status: 503, json: { Status: false, Error: "Unable to load member. Please try again." } });
    let result;
    if (path === "/auth/roleTypes") result = [{ id: 1, role: "Administrator" }, { id: 2, role: "Member" }, { id: 3, role: "Non-member" }, { id: 4, role: "Volunteer" }];
    else if (path === "/account/ageGroups") result = [{ id: 1, group: "18-45" }, { id: 2, group: "46-65" }];
    else if (path === "/account/membershipCategories") result = [{ id: 1, category: "Adult" }, { id: 2, category: "Senior" }];
    else if (path === `/auth/accountRoles/${email}`) result = state.roles;
    else if (path === `/account/accountDetails/${email}`) result = [{ first_name: "Target", last_name: "Account", account_email: email }];
    else if (path === `/account/${email}/accountMembers`) result = state.members;
    else if (path === "/account/members/7") result = state.members[0];
    else throw new Error(`Unexpected member registration read: ${path}`);
    await route.fulfill({ json: { Status: true, Result: result } });
  });
  await page.goto(admin ? `/adminDashboard/addAccountRole/${encodeURIComponent(email)}` : `/accountDashboard/${encodeURIComponent(email)}${dashboard ? "" : "/registerMember"}`);
  return state;
}

async function openRegistration(page) {
  await expect(page.getByLabel("Select Role Type:")).toBeEnabled();
  await page.getByLabel("Select Role Type:").selectOption("Member");
  const form = page.getByRole("region", { name: "Register Member", exact: true, includeHidden: true });
  await expect(form).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Role", exact: true })).toHaveCount(0);
  await expect(form.getByLabel("Account Email", { exact: true })).toHaveValue(email);
  await expect(form.getByLabel("Account Email", { exact: true })).toBeDisabled();
  return form;
}

async function enterMember(scope) {
  await scope.getByLabel("First Name", { exact: true }).fill("New");
  await scope.getByLabel("Last Name", { exact: true }).fill("Person");
  await scope.getByLabel("Member Email", { exact: true }).fill("person@example.test");
  await scope.getByLabel("Age Group", { exact: true }).selectOption("46-65");
  await scope.getByLabel("Membership Category", { exact: true }).selectOption("Senior");
}

async function expectCenteredMemberActions(form) {
  const register = form.getByRole("button", { name: "Register", exact: true });
  const cancel = form.getByRole("button", { name: "Cancel", exact: true });
  await expect(register).toBeVisible(); await expect(cancel).toBeVisible();
  await expectActionIcon(register, "person-plus");
  await expectActionIcon(cancel, "x-circle");
  const [registerBounds, cancelBounds, formBounds] = await form.evaluate((element) => {
    const submit = element.querySelector('button[type="submit"]');
    const cancel = [...element.querySelectorAll("button")].find((button) => button.textContent.trim() === "Cancel");
    return [submit, cancel, element].map((target) => {
      const { x, y, width } = target.getBoundingClientRect();
      return { x, y, width };
    });
  });
  expect(registerBounds.y).toBeCloseTo(cancelBounds.y, 0);
  expect(registerBounds.x + registerBounds.width).toBeLessThan(cancelBounds.x);
  expect((registerBounds.x + cancelBounds.x + cancelBounds.width) / 2).toBeCloseTo(formBounds.x + formBounds.width / 2, 0);
}

async function dismissRoleError(page, message, escape = false) {
  const dialog = page.getByRole("alertdialog", { name: "Account Role Error", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("p")).toHaveText(message);
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "OK", exact: true })).toBeFocused();
  if (escape) await page.keyboard.press("Escape");
  else await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
}

test("account role sections use three centered cards with a two-line gap below Email Address", async ({ page }) => {
  const state = await fixture(page);
  const details = page.getByRole("region", { name: "Account details", exact: true });
  for (const [label, value] of [["First Name", "Target"], ["Last Name", "Account"], ["Email Address", email]]) {
    await expect(details.getByText(label, { exact: true })).toBeVisible();
    await expect(details.getByText(value, { exact: true })).toBeVisible();
  }
  const emailBounds = await details.getByText(email, { exact: true }).boundingBox();
  const labelBounds = await page.getByText("Select Role Type:", { exact: true }).boundingBox();
  const lineHeight = await details.evaluate((element) => parseFloat(getComputedStyle(element).lineHeight));
  expect(labelBounds.y - emailBounds.y - emailBounds.height).toBeCloseTo(2 * lineHeight, 0);
  const accountReads = state.accountReads;
  const form = await openRegistration(page);
  const selectBounds = await page.getByLabel("Select Role Type:").boundingBox();
  const formBounds = await form.boundingBox();
  expect(formBounds.y).toBeGreaterThan(selectBounds.y + selectBounds.height);
  const roleCard = page.getByRole("form", { name: "Account role selection", exact: true });
  const contentCenter = await details.evaluate((element) => {
    const bounds = element.parentElement.parentElement.getBoundingClientRect();
    return bounds.x + bounds.width / 2;
  });
  const detailBounds = await details.boundingBox();
  for (const card of [details, roleCard, form]) {
    await expect(card).toHaveClass(/\bcard\b/);
    const bounds = await card.boundingBox();
    expect(bounds.x + bounds.width / 2).toBeCloseTo(contentCenter, 0);
    expect(bounds.width).toBeCloseTo(detailBounds.width, 0);
    expect(await card.evaluate((element) => parseFloat(getComputedStyle(element).borderRadius))).toBeGreaterThan(0);
    await expect(card).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue("Target");
  expect(state.accountReads).toBe(accountReads);
  expect(state.writes).toHaveLength(0);
  await expectCenteredMemberActions(form);
});

test("cancelling inline registration or switching roles leaves profiles and roles unchanged", async ({ page }) => {
  const state = await fixture(page);
  const form = await openRegistration(page);
  await enterMember(form);
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(form).toBeHidden();
  await expect(page.getByLabel("Select Role Type:")).toHaveValue("Non-member");
  expect(state.writes).toHaveLength(0);
  await openRegistration(page);
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue("Target");
  await page.getByLabel("Select Role Type:").selectOption("Volunteer");
  await expect(form).toBeHidden();
  await expect(page.getByRole("button", { name: "Add Role", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(0);
});

test("admin registration saves a profile with a new Member role", async ({ page }) => {
  const state = await fixture(page);
  const form = await openRegistration(page);
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue("Target");
  await expect(form.getByLabel("Last Name", { exact: true })).toHaveValue("Account");
  await expect(form.getByLabel("Member Email", { exact: true })).toHaveValue(email);
  await enterMember(form);
  await form.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account Roles", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Member registered and Member role assigned successfully.");
  await expect(page.getByRole("cell", { name: "Member", exact: true })).toHaveCount(1);
  expect(state.writes).toEqual([{ path: "/account/registerMember", body: {
    account_email: email, first_name: "New", last_name: "Person", age_group: "46-65", member_email: "person@example.test", membership_category: "Senior",
  } }]);
  await page.goto(`/accountDashboard/${encodeURIComponent(email)}`);
  const row = page.getByRole("row").filter({ hasText: "person@example.test" });
  await expect(row.getByRole("cell", { name: "New", exact: true })).toBeVisible();
  await expect(row.getByRole("cell", { name: "Person", exact: true })).toBeVisible();
});

for (const role of ["Non-member", "Member"]) test(`already-assigned ${role} role displays a dismissible error without creating records`, async ({ page }) => {
  const state = await fixture(page, { existingMemberRole: role === "Member" });
  const select = page.getByLabel("Select Role Type:");
  await expect(select).toBeEnabled();
  if (role === "Member") await select.selectOption(role);
  else await page.getByRole("button", { name: "Add Role", exact: true }).click();
  await dismissRoleError(page, `This account already has the ${role} role.`);
  await expect(page.getByRole("region", { name: "Register Member", exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Add Role", exact: true }).click();
  await dismissRoleError(page, `This account already has the ${role} role.`, true);
  await expect(select).toHaveValue(role);
  expect(state.writes).toHaveLength(0);
});

test("failed registration preserves details and in-flight saving cannot be cancelled or submitted twice", async ({ page }) => {
  const state = await fixture(page);
  state.error = "A member with this email address already exists.";
  const form = await openRegistration(page); await enterMember(form);
  await form.getByRole("button", { name: "Register", exact: true }).click();
  await dismissRoleError(page, state.error);
  await expect(form.getByRole("button", { name: "Register", exact: true })).toBeFocused();
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue("New");
  state.error = "";
  let finish; state.gate = new Promise((resolve) => { finish = resolve; });
  await form.getByRole("button", { name: "Register", exact: true }).click();
  await expect(form.getByRole("button", { name: "Saving...", exact: true })).toBeDisabled();
  await expect(form.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Select Role Type:")).toBeDisabled();
  await page.keyboard.press("Escape"); await expect(form).toBeVisible();
  finish();
  await expect(page.getByRole("heading", { name: "Account Roles", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(2);
});

test("other role selections continue through the existing admin role endpoint", async ({ page }) => {
  const state = await fixture(page);
  await expect(page.getByLabel("Select Role Type:")).toHaveValue("Non-member");
  await page.getByLabel("Select Role Type:").selectOption("Volunteer");
  const add = page.getByRole("button", { name: "Add Role", exact: true });
  await expectActionIcon(add, "plus-circle");
  const buttonBounds = await add.boundingBox();
  const cardBounds = await page.getByRole("form", { name: "Account role selection", exact: true }).boundingBox();
  expect(buttonBounds.width).toBeLessThan(cardBounds.width / 2);
  expect(buttonBounds.x + buttonBounds.width / 2).toBeCloseTo(cardBounds.x + cardBounds.width / 2, 0);
  await add.click();
  await expect(page.getByRole("heading", { name: "Account Roles", exact: true })).toBeVisible();
  expect(state.writes).toEqual([{ path: "/auth/addAccountRole/", body: { account_email: email, account_role: "Volunteer" } }]);
});

test("role save server and network errors use the same dialog and allow retry", async ({ page }) => {
  const state = await fixture(page);
  await page.getByLabel("Select Role Type:").selectOption("Volunteer");
  state.error = "Unable to add account role. Please try again."; state.errorStatus = 200;
  await page.getByRole("button", { name: "Add Role", exact: true }).click();
  await dismissRoleError(page, state.error);
  await expect(page.getByRole("button", { name: "Add Role", exact: true })).toBeFocused();
  state.error = ""; state.networkError = true;
  await page.getByRole("button", { name: "Add Role", exact: true }).click();
  await dismissRoleError(page, "Network Error", true);
  await expect(page.getByLabel("Select Role Type:")).toHaveValue("Volunteer");
  state.networkError = false;
  await page.getByRole("button", { name: "Add Role", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account Roles", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(3);
});

test("account-holder registration keeps the shared fields and returns to its account dashboard", async ({ page }) => {
  const state = await fixture(page, { admin: false });
  await expect(page.getByRole("button", { name: "Register Member", exact: true })).toBeEnabled();
  for (const label of ["First Name", "Last Name", "Member Email"]) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  await enterMember(page);
  await page.getByRole("button", { name: "Register Member", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Member List", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "person@example.test" })).toContainText("Senior");
  await expect(page.getByRole("link", { name: "Edit", exact: true })).toHaveCSS("background-color", "rgb(25, 135, 84)");
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCSS("background-color", "rgb(255, 0, 0)");
  expect(state.writes).toHaveLength(1);
});

test("admin account prefill can be retried and saved without changing the suggested details", async ({ page }) => {
  const state = await fixture(page, { accountError: true });
  await dismissRoleError(page, "Account details are temporarily unavailable.");
  await expect(page.getByLabel("Select Role Type:")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add Role", exact: true })).toBeDisabled();
  expect(state.writes).toHaveLength(0);
  state.accountError = false;
  await page.getByRole("button", { name: "Reload account details" }).click();
  const form = await openRegistration(page);
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue("Target");
  await expect(form.getByLabel("Last Name", { exact: true })).toHaveValue("Account");
  await expect(form.getByLabel("Member Email", { exact: true })).toHaveValue(email);
  await form.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account Roles", exact: true })).toBeVisible();
  expect(state.writes).toEqual([{ path: "/account/registerMember", body: {
    account_email: email, first_name: "Target", last_name: "Account", age_group: "18-45", member_email: email, membership_category: "Adult",
  } }]);
});

test("registration options can be retried and the inline form fits a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  const state = await fixture(page); state.lookupError = true;
  const form = await openRegistration(page);
  await dismissRoleError(page, "Member options are temporarily unavailable.");
  await expect(form.getByRole("button", { name: "Register", exact: true })).toBeDisabled();
  state.lookupError = false;
  await form.getByRole("button", { name: "Reload options" }).click();
  await enterMember(form);
  await expectCenteredMemberActions(form);
  const bounds = await form.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await form.screenshot({ path: "node_modules\\.cache\\member-registration-mobile.png" });
  const widths = await form.evaluate((element) => ({ width: element.clientWidth, scrollWidth: element.scrollWidth,
    fieldsetWidth: element.querySelector("fieldset").getBoundingClientRect().width }));
  expect(widths.scrollWidth, JSON.stringify(widths)).toBeLessThanOrEqual(widths.width);
  await form.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account Roles", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test("account member Edit loads the saved profile and persists changes across reloads", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true });
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit Member", exact: true })).toBeVisible();
  await expect(page.getByLabel("First Name", { exact: true })).toHaveValue("Existing");
  await expect(page.getByLabel("Last Name", { exact: true })).toHaveValue("Member");
  await expect(page.getByLabel("Member Email", { exact: true })).toHaveValue("existing@example.test");
  await expect(page.getByLabel("Account Email", { exact: true })).toHaveValue(email);
  await expect(page.getByLabel("Account Email", { exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("First Name", { exact: true })).toHaveValue("Existing");
  await enterMember(page);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Member updated successfully.");
  expect(state.writes).toEqual([{ path: "/account/members/7", body: {
    first_name: "New", last_name: "Person", age_group: "46-65", member_email: "person@example.test", membership_category: "Senior",
  } }]);
  await page.reload();
  const row = page.getByRole("row").filter({ hasText: "person@example.test" });
  await expect(row.getByRole("cell", { name: "New", exact: true })).toBeVisible();
  await expect(row).toContainText("2026-01-01");
  await row.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("First Name", { exact: true })).toHaveValue("New");
  await expect(page.getByLabel("Membership Category", { exact: true })).toHaveValue("Senior");
});

test("cancelling member edits returns to the unchanged dashboard without a write", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true });
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await enterMember(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("cell", { name: "existing@example.test", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(0);
});

test("member edit failures preserve input and saving disables duplicate submission and cancellation", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true });
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await enterMember(page); state.error = "A member with this email address already exists.";
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(state.error);
  await expect(page.getByLabel("First Name", { exact: true })).toHaveValue("New");
  expect(state.members[0].first_name).toBe("Existing");
  state.error = "";
  let finish; state.gate = new Promise((resolve) => { finish = resolve; });
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving...", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  finish();
  await expect(page.getByRole("status")).toHaveText("Member updated successfully.");
  expect(state.writes).toHaveLength(2);
});

test("member load errors block saving and allow a fresh read", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true }); state.memberReadError = true;
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Unable to load member. Please try again.");
  await expect(page.getByRole("button", { name: "Save Changes", exact: true })).toBeDisabled();
  state.memberReadError = false;
  await page.getByRole("button", { name: "Reload details", exact: true }).click();
  await expect(page.getByLabel("First Name", { exact: true })).toHaveValue("Existing");
  expect(state.writes).toHaveLength(0);
});

test("member Delete removes the selected record and it stays removed after reload", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true });
  state.members.push({ ...state.members[0], id: 8, first_name: "Retained", member_email: "retained@example.test" });
  await page.reload();
  const row = page.getByRole("row").filter({ hasText: "existing@example.test" });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete Member", exact: true });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText("Existing Member");
  await expect(confirmation).toContainText("existing@example.test");
  expect(state.writes).toHaveLength(0);
  await confirmation.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(row).toHaveCount(0);
  await expect(page.getByText("Member deleted successfully.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "retained@example.test", exact: true })).toBeVisible();
  expect(state.writes).toEqual([{ path: "/account/members/7", body: null }]);
  await page.reload();
  await expect(page.getByRole("cell", { name: "retained@example.test", exact: true })).toBeVisible();
  await expect(row).toHaveCount(0);
});

test("failed member deletion keeps the row and retry waits for confirmed success", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true });
  state.error = "This member is linked to a cart or order and cannot be deleted.";
  const row = page.getByRole("row").filter({ hasText: "existing@example.test" });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete Member", exact: true });
  await confirmation.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(state.error);
  await expect(row).toBeVisible(); expect(state.members).toHaveLength(1);
  state.error = "";
  let finish; state.gate = new Promise((resolve) => { finish = resolve; });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await confirmation.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row.getByRole("button", { name: "Deleting...", exact: true })).toBeDisabled();
  await expect(row).toBeVisible();
  finish();
  await expect(row).toHaveCount(0);
  await expect(page.getByText("Member deleted successfully.", { exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(2);
});

test("cancelling member deletion by button or Escape leaves the record unchanged", async ({ page }) => {
  const state = await fixture(page, { admin: false, dashboard: true });
  const row = page.getByRole("row").filter({ hasText: "existing@example.test" });
  const deleteButton = row.getByRole("button", { name: "Delete", exact: true });
  await deleteButton.click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete Member", exact: true });
  await expect(confirmation.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(deleteButton).toBeFocused();
  expect(state.writes).toHaveLength(0);
  await deleteButton.click();
  await expect(confirmation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(row).toBeVisible();
  expect(state.writes).toHaveLength(0); expect(state.members).toHaveLength(1);
});
