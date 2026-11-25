import { validateMemberProducts } from "./MemberProductValidation.js";
import { CommerceError } from "./CommerceMoney.js";

export async function replaceMemberProducts(connection, eventURL, products, expectedVersion) {
  products = validateMemberProducts(products);
  if (typeof eventURL !== "string" || !eventURL.trim()) {
    throw new Error("An event URL is required.");
  }
  await connection.beginTransaction();
  try {
    const [events] = await connection.query("SELECT id, products_version FROM events WHERE url = ? FOR UPDATE", [eventURL]);
    if (!events.length) throw new Error("Event not found.");
    if (expectedVersion !== undefined && Number(expectedVersion) !== events[0].products_version) {
      throw new CommerceError(409, "Products changed since this form was loaded. Reopen the event before saving products.");
    }
    const [current] = await connection.query("SELECT id, version FROM member_products WHERE event_url = ? ORDER BY id FOR UPDATE", [eventURL]);
    for (const product of products) {
      const values = [
        product.productName, product.productType, product.productImage || null,
        product.productTarget, product.productPrice, product.productInventory,
        eventURL, product.eventDate,
      ];
      if (product.productId == null) {
        const [result] = await connection.query(
          "INSERT INTO member_products (name, type, image_name, target, price, inventory, event_url, event_date) VALUES (?,?,?,?,?,?,?,?)", values);
        product.productId = result.insertId;
        product.version = 1;
      } else {
        const stored = current.find((item) => item.id === product.productId);
        if (!stored || stored.version !== product.version) throw new CommerceError(409, "Product changed or belongs to another event. Reopen the event.");
        const [[held]] = await connection.query("SELECT COALESCE(SUM(quantity),0) AS quantity FROM commerce_reservations WHERE product_id = ? AND state = 'active'", [product.productId]);
        if (product.productInventory < Number(held.quantity)) throw new CommerceError(409, "Inventory cannot be lower than reserved units.");
        await connection.query(`UPDATE member_products SET name=?, type=?, image_name=?, target=?, price=?, inventory=?,
          event_url=?, event_date=?, active=TRUE, version=version+1 WHERE id=?`, [...values, product.productId]);
        product.version++;
      }
    }
    const retained = products.map((product) => product.productId);
    await connection.query(`UPDATE member_products SET active=FALSE, version=version+1 WHERE event_url=? AND active=TRUE${retained.length ? " AND id NOT IN (?)" : ""}`,
      retained.length ? [eventURL, retained] : [eventURL]);
    await connection.query("UPDATE events SET products_version=products_version+1 WHERE id=?", [events[0].id]);
    await connection.commit();
    return { products, version: events[0].products_version + 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
