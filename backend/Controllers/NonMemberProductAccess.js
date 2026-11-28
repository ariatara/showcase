import { replaceNonMemberProducts } from "../Utilities/MemberProductWrites.js";

function productError(response, error) {
  console.error("Non-member product request failed:", error.code || error.message);
  if (error.code === "ER_BAD_FIELD_ERROR") {
    return response.status(500).json({ Status: false,
      Error: "Non-member products are not configured. Apply migration 004_non_member_product_editing.mysql.sql." });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return response.status(400).json({ Status: false, Error: "The event or product type no longer exists. Reload the event before saving." });
  }
  return response.status(error.status || 500).json({ Status: false,
    Error: error.status ? error.message : "Non-member products could not be loaded or saved. Please try again." });
}

export function createNonMemberProductHandlers(db, connect) {
  function getProducts(request, response) {
    db.query(`SELECT p.*, DATE_FORMAT(p.event_date, '%Y-%m-%d') AS event_date,
      e.non_member_products_version AS collection_version FROM events e
      LEFT JOIN non_member_products p ON p.event_url = e.url AND p.active = TRUE
      WHERE e.url = ? ORDER BY p.id`, [request.params.event_url], (error, rows) => {
      if (error) return productError(response, error);
      if (!rows.length) return response.status(404).json({ Status: false, Error: "Event not found." });
      return response.json({ Status: true, Result: rows.filter((row) => row.id !== null), Version: rows[0].collection_version });
    });
  }

  async function saveProducts(request, response) {
    const expectedVersion = request.get("X-Product-Version");
    if (!/^[1-9]\d*$/.test(expectedVersion || "") || !Number.isSafeInteger(Number(expectedVersion))) {
      return response.status(400).json({ Status: false, Error: "Product collection version is required. Reopen the event." });
    }
    let connection;
    try {
      connection = connect().promise();
      const saved = await replaceNonMemberProducts(connection, request.params.event_url, request.body, expectedVersion);
      return response.json({ Status: true, Result: saved });
    } catch (error) {
      return productError(response, error);
    } finally {
      if (connection) {
        try { await connection.end(); }
        catch (error) { console.error("Non-member product connection close failed:", error.code || "UNKNOWN"); }
      }
    }
  }

  return { getProducts, saveProducts };
}
