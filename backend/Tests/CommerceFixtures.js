import MySQL from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const mysqlEnabled = process.env.EVENT_TEST_MYSQL === "1";

export async function runSql(connection, path, database) {
  const sql = (await readFile(new URL(path, import.meta.url), "utf8"))
    .replaceAll("showcase.", `\`${database}\`.`).replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\r\n]*/g, "");
  for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) {
    await connection.query(statement);
  }
}

export async function commerceDatabase(t, upgrade = false, beforeCommerce) {
  const options = {
    host: process.env.MYSQL_TEST_HOST || "localhost", port: Number(process.env.MYSQL_TEST_PORT || 3306),
    user: process.env.MYSQL_TEST_USER || "root", password: process.env.MYSQL_TEST_PASSWORD,
    dateStrings: true,
  };
  const db = await MySQL.createConnection(options);
  const database = `showcase_commerce_test_${randomUUID().replaceAll("-", "")}`;
  await db.query(`CREATE DATABASE \`${database}\``);
  t.after(async () => {
    try { await db.query(`DROP DATABASE \`${database}\``); } finally { await db.end(); }
  });
  await db.changeUser({ database });
  if (upgrade) {
    await runSql(db, "./Fixtures/EventsBeforePartialSave.mysql.sql", database);
    if (upgrade === "current") await runSql(db, "../../datastore/Migrations/001_events_partial_save.mysql.sql", database);
    await db.query(`CREATE TABLE member_products (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(512) NOT NULL,
      type VARCHAR(256) NOT NULL, image_name VARCHAR(128), target VARCHAR(128) NOT NULL,
      price DECIMAL(10,0) NOT NULL, inventory INT NOT NULL, event_url VARCHAR(64) NOT NULL,
      event_date DATE NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  }
  await runSql(db, "../../datastore/Schema/BackendSchema.mysql.sql", database);
  if (upgrade) {
    if (upgrade !== "current") await runSql(db, "../../datastore/Migrations/001_events_partial_save.mysql.sql", database);
    await runSql(db, "../../datastore/Migrations/002_event_templates.mysql.sql", database);
  }
  if (beforeCommerce) await beforeCommerce(db);
  await runSql(db, "../../datastore/Migrations/003_event_commerce.mysql.sql", database);
  const connect = () => MySQL.createConnection({ ...options, database });
  return { db, connect };
}

export async function seedCommerce(db) {
  await db.query(`INSERT INTO accounts(id,first_name,last_name,account_email,account_password)
    VALUES(101,'Test','One','one@example.invalid','unused'),(102,'Test','Two','two@example.invalid','unused')`);
  await db.query("INSERT INTO account_roles(account_email,account_role) VALUES('one@example.invalid','Member'),('two@example.invalid','Member')");
  await db.query(`INSERT INTO members(id,account_email,first_name,last_name,age_group,member_email,membership_category)
    VALUES(101,'one@example.invalid','Member','One','18-45','m1@example.invalid','Adult'),
    (102,'two@example.invalid','Member','Two','18-45','m2@example.invalid','Adult')`);
  await db.query(`INSERT INTO events(id,url,page_title,event_title,start_date,start_time,end_date,end_time,
    venue_address,banner_background_image_name,published) VALUES
    (101,'first','First','First','2026-04-01','10:00','2026-04-01','17:00','Hall','banner.jpg',TRUE),
    (102,'second','Second','Second','2026-04-02','10:00','2026-04-02','17:00','Hall','banner.jpg',TRUE)`);
  await db.query("INSERT INTO product_types(type) VALUES('Ticket')");
  await db.query(`INSERT INTO member_products(id,name,type,target,price,inventory,event_url,event_date)
    VALUES(101,'First ticket','Ticket','Adult',10.25,5,'first','2026-04-01'),
    (102,'Second ticket','Ticket','Adult',20.00,5,'second','2026-04-02')`);
}
