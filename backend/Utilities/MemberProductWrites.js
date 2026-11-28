import { validateMemberProducts, validateNonMemberProducts } from "./MemberProductValidation.js";
import { CommerceError } from "./CommerceMoney.js";

async function replaceProducts(connection, eventURL, products, expectedVersion, member) {
  products = member ? validateMemberProducts(products) : validateNonMemberProducts(products);
  const table = member ? "member_products" : "non_member_products";
  const versionColumn = member ? "products_version" : "non_member_products_version";
  if (typeof eventURL !== "string" || !eventURL.trim()) {
    throw new CommerceError(400, "An event URL is required.");
  }
  await connection.beginTransaction();
  try {
    const [events] = await connection.query(`SELECT id, ${versionColumn} FROM events WHERE url = ? FOR UPDATE`, [eventURL]);
    if (!events.length) throw new CommerceError(404, "Event not found.");
    if (expectedVersion !== undefined && Number(expectedVersion) !== events[0][versionColumn]) {
      throw new CommerceError(409, "Products changed since this form was loaded. Reopen the event before saving products.");
    }
    const [current] = await connection.query(`SELECT id, version FROM ${table} WHERE event_url = ? ORDER BY id FOR UPDATE`, [eventURL]);
    for (const product of products) {
      const values = [
        product.productName, product.productType, product.productImage || null,
        ...(member ? [product.productTarget] : []), product.productPrice, product.productInventory,
        eventURL, product.eventDate,
      ];
      if (product.productId == null) {
        const [result] = await connection.query(
          `INSERT INTO ${table} (name, type, image_name, ${member ? "target, " : ""}price, inventory, event_url, event_date) VALUES (${values.map(() => "?").join(",")})`, values);
        product.productId = result.insertId;
        product.version = 1;
      } else {
        const stored = current.find((item) => item.id === product.productId);
        if (!stored || stored.version !== product.version) throw new CommerceError(409, "Product changed or belongs to another event. Reopen the event.");
        if (member) {
          const [[held]] = await connection.query("SELECT COALESCE(SUM(quantity),0) AS quantity FROM commerce_reservations WHERE product_id = ? AND state = 'active'", [product.productId]);
          if (product.productInventory < Number(held.quantity)) throw new CommerceError(409, "Inventory cannot be lower than reserved units.");
        }
        await connection.query(`UPDATE ${table} SET name=?, type=?, image_name=?, ${member ? "target=?, " : ""}price=?, inventory=?,
          event_url=?, event_date=?, active=TRUE, version=version+1 WHERE id=?`, [...values, product.productId]);
        product.version++;
      }
    }
    const retained = products.map((product) => product.productId);
    await connection.query(`UPDATE ${table} SET active=FALSE, version=version+1 WHERE event_url=? AND active=TRUE${retained.length ? " AND id NOT IN (?)" : ""}`,
      retained.length ? [eventURL, retained] : [eventURL]);
    await connection.query(`UPDATE events SET ${versionColumn}=${versionColumn}+1 WHERE id=?`, [events[0].id]);
    await connection.commit();
    return { products, version: events[0][versionColumn] + 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export const replaceMemberProducts = (connection, eventURL, products, expectedVersion) =>
  replaceProducts(connection, eventURL, products, expectedVersion, true);

export const replaceNonMemberProducts = (connection, eventURL, products, expectedVersion) =>
  replaceProducts(connection, eventURL, products, expectedVersion, false);
