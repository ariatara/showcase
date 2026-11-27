import { galleryFixture } from "./GalleryFixtures.js";

export async function commerceFixture(page, { access = "member", viewTemplate = "signature" } = {}) {
  const gallery = await galleryFixture(page);
  gallery.row.view_template = viewTemplate;
  const state = { version: 0, lines: [], catalogReads: 0, captures: 0, captureStatus: "paid", quoteError: "", orders: {} };
  await page.route("http://localhost:3000/account/commerce/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204 });
    const ok = (Result) => route.fulfill({ json: { Status: true, Result } });
    if (access !== "member") return route.fulfill({ status: access === "guest" ? 401 : 403, json: { Status: false, Error: "Member access required." } });
    const body = method === "GET" ? {} : request.postDataJSON();
    if (path.endsWith("/context")) return ok({ accountId: 101, csrf: "test-csrf", paymentsEnabled: true,
      cartVersion: state.version, cartCount: state.lines.reduce((sum, line) => sum + line.quantity, 0),
      members: [{ id: 101, first_name: "Test", last_name: "Member", membership_category: "Adult" }] });
    if (path.includes("/events/")) {
      state.catalogReads++;
      const second = path.includes("/second/");
      return ok({ products: [{ id: second ? 102 : 101, name: second ? "Second ticket" : "First ticket", type: "Ticket",
        target: "Adult", unit_cents: second ? 2000 : 1025, available: 5, event_date: "2026-04-01" }], next: null });
    }
    if (path.endsWith("/cart")) return ok({ version: state.version, lines: state.lines });
    if (path.includes("/cart/items")) {
      if (body.version !== state.version) return route.fulfill({ status: 409, json: { Status: false, Error: "Cart changed. Reload." } });
      if (method === "POST") state.lines.push({ id: state.lines.length + 1, product_id: body.productId, member_id: body.memberId,
        name: body.productId === 101 ? "First ticket" : "Second ticket", event_title: body.productId === 101 ? "First event" : "Second event",
        event_url: body.productId === 101 ? "gallery_event" : "second", first_name: "Test", last_name: "Member",
        quantity: body.quantity, unit_cents: body.productId === 101 ? 1025 : 2000, issue: "", available: 5 });
      else if (method === "DELETE") state.lines = state.lines.filter((line) => line.id !== Number(path.split("/").at(-1)));
      else state.lines.find((line) => line.id === Number(path.split("/").at(-1))).quantity = body.quantity;
      state.version++; return ok({ version: state.version, lines: state.lines });
    }
    const amounts = { subtotal: 3025, discount: 0, fee: 0, total: 3025 };
    if (path.endsWith("/checkout/quote")) {
      if (state.quoteError) return route.fulfill({ status: 409, json: { Status: false, Error: state.quoteError } });
      return ok({ hash: "a".repeat(64), cart: { version: state.version, lines: state.lines }, amounts, coupon: null });
    }
    const id = "11111111-1111-4111-8111-111111111111";
    if (path.endsWith("/checkout")) {
      state.orders[id] = { id, status: "awaiting_approval", amounts, items: state.lines.map((line) => ({
        ...line, eventTitle: line.event_title, memberName: "Test Member" })), approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=test" };
      return ok(state.orders[id]);
    }
    if (path.includes("/orders/")) {
      if (path.endsWith("/capture")) { state.captures++; state.orders[id].status = state.captureStatus; }
      if (path.endsWith("/cancel")) state.orders[id].status = "cancelled";
      return ok(state.orders[id]);
    }
    throw new Error(`Unexpected commerce request ${method} ${path}`);
  });
  await page.route("https://www.sandbox.paypal.com/**", (route) => route.fulfill({
    contentType: "text/html", body: `<script>location.href="http://127.0.0.1:5174/shoppingCheckout?order=11111111-1111-4111-8111-111111111111&action=return"</script>`,
  }));
  return state;
}
