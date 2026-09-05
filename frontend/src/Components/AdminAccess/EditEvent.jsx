import Axios from "axios";
import { useEffect, useState, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useNavigate, useParams } from "react-router-dom";
import Moment from "moment";
import eventStyle from "../../../css/CreateEvent.module.css";
import { ServerLocation } from "../../Utilities/Locations";
import { OriginalFilesInList } from "../../Utilities/Formats";
import EditMemberProducts from "./EditMemberProducts";

const MAX_FILE_COUNT = 5;

export const EditEvent = () => {
  const NavigateTo = useNavigate();

  const { event_url } = useParams();

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
    Axios.get(ServerLocation("/user/events/" + event_url))
      .then((response) => {
        if (response.data.Status) {
          setEventDetails({
            eventId: response.data.Result[0].id,
            pageTitle: response.data.Result[0].page_title,
            eventURL: response.data.Result[0].url,
            eventTitle: response.data.Result[0].event_title,
            startDate: response.data.Result[0].start_date.substring(0, 10),
            startTime: response.data.Result[0].start_time,
            endDate: response.data.Result[0].end_date.substring(0, 10),
            endTime: response.data.Result[0].end_time,
            venueAddress: response.data.Result[0].venue_address,
            mapLink: response.data.Result[0].map_link,
            bannerBackground:
              response.data.Result[0].banner_background_image_name,
            upperHubContent: response.data.Result[0].upper_hub_content,
            upperHubBackground:
              response.data.Result[0].upper_hub_background_image_name,
            upperHubEventImages:
              response.data.Result[0].upper_hub_event_image_names.split(","),
            lowerHubContent: response.data.Result[0].lower_hub_content,
            lowerHubBackground:
              response.data.Result[0].lower_hub_background_image_name,
            lowerHubEventImages:
              response.data.Result[0].lower_hub_event_image_names.split(","),
            isPublished: response.data.Result[0].published,
            createdBy: response.data.Result[0].created_by,
            createdDateTime: response.data.Result[0].created_date,
            modifiedBy: response.data.Result[0].modified_by,
            modifiedDateTime: response.data.Result[0].modified_date,
          });
        } else {
          alert(response.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const getEventURL = useCallback(() => {
    return eventDetails.pageTitle.replace(/ /g, "_").toLocaleLowerCase();
  }, [eventDetails.pageTitle]);

  useEffect(() => {
    eventDetails.eventURL = getEventURL();
  }, [eventDetails, eventDetails.pageTitle, getEventURL]);

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

  const handleMultipleUploads = async (event, fieldName, fieldState) => {
    event.preventDefault();

    const targetFileNames = [...new Set(fieldState)];

    if (targetFileNames.length > MAX_FILE_COUNT) {
      alert("Maximum of five files can be uploaded.");
    }

    const uploadedFileNameCollection = [];

    for (let fileIndex in targetFileNames) {
      const uploadedFileName = await uploadFileByFieldName(
        fieldName,
        targetFileNames[fileIndex]
      );
      uploadedFileNameCollection.push(uploadedFileName);
    }

    uploadedFileNameCollection.forEach((x) => {
      console.log("Uploaded file:" + x);
    });

    setEventDetails({
      ...eventDetails,
      [fieldName]: uploadedFileNameCollection.join(","),
    });
  };

  const handleUpload = async (event, fieldName, fieldState) => {
    event.preventDefault();

    const uploadedFileName = await uploadFileByFieldName(fieldName, fieldState);

    console.log("Uploaded file:" + uploadedFileName);

    setEventDetails({
      ...eventDetails,
      [fieldName]: uploadedFileName,
    });
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

  const [productDetails, setProductDetails] = useState([]);

  const handleUpdate = (event) => {
    event.preventDefault();

    const id = eventDetails.eventId;

    delete eventDetails.eventId;

    eventDetails.upperHubEventImages =
      eventDetails.upperHubEventImages.join(",");
    eventDetails.lowerHubEventImages =
      eventDetails.lowerHubEventImages.join(",");

    eventDetails.modifiedDateTime = Moment().format("YYYY-MM-DD HH:mm:ss");

    Axios.put(ServerLocation("/auth/events/" + id), eventDetails)
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/events");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));

    productDetails.forEach((product) => {
      product.eventURL = eventDetails.eventURL;
    });

    console.log("Edit event productDetails:", productDetails);

    Axios.put(
      ServerLocation("/auth/memberProducts/" + eventDetails.eventURL),
      productDetails
    )
      .then((result) => {
        if (result.data.Status) {
          console.log("Product details updated successfully");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));

    //window.location.reload();
  };

  return (
    <div className={eventStyle.createEvent}>
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
                setEventDetails({
                  ...eventDetails,
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
                  eventDetails.bannerBackground
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
                setEventDetails({
                  ...eventDetails,
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
                  eventDetails.upperHubBackground
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
                setEventDetails({
                  ...eventDetails,
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
                  eventDetails.upperHubEventImages
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
                setEventDetails({
                  ...eventDetails,
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
                  eventDetails.lowerHubBackground
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
                setEventDetails({
                  ...eventDetails,
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
                  eventDetails.lowerHubEventImages
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
              defaultChecked
              onChange={() => (eventDetails.isPublished = false)}
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
              onChange={() => (eventDetails.isPublished = true)}
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
            Update
          </button>
        </div>
      </div>
    </div>
  );
};
