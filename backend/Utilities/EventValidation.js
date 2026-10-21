export const EVENT_FIELDS = {
  pageTitle: ["page_title", "Page title", 64],
  eventURL: ["url", "URL", 64],
  eventTitle: ["event_title", "Event title", 128],
  startDate: ["start_date", "Start date"],
  startTime: ["start_time", "Start time"],
  endDate: ["end_date", "End date"],
  endTime: ["end_time", "End time"],
  venueAddress: ["venue_address", "Venue", 256],
  mapLink: ["map_link", "Map link", 128],
  bannerBackground: ["banner_background_image_name", "Banner background image", 128],
  upperHubContent: ["upper_hub_content", "Upper hub content"],
  upperHubBackground: ["upper_hub_background_image_name", "Upper hub background", 1024],
  upperHubEventImages: ["upper_hub_event_image_names", "Upper hub images"],
  lowerHubContent: ["lower_hub_content", "Lower hub content"],
  lowerHubBackground: ["lower_hub_background_image_name", "Lower hub background", 128],
  lowerHubEventImages: ["lower_hub_event_image_names", "Lower hub images"],
  createdBy: ["created_by", "Created by", 128],
  modifiedBy: ["modified_by", "Modified by", 128],
};

export const REQUIRED_FOR_PUBLISH = [
  "pageTitle", "eventURL", "eventTitle", "startDate", "startTime",
  "endDate", "endTime", "venueAddress", "bannerBackground",
];

export function normalizeEventPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Event details must be an object.");
  }
  const normalized = {};
  for (const [key, [, label]] of Object.entries(EVENT_FIELDS)) {
    if (!Object.hasOwn(body, key)) continue;
    const value = body[key];
    if (value !== null && typeof value !== "string") {
      throw new Error(`${label} must be text.`);
    }
    normalized[key] = value === null ? null : value.trim() || null;
  }
  if (Object.hasOwn(body, "isPublished")) {
    if (![true, false, 1, 0, "true", "false", "1", "0"].includes(body.isPublished)) {
      throw new Error("Visibility must be Publish or Unpublish.");
    }
    normalized.isPublished = [true, 1, "true", "1"].includes(body.isPublished);
  }
  return normalized;
}

export function validateDraft(event) {
  return ["pageTitle", "eventURL"].filter(
    (key) => typeof event?.[key] !== "string" || !event[key].trim()
  );
}

export function validatePublish(event) {
  return REQUIRED_FOR_PUBLISH.filter(
    (key) => typeof event?.[key] !== "string" || !event[key].trim()
  );
}

export function validateEvent(event) {
  const errors = {};
  const missing = event.isPublished ? validatePublish(event) : validateDraft(event);
  for (const key of missing) errors[key] = `${EVENT_FIELDS[key][1]} is required.`;
  for (const [key, [, label, max]] of Object.entries(EVENT_FIELDS)) {
    const value = event[key];
    if (value == null) continue;
    if (typeof value !== "string") {
      errors[key] = `${label} must be text.`;
    } else if (max && [...value].length > max) {
      errors[key] = `${label} must be at most ${max} characters.`;
    } else if (["startDate", "endDate"].includes(key)) {
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        errors[key] = `${label} must be a valid date.`;
      }
    } else if (["startTime", "endTime"].includes(key)) {
      if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) {
        errors[key] = `${label} must be a valid time.`;
      }
    } else if (!max && Buffer.byteLength(value, "utf8") > 65535) {
      errors[key] = `${label} exceeds the database text limit.`;
    }
  }
  return errors;
}
