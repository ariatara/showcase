import ActionLabel from "../ActionLabel";
import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { usePopup } from "../../Utilities/usePopup";
import { ServerLocation } from "../../Utilities/Locations";

const ProductTypes = () => {
  const { showAlert, showConfirm } = usePopup("Product Types");
  const [productTypes, setProductTypes] = useState([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    Axios.get(ServerLocation("/auth/productTypes"), { signal: controller.signal })
      .then(({ data }) => {
        if (!data.Status) throw new Error(data.Error || "Get product types failed.");
        if (!controller.signal.aborted) setProductTypes(data.Result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.response?.data?.Error || failure.message);
      });
    return () => controller.abort();
  }, []);

  const handleDelete = async (productType) => {
    if (deleting !== null) return;
    setDeleting(productType.id);
    try {
      if (!await showConfirm(`Delete product type "${productType.type}"? This cannot be undone.`,
        { title: "Delete Product Type", confirmLabel: "Delete", confirmAction: "delete" })) return;
      const { data } = await Axios.delete(ServerLocation(`/auth/productTypes/${productType.id}`));
      if (!data.Status) throw new Error(data.Error || "Delete product type failed.");
      setProductTypes((current) => current.filter((item) => item.id !== productType.id));
    } catch (failure) {
      await showAlert(failure.response?.data?.Error || failure.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Product Types</h4>
      </div>
      <Link
        to="/adminDashboard/addProductType"
        className="btn btn-primary rounded-1"
      >
        <ActionLabel action="add">Add Product Type</ActionLabel>
      </Link>
      <div className="mt-3">
        {error && <p role="alert" className="text-warning">{error}</p>}
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
                    to={"/adminDashboard/editProductType/" + x.id}
                    className="btn btn-success btn-sm me-2"
                  >
                    <ActionLabel action="edit">Edit</ActionLabel>
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={deleting !== null}
                    onClick={() => handleDelete(x)}
                  >
                    <ActionLabel action="delete">Delete</ActionLabel>
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
