import PropTypes from "prop-types";
import parse from "html-react-parser";
import styles from "../../../../css/ViewEvent.module.css";
import { eventDate, eventTime, safeMapLink } from "../../../Utilities/EventViewFormatting";
import { eventImageUrl } from "../../../Utilities/EventImages";
import EventImageGallery from "../EventImageGallery";

const background = (file) => file ? { backgroundImage: `url("${eventImageUrl(file)}")`, backgroundRepeat: "no-repeat" } : {};
export default function ClassicEventTemplate({ event, memberProducts }) {
  const map = safeMapLink(event.mapLink);
  return <main style={{ paddingTop: 80, paddingBottom: 100 }} data-event-template="classic">
    <section className={`${styles.eventBanner} container-fluid`}>
      <div className={`${styles.eventBannerContainer} shadow-lg bg-body rounded-5`} style={background(event.bannerBackground)}>
        <div className={`${styles.eventBannerContent} rounded-5`}>
          <h1 className={`${styles.eventTitle} text-xxl`}>{event.eventTitle}</h1>
          <h4 className={styles.eventDate}>Start: {eventDate(event.startDate)}, {eventTime(event.startTime)}
            <hr />End: {eventDate(event.endDate)}, {eventTime(event.endTime)}</h4>
          <h4 className={styles.eventVenue}>Venue: {event.venueAddress} {map && <a href={map} aria-label="View venue map">
            <img src="/Images/pin-location.svg" width="15" alt="" /></a>}</h4>
        </div>
      </div>
    </section>
    {["upper", "lower"].map((hub) => {
      const title = hub === "upper" ? "Upper" : "Lower";
      return <div key={hub} className={`${styles[`event${title}Section`]} container-fluid`}>
        <div className={`${styles[`event${title}Container`]} border border-5 shadow-lg rounded-5`} style={background(event[`${hub}HubBackground`])}>
          <div className={`${styles[`event${title}Content`]} rounded-5 fs-6 fw-semibold`}>{parse(event[`${hub}HubContent`] || "")}</div>
          <EventImageGallery imagePaths={event[`${hub}HubEventImages`]} eventTitle={event.eventTitle} hubLabel={`${title} hub`} />
        </div>
      </div>;
    })}
    <section style={{ width: "90%", margin: "32px auto" }}>{memberProducts}</section>
  </main>;
}
ClassicEventTemplate.propTypes = { event: PropTypes.object.isRequired, memberProducts: PropTypes.node };
