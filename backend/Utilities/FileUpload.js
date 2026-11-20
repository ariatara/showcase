import FileSystem from "fs";
import Multer from "multer";
import Path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";

const UtilitiesDirectory = Path.dirname(fileURLToPath(import.meta.url));
export const PublicDirectory = Path.resolve(UtilitiesDirectory, "../Public");
export const UploadDirectory = Path.join(PublicDirectory, "Uploads");

FileSystem.mkdirSync(UploadDirectory, { recursive: true });

const fileStore = Multer.diskStorage({
  destination: (request, file, destinationCallback) => {
    destinationCallback(null, UploadDirectory);
  },
  filename: (request, file, filenameCallback) => {
    filenameCallback(
      null,
      file.fieldname + "_" + Date.now() + "_" + file.originalname
    );
  },
});

const FileUpload = Multer({
  storage: fileStore,
});

export const MAX_GALLERY_FILE_BYTES = 10 * 1024 * 1024;
const galleryFormats = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

export function createGalleryFileUpload(directory = UploadDirectory) {
  return Multer({
    storage: Multer.diskStorage({
      destination: (request, file, callback) => callback(null, directory),
      filename: (request, file, callback) => {
        const filename = `${file.fieldname}_${randomUUID()}${galleryFormats[file.mimetype][0]}`;
        // Disk errors can occur before Multer assigns request.file.
        request.galleryUploadPath = Path.join(directory, filename);
        callback(null, filename);
      },
    }),
    // Busboy raises its limit at equality; permit the exact advertised maximum.
    limits: { fileSize: MAX_GALLERY_FILE_BYTES + 1, files: 1, fields: 0, parts: 2 },
    fileFilter: (request, file, callback) => {
      if (!galleryFormats[file.mimetype]?.includes(Path.extname(file.originalname).toLowerCase())) {
        return callback(Object.assign(new Error("Gallery images must be JPEG, PNG, WebP, or GIF."), { status: 415 }));
      }
      callback(null, true);
    },
  });
}

export default FileUpload;
