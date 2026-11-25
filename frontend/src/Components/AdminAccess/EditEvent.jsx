import Axios from "axios";
import EventTemplateSelector from "./EventTemplateSelector";
import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useNavigate, useParams } from "react-router-dom";
import eventStyle from "../../../css/CreateEvent.module.css";
import imageEditorStyle from "../../../css/EventImageEditor.module.css";
import loginStyle from "../../../css/Login.module.css";
import { ServerLocation } from "../../Utilities/Locations";
import EditMemberProducts from "./EditMemberProducts";
import UploadedFileNames from "./UploadedFileNames";
import { eventFromRow } from "../../Utilities/EventValidation";
import { saveEvent } from "../../Utilities/SaveEvent";
import { UploadFileByFieldName } from "../../Utilities/Uploads";
import { EditorFontOptions, matchEditorFont } from "../QuillEditor/EditorFonts";
import { eventImageUrl, parseEventImagePaths } from "../../Utilities/EventImages";
import EventImageEditor from "./EventImageEditor";
import EventImagePreview from "./EventImagePreview";

const eventEditorModules = {
  clipboard: {
    matchers: [['[class*="ql-font-"]', matchEditorFont]],
  },
  toolbar: [
    [{ header: ["1", "2", "3", false] }],
    [{ font: [false, ...EditorFontOptions.map(({ value }) => value)] }],
    ["bold", "italic", "underline", "link"],
    [{ color: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

export const EditEvent = () => {
  const NavigateTo = useNavigate();

  const { event_url } = useParams();
  const [saving, setSaving] = useState(false);
  const [productReceipt, setProductReceipt] = useState();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(0);
  const [pendingUploads, setPendingUploads] = useState({});
  const uploadWarningRef = useRef(null);

  const [eventDetails, setEventDetails] = useState({
    eventId: "",
    pageTitle: "",
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
    createdDateTime: "",
    modifiedBy: "",
    modifiedDateTime: "",
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setPendingUploads({});
    Axios.get(ServerLocation("/auth/events/url/" + encodeURIComponent(event_url)))
      .then((response) => {
        if (!response.data.Status || !response.data.Result?.length) {
          throw new Error(response.data.Error || "Event not found.");
        }
        const details = eventFromRow(response.data.Result[0]);
        if (active) setEventDetails({
          ...details,
          upperHubEventImages: parseEventImagePaths(details.upperHubEventImages),
          lowerHubEventImages: parseEventImagePaths(details.lowerHubEventImages),
        });
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.Error || error.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [event_url]);

  const getEventURL = () => eventDetails.pageTitle.trim().replace(/ /g, "_").toLocaleLowerCase();

  const showUploadWarning = () => uploadWarningRef.current.showModal();

  const handleGalleryBusy = (busy) => setUploading((count) => count + (busy ? 1 : -1));

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

    if (!(fieldState instanceof File)) {
      showUploadWarning();
      return;
    }

    setUploading((count) => count + 1);
    try {
      const uploadedFileName = await UploadFileByFieldName(fieldName, fieldState);
      setEventDetails((current) => ({ ...current, [fieldName]: uploadedFileName }));
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

  const [productDetails, setProductDetails] = useState(null);

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    try {
      const result = await saveEvent({ details: eventDetails, products: productDetails, id: eventDetails.eventId });
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

  if (loading) return <p>Loading event...</p>;
  if (loadError) return <p role="alert">{loadError}</p>;

  return (
    <fieldset className={eventStyle.createEvent} disabled={saving || uploading > 0}>
      <div className={eventStyle.eventContent}>
        <h4>Edit Event:</h4>
        <EventTemplateSelector value={eventDetails.viewTemplate} disabled={saving || uploading > 0}
          onChange={(viewTemplate) => setEventDetails((current) => ({ ...current, viewTemplate }))} />
        <div className="input-group mb-2">
          <span className="input-group-text" id="basic-addon1">
            Page Title
          </span>
          <input
            className="form-control"
            type="text"
            placeholder="Enter Page Title"
            aria-label="Page Title"
            aria-describedby="basic-addon1"
            value={eventDetails.pageTitle}
            onChange={(event) =>
              setEventDetails({
                ...eventDetails,
                pageTitle: event.target.value,
              })
            }
          ></input>
        </div>
        <div className="input-group mb-2">
          <span className="input-group-text" id="basic-addon1">
            Event Title
          </span>
          <input
            className="form-control"
            type="text"
            placeholder="Enter Event Title"
            aria-label="Event Title"
            aria-describedby="basic-addon1"
            value={eventDetails.eventTitle}
            onChange={(event) =>
              setEventDetails({
                ...eventDetails,
                eventTitle: event.target.value,
              })
            }
          ></input>
        </div>
        <fieldset className={eventStyle.eventDate}>
          <legend className={eventStyle.boxHeading}><span className="h6">Event Start:</span></legend>
          <div className="row">
            <div className="col">
              <input
                type="date"
                className="form-control"
                placeholder="Set Start Date"
                aria-label="Start Date"
                value={eventDetails.startDate}
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
                className="form-control"
                placeholder="Set Start Time"
                aria-label="Start Time"
                value={eventDetails.startTime}
                onChange={(event) =>
                  setEventDetails({
                    ...eventDetails,
                    startTime: event.target.value,
                  })
                }
              ></input>
            </div>
          </div>
        </fieldset>
        <fieldset className={eventStyle.eventDate}>
          <legend className={eventStyle.boxHeading}><span className="h6">Event End:</span></legend>
          <div className="row">
            <div className="col">
              <input
                type="date"
                className="form-control"
                placeholder="Set End Date"
                aria-label="End Date"
                value={eventDetails.endDate}
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
                className="form-control"
                placeholder="Set End Time"
                aria-label="End Time"
                value={eventDetails.endTime}
                onChange={(event) =>
                  setEventDetails({
                    ...eventDetails,
                    endTime: event.target.value,
                  })
                }
              ></input>
            </div>
          </div>
        </fieldset>
        <div className="input-group mb-2">
          <span className="input-group-text" id="basic-addon1">
            Venue
          </span>
          <input
            className="form-control"
            type="text"
            placeholder="Enter Venue Address"
            aria-label="Venue Address"
            aria-describedby="basic-addon1"
            value={eventDetails.venueAddress}
            onChange={(event) =>
              setEventDetails({
                ...eventDetails,
                venueAddress: event.target.value,
              })
            }
          ></input>
        </div>
        <div className="input-group mb-2">
          <span className="input-group-text" id="basic-addon1">
            Map
          </span>
          <input
            className="form-control"
            type="text"
            placeholder="Enter Map Link"
            aria-label="Map Link"
            aria-describedby="basic-addon1"
            value={eventDetails.mapLink}
            onChange={(event) =>
              setEventDetails({ ...eventDetails, mapLink: event.target.value })
            }
          ></input>
        </div>
        <fieldset className={eventStyle.imageUploadContainer}>
          <legend className={eventStyle.boxHeading}><span className="h6">Banner Background Image:</span></legend>
          <UploadedFileNames fileNames={eventDetails.bannerBackground} />
          <div className="input-group mb-2">
            <input
              className="form-control"
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
        </fieldset>
        <fieldset className={eventStyle.textInputContainer}>
          <legend className={eventStyle.boxHeading}><span className="h6">Upper Hub Content:</span></legend>
          <div className={eventStyle.editorContainer}>
            <ReactQuill
              className={eventStyle.contentEditor}
              theme="snow"
              modules={eventEditorModules}
              readOnly={saving || uploading > 0}
              value={eventDetails.upperHubContent}
              onChange={setUpperHubContent}
            />
          </div>
        </fieldset>
        <fieldset className={`${eventStyle.imageUploadContainer} ${imageEditorStyle.compact}`}>
          <legend className={eventStyle.boxHeading}><span className="h6">Upper Hub Background Image:</span></legend>
          <div className="input-group mb-2">
            <input
              className="form-control"
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
          {eventDetails.upperHubBackground && <ul className={imageEditorStyle.grid} aria-label="Uploaded background image">
            <li className={imageEditorStyle.card}>
              <EventImagePreview key={eventDetails.upperHubBackground}
                src={eventImageUrl(eventDetails.upperHubBackground)} name={eventDetails.upperHubBackground} />
              <span className={imageEditorStyle.status}>Uploaded</span>
            </li>
          </ul>}
        </fieldset>
        <EventImageEditor key={`${event_url}-upper`} fieldName="upperHubEventImages"
          className={`${imageEditorStyle.compact} rounded-0 my-0`}
          label={<span className="h6">Upper Hub Event Images:</span>}
          imagePaths={eventDetails.upperHubEventImages} disabled={saving || uploading > 0}
          onChange={(paths) => setEventDetails((current) => ({ ...current, upperHubEventImages: paths }))}
          onBusyChange={handleGalleryBusy}
          onPendingChange={(pending) => setPendingUploads((current) => ({ ...current, upperHubEventImages: pending }))} />
        <fieldset className={eventStyle.textInputContainer}>
          <legend className={eventStyle.boxHeading}><span className="h6">Lower Hub Content:</span></legend>
          <div className={eventStyle.editorContainer}>
            <ReactQuill
              className={eventStyle.contentEditor}
              theme="snow"
              modules={eventEditorModules}
              readOnly={saving || uploading > 0}
              value={eventDetails.lowerHubContent}
              onChange={setLowerHubContent}
            />
          </div>
        </fieldset>
        <fieldset className={`${eventStyle.imageUploadContainer} ${imageEditorStyle.compact}`}>
          <legend className={eventStyle.boxHeading}><span className="h6">Lower Hub Background Image:</span></legend>
          <div className="input-group mb-2">
            <input
              className="form-control"
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
          {eventDetails.lowerHubBackground && <ul className={imageEditorStyle.grid} aria-label="Uploaded background image">
            <li className={imageEditorStyle.card}>
              <EventImagePreview key={eventDetails.lowerHubBackground}
                src={eventImageUrl(eventDetails.lowerHubBackground)} name={eventDetails.lowerHubBackground} />
              <span className={imageEditorStyle.status}>Uploaded</span>
            </li>
          </ul>}
        </fieldset>
        <EventImageEditor key={`${event_url}-lower`} fieldName="lowerHubEventImages"
          className={`${imageEditorStyle.compact} rounded-0 my-0`}
          label={<span className="h6">Lower Hub Event Images:</span>}
          imagePaths={eventDetails.lowerHubEventImages} disabled={saving || uploading > 0}
          onChange={(paths) => setEventDetails((current) => ({ ...current, lowerHubEventImages: paths }))}
          onBusyChange={handleGalleryBusy}
          onPendingChange={(pending) => setPendingUploads((current) => ({ ...current, lowerHubEventImages: pending }))} />
        <fieldset className={eventStyle.textInputContainer}>
          <legend className={eventStyle.boxHeading}><span className="h6">Member Products:</span></legend>
          <EditMemberProducts
            productReceipt={productReceipt}
            eventURL={event_url}
            setProductDetails={setProductDetails}
            onMissingUpload={showUploadWarning}
          ></EditMemberProducts>
        </fieldset>
      </div>
      <div className={eventStyle.eventMenu}>
        <fieldset className={eventStyle.eventMenuItem}>
          <legend className={eventStyle.boxHeading}><span className="h6">URL:</span></legend>
          <div className="input-group mb-3">
            <span className="input-group-text" id="basic-addon">
              ~/events/
            </span>
            <input
              type="text"
              className="form-control"
              id="page-url"
              aria-describedby="basic-addon"
              value={getEventURL()}
              readOnly
            ></input>
          </div>
        </fieldset>
        <fieldset className={eventStyle.eventMenuItem}>
          <legend className={eventStyle.boxHeading}><span className="h6">Visibility:</span></legend>
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
            onClick={handleUpdate}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </fieldset>
      </div>
      <dialog
        ref={uploadWarningRef}
        className={`${loginStyle.loginNotification} p-4 rounded-5 border text-center`}
        role="alertdialog"
        aria-labelledby="upload-warning-title"
        aria-describedby="upload-warning-message"
      >
        <h2 id="upload-warning-title" className="h5 text-orangered">
          Upload
        </h2>
        <p id="upload-warning-message">Select a file before uploading.</p>
        <form method="dialog" className="mt-4">
          <button type="submit" className={loginStyle.loginButton} autoFocus>
            OK
          </button>
        </form>
      </dialog>
    </fieldset>
  );
};
