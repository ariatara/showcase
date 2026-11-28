import { open, unlink } from "node:fs/promises";
import { createGalleryFileUpload, MAX_GALLERY_FILE_BYTES } from "../Utilities/FileUpload.js";
import { GALLERY_FIELDS } from "../Utilities/EventValidation.js";

function matchesFormat(header, type) {
  if (type === "image/png") return header.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (type === "image/jpeg") return header[0] === 255 && header[1] === 216 && header[2] === 255;
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(header.subarray(0, 6).toString("ascii"));
  return type === "image/webp" && header.subarray(0, 4).toString("ascii") === "RIFF"
    && header.subarray(8, 12).toString("ascii") === "WEBP";
}

export function createGalleryImageUploadHandler(directory) {
  const upload = createGalleryFileUpload(directory);
  return (request, response) => {
    const fieldName = request.params.fieldName;
    if (!GALLERY_FIELDS.includes(fieldName)) {
      return response.status(400).json({ Status: false, Error: "Invalid gallery field." });
    }
    upload.single(fieldName)(request, response, async (uploadError) => {
      try {
        if (uploadError) throw uploadError;
        if (!request.file) throw Object.assign(new Error("Select an image to upload."), { status: 400 });
        if (request.file.size > MAX_GALLERY_FILE_BYTES) {
          throw Object.assign(new Error("Gallery images must be at most 10 MiB."), { status: 413 });
        }
        const file = await open(request.file.path, "r");
        let valid;
        try {
          const header = Buffer.alloc(12);
          const { bytesRead } = await file.read(header, 0, header.length, 0);
          valid = matchesFormat(header.subarray(0, bytesRead), request.file.mimetype);
        } finally {
          await file.close();
        }
        if (!valid) throw Object.assign(new Error("The image content does not match its supported file type."), { status: 415 });
        return response.status(200).json(request.file.filename);
      } catch (error) {
        if (request.galleryUploadPath) {
          try {
            await unlink(request.galleryUploadPath);
          } catch (cleanupError) {
            if (cleanupError.code !== "ENOENT") {
              console.error("Gallery upload cleanup failed:", cleanupError.code);
              return response.status(500).json({ Status: false, Error: "Gallery upload cleanup failed." });
            }
          }
        }
        const status = error.code === "LIMIT_FILE_SIZE" ? 413
          : error.status || (error.code?.startsWith("LIMIT_") ? 400 : 500);
        if (status === 500) console.error("Gallery upload failed:", error.code || error.message);
        const message = status === 500 ? "Gallery upload failed."
          : status === 413 ? "Gallery images must be at most 10 MiB."
          : error.code?.startsWith("LIMIT_") ? "Upload one image using the correct gallery field." : error.message;
        return response.status(status).json({ Status: false, Error: message });
      }
    });
  };
}

export const uploadGalleryImage = createGalleryImageUploadHandler();
