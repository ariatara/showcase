import FileSystem from "fs";
import Multer from "multer";
import Path from "path";
import { fileURLToPath } from "url";

const UtilitiesDirectory = Path.dirname(fileURLToPath(import.meta.url));
export const PublicDirectory = Path.resolve(UtilitiesDirectory, "../Public");
const UploadDirectory = Path.join(PublicDirectory, "Uploads");

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

export default FileUpload;
