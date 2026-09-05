import Axios from "axios";

export const UploadFileByFieldName = async (fieldName, fileName) => {
    try {
        const formData = new FormData();
        formData.append(fieldName, fileName);

        const response = await Axios.post(
        "http://localhost:3000/auth/upload/" + fieldName,
        formData);

        return response.data;
    } 
    catch (error) {
        console.log("File upload failed: " + error);
    }
};