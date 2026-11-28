import { GALLERY_FIELDS, MAX_GALLERY_FILE_BYTES, MAX_GALLERY_IMAGES, serializeEventImagePaths } from "./EventImages.js";

const formats = {
  "image/jpeg": /\.(jpe?g)$/i, "image/png": /\.png$/i,
  "image/webp": /\.webp$/i, "image/gif": /\.gif$/i,
};

export function validateImageSelection(files, existingCount) {
  if (!Number.isInteger(existingCount) || existingCount < 0) throw new Error("Invalid existing image count.");
  const selected = Array.from(files);
  if (existingCount + selected.length > MAX_GALLERY_IMAGES) {
    throw new Error(`Each hub allows at most ${MAX_GALLERY_IMAGES} images, including selected files.`);
  }
  for (const file of selected) {
    if (!(file instanceof File)) throw new Error("Select valid image files.");
    if (!formats[file.type]?.test(file.name)) throw new Error("Select JPEG, PNG, WebP, or GIF image files.");
    if (!file.size) throw new Error(`${file.name} is empty.`);
    if (file.size > MAX_GALLERY_FILE_BYTES) throw new Error(`${file.name} exceeds the 10 MiB image limit.`);
  }
  return selected;
}

export function moveImage(items, from, to) {
  if (!Array.isArray(items) || !Number.isInteger(from) || !Number.isInteger(to)
    || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    throw new Error("Invalid image position.");
  }
  const reordered = [...items];
  const [item] = reordered.splice(from, 1);
  reordered.splice(to, 0, item);
  return reordered;
}

export async function uploadPendingImages({
  queue, fieldName, uploadedPaths, upload, onUploaded, onProgress, isActive = () => true,
}) {
  if (!GALLERY_FIELDS.includes(fieldName)) throw new Error("Invalid gallery field.");
  serializeEventImagePaths(uploadedPaths);
  validateImageSelection(queue.map((item) => item.file), uploadedPaths.length);
  if (typeof upload !== "function" || typeof onUploaded !== "function") throw new Error("Upload callbacks are required.");
  const paths = [...uploadedPaths];
  for (let index = 0; index < queue.length; index++) {
    const remaining = queue.slice(index);
    if (!isActive()) return { remaining, cancelled: true };
    const entry = queue[index];
    onProgress?.(entry.id);
    try {
      const response = await upload(fieldName, entry.file);
      if (!isActive()) return { remaining, cancelled: true };
      if (typeof response !== "string") throw new Error(response?.Error || "Upload did not return a valid filename.");
      const filename = serializeEventImagePaths([response]);
      serializeEventImagePaths([...paths, filename]);
      paths.push(filename);
      onUploaded(entry, [...paths]);
    } catch (error) {
      return { remaining, error: error.response?.data?.Error || error.message || "Gallery upload failed." };
    }
  }
  return { remaining: [], error: "" };
}
