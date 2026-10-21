import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Express from "express";
import MySQL from "mysql2";
import CookieParser from "cookie-parser";
import JWToken from "jsonwebtoken";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { ROLES } from "../Configurations/Roles.js";
import { SECRETS } from "../Configurations/Secrets.js";
import { createEventHandlers } from "../Controllers/EventAccess.js";
import { replaceMemberProducts } from "../Utilities/MemberProductWrites.js";

// Explicitly opt in: tests create/drop only their own uniquely named databases.
const enabled = process.env.EVENT_TEST_MYSQL === "1";
const bootstrap = await readFile(new URL("../../datastore/Schema/BackendSchema.mysql.sql", import.meta.url), "utf8");
const migration = await readFile(new URL("../../datastore/Migrations/001_events_partial_save.mysql.sql", import.meta.url), "utf8");
const oldEvents = await readFile(new URL("./Fixtures/EventsBeforePartialSave.mysql.sql", import.meta.url), "utf8");

async function runScript(db, script, database) {
  const scoped = script.replaceAll("showcase.", `\`${database}\`.`)
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\r\n]*/g, "");
  for (const statement of scoped.split(";").map((sql) => sql.trim()).filter(Boolean)) {
    await db.query(statement);
  }
}

for (const upgrade of [false, true]) {
  test(`MySQL ${upgrade ? "upgrade" : "fresh bootstrap"}: draft lifecycle, CHECKs and product integrity`,
    { skip: !enabled }, async (t) => {
      const connection = MySQL.createConnection({
        host: process.env.MYSQL_TEST_HOST || "localhost",
        port: Number(process.env.MYSQL_TEST_PORT || 3306),
        user: process.env.MYSQL_TEST_USER || "root",
        password: process.env.MYSQL_TEST_PASSWORD,
      });
      const db = connection.promise();
      const database = `showcase_event_test_${randomUUID().replaceAll("-", "")}`;
      let created = false;
      t.after(async () => {
        try {
          if (created) await db.query(`DROP DATABASE \`${database}\``);
        } finally {
          await db.end();
        }
      });
      await db.query(`CREATE DATABASE \`${database}\``);
      created = true;
      await db.changeUser({ database });
      if (upgrade) {
        await runScript(db, oldEvents, database);
      }
      await runScript(db, bootstrap, database);
      if (upgrade) {
        await assert.rejects(db.query("INSERT INTO events (url, page_title) VALUES ('old_draft', 'Old draft')"));
        await db.query(`INSERT INTO events (url, page_title, event_title, start_date, start_time,
          end_date, end_time, venue_address, banner_background_image_name, published)
          VALUES ('legacy', 'Legacy', 'Legacy', '2026-04-01', '10:00', '2026-04-02', '17:00', 'Hall', 'banner.jpg', NULL)`);
        await db.query(`INSERT INTO events (url, page_title, event_title, start_date, start_time,
          end_date, end_time, venue_address, banner_background_image_name, published)
          VALUES ('incomplete', 'Incomplete', '', '2026-04-01', '10:00', '2026-04-02', '17:00', 'Hall', 'banner.jpg', TRUE)`);
        await assert.rejects(runScript(db, migration, database), { code: "ER_CHECK_CONSTRAINT_VIOLATED" });
        await db.query("UPDATE events SET event_title = 'Completed legacy event' WHERE url = 'incomplete'");
        await runScript(db, migration, database);
        const [[legacy]] = await db.query("SELECT published FROM events WHERE url = 'legacy'");
        assert.equal(legacy.published, 0);
      }

      const handlers = createEventHandlers(connection);
      const app = Express();
      app.use(Express.json());
      app.use(CookieParser());
      const adminOnly = [AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR)];
      app.post("/events", ...adminOnly, handlers.createEventAdminAccess);
      app.put("/events/:id", ...adminOnly, handlers.updateEventAdminAccess);
      app.get("/admin/events/:event_url", ...adminOnly, handlers.getEventAdminAccess);
      app.get("/public/events/:event_url", handlers.viewEventUserAccess);
      const server = await new Promise((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
      });
      t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
      const url = `http://127.0.0.1:${server.address().port}`;
      const adminToken = JWToken.sign({ account_roles: [ROLES.ADMINISTRATOR] }, SECRETS.SITEKEY, { expiresIn: "5m" });
      const memberToken = JWToken.sign({ account_roles: [ROLES.MEMBER] }, SECRETS.SITEKEY, { expiresIn: "5m" });
      async function request(path, method = "GET", body, token = adminToken) {
        const response = await fetch(url + path, {
          method, headers: { "Content-Type": "application/json", ...(token ? { Cookie: `loginToken=${token}` } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { code: response.status, ...await response.json() };
      }

      const saved = await request("/events", "POST", { pageTitle: "Fair", eventURL: "fair" });
      assert.equal(saved.Status, true);
      const id = saved.Result.id;
      const draft = await request("/admin/events/fair");
      assert.equal(draft.Result[0].start_date, null);
      assert.equal((await request("/admin/events/fair", "GET", undefined, "")).Status, false);
      assert.equal((await request("/admin/events/fair", "GET", undefined, memberToken)).code, 403);
      assert.equal((await request("/admin/events/fair", "GET", undefined, "invalid")).code, 401);
      assert.equal((await request("/public/events/fair")).code, 404);
      assert.equal((await request("/events", "POST", { pageTitle: "Fair", eventURL: "other" })).code, 409);
      assert.equal((await request("/events", "POST", { pageTitle: "Other", eventURL: "FAIR" })).code, 409);
      assert.equal((await request(`/events/${id}`, "PUT", { isPublished: true })).code, 400);
      await assert.rejects(db.query("UPDATE events SET published = TRUE WHERE id = ?", [id]),
        { code: "ER_CHECK_CONSTRAINT_VIOLATED" });
      const full = { eventTitle: "Fair", startDate: "2026-04-01", startTime: "10:00",
        endDate: "2026-04-02", endTime: "17:00", venueAddress: "Hall",
        bannerBackground: "banner.jpg", isPublished: true };
      assert.equal((await request(`/events/${id}`, "PUT", full)).Status, true);
      assert.equal((await request("/public/events/fair")).code, 200);
      for (const column of ["event_title", "start_date", "start_time", "end_date", "end_time",
        "venue_address", "banner_background_image_name"]) {
        await assert.rejects(db.query(`UPDATE events SET ${column} = NULL WHERE id = ?`, [id]),
          { code: "ER_CHECK_CONSTRAINT_VIOLATED" });
      }
      await assert.rejects(db.query("UPDATE events SET event_title = '   ' WHERE id = ?", [id]),
        { code: "ER_CHECK_CONSTRAINT_VIOLATED" });
      assert.equal((await request(`/events/${id}`, "PUT", { eventTitle: null })).code, 400);
      assert.equal((await request(`/events/${id}`, "PUT", { isPublished: false, startDate: null })).Status, true);
      assert.equal((await request("/public/events/fair")).code, 404);
      assert.equal((await request("/admin/events/fair")).Result[0].start_date, null);

      await db.query("INSERT INTO product_types (`type`) VALUES ('Ticket')");
      await db.query("INSERT IGNORE INTO membership_categories (category) VALUES ('Member')");
      const product = { productName: "Admission", productType: "Ticket", productTarget: "Member",
        productPrice: 10, productInventory: 5, eventDate: "2026-04-01" };
      await replaceMemberProducts(db, "fair", [product]);
      await assert.rejects(replaceMemberProducts(db, "fair", [{ ...product, productType: "Missing" }]));
      const [[count]] = await db.query("SELECT COUNT(*) AS count FROM member_products WHERE event_url = 'fair'");
      assert.equal(count.count, 1);
      assert.equal((await request(`/events/${id}`, "PUT", { pageTitle: "Renamed Fair", eventURL: "renamed_fair" })).Status, true);
      const [[renamed]] = await db.query("SELECT event_url FROM member_products");
      assert.equal(renamed.event_url, "renamed_fair");
      await replaceMemberProducts(db, "renamed_fair", []);
      const [[empty]] = await db.query("SELECT COUNT(*) AS count FROM member_products");
      assert.equal(empty.count, 0);
    });
}
