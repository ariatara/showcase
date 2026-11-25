import PropTypes from "prop-types";
import parse from "html-react-parser";
import styles from "../../../../css/SignatureEventTemplate.module.css";
import { eventDate, eventTime, safeMapLink } from "../../../Utilities/EventViewFormatting";
import { eventImageUrl } from "../../../Utilities/EventImages";
import EventImageGallery from "../EventImageGallery";

export default function SignatureEventTemplate({ event, memberProducts }) {
  const map = safeMapLink(event.mapLink);
  return <main className={styles.page} data-event-template="signature">
    <div className={styles.content}>
      <header className={styles.hero} style={event.bannerBackground ? {
        backgroundImage: `linear-gradient(90deg,rgba(15,19,24,.94),rgba(15,19,24,.3)),url("${eventImageUrl(event.bannerBackground)}")`,
      } : undefined}>
        <div className={styles.heroText}><h1>{event.eventTitle}</h1></div>
      </header>
      <section className={styles.essentials} aria-label="Event details">
        <div><h2>Starts</h2><p>{eventDate(event.startDate)}<br />{eventTime(event.startTime)}</p></div>
        <div><h2>Ends</h2><p>{eventDate(event.endDate)}<br />{eventTime(event.endTime)}</p></div>
        <div><h2>Venue</h2><p>{event.venueAddress}</p>{map && <a href={map}>View venue map</a>}</div>
      </section>
      {["upper", "lower"].map((hub) => {
        const content = event[`${hub}HubContent`], images = event[`${hub}HubEventImages`] || [], background = event[`${hub}HubBackground`];
        if (!content && !images.length && !background) return null;
        return <section key={hub} className={styles.hub} aria-label={`${hub === "upper" ? "Upper" : "Lower"} hub`}
          style={background ? { backgroundImage: `linear-gradient(rgba(19,24,30,.85),rgba(19,24,30,.93)),url("${eventImageUrl(background)}")` } : undefined}>
          {content && <div className={`${styles.richText} ql-editor`}>{parse(content)}</div>}
          <EventImageGallery imagePaths={images} eventTitle={event.eventTitle} hubLabel={`${hub === "upper" ? "Upper" : "Lower"} hub`} />
        </section>;
      })}
      {memberProducts}
    </div>
  </main>;
}
SignatureEventTemplate.propTypes = { event: PropTypes.object.isRequired, memberProducts: PropTypes.node };
