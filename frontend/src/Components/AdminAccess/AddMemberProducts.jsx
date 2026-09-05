import { useEffect, useState } from "react";
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

const AddMemberProduct = ({ setProductDetails }) => {
  const [productTypes, setProductTypes] = useState([]);

  useEffect(() => {
    Axios.get(ServerLocation("/auth/productTypes"))
      .then((result) => {
        if (result.data.Status) {
          setProductTypes(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const [productTargets, setProductTargets] = useState([]);

  useEffect(() => {
    Axios.get(ServerLocation("/auth/membershipCategories"))
      .then((result) => {
        if (result.data.Status) {
          setProductTargets(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

    const uploadedFileName = await UploadFileByFieldName(fieldName, fieldState);

    console.log("Uploaded file:" + uploadedFileName);

    return uploadedFileName;
  };

  const productSchema = Yup.object().shape({
    products: Yup.array().of(
      Yup.object().shape({
        productName: Yup.string().required("Name is required"),
        productType: Yup.string().required("Type is required"),
        productImage: Yup.string(),
        productTarget: Yup.string().required("Target is required"),
        productPrice: Yup.number()
          .typeError("Price must be a number")
          .positive("Price must be a positive number")
          .required("Price is required"),
        productInventory: Yup.number()
          .typeError("Inventory must be a number")
          .positive("Inventory must be a positive number")
          .required("Inventory is required")
          .integer("Inventory must be an integer"),
        eventDate: Yup.date()
          .typeError("Event date must be valid")
          .required("Event date is required"),
      })
    ),
  });

  const products = [
    {
      productName: "",
      productType: "",
      productImage: "",
      productTarget: "",
      productPrice: "",
      productInventory: "",
      eventDate: "",
    },
  ];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    control,
    watch,
    getValues,
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      productSchema: products,
    },
  });

  const { fields, append, prepend, remove } = useFieldArray({
    name: "products",
    control,
    rules: { required: "Add at least one product" },
  });

  const onSubmit = (formValues) => {
    setProductDetails(formValues.products);
  };

  return (
    <form
      className="row gy-2 gx-2 justify-content-evenly"
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => {
        const formValues = getValues();
        setProductDetails(formValues.products);
      }}
    >
      <h6>Member Products:</h6>
      {fields.map((item, index) => {
        return (
          <div key={item.id} className="row gy-2 gx-2 justify-left">
            <div className="col-4">
              <div className={eventStyle.imageNames}>Product Name:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor="autoSizingInput"
              >
                Product Name
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="autoSizingInput"
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
                htmlFor="productType"
              >
                Product Type
              </label>
              <select
                type="text"
                className="form-control form-control-sm form-select"
                id="productType"
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
                Product Image:{" "}
                {OriginalFilesInList(
                  getValues(`products.${index}.productImage`)
                )}
              </div>
              <div className="input-group mb-3 ">
                <label
                  className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                  htmlFor="productImage"
                >
                  Product Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control form-control-sm"
                  id="productImage"
                  placeholder="Product Image"
                  {...register(`products.${index}.productImage`)}
                ></input>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  id="productImage"
                  onClick={async (event) => {
                    const imageFile = getValues(
                      `products.${index}.productImage`
                    );
                    const uploadedImageFile = await handleUpload(
                      event,
                      "productImage",
                      imageFile[0]
                    );
                    setValue(
                      `products.${index}.productImage`,
                      `${uploadedImageFile}`
                    );
                  }}
                >
                  Upload
                </button>
                <p>{errors.products?.[index]?.productImage?.message}</p>
              </div>
            </div>
            <div className="col-3">
              <div className={eventStyle.imageNames}>Product Target:</div>
              <label
                className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                htmlFor="productTarget"
              >
                Product Target
              </label>
              <select
                type="text"
                className="form-control form-control-sm form-select"
                id="productTarget"
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
              <p>{errors.products?.[index]?.productPrice?.message}</p>
            </div>
            <div className="col-3">
              <div className={eventStyle.imageNames}>Product Price:</div>
              <div className="input-group mb-3">
                <label
                  className="visually-hidden col-sm-2 col-form-label col-form-label-sm"
                  htmlFor="productPrice"
                >
                  Product Price
                </label>
                <span className="input-group-text" id="basic-addon1">
                  US $
                </span>
                <input
                  type="decimal"
                  className="form-control form-control-sm"
                  id="productPrice"
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
                htmlFor="productInventory"
              >
                Product Inventory
              </label>
              <input
                type="integer"
                className="form-control form-control-sm"
                id="productInventory"
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
                htmlFor="eventDate"
              >
                Event Date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                id="eventDate"
                placeholder="Select Date"
                {...register(`products.${index}.eventDate`, { required: true })}
              ></input>
              <p>{errors.products?.[index]?.eventDate?.message}</p>
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => remove(index)}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>
        );
      })}
      <div className="col-auto">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => append({})}
        >
          <i className="bi bi-plus-lg"></i>
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

AddMemberProduct.propTypes = {
  setProductDetails: PropTypes.func.isRequired,
};

export default AddMemberProduct;
