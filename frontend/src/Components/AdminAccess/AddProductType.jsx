import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";

const AddProductType = () => {
  const [productType, setProductType] = useState();

  const NavigateTo = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/auth/addProductType", {
      productType,
    })
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/productTypes");
        } else {
          alert(result.data.Error);
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
          <button className="btn btn-custom w-100 rounded-1 mb-1">
            Add Product Type
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddProductType;
