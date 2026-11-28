import PropTypes from "prop-types";
import parse from "html-react-parser";
import ActionLabel from "../../ActionLabel";
import EventImageGallery from "../EventImageGallery";
import { eventDate, eventTime, safeMapLink } from "../../../Utilities/EventViewFormatting";
import { eventImageUrl } from "../../../Utilities/EventImages";
import styles from "../../../../css/FestiveEventTemplate.module.css";

export default function FestiveEventTemplate({ event, memberProducts }) {
  const map = safeMapLink(event.mapLink);
  return <main className={styles.page} data-event-template="festive">
    <div className={styles.content}>
      <header className={styles.hero} style={event.bannerBackground ? {
        backgroundImage: `linear-gradient(135deg,rgba(64,12,40,.88),rgba(36,9,32,.75)),url("${eventImageUrl(event.bannerBackground)}")`,
      } : undefined}>
        <div className={styles.lights} aria-hidden="true">
          {Array.from({ length: 11 }, (_, index) => <span key={index} />)}
        </div>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Celebrate together</p>
          <h1>{event.eventTitle}</h1>
          <div className={styles.ornament} aria-hidden="true" />
        </div>
      </header>
      <section className={styles.details} aria-label="Event details">
        <div><h2>Starts</h2><p>{eventDate(event.startDate)}<br />{eventTime(event.startTime)}</p></div>
        <div><h2>Ends</h2><p>{eventDate(event.endDate)}<br />{eventTime(event.endTime)}</p></div>
        <div><h2>Venue</h2><p>{event.venueAddress}</p>
          {map && <a href={map}><ActionLabel action="view">View venue map</ActionLabel></a>}
        </div>
      </section>
      {["upper", "lower"].map((hub) => {
        const content = event[`${hub}HubContent`], images = event[`${hub}HubEventImages`] || [], background = event[`${hub}HubBackground`];
        if (!content && !images.length && !background) return null;
        const label = `${hub === "upper" ? "Upper" : "Lower"} hub`;
        return <section key={hub} className={styles.hub} aria-label={label} style={background ? {
          backgroundImage: `linear-gradient(rgba(47,13,36,.88),rgba(47,13,36,.94)),url("${eventImageUrl(background)}")`,
        } : undefined}>
          <div className={styles.ornament} aria-hidden="true" />
          {content && <div className={`${styles.richText} ql-editor`}>{parse(content)}</div>}
          <EventImageGallery imagePaths={images} eventTitle={event.eventTitle} hubLabel={label} />
        </section>;
      })}
      {memberProducts}
    </div>
  </main>;
}

FestiveEventTemplate.propTypes = { event: PropTypes.object.isRequired, memberProducts: PropTypes.node };
