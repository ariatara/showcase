import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Express from "express";
import CookieParser from "cookie-parser";
import MySQL from "mysql2";
import JWToken from "jsonwebtoken";
import { SECRETS } from "../Configurations/Secrets.js";
import { ROLES } from "../Configurations/Roles.js";
import { createNonMemberProductRouter } from "../Routes/NonMemberProductRoutes.js";

test("non-member API and migration preserve both audiences with independent, versioned writes",
  { skip: process.env.NON_MEMBER_PRODUCTS_TEST_MYSQL !== "1" }, async (t) => {
    const options = { host: process.env.MYSQL_TEST_HOST || "localhost", port: Number(process.env.MYSQL_TEST_PORT || 3306),
      user: process.env.MYSQL_TEST_USER || "root", password: process.env.MYSQL_TEST_PASSWORD };
    const connection = MySQL.createConnection(options);
    const db = connection.promise();
    const database = `showcase_nonmember_test_${randomUUID().replaceAll("-", "")}`;
    let created = false;
    t.after(async () => {
      try { if (created) await db.query(`DROP DATABASE \`${database}\``); }
      finally { await db.end(); }
    });
    await db.query(`CREATE DATABASE \`${database}\``);
    created = true;
    await db.changeUser({ database });
    const runScript = async (file) => {
      const source = await readFile(new URL(`../../datastore/${file}`, import.meta.url), "utf8");
      const script = source.replaceAll("showcase.", `\`${database}\`.`)
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\r\n]*/g, "");
      for (const sql of script.split(";").map((value) => value.trim()).filter(Boolean)) await db.query(sql);
    };
    await runScript("Schema/BackendSchema.mysql.sql");
    await runScript("Migrations/003_event_commerce.mysql.sql");
    await db.query("INSERT INTO events (page_title, url) VALUES ('First event', 'fair'), ('Other event', 'other')");
    await db.query("INSERT INTO product_types (`type`) VALUES ('Ticket')");
    await db.query("INSERT IGNORE INTO membership_categories (category) VALUES ('Adult')");
    await db.query(`INSERT INTO member_products (name, type, target, price, inventory, event_url, event_date)
      VALUES ('Member ticket', 'Ticket', 'Adult', 12.75, 10, 'fair', '2026-12-01')`);
    await db.query(`INSERT INTO non_member_products (name, type, price, inventory, event_url, event_date)
      VALUES ('Guest ticket', 'Ticket', 20, 5, 'fair', '2026-12-01'), ('Other ticket', 'Ticket', 25, 2, 'other', '2026-12-01')`);
    await runScript("Migrations/004_non_member_product_editing.mysql.sql");
    const [legacy] = await db.query("SELECT id, name, price, inventory, active, version FROM non_member_products ORDER BY id");
    assert.deepEqual(legacy.map(({ price, active, version }) => [price, active, version]), [["20.00", 1, 1], ["25.00", 1, 1]]);
    const [memberBefore] = await db.query("SELECT * FROM member_products");
    const [otherBefore] = await db.query("SELECT * FROM non_member_products WHERE event_url='other'");
    const app = Express();
    app.use(Express.json(), CookieParser());
    app.use("/auth/nonMemberProducts", createNonMemberProductRouter(connection, () => MySQL.createConnection({ ...options, database })));
    const server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/auth/nonMemberProducts`;
    const token = (role) => JWToken.sign({ account_roles: [role] }, SECRETS.SITEKEY, { expiresIn: "5m" });
    const admin = token(ROLES.ADMINISTRATOR), member = token(ROLES.MEMBER);
    const request = async (method = "GET", body, version = 1, credential = admin, event = "fair") => {
      const response = await fetch(`${base}/${event}`, { method,
        headers: { "Content-Type": "application/json", ...(version === null ? {} : { "X-Product-Version": String(version) }),
          ...(credential ? { Cookie: `loginToken=${credential}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        assert.equal(response.status, 400, "Only the JSON parser may reject input before the API's JSON response");
        return { code: response.status, Status: false, Error: await response.text() };
      }
      return { code: response.status, ...await response.json() };
    };
    const original = { productId: legacy[0].id, version: 1, productName: "Guest ticket", productType: "Ticket",
      productPrice: "20.00", productInventory: 5, eventDate: "2026-12-01" };
    const added = { productName: "New admission", productType: "Ticket", productPrice: "9.25",
      productInventory: 0, productImage: "productImage_123_guest.png", eventDate: "2026-12-01", eventURL: "other" };

    await t.test("only administrators can read or save, and validation never mutates data", async () => {
      for (const method of ["GET", "PUT"]) {
        const body = method === "PUT" ? [] : undefined;
        assert.equal((await request(method, body, 1, "")).Status, false);
        assert.equal((await request(method, body, 1, member)).code, 403);
        assert.equal((await request(method, body, 1, "invalid")).code, 401);
      }
      assert.equal((await request("PUT", [], null)).code, 400);
      assert.equal((await request("GET", undefined, 1, admin, "missing")).code, 404);
      assert.equal((await request("PUT", [], 1, admin, "missing")).code, 404);
      for (const body of [null, [{}], [{ ...original, productPrice: "1.001" }], [{ ...original, productInventory: -1 }]]) {
        assert.equal((await request("PUT", body)).code, 400);
      }
      assert.equal((await request()).Result[0].name, "Guest ticket");
    });

    await t.test("add and edit preserve cents, images, stable IDs and independent versions", async () => {
      const saved = await request("PUT", [{ ...original, productName: "Revised guest", productPrice: "21.75" }, added]);
      assert.equal(saved.Status, true, saved.Error);
      assert.equal(saved.Result.version, 2);
      assert.equal(saved.Result.products[0].productId, original.productId);
      assert.equal(saved.Result.products[0].version, 2);
      const loaded = await request();
      assert.equal(loaded.Version, 2);
      assert.deepEqual(loaded.Result.map(({ price, image_name }) => [price, image_name]), [["21.75", null], ["9.25", added.productImage]]);
      assert.ok(loaded.Result.every((row) => row.event_url === "fair"));
      assert.deepEqual((await db.query("SELECT * FROM member_products"))[0], memberBefore);
      assert.deepEqual((await db.query("SELECT * FROM non_member_products WHERE event_url='other'"))[0], otherBefore);
      const [[event]] = await db.query("SELECT products_version, non_member_products_version FROM events WHERE url='fair'");
      assert.deepEqual(event, { products_version: 1, non_member_products_version: 2 });
    });

    await t.test("stale or cross-event identities reject atomically, including inserts before a failure", async () => {
      const before = (await db.query("SELECT * FROM non_member_products ORDER BY id"))[0];
      assert.equal((await request("PUT", [], 1)).code, 409);
      assert.equal((await request("PUT", [added, original], 2)).code, 409);
      assert.equal((await request("PUT", [{ ...original, productId: legacy[1].id }], 2)).code, 409);
      assert.equal((await request("PUT", [{ ...added, productType: "Missing" }], 2)).code, 400);
      assert.deepEqual((await db.query("SELECT * FROM non_member_products ORDER BY id"))[0], before);
      assert.equal((await request()).Version, 2);
    });

    await t.test("simultaneous writes have one winner and empty lists retire only this audience", async () => {
      const competing = await Promise.all([request("PUT", [added], 2), request("PUT", [added], 2)]);
      assert.deepEqual(competing.map(({ code }) => code).sort(), [200, 409]);
      assert.equal((await request()).Result.length, 1);
      const cleared = await request("PUT", [], 3);
      assert.equal(cleared.Result.version, 4);
      assert.deepEqual((await request()).Result, []);
      assert.equal((await request()).Version, 4);
      const [[retired]] = await db.query("SELECT COUNT(*) AS total, SUM(active) AS active FROM non_member_products WHERE event_url='fair'");
      assert.ok(retired.total >= 2);
      assert.equal(Number(retired.active), 0);
      assert.deepEqual((await db.query("SELECT * FROM member_products"))[0], memberBefore);
      assert.deepEqual((await db.query("SELECT * FROM non_member_products WHERE event_url='other'"))[0], otherBefore);
    });
  });
