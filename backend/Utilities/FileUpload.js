import Multer from "multer";

const fileStore = Multer.diskStorage({
  destination: (request, file, destinationCallback) => {
    destinationCallback(null, "Public/Uploads");
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
