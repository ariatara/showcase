import Axios from "axios";
import { ServerLocation } from "./Locations";

export const UploadFileByFieldName = async (fieldName, fileName) => {
  if (!fileName) {
    throw new Error("Select a file before uploading.");
  }

  const formData = new FormData();
  formData.append(fieldName, fileName);

  const response = await Axios.post(
    ServerLocation("/auth/upload/" + fieldName),
    formData,
    { withCredentials: true }
  );

  return response.data;
};