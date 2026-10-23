import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import htmlReactParser from "html-react-parser";
import Axios from "axios";
import viewEventStyle from "../../../css/ViewEvent.module.css";
import { DateInWords, TimeInWords } from "../../Utilities/Formats";
import { ServerLocation } from "../../Utilities/Locations";
import { eventFromRow } from "../../Utilities/EventValidation";
import "../../../css/EditorFonts.css";

const ViewEvent = () => {
  const { event_url } = useParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [eventDetails, setEventDetails] = useState({
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
    Axios.get(ServerLocation("/user/events/" + encodeURIComponent(event_url)))
      .then((response) => {
        if (!response.data.Status || !response.data.Result?.length) {
          throw new Error(response.data.Error || "Event not found.");
        }
        const details = eventFromRow(response.data.Result[0]);
        if (active) setEventDetails({
          ...details,
          startDate: response.data.Result[0].start_date,
          endDate: response.data.Result[0].end_date,
          upperHubEventImages: details.upperHubEventImages.split(",").filter(Boolean),
          lowerHubEventImages: details.lowerHubEventImages.split(",").filter(Boolean),
        });
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.Error || error.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [event_url]);

  if (loading) return <p>Loading event...</p>;
  if (loadError) return <p role="alert">{loadError}</p>;

  return (
    <div>
      <section className={`${viewEventStyle.eventBanner} container-fluid`}>
        <div
          className={`${viewEventStyle.eventBannerContainer} shadow-lg bg-body rounded-5`}
          style={{
            backgroundImage:
              "url(" +
              ServerLocation("/Uploads/" + eventDetails.bannerBackground),
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className={`${viewEventStyle.eventBannerContent} rounded-5`}>
            <h1 className={`${viewEventStyle.eventTitle} text-xxl`}>
              {eventDetails.eventTitle}
            </h1>
            <h4 className={viewEventStyle.eventDate}>
              Start: {DateInWords(eventDetails.startDate)},{" "}
              {TimeInWords(eventDetails.startTime)}
              <hr />
              End: {DateInWords(eventDetails.endDate)},{" "}
              {TimeInWords(eventDetails.endTime)}
            </h4>
            <h4 className={viewEventStyle.eventVenue}>
              <span>Venue: {eventDetails.venueAddress} | </span>
              <span>
                <a href={eventDetails.mapLink}>
                  <img src="/Images/pin-location.svg" width="15px" />
                </a>
              </span>
            </h4>
          </div>
        </div>
      </section>

      <div className={`${viewEventStyle.eventUpperSection} container-fluid`}>
        <div
          className={`${viewEventStyle.eventUpperContainer} border border-5 shadow-lg rounded-5`}
          style={{
            backgroundImage:
              "url(" +
              ServerLocation("/Uploads/" + eventDetails.upperHubBackground),
            backgroundRepeat: "no-repeat",
          }}
        >
          <div
            className={`${viewEventStyle.eventUpperContent} rounded-5 fs-6 fw-semibold`}
          >
            <p>{htmlReactParser(eventDetails.upperHubContent)}</p>
          </div>
          <div className="container-fluid">
            <div className="row g-0">
              {eventDetails.upperHubEventImages.map((image, index) => (
                <div key={index}>
                  <div className="col-md-auto">
                    {" "}
                    <div
                      className="card shadow-lg bg-transparent"
                      style={{ width: "fit-content", maxWidth: "100%", margin: "auto" }}
                    >
                      <img
                        className="img-fluid"
                        style={{ opacity: 0.9 }}
                        src={`${ServerLocation("/Uploads/" + image)}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${viewEventStyle.eventLowerSection} container-fluid`}>
        <div
          className={`${viewEventStyle.eventLowerContainer} border border-5 shadow-lg rounded-5`}
          style={{
            backgroundImage:
              "url(" +
              ServerLocation("/Uploads/" + eventDetails.lowerHubBackground),
          }}
        >
          <div
            className={`${viewEventStyle.eventLowerContent} rounded-5 fs-6 fw-semibold`}
          >
            <p>{htmlReactParser(eventDetails.lowerHubContent)}</p>
          </div>
          <div className="container-fluid">
            {eventDetails.lowerHubEventImages.map((image, index) => (
              <div key={index} className="text-center">
                <img
                  className="img-fluid"
                  style={{ opacity: 0.9 }}
                  src={`${ServerLocation("/Uploads/" + image)}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <section></section>
    </div>
  );
};

export default ViewEvent;
