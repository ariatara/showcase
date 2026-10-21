export async function replaceMemberProducts(connection, eventURL, products) {
  if (!Array.isArray(products) || !products.every((product) => product && typeof product === "object")) {
    throw new Error("Products must be a list of product details.");
  }
  if (typeof eventURL !== "string" || !eventURL.trim()) {
    throw new Error("An event URL is required.");
  }
  await connection.beginTransaction();
  try {
    const [events] = await connection.query("SELECT id FROM events WHERE url = ? FOR UPDATE", [eventURL]);
    if (!events.length) throw new Error("Event not found.");
    await connection.query("DELETE FROM member_products WHERE event_url = ?", [eventURL]);
    if (products.length) {
      const values = products.map((product) => [
        product.productName, product.productType, product.productImage || null,
        product.productTarget, product.productPrice, product.productInventory,
        eventURL, product.eventDate,
      ]);
      await connection.query(
        "INSERT INTO member_products (name, type, image_name, target, price, inventory, event_url, event_date) VALUES ?",
        [values]
      );
    }
    await connection.commit();
    return products.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
