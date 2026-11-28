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
import { createProductTypeRouter } from "../Routes/ProductTypeRoutes.js";

test("Product Types API persists edits/deletes and protects product references and administrator access",
  { skip: process.env.PRODUCT_TYPES_TEST_MYSQL !== "1" }, async (t) => {
    const connection = MySQL.createConnection({
      host: process.env.MYSQL_TEST_HOST || "localhost", port: Number(process.env.MYSQL_TEST_PORT || 3306),
      user: process.env.MYSQL_TEST_USER || "root", password: process.env.MYSQL_TEST_PASSWORD,
    });
    const db = connection.promise();
    const database = `showcase_product_type_test_${randomUUID().replaceAll("-", "")}`;
    let created = false;
    t.after(async () => {
      try { if (created) await db.query(`DROP DATABASE \`${database}\``); }
      finally { await db.end(); }
    });
    await db.query(`CREATE DATABASE \`${database}\``);
    created = true;
    await db.changeUser({ database });
    const bootstrap = await readFile(new URL("../../datastore/Schema/BackendSchema.mysql.sql", import.meta.url), "utf8");
    const script = bootstrap.replaceAll("showcase.", `\`${database}\`.`)
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\r\n]*/g, "");
    for (const sql of script.split(";").map((value) => value.trim()).filter(Boolean)) await db.query(sql);

    const app = Express();
    app.use(Express.json(), CookieParser());
    app.use("/auth/productTypes", createProductTypeRouter(connection));
    const server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const url = `http://127.0.0.1:${server.address().port}/auth/productTypes`;
    const token = (role) => JWToken.sign({ account_roles: [role] }, SECRETS.SITEKEY, { expiresIn: "5m" });
    const admin = token(ROLES.ADMINISTRATOR), member = token(ROLES.MEMBER);
    const request = async (id, method = "GET", productType, credential = admin) => {
      const response = await fetch(`${url}/${id}`, { method,
        headers: { "Content-Type": "application/json", ...(credential ? { Cookie: `loginToken=${credential}` } : {}) },
        body: productType === undefined ? undefined : JSON.stringify({ productType }),
      });
      return { code: response.status, ...await response.json() };
    };
    const [inserted] = await db.query("INSERT INTO product_types (`type`) VALUES ('Ticket')");
    const id = inserted.insertId;
    await db.query("INSERT INTO product_types (`type`) VALUES ('Donation')");
    for (const method of ["GET", "PUT", "DELETE"]) {
      const body = method === "PUT" ? "Unauthorized rename" : undefined;
      assert.equal((await request(id, method, body, "")).Status, false);
      assert.equal((await request(id, method, body, member)).code, 403);
      assert.equal((await request(id, method, body, "invalid")).code, 401);
    }
    assert.equal((await request(id)).Result.type, "Ticket");
    assert.equal((await request(id, "PUT", "  Admission  ")).Status, true);
    assert.equal((await request(id)).Result.type, "Admission");
    assert.equal((await request(id, "PUT", "Admission")).Status, true);
    assert.equal((await request(id, "PUT", "donation")).code, 409);
    assert.equal((await request(id, "PUT", " ")).code, 400);
    assert.equal((await request(id, "PUT", "x".repeat(257))).code, 400);
    assert.equal((await request(id)).Result.type, "Admission");

    await db.query("INSERT INTO events (page_title, url) VALUES ('Test event', 'type_test')");
    await db.query("INSERT IGNORE INTO membership_categories (category) VALUES ('Type test')");
    for (const table of ["member_products", "non_member_products"]) {
      const memberProduct = table === "member_products";
      const [product] = await db.query(`INSERT INTO ${table}
        (name, \`type\`, price, inventory, event_url, event_date${memberProduct ? ", target" : ""})
        VALUES ('Test product', 'Admission', 10, 5, 'type_test', '2026-04-01'${memberProduct ? ", 'Type test'" : ""})`);
      await t.test(`${table} references prevent renaming or deleting their type`, async () => {
        for (const [method, name] of [["PUT", "Renamed"], ["DELETE", undefined]]) {
          const result = await request(id, method, name);
          assert.equal(result.code, 409);
          assert.match(result.Error, /used by products/);
        }
        const [[stored]] = await db.query(`SELECT \`type\` FROM ${table} WHERE id = ?`, [product.insertId]);
        assert.equal(stored.type, "Admission");
        assert.equal((await request(id)).Result.type, "Admission");
      });
      await db.query(`DELETE FROM ${table} WHERE id = ?`, [product.insertId]);
    }
    assert.equal((await request(id, "DELETE")).Status, true);
    for (const method of ["GET", "PUT", "DELETE"]) {
      assert.equal((await request(id, method, method === "PUT" ? "Missing" : undefined)).code, 404);
    }
    const [remaining] = await db.query("SELECT `type` FROM product_types");
    assert.deepEqual(remaining.map((row) => row.type), ["Donation"]);
  });
