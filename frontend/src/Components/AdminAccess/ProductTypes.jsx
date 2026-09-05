import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";

const ProductTypes = () => {
  const [productTypes, setProductTypes] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/productTypes")
      .then((result) => {
        if (result.data.Status) {
          setProductTypes(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Product Types</h4>
      </div>
      <Link
        to="/adminDashboard/addProductType"
        className="btn btn-custom rounded-1"
      >
        Add Product Type
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Product Type </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {productTypes.map((x) => (
              <tr key={x.id}>
                <td>{x.type}</td>
                <td>
                  <Link
                    //to={"/adminDashboard/editEmployee/" + value.id}
                    className="btn btn-info btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    //onClick={() => handleDelete(value.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTypes;
