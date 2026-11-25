import { cents, dollars, integer, CommerceError } from "./CommerceMoney.js";

export function validateMemberProducts(products) {
  if (!Array.isArray(products) || products.length > 100) throw new CommerceError(400, "Products must be a list of at most 100 product details.");
  const ids = new Set();
  return products.map((product) => {
    if (!product || typeof product !== "object") throw new CommerceError(400, "Product details are required.");
    for (const [key, limit] of Object.entries({ productName: 512, productType: 256, productTarget: 128 })) {
      if (typeof product[key] !== "string" || !product[key].trim() || [...product[key]].length > limit) {
        throw new CommerceError(400, `Complete ${key} (at most ${limit} characters).`);
      }
    }
    const date = new Date(`${product.eventDate}T00:00:00Z`);
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(product.eventDate) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== product.eventDate) throw new CommerceError(400, "Product event date is invalid.");
    if (product.productImage != null && (typeof product.productImage !== "string" ||
        product.productImage.length > 128 || /[\\/\x00-\x1f]/.test(product.productImage))) {
      throw new CommerceError(400, "Product image must be an uploaded filename.");
    }
    if (product.productId != null) {
      integer(product.productId, "Product ID");
      integer(product.version, "Product version");
      if (ids.has(product.productId)) throw new CommerceError(400, "Duplicate product ID.");
      ids.add(product.productId);
    }
    return { ...product, productPrice: dollars(cents(product.productPrice)),
      productInventory: integer(product.productInventory, "Inventory", 0, 2147483647) };
  });
}
