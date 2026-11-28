import { ServerLocation } from "./Locations.js";

export const MAX_GALLERY_IMAGES = 10;
export const MAX_GALLERY_FILE_BYTES = 10 * 1024 * 1024;
export const GALLERY_FIELDS = ["upperHubEventImages", "lowerHubEventImages"];

export function parseEventImagePaths(csv) {
  if (csv == null) return [];
  if (typeof csv !== "string") throw new Error("Gallery references must be text.");
  return csv.split(",").map((name) => name.trim()).filter(Boolean);
}

export function serializeEventImagePaths(paths) {
  if (!Array.isArray(paths)) throw new Error("Gallery references must be a list.");
  if (paths.length > MAX_GALLERY_IMAGES) throw new Error(`A gallery can contain at most ${MAX_GALLERY_IMAGES} images.`);
  const names = paths.map((name) => {
    if (typeof name !== "string" || !name.trim() || /[,\\/:]/.test(name)
      || [".", ".."].includes(name.trim())
      || [...name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
      throw new Error("Each gallery image must have a valid uploaded filename.");
    }
    return name.trim();
  });
  const csv = names.join(",");
  if (new TextEncoder().encode(csv).length > 65535) throw new Error("Gallery references exceed the database text limit.");
  return csv || null;
}

export function eventImageUrl(filename) {
  return ServerLocation("/Uploads/" + encodeURIComponent(filename));
}
