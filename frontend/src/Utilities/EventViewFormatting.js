export function eventDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "";
  const day = value.slice(0, 10), date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
export function eventTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) return "";
  return new Date(`2000-01-01T${value.length === 5 ? value + ":00" : value}Z`)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}
export function safeMapLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
