import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import htmlReactParser from "html-react-parser";
import Axios from "axios";
import viewEventStyle from "../../../css/ViewEvent.module.css";
import { DateInWords, TimeInWords } from "../../Utilities/Formats";
import { ServerLocation } from "../../Utilities/Locations";

const ViewEvent = () => {
  const NavigateTo = useNavigate();

  const { event_url } = useParams();

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
    Axios.get(ServerLocation("/user/events/" + event_url))
      .then((response) => {
        if (response.data.Status) {
          setEventDetails({
            pageTitle: response.data.Result[0].page_title,
            eventURL: response.data.Result[0].url,
            eventTitle: response.data.Result[0].event_title,
            startDate: response.data.Result[0].start_date,
            startTime: response.data.Result[0].start_time,
            endDate: response.data.Result[0].end_date,
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

  return (
    <div>
      <section className={viewEventStyle.eventBanner}>
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

      <div className={viewEventStyle.eventUpperSection}>
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
        </div>
      </div>

      <div className="container-fluid">
        <div className="row g-0">
          {eventDetails.upperHubEventImages.map((image, index) => (
            <div key={index}>
              <div className="col-md-auto">
                {" "}
                <div
                  className="card shadow-lg"
                  style={{ width: "32%", margin: "auto" }}
                >
                  <img src={`${ServerLocation("/Uploads/" + image)}`} />
                </div>
              </div>
            </div>
          ))}
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
            className={`${viewEventStyle.eventLowerContent} mt-5 rounded-5 fs-6 fw-semibold`}
          >
            <p>{htmlReactParser(eventDetails.lowerHubContent)}</p>
          </div>
          <div>
            {eventDetails.lowerHubEventImages.map((image, index) => (
              <div key={index}>
                {index % 2 === 0 ? (
                  <div className="row g-0 my-5">
                    <div className="col-lg-6">
                      <img
                        className="image-fluid"
                        src={`${ServerLocation("/Uploads/" + image)}`}
                        width={`400px`}
                        height={`auto`}
                      />
                    </div>
                    <div className="col-lg-6" style={{ visibility: "hidden" }}>
                      {" "}
                      <img
                        className="image-fluid"
                        src={`${ServerLocation("/Uploads/" + image)}`}
                        width={`400px`}
                        height={`auto`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="row g-0 my-5">
                    <div className="col-lg-6" style={{ visibility: "hidden" }}>
                      <img
                        className="image-fluid"
                        src={`${ServerLocation("/Uploads/" + image)}`}
                        width={`400px`}
                        height={`auto`}
                      />
                    </div>
                    <div className="col-lg-6">
                      <img
                        className="image-fluid"
                        src={`${ServerLocation("/Uploads/" + image)}`}
                        width={`400px`}
                        height={`auto`}
                      />
                    </div>
                  </div>
                )}
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
