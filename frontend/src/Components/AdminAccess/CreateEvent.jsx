import { useState } from "react";
import EventTemplateSelector from "./EventTemplateSelector";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useNavigate } from "react-router-dom";
import Moment from "moment";
import eventStyle from "../../../css/CreateEvent.module.css";
import AddMemberProduct from "./AddMemberProducts";
import { UploadFileByFieldName } from "../../Utilities/Uploads";
import { saveEvent } from "../../Utilities/SaveEvent";
import UploadedFileNames from "./UploadedFileNames";
import EventImageEditor from "./EventImageEditor";

export const CreateEvent = () => {
  const NavigateTo = useNavigate();
  const [savedId, setSavedId] = useState();
  const [saving, setSaving] = useState(false);
  const [productReceipt, setProductReceipt] = useState();
  const [uploading, setUploading] = useState(0);
  const [pendingUploads, setPendingUploads] = useState({});

  const [eventDetails, setEventDetails] = useState({
    pageTitle: "",
    viewTemplate: "signature",
    eventTitle: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    venueAddress: "",
    mapLink: "",
    bannerBackground: "",
    upperHubBackground: "",
    upperHubContent: "",
    upperHubEventImages: [],
    lowerHubBackground: "",
    lowerHubContent: "",
    lowerHubEventImages: [],
    eventURL: "",
    isPublished: false,
    createdBy: "",
    createdDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
    modifiedBy: "",
    modifiedDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
  });

  const getEventURL = () => eventDetails.pageTitle.trim().replace(/ /g, "_").toLocaleLowerCase();

  const handleGalleryBusy = (busy) => setUploading((count) => count + (busy ? 1 : -1));

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

    setUploading((count) => count + 1);
    try {
      const uploadedFileName = await UploadFileByFieldName(
        fieldName,
        fieldState
      );

      console.log("Uploaded file:" + uploadedFileName);

      setEventDetails((current) => ({
        ...current,
        [fieldName]: uploadedFileName,
      }));
      setPendingUploads((current) => ({ ...current, [fieldName]: null }));
    } catch (error) {
      alert(error.response?.data?.Error || error.message);
    } finally {
      setUploading((count) => count - 1);
    }
  };

  const setUpperHubContent = (value) => {
    setEventDetails({
      ...eventDetails,
      upperHubContent: value,
    });
  };

  const setLowerHubContent = (value) => {
    setEventDetails({
      ...eventDetails,
      lowerHubContent: value,
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    try {
      const result = await saveEvent({ details: eventDetails, products: productDetails, id: savedId });
      setSavedId(result.id);
      if (result.productReceipt) {
        setProductReceipt(result.productReceipt);
        setEventDetails((current) => ({ ...current, productsVersion: result.productReceipt.version }));
      }
      const pending = Object.values(pendingUploads).some((value) => value && (!Array.isArray(value) || value.length));
      if (result.warning || pending) {
        alert([result.warning, pending ? "Event saved. Selected images are not saved until you upload them and save again." : ""].filter(Boolean).join("\n"));
      } else {
        NavigateTo("/adminDashboard/events");
      }
    } catch (error) {
      alert(error.response?.data?.Error || error.message);
    } finally {
      setSaving(false);
    }
  };

  const [productDetails, setProductDetails] = useState([]);

  return (
    <fieldset className={eventStyle.createEvent} disabled={saving || uploading > 0}>
      <div className={eventStyle.eventContent}>
        <h4>Create Event:</h4>
        <EventTemplateSelector value={eventDetails.viewTemplate} disabled={saving || uploading > 0}
          onChange={(viewTemplate) => setEventDetails((current) => ({ ...current, viewTemplate }))} />
        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">
            Page Title
          </span>
          <input
            className="form-control form-control-sm"
            type="text"
            placeholder="Enter Page Title"
            aria-label="Page Title"
            aria-describedby="basic-addon1"
            onChange={(event) =>
              setEventDetails({
                ...eventDetails,
                pageTitle: event.target.value,
              })
            }
          ></input>
        </div>
        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">
            Event Title
          </span>
          <input
            className="form-control form-control-sm"
            type="text"
            placeholder="Enter Event Title"
            aria-label="Event Title"
            aria-describedby="basic-addon1"
            onChange={(event) =>
              setEventDetails({
                ...eventDetails,
                eventTitle: event.target.value,
              })
            }
          ></input>
        </div>
        <div className={eventStyle.eventDate}>
          <h6>Event Start:</h6>
          <div className="row">
            <div className="col">
              <input
                type="date"
                className="form-control form-control-sm"
                placeholder="Set Start Date"
                aria-label="Start Date"
                onChange={(event) =>
                  setEventDetails({
                    ...eventDetails,
                    startDate: event.target.value,
                  })
                }
              ></input>
            </div>
            <div className="col">
              <input
                type="time"
                className="form-control form-control-sm"
                placeholder="Set Start Time"
                aria-label="Start Time"
                onChange={(event) =>
                  setEventDetails({
                    ...eventDetails,
                    startTime: event.target.value,
                  })
                }
              ></input>
            </div>
          </div>
        </div>
        <div className={eventStyle.eventDate}>
          <h6>Event End:</h6>
          <div className="row">
            <div className="col">
              <input
                type="date"
                className="form-control form-control-sm"
                placeholder="Set End Date"
                aria-label="End Date"
                onChange={(event) =>
                  setEventDetails({
                    ...eventDetails,
                    endDate: event.target.value,
                  })
                }
              ></input>
            </div>
            <div className="col">
              <input
                type="time"
                className="form-control form-control-sm"
                placeholder="Set End Time"
                aria-label="End Time"
                onChange={(event) =>
                  setEventDetails({
                    ...eventDetails,
                    endTime: event.target.value,
                  })
                }
              ></input>
            </div>
          </div>
        </div>
        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">
            Venue
          </span>
          <input
            className="form-control form-control-sm"
            type="text"
            placeholder="Enter Venue Address"
            aria-label="Venue Address"
            aria-describedby="basic-addon1"
            onChange={(event) =>
              setEventDetails({
                ...eventDetails,
                venueAddress: event.target.value,
              })
            }
          ></input>
        </div>
        <div className="input-group mb-3">
          <span className="input-group-text" id="basic-addon1">
            Map
          </span>
          <input
            className="form-control form-control-sm"
            type="text"
            placeholder="Enter Map Link"
            aria-label="Map Link"
            aria-describedby="basic-addon1"
            onChange={(event) =>
              setEventDetails({ ...eventDetails, mapLink: event.target.value })
            }
          ></input>
        </div>
        <div className={eventStyle.imageUploadContainer}>
          <h6>
            Banner Background Image:
            <UploadedFileNames fileNames={eventDetails.bannerBackground} />
          </h6>
          <div className="input-group mb-3">
            <input
              className="form-control form-control-sm"
              type="file"
              id="bannerBackground"
              name="bannerBackground"
              onChange={(event) =>
                setPendingUploads({
                  ...pendingUploads,
                  bannerBackground: event.target.files[0],
                })
              }
            ></input>
            <button
              className="btn btn-outline-secondary"
              type="button"
              id="bannerBackground"
              onClick={(event) =>
                handleUpload(
                  event,
                  "bannerBackground",
                  pendingUploads.bannerBackground
                )
              }
            >
              Upload
            </button>
          </div>
        </div>
        <div className={eventStyle.textInputContainer}>
          <h6>Upper Hub Content:</h6>
          <div className={eventStyle.editorContainer}>
            <ReactQuill
              className={eventStyle.contentEditor}
              theme="snow"
              readOnly={saving || uploading > 0}
              value={eventDetails.upperHubContent}
              onChange={setUpperHubContent}
            />
          </div>
        </div>
        <div className={eventStyle.imageUploadContainer}>
          <h6>
            Upper Hub Background Image:
            <UploadedFileNames fileNames={eventDetails.upperHubBackground} />
          </h6>
          <div className="input-group mb-3">
            <input
              className="form-control form-control-sm"
              type="file"
              id="upperHubBackground"
              name="upperHubBackground"
              onChange={(event) =>
                setPendingUploads({
                  ...pendingUploads,
                  upperHubBackground: event.target.files[0],
                })
              }
            ></input>
            <button
              className="btn btn-outline-secondary"
              type="button"
              id="upperHubBackground"
              onClick={(event) =>
                handleUpload(
                  event,
                  "upperHubBackground",
                  pendingUploads.upperHubBackground
                )
              }
            >
              Upload
            </button>
          </div>
        </div>
        <EventImageEditor fieldName="upperHubEventImages" label="Upper hub event images"
          imagePaths={eventDetails.upperHubEventImages} disabled={saving || uploading > 0}
          onChange={(paths) => setEventDetails((current) => ({ ...current, upperHubEventImages: paths }))}
          onBusyChange={handleGalleryBusy}
          onPendingChange={(pending) => setPendingUploads((current) => ({ ...current, upperHubEventImages: pending }))} />
        <div className={eventStyle.textInputContainer}>
          <h6>Lower Hub Content:</h6>
          <div className={eventStyle.editorContainer}>
            <ReactQuill
              className={eventStyle.contentEditor}
              theme="snow"
              readOnly={saving || uploading > 0}
              value={eventDetails.lowerHubContent}
              onChange={setLowerHubContent}
            />
          </div>
        </div>
        <div className={eventStyle.imageUploadContainer}>
          <h6>
            Lower Hub Background Image:
            <UploadedFileNames fileNames={eventDetails.lowerHubBackground} />
          </h6>
          <div className="input-group mb-3">
            <input
              className="form-control form-control-sm"
              type="file"
              id="lowerHubBackground"
              name="lowerHubBackground"
              onChange={(event) =>
                setPendingUploads({
                  ...pendingUploads,
                  lowerHubBackground: event.target.files[0],
                })
              }
            ></input>
            <button
              className="btn btn-outline-secondary"
              type="button"
              id="lowerHubBackground"
              onClick={(event) =>
                handleUpload(
                  event,
                  "lowerHubBackground",
                  pendingUploads.lowerHubBackground
                )
              }
            >
              Upload
            </button>
          </div>
        </div>
        <EventImageEditor fieldName="lowerHubEventImages" label="Lower hub event images"
          imagePaths={eventDetails.lowerHubEventImages} disabled={saving || uploading > 0}
          onChange={(paths) => setEventDetails((current) => ({ ...current, lowerHubEventImages: paths }))}
          onBusyChange={handleGalleryBusy}
          onPendingChange={(pending) => setPendingUploads((current) => ({ ...current, lowerHubEventImages: pending }))} />
        <section className={eventStyle.textInputContainer}>
          <AddMemberProduct
            productReceipt={productReceipt}
            setProductDetails={setProductDetails}
          ></AddMemberProduct>
        </section>
      </div>
      <div className={eventStyle.eventMenu}>
        <div className={eventStyle.eventMenuItem}>
          <h4>URL</h4>
          <div className="input-group mb-3">
            <span className="input-group-text" id="basic-addon">
              ~/events/
            </span>
            <input
              type="text"
              className="form-control form-control-sm"
              id="page-url"
              aria-describedby="basic-addon"
              value={getEventURL()}
              readOnly
            ></input>
          </div>
        </div>
        <div className={eventStyle.eventMenuItem}>
          <h4>Visibility</h4>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="visibilityOptions"
              id="unpublish"
              checked={!eventDetails.isPublished}
              onChange={() => setEventDetails({ ...eventDetails, isPublished: false })}
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
              checked={eventDetails.isPublished}
              onChange={() => setEventDetails({ ...eventDetails, isPublished: true })}
            ></input>
            <label className="form-check-label" htmlFor="publish">
              Publish
            </label>
          </div>
          {/*
          <input
            style={{ display: "none" }}
            type="file"
            id="eventFile"
            name=""
            onChange={(event) => setEventFile(event.target.files[0])}
          ></input>
          <label className="imageUpload" htmlFor="eventFile">
            Upload Image
          </label>
          */}
          <button
            type="button"
            className="btn btn-success btn-block w-50"
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </fieldset>
  );
};
