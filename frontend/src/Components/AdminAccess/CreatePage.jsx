import Axios from "axios";
import { useEffect, useState, useCallback } from "react";
import "react-quill/dist/quill.snow.css";
import { useNavigate } from "react-router-dom";
import Moment from "moment";
import pageStyle from "../../../css/CreatePage.module.css";
import QuillEditor from "../QuillEditor/Editor";

export const CreatePage = () => {
  const NavigateTo = useNavigate();

  const [pageDetails, setPageDetails] = useState({
    pageTitle: "",
    pageBackground: "",
    pageContent: "",
    pageURL: "",
    isPublished: false,
    createdBy: "",
    createdDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
    modifiedBy: "",
    modifiedDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
  });

  const getPageURL = useCallback(() => {
    return pageDetails.pageTitle.replace(/ /g, "_").toLowerCase();
  }, [pageDetails.pageTitle]);

  useEffect(() => {
    pageDetails.pageURL = getPageURL();
  }, [getPageURL, pageDetails, pageDetails.pageTitle]);

  const uploadFileByFieldName = async (fieldName, eventFileName) => {
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

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

    const uploadedFileName = await uploadFileByFieldName(fieldName, fieldState);

    console.log("Uploaded file:" + uploadedFileName);

    setPageDetails({
      ...pageDetails,
      [fieldName]: uploadedFileName,
    });
  };

  const updateEditorContent = (value) => {
    setPageDetails({
      ...pageDetails,
      pageContent: value,
    });
  };

  const handleSave = (event) => {
    event.preventDefault();

    console.log(pageDetails);

    {
      Axios.post("http://localhost:3000/auth/pages", pageDetails)
        .then((result) => {
          if (result.data.Status) {
            NavigateTo("/adminDashboard/pages");
          } else {
            alert(result.data.Error);
          }
        })
        .catch((error) => console.log(error));
    }

    //window.location.reload();
  };

  return (
    <div className={pageStyle.createPage}>
      <div className={pageStyle.pageContent}>
        <h4>Create Page:</h4>
        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">
            Page Title
          </span>
          <input
            className="form-control"
            type="text"
            placeholder="Enter Page Title"
            aria-label="Page Title"
            aria-describedby="basic-addon1"
            onChange={(event) =>
              setPageDetails({
                ...pageDetails,
                pageTitle: event.target.value,
              })
            }
          ></input>
        </div>

        <div className={pageStyle.imageUploadContainer}>
          <h6>Page Background Image:</h6>
          <div className="input-group mb-3">
            <input
              className="form-control"
              type="file"
              id="pageBackground"
              name="pageBackground"
              onChange={(page) =>
                setPageDetails({
                  ...pageDetails,
                  pageBackground: page.target.files[0],
                })
              }
            ></input>
            <button
              className="btn btn-outline-secondary"
              type="button"
              id="pageBackground"
              onClick={(event) =>
                handleUpload(
                  event,
                  "pageBackground",
                  pageDetails.pageBackground
                )
              }
            >
              Upload
            </button>
          </div>
        </div>
        <div className={pageStyle.textInputContainer}>
          <h6>Page Content:</h6>
          <QuillEditor updateContent={updateEditorContent}></QuillEditor>
        </div>
      </div>
      <div className={pageStyle.pageMenu}>
        <div className={pageStyle.pageMenuItem}>
          <h4>URL</h4>
          <div className="input-group mb-3">
            <span className="input-group-text" id="basic-addon">
              ~/pages/
            </span>
            <input
              type="text"
              className="form-control"
              id="page-url"
              aria-describedby="basic-addon"
              value={getPageURL()}
              readOnly
            ></input>
          </div>
        </div>
        <div className={pageStyle.pageMenuItem}>
          <h4>Visibility</h4>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="visibilityOptions"
              id="unpublish"
              defaultChecked
              onChange={() => (pageDetails.isPublished = false)}
            ></input>
            <label className="form-check-label" htmlFor="unpublish">
              Unpublish
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="visibilityOptions"
              id="publish"
              onChange={() => (pageDetails.isPublished = true)}
            ></input>
            <label className="form-check-label" htmlFor="publish">
              Publish
            </label>
          </div>
          <button
            type="button"
            className="btn btn-success btn-block w-50"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
