import Compressor from "compressorjs";
import Axios from "axios";
import { ServerLocation } from "../../Utilities/Locations";

function undoChange() {
  this.quill.history.undo();
}

function redoChange() {
  this.quill.history.redo();
}

const uploadFile = async (fieldName, eventFileName) => {
  try {
    const formData = new FormData();
    formData.append(fieldName, eventFileName);

    const response = await Axios.post(
      "http://localhost:3000/auth/upload/" + fieldName,
      formData
    );

    return response.data;
  } catch (error) {
    console.log("File upload failed: " + error);
  }
};

function compressFile(inputFile) {
  return new Promise((resolve, reject) => {
    new Compressor(inputFile, {
      file: "File",
      quality: 1.0,
      success(inputFile) {
        return resolve({
          success: true,
          file: inputFile,
        });
      },
      error(compressError) {
        return resolve({
          success: false,
          message: compressError.message,
        });
      },
    });
  });
}

function handleImage() {
  const inputImage = document.createElement("input");
  inputImage.setAttribute("type", "file");
  inputImage.setAttribute("accept", "image/*");

  inputImage.click();

  inputImage.onchange = async () => {
    const imageFile = inputImage.files[0];
    const compressState = await compressFile(imageFile);
    if (compressState.success) {
      const relativePath = await uploadFile("editorUpload", compressState.file);

      const quillRange = this.quill.getSelection(true);
      this.quill.insertEmbed(
        quillRange.index,
        "image",
        ServerLocation("Uploads/" + relativePath)
      );
    }
  };
}

export const EditorModules = {
  toolbar: {
    container: "#toolbar",
    handlers: {
      undo: undoChange,
      redo: redoChange,
      image: handleImage,
    },
  },
  clipboard: {
    matchVisual: false,
  },
  resize: {
    locale: {
      center: "center",
    },
  },
  history: {
    delay: 500,
    maxStack: 100,
    userOnly: true,
  },
};
