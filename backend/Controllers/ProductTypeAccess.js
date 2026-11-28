function productTypeId(request, response) {
  const value = request.params.id;
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    response.status(400).json({ Status: false, Error: "Invalid product type ID." });
    return null;
  }
  return Number(value);
}

function databaseError(response, error, action) {
  console.error(`${action} product type failed:`, error.code);
  if (error.code === "ER_DUP_ENTRY") {
    return response.status(409).json({ Status: false, Error: "A product type with this name already exists." });
  }
  if (["ER_ROW_IS_REFERENCED", "ER_ROW_IS_REFERENCED_2"].includes(error.code)) {
    return response.status(409).json({ Status: false,
      Error: "This product type is used by products and cannot be renamed or deleted. Reassign those products to another type first." });
  }
  return response.status(500).json({ Status: false, Error: `${action} product type failed. Please try again.` });
}

export function createProductTypeHandlers(db) {
  function getProductType(request, response) {
    const id = productTypeId(request, response);
    if (id === null) return;
    db.query("SELECT id, `type` FROM product_types WHERE id = ?", [id], (error, rows) => {
      if (error) return databaseError(response, error, "Get");
      if (!rows.length) return response.status(404).json({ Status: false, Error: "Product type not found." });
      return response.json({ Status: true, Result: rows[0] });
    });
  }

  function updateProductType(request, response) {
    const id = productTypeId(request, response);
    if (id === null) return;
    const value = request.body?.productType;
    if (typeof value !== "string" || !value.trim() || [...value.trim()].length > 256) {
      return response.status(400).json({ Status: false, Error: "Enter a product type between 1 and 256 characters." });
    }
    db.query("UPDATE product_types SET `type` = ? WHERE id = ?", [value.trim(), id], (error, result) => {
      if (error) return databaseError(response, error, "Update");
      if (!result.affectedRows) return response.status(404).json({ Status: false, Error: "Product type not found." });
      return response.json({ Status: true });
    });
  }

  function deleteProductType(request, response) {
    const id = productTypeId(request, response);
    if (id === null) return;
    db.query("DELETE FROM product_types WHERE id = ?", [id], (error, result) => {
      if (error) return databaseError(response, error, "Delete");
      if (!result.affectedRows) return response.status(404).json({ Status: false, Error: "Product type not found." });
      return response.json({ Status: true });
    });
  }

  return { getProductType, updateProductType, deleteProductType };
}
