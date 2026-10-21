const fieldColumns = {
  pageTitle: "page_title", eventURL: "url", eventTitle: "event_title",
  startDate: "start_date", startTime: "start_time", endDate: "end_date",
  endTime: "end_time", venueAddress: "venue_address", mapLink: "map_link",
  bannerBackground: "banner_background_image_name",
  upperHubContent: "upper_hub_content", upperHubBackground: "upper_hub_background_image_name",
  upperHubEventImages: "upper_hub_event_image_names", lowerHubContent: "lower_hub_content",
  lowerHubBackground: "lower_hub_background_image_name", lowerHubEventImages: "lower_hub_event_image_names",
  createdBy: "created_by", modifiedBy: "modified_by",
};

const requiredFields = {
  pageTitle: "Page title", eventURL: "URL", eventTitle: "Event title",
  startDate: "Start date", startTime: "Start time", endDate: "End date",
  endTime: "End time", venueAddress: "Venue", bannerBackground: "Banner background image",
};

export function prepareEventPayload(details) {
  const payload = {};
  for (const key of Object.keys(fieldColumns)) {
    let value = details[key];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      value = value.join(",");
    }
    payload[key] = typeof value === "string" ? value.trim() || null : null;
  }
  payload.eventURL = (payload.pageTitle || "").replace(/ /g, "_").toLocaleLowerCase();
  payload.isPublished = details.isPublished === true || details.isPublished === 1;
  return payload;
}

export function missingEventFields(payload) {
  const keys = payload.isPublished ? Object.keys(requiredFields) : ["pageTitle", "eventURL"];
  return keys.filter((key) => typeof payload[key] !== "string" || !payload[key].trim())
    .map((key) => requiredFields[key]);
}

export function eventFromRow(row) {
  const details = { eventId: row.id, isPublished: row.published === true || row.published === 1 };
  for (const [key, column] of Object.entries(fieldColumns)) {
    details[key] = row[column] ?? "";
  }
  details.startDate = details.startDate.slice(0, 10);
  details.endDate = details.endDate.slice(0, 10);
  return details;
}

export function completeProducts(products) {
  return Array.isArray(products) && products.every((product) => {
    if (!product || !["productName", "productType", "productTarget", "eventDate"].every(
      (key) => typeof product[key] === "string" && product[key].trim()
    )) return false;
    const date = new Date(`${product.eventDate}T00:00:00Z`);
    return Number.isFinite(Number(product.productPrice)) && Number(product.productPrice) > 0 &&
      Number.isInteger(Number(product.productInventory)) && Number(product.productInventory) > 0 &&
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === product.eventDate &&
      (product.productImage == null || typeof product.productImage === "string");
  });
}
