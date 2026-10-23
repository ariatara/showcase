import test from "node:test";
import assert from "node:assert/strict";
import { createEventHandlers } from "../Controllers/EventAccess.js";

function invoke(handler, body, params = {}) {
  return new Promise((resolve) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { resolve({ code: this.statusCode, ...data }); },
    };
    handler({ body, params }, response);
  });
}

test("create saves only draft identity, returns its ID, and defaults to unpublished", async () => {
  const db = { query(sql, values, callback) {
    assert.match(sql, /INSERT INTO events/);
    assert.equal(values[0].published, false);
    assert.equal(values[0].start_date, undefined);
    callback(null, { insertId: 9 });
  } };
  const result = await invoke(createEventHandlers(db).createEventAdminAccess,
    { pageTitle: "Fair", eventURL: "fair" });
  assert.equal(result.Status, true);
  assert.equal(result.Result.id, 9);
});

test("invalid input and missing publication fields never write", async () => {
  const db = { query() { assert.fail("Invalid input must not reach the database"); } };
  const handler = createEventHandlers(db).createEventAdminAccess;
  assert.equal((await invoke(handler, null)).code, 400);
  const result = await invoke(handler, { pageTitle: "Fair", eventURL: "fair", isPublished: true });
  assert.equal(result.Status, false);
  assert.ok(result.MissingFields.includes("startDate"));
  assert.ok(result.FieldErrors.bannerBackground);
});

test("duplicates and database CHECK errors receive readable responses", async () => {
  for (const code of ["ER_DUP_ENTRY", "ER_CHECK_CONSTRAINT_VIOLATED"]) {
    const handler = createEventHandlers({ query(sql, values, callback) { callback({ code }); } }).createEventAdminAccess;
    const result = await invoke(handler, { pageTitle: "Fair", eventURL: "fair" });
    assert.equal(result.Status, false);
    assert.match(result.Error, code === "ER_DUP_ENTRY" ? /already exists/ : /publish/i);
  }
});

test("update merges omitted values but explicitly clears fields when unpublishing", async () => {
  let writes = 0;
  const row = { page_title: "Fair", url: "fair", published: 1, event_title: "Fair",
    start_date: "2026-04-01", start_time: "10:00", end_date: "2026-04-02", end_time: "17:00",
    venue_address: "Hall", banner_background_image_name: "banner.jpg" };
  const handler = createEventHandlers({ query(sql, values, callback) {
    if (sql.startsWith("SELECT")) return callback(null, [row]);
    writes++;
    assert.equal(values[0].event_title, null);
    assert.equal(values[0].published, false);
    assert.equal(Object.hasOwn(values[0], "page_title"), false);
    callback(null, { affectedRows: 1 });
  } }).updateEventAdminAccess;
  const failed = await invoke(handler, { eventTitle: "" }, { id: "1" });
  assert.equal(failed.Status, false);
  assert.equal(writes, 0);
  const saved = await invoke(handler, { eventTitle: "", isPublished: false }, { id: "1" });
  assert.equal(saved.Status, true);
  assert.equal(writes, 1);
});

test("missing update and public draft reads return not found", async () => {
  const db = { query(sql, values, callback) { callback(null, []); } };
  const handlers = createEventHandlers(db);
  assert.equal((await invoke(handlers.updateEventAdminAccess, {}, { id: "99" })).code, 404);
  assert.equal((await invoke(handlers.viewEventUserAccess, undefined, { event_url: "fair" })).code, 404);
});

test("public fetch filters published rows while the admin fetch can reopen drafts", async () => {
  const sqlQueries = [];
  const handlers = createEventHandlers({ query(sql, values, callback) {
    sqlQueries.push(sql);
    callback(null, [{ id: 1 }]);
  } });
  await invoke(handlers.viewEventUserAccess, undefined, { event_url: "fair" });
  await invoke(handlers.getEventAdminAccess, undefined, { event_url: "fair" });
  assert.match(sqlQueries[0], /published = TRUE/);
  assert.doesNotMatch(sqlQueries[1], /published/);
});
