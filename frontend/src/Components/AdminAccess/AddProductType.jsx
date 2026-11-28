import ActionLabel from "../ActionLabel";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";
import { usePopup } from "../../Utilities/usePopup";

const AddProductType = () => {
  const { showAlert } = usePopup("Add Product Type");
  const [productType, setProductType] = useState();

  const NavigateTo = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/auth/addProductType", {
      productType,
    })
      .then(async (result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/productTypes");
        } else {
          await showAlert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="addProductTypePage d-flex justify-content-center align-items-center h-100">
      <div className="addProductTypeForm p-5 rounded w-25 border">
        <div className="addProductTypeError text-warning"></div>
        <h5>Add Product Type:</h5>
        <form onSubmit={handleSubmit}>
          <div className="categoryForm my-3">
            <input
              className="form-control rounded-0"
              type="text"
              name="category"
              placeholder="Enter Product Type"
              onChange={(event) => setProductType(event.target.value)}
            />
          </div>
          <button className="btn btn-primary w-100 rounded-1 mb-1">
            <ActionLabel action="add">Add Product Type</ActionLabel>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddProductType;
