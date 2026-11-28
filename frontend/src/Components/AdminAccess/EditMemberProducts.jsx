import ActionLabel from "../ActionLabel";
import { useEffect, useId, useState } from "react";
import Axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import "../../../css/AddProduct.css";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { UploadFileByFieldName } from "../../Utilities/Uploads";
import PropTypes from "prop-types";
import { ServerLocation } from "../../Utilities/Locations";
import eventStyle from "../../../css/CreateEvent.module.css";
import { OriginalFilesInList } from "../../Utilities/Formats";
import { usePopup } from "../../Utilities/usePopup";

const EditMemberProduct = ({ eventURL, setProductDetails, onMissingUpload, productReceipt,
  audience = "member", onVersionLoaded, onBusyChange, productTypes, productTargets = [] }) => {
  const member = audience === "member";
  const endpoint = member ? "memberProducts" : "nonMemberProducts";
  const { showAlert } = usePopup(member ? "Edit Member Products" : "Edit Non-Member Products");
  const formId = useId();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

    if (!(fieldState instanceof File)) {
      onMissingUpload();
      return null;
    }

    onBusyChange?.(true);
    try {
      const uploadedFileName = await UploadFileByFieldName(
        fieldName,
        fieldState
      );

      console.log("Uploaded file:" + uploadedFileName);

      return uploadedFileName;
    } catch (error) {
      await showAlert(error.response?.data?.Error || error.message);
      return null;
    } finally {
      onBusyChange?.(false);
    }
  };

  const productSchema = Yup.object().shape({
    products: Yup.array().of(
      Yup.object().shape({
        productName: Yup.string().required("Name is required"),
        productType: Yup.string().required("Type is required"),
        productImage: Yup.string(),
        ...(member ? { productTarget: Yup.string().required("Target is required") } : {}),
        productPrice: Yup.number()
          .typeError("Price must be a number")
          .positive("Price must be a positive number")
          .required("Price is required"),
        productInventory: Yup.number()
          .typeError("Inventory must be a number")
          .min(0, "Inventory cannot be negative")
          .required("Inventory is required")
          .integer("Inventory must be an integer"),
        eventDate: Yup.date()
          .typeError("Event date must be valid")
          .required("Event date is required"),
      })
    ),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    control,
    watch,
    getValues,
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      products: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "products",
    control,
    rules: { required: "Add at least one product" },
  });

  const onSubmit = (formValues) => {
    setProductDetails(formValues.products);
  };

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setLoadError("");
    setProductDetails(null);
    Axios.get(ServerLocation(`auth/${endpoint}/` + encodeURIComponent(eventURL)))
      .then((response) => {
        if (!active) return;
        if (response.data.Status) {
          if (!member && (!Number.isSafeInteger(response.data.Version) || response.data.Version < 1)) {
            throw new Error("Product collection version is missing. Reload the event before saving.");
          }
          const mappedProducts = response.data.Result.map((item) => ({
            productId: item.id,
            version: item.version,
            productName: item.name || "",
            productType: item.type || "",
            productImage: item.image_name || "",
            ...(member ? { productTarget: item.target || "" } : {}),
            productPrice: item.price || 0,
            productInventory: item.inventory || 0,
            eventURL: item.event_url || eventURL,
            eventDate: item.event_date ? item.event_date.substring(0, 10) : "",
          }));
          setValue("products", mappedProducts);
          setProductDetails(mappedProducts);
          if (!member) onVersionLoaded?.(response.data.Version);
          setLoaded(true);
        } else {
          setLoadError(response.data.Error);
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.Error || error.message);
      });
    return () => { active = false; };
  }, [eventURL, setValue, setProductDetails, endpoint, member, onVersionLoaded]);

  useEffect(() => {
    if (!loaded) return;
    const subscription = watch((values) => setProductDetails(values.products ?? []));
    return () => subscription.unsubscribe();
  }, [loaded, watch, setProductDetails]);

  useEffect(() => {
    productReceipt?.products.forEach((product, index) => {
      setValue(`products.${index}.productId`, product.productId);
      setValue(`products.${index}.version`, product.version);
    });
  }, [productReceipt, setValue]);

  if (loadError) return <p role="alert">Products could not be loaded: {loadError}</p>;
  if (!loaded) return <p>Loading products...</p>;

  return (
    <form
      className="row gy-2 gx-2 justify-content-evenly"
      onSubmit={handleSubmit(onSubmit)}
    >
      {fields.map((item, index) => {
        const rowId = `${formId}-${item.id}`;
        return (
          <div key={item.id} className="member-product-row">
            <div className="row gy-2 gx-2 m-0">
            <div className="col-4">
              <div className={eventStyle.imageNames}>Product Name:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor={`${rowId}-name`}
              >
                Product Name
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id={`${rowId}-name`}
                placeholder="Enter Name"
                {...register(`products.${index}.productName`, {
                  required: true,
                })}
              ></input>
              <p>{errors.products?.[index]?.productName?.message}</p>
            </div>
            <div className="col-2">
              <div className={eventStyle.imageNames}>Product Type:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor={`${rowId}-type`}
              >
                Product Type
              </label>
              <select
                type="text"
                className="form-control form-control-sm form-select product-type-select"
                id={`${rowId}-type`}
                defaultValue=""
                placeholder="Select Type"
                {...register(`products.${index}.productType`, {
                  required: true,
                })}
              >
                <option value="" disabled>
                  Select Type
                </option>
                {productTypes.map((x) => {
                  return <option key={x.id}>{x.type}</option>;
                })}
              </select>
              <p>{errors.products?.[index]?.productType?.message}</p>
            </div>
            <div className="col-4">
              <div className={eventStyle.imageNames}>
                Product Image:
                {OriginalFilesInList(
                  getValues(`products.${index}.productImage`)
                )}
              </div>
              <div className="input-group mb-2">
                <label
                  className="visually-hidden col-sm-2 col-form-label-sm"
                  htmlFor={`${rowId}-image`}
                >
                  Product Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control form-control-sm"
                  id={`${rowId}-image`}
                  placeholder="Product Image"
                  {...register(`products.${index}.productImage`)}
                ></input>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={async (event) => {
                    const imageFile = getValues(
                      `products.${index}.productImage`
                    );
                    const uploadedImageFile = await handleUpload(
                      event,
                      "productImage",
                      imageFile?.[0]
                    );
                    if (uploadedImageFile) {
                      setValue(
                        `products.${index}.productImage`,
                        uploadedImageFile
                      );
                    }
                  }}
                >
                  <ActionLabel action="upload">Upload</ActionLabel>
                </button>
                <p>{errors.products?.[index]?.productImage?.message}</p>
              </div>
            </div>
            {member && <div className="col-3">
              <div className={eventStyle.imageNames}>Product Target:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor={`${rowId}-target`}
              >
                Product Target
              </label>
              <select
                type="text"
                className="form-control form-control-sm form-select product-target-select"
                id={`${rowId}-target`}
                defaultValue=""
                placeholder="Select Target"
                {...register(`products.${index}.productTarget`, {
                  required: true,
                })}
              >
                <option value="" disabled>
                  Select Target
                </option>
                {productTargets.map((x) => {
                  return <option key={x.id}>{x.category}</option>;
                })}
              </select>
              <p>{errors.products?.[index]?.productTarget?.message}</p>
            </div>}
            <div className="col-3">
              <div className={eventStyle.imageNames}>Product Price:</div>
              <div className="input-group mb-2">
                <label
                  className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                  htmlFor={`${rowId}-price`}
                >
                  Product Price
                </label>
                <span className="input-group-text" id="basic-addon1">
                  US $
                </span>
                <input
                  type="decimal"
                  className="form-control form-control-sm"
                  id={`${rowId}-price`}
                  placeholder="Enter Price"
                  {...register(`products.${index}.productPrice`, {
                    required: true,
                  })}
                ></input>
                <p>{errors.products?.[index]?.productPrice?.message}</p>
              </div>
            </div>
            <div className="col-2">
              <div className={eventStyle.imageNames}>Product Inventory:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor={`${rowId}-inventory`}
              >
                Product Inventory
              </label>
              <input
                type="integer"
                className="form-control form-control-sm"
                id={`${rowId}-inventory`}
                placeholder="Enter Inventory"
                {...register(`products.${index}.productInventory`, {
                  required: true,
                })}
              ></input>
              <p>{errors.products?.[index]?.productInventory?.message}</p>
            </div>
            <div className="col-2">
              <div className={eventStyle.imageNames}>Event Date:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor={`${rowId}-date`}
              >
                Event Date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                id={`${rowId}-date`}
                placeholder="Select Date"
                {...register(`products.${index}.eventDate`, { required: true })}
              ></input>
              <p>{errors.products?.[index]?.eventDate?.message}</p>
            </div>
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-danger"
                aria-label={`Delete ${member ? "member" : "non-member"} product ${index + 1}`}
                title="Delete product"
                onClick={() => remove(index)}
              >
                <i className="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        );
      })}
      <div className="col-auto">
        <button
          type="button"
          className="btn btn-primary"
          aria-label={`Add ${member ? "member" : "non-member"} product`}
          title={`Add ${member ? "member" : "non-member"} product`}
          onClick={() => append({ productName: "", productType: "", productImage: "", ...(member ? { productTarget: "" } : {}),
            productPrice: "", productInventory: "", eventDate: "" })}
        >
          <i className="bi bi-plus-lg" aria-hidden="true"></i>
        </button>
      </div>
      {/*
      <div className="col-auto">
        <button type="submit" className="btn btn-success">
          <i className="bi bi-save"></i>
        </button>
      </div>
      */}
    </form>
  );
};

EditMemberProduct.propTypes = {
  productTypes: PropTypes.array.isRequired,
  productTargets: PropTypes.array,
  audience: PropTypes.oneOf(["member", "non-member"]),
  onVersionLoaded: PropTypes.func,
  onBusyChange: PropTypes.func,
  productReceipt: PropTypes.shape({ products: PropTypes.array.isRequired }),
  eventURL: PropTypes.string.isRequired,
  setProductDetails: PropTypes.func.isRequired,
  onMissingUpload: PropTypes.func.isRequired,
};

export default EditMemberProduct;
