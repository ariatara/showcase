import ActionLabel from "../ActionLabel";
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { eventImageUrl } from "../../Utilities/EventImages";
import styles from "../../../css/EventImageGallery.module.css";

function GalleryImage({ filename, description, position, thumbnail = false }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={styles.imageError} role={thumbnail ? "img" : "alert"} aria-label={description}>
      Image {position} could not be loaded.
    </span>
  ) : (
    <img src={eventImageUrl(filename)} alt={description} loading={thumbnail ? "lazy" : "eager"}
      decoding="async" onError={() => setFailed(true)} />
  );
}

GalleryImage.propTypes = {
  filename: PropTypes.string.isRequired, description: PropTypes.string.isRequired,
  position: PropTypes.number.isRequired, thumbnail: PropTypes.bool,
};

export default function EventImageGallery({ imagePaths, eventTitle, hubLabel }) {
  const [selection, setSelection] = useState(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const activeIndex = selection?.paths === imagePaths && selection?.title === eventTitle ? selection.index : null;
  const isOpen = activeIndex !== null;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!imagePaths.length) return null;
  const description = (index) => `${eventTitle || "Event"} - ${hubLabel} image ${index + 1} of ${imagePaths.length}`;
  const close = () => setSelection(null);
  const move = (direction) => {
    if (activeIndex === null) return;
    setSelection({ ...selection, index: Math.max(0, Math.min(imagePaths.length - 1, activeIndex + direction)) });
  };

  return (
    <section className={styles.gallery} aria-label={`${hubLabel} image gallery`}>
      <ul className={`${styles.grid} ${imagePaths.length === 1 ? styles.single : ""}`}>
        {imagePaths.map((filename, index) => (
          <li key={`${filename}-${index}`}>
            <button type="button" className={styles.thumbnail} aria-label={`Open ${description(index)}`}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setSelection({ paths: imagePaths, title: eventTitle, index });
              }}>
              <GalleryImage filename={filename} description={description(index)} position={index + 1} thumbnail />
              <span className={styles.badge} aria-hidden="true">{index + 1} / {imagePaths.length}</span>
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={dialogRef} className={styles.dialog} aria-label={`${hubLabel} image viewer`}
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={() => { if (!dialogRef.current?.open) close(); }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right
            || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            const buttons = [...event.currentTarget.querySelectorAll("button:not(:disabled)")];
            const index = buttons.indexOf(document.activeElement);
            if ((event.shiftKey && index <= 0) || (!event.shiftKey && (index < 0 || index === buttons.length - 1))) {
              event.preventDefault();
              buttons[event.shiftKey ? buttons.length - 1 : 0].focus();
            }
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}>
        <div className={styles.toolbar}>
          <span>{hubLabel}</span>
          <button type="button" ref={closeRef} onClick={close}><ActionLabel action="cancel">Close</ActionLabel></button>
        </div>
        {activeIndex !== null && (
          <div className={styles.viewerImage}>
            <GalleryImage key={imagePaths[activeIndex]} filename={imagePaths[activeIndex]}
              description={description(activeIndex)} position={activeIndex + 1} />
          </div>
        )}
        <div className={styles.controls}>
          {imagePaths.length > 1 && <button type="button" disabled={activeIndex === 0}
            onClick={() => move(-1)}><ActionLabel action="previous">Previous</ActionLabel></button>}
          <span aria-live="polite" aria-atomic="true">{(activeIndex ?? 0) + 1} / {imagePaths.length}</span>
          {imagePaths.length > 1 && <button type="button" disabled={activeIndex === imagePaths.length - 1}
            onClick={() => move(1)}><ActionLabel action="next">Next</ActionLabel></button>}
        </div>
      </dialog>
    </section>
  );
}

EventImageGallery.propTypes = {
  imagePaths: PropTypes.arrayOf(PropTypes.string).isRequired,
  eventTitle: PropTypes.string.isRequired,
  hubLabel: PropTypes.string.isRequired,
};
