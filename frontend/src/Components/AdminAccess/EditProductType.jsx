import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";
import ActionLabel from "../ActionLabel";
import { ServerLocation } from "../../Utilities/Locations";
import { usePopup } from "../../Utilities/usePopup";

export default function EditProductType() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = usePopup("Edit Product Type");
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const requestRef = useRef(null);
  const loaded = record?.id === id;

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    setRecord(null);
    setError("");
    setSaving(false);
    Axios.get(ServerLocation(`/auth/productTypes/${encodeURIComponent(id)}`), { signal: controller.signal })
      .then(({ data }) => {
        if (!data.Status || !data.Result) throw new Error(data.Error || "Product type not found.");
        if (!controller.signal.aborted) setRecord({ id, type: data.Result.type });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.response?.data?.Error || failure.message);
      });
    return () => controller.abort();
  }, [id]);

  const save = async (event) => {
    event.preventDefault();
    if (!loaded || saving) return;
    const productType = record.type.trim();
    if (!productType) {
      await showAlert("Enter a product type between 1 and 256 characters.");
      return;
    }
    const controller = requestRef.current;
    setSaving(true);
    try {
      const { data } = await Axios.put(ServerLocation(`/auth/productTypes/${encodeURIComponent(id)}`),
        { productType }, { signal: controller.signal });
      if (!data.Status) throw new Error(data.Error || "Update product type failed.");
      if (!controller.signal.aborted) navigate("/adminDashboard/productTypes");
    } catch (failure) {
      if (!controller.signal.aborted) await showAlert(failure.response?.data?.Error || failure.message);
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  return <div className="d-flex justify-content-center align-items-center h-100">
    <div className="p-4 m-3 rounded border w-100" style={{ maxWidth: "36rem" }}>
      <h3>Edit Product Type</h3>
      {error && <p role="alert" className="text-warning">{error}</p>}
      {!loaded && !error && <p role="status">Loading product type...</p>}
      <form onSubmit={save}>
        <div className="my-3">
          <label htmlFor="product-type" className="form-label">Product Type</label>
          <input id="product-type" className="form-control" value={loaded ? record.type : ""}
            onChange={(event) => setRecord({ id, type: event.target.value })}
            required maxLength={256} disabled={!loaded || saving} />
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={!loaded || saving}>
            <ActionLabel action="save">{saving ? "Saving..." : "Save"}</ActionLabel>
          </button>
          <button type="button" className="btn btn-secondary" disabled={saving}
            onClick={() => navigate("/adminDashboard/productTypes")}><ActionLabel action="cancel">Cancel</ActionLabel></button>
        </div>
      </form>
    </div>
  </div>;
}
