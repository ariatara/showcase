import Axios from "axios";
import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useNavigate, useParams } from "react-router-dom";
import eventStyle from "../../../css/CreateEvent.module.css";
import { ServerLocation } from "../../Utilities/Locations";
import { OriginalFilesInList } from "../../Utilities/Formats";
import EditMemberProducts from "./EditMemberProducts";
import { eventFromRow } from "../../Utilities/EventValidation";
import { saveEvent } from "../../Utilities/SaveEvent";
import { UploadFileByFieldName } from "../../Utilities/Uploads";

const MAX_FILE_COUNT = 5;

export const EditEvent = () => {
  const NavigateTo = useNavigate();

  const { event_url } = useParams();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(0);
  const [pendingUploads, setPendingUploads] = useState({});

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
    upperHubEventImages: "",
    lowerHubBackground: "",
    lowerHubContent: "",
    lowerHubEventImages: "",
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
    Axios.get(ServerLocation("/auth/events/url/" + encodeURIComponent(event_url)))
      .then((response) => {
        if (!response.data.Status || !response.data.Result?.length) {
          throw new Error(response.data.Error || "Event not found.");
        }
        if (active) setEventDetails(eventFromRow(response.data.Result[0]));
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.Error || error.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [event_url]);

  const getEventURL = () => eventDetails.pageTitle.trim().replace(/ /g, "_").toLocaleLowerCase();

  const handleMultipleUploads = async (event, fieldName, fieldState) => {
    event.preventDefault();

    if (!fieldState?.length) {
      alert("Select at least one file before uploading.");
      return;
    }
    const targetFileNames = [...new Set(fieldState)];
    if (targetFileNames.length > MAX_FILE_COUNT) {
      alert("Maximum of five files can be uploaded.");
      return;
    }
    setUploading((count) => count + 1);
    try {
      const uploadedFileNameCollection = [];
      for (const file of targetFileNames) {
        uploadedFileNameCollection.push(await UploadFileByFieldName(fieldName, file));
      }
      setEventDetails((current) => ({ ...current, [fieldName]: uploadedFileNameCollection.join(",") }));
      setPendingUploads((current) => ({ ...current, [fieldName]: null }));
    } catch (error) {
      alert(error.response?.data?.Error || error.message);
    } finally {
      setUploading((count) => count - 1);
    }
  };

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

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
        <div className={eventStyle.eventDate}>
          <h6>Event Start:</h6>
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
        </div>
        <div className={eventStyle.eventDate}>
          <h6>Event End:</h6>
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
        </div>
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
        <div className={eventStyle.imageUploadContainer}>
          <h6>Banner Background Image:</h6>
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
          <div className={eventStyle.imageNames}>
            Current Image: {OriginalFilesInList(eventDetails.bannerBackground)}
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
          <h6>Upper Hub Background Image:</h6>
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
          <div className={eventStyle.imageNames}>
            Current Image:{" "}
            {OriginalFilesInList(eventDetails.upperHubBackground)}
          </div>
        </div>
        <div className={eventStyle.imageUploadContainer}>
          <h6>Upper Hub Event Images:</h6>
          <div className="input-group mb-2">
            <input
              className="form-control"
              type="file"
              multiple
              id="upperHubEventImages"
              name="upperHubEventImages"
              onChange={(event) => {
                const selectedFiles = Array.prototype.slice.call(
                  event.target.files
                );
                setPendingUploads({
                  ...pendingUploads,
                  upperHubEventImages: selectedFiles,
                });
              }}
            ></input>
            <button
              className="btn btn-outline-secondary"
              type="button"
              id="upperHubEventImages"
              onClick={(event) =>
                handleMultipleUploads(
                  event,
                  "upperHubEventImages",
                  pendingUploads.upperHubEventImages
                )
              }
            >
              Upload
            </button>
          </div>
          <div className={eventStyle.imageNames}>
            Current Image(s):{" "}
            {OriginalFilesInList(eventDetails.upperHubEventImages)}
          </div>
        </div>
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
          <h6>Lower Hub Background Image:</h6>
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
          <div className={eventStyle.imageNames}>
            Current Image:{" "}
            {OriginalFilesInList(eventDetails.lowerHubBackground)}
          </div>
        </div>
        <div className={eventStyle.imageUploadContainer}>
          <h6>Lower Hub Event Images:</h6>
          <div className="input-group mb-2">
            <input
              className="form-control"
              type="file"
              multiple
              id="lowerHubEventImages"
              name="lowerHubEventImages"
              onChange={(event) => {
                const selectedFiles = Array.prototype.slice.call(
                  event.target.files
                );
                setPendingUploads({
                  ...pendingUploads,
                  lowerHubEventImages: selectedFiles,
                });
              }}
            ></input>
            <button
              className="btn btn-outline-secondary"
              type="button"
              id="lowerHubEventImages"
              onClick={(event) =>
                handleMultipleUploads(
                  event,
                  "lowerHubEventImages",
                  pendingUploads.lowerHubEventImages
                )
              }
            >
              Upload
            </button>
          </div>
          <div className={eventStyle.imageNames}>
            Current Image(s):{" "}
            {OriginalFilesInList(eventDetails.lowerHubEventImages)}
          </div>
        </div>
        <section className={eventStyle.textInputContainer}>
          <EditMemberProducts
            eventURL={event_url}
            setProductDetails={setProductDetails}
          ></EditMemberProducts>
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
              className="form-control"
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
            onClick={handleUpdate}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </fieldset>
  );
};
