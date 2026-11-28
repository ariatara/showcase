import ActionLabel from "../ActionLabel";
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { eventImageUrl, MAX_GALLERY_IMAGES } from "../../Utilities/EventImages";
import { moveImage, uploadPendingImages, validateImageSelection } from "../../Utilities/EventImageUploads";
import { UploadFileByFieldName } from "../../Utilities/Uploads";
import EventImagePreview from "./EventImagePreview";
import styles from "../../../css/EventImageEditor.module.css";
import eventStyle from "../../../css/CreateEvent.module.css";

export default function EventImageEditor({ fieldName, label, imagePaths, onChange, disabled,
  onBusyChange, onPendingChange, className = "" }) {
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const inputRef = useRef(null);
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const lifetimeRef = useRef(null);
  const callbacksRef = useRef(null);
  callbacksRef.current = { onChange, onBusyChange, onPendingChange };

  useEffect(() => {
    const lifetime = { active: true };
    lifetimeRef.current = lifetime;
    return () => {
      lifetime.active = false;
      queueRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      queueRef.current = [];
      if (busyRef.current) {
        busyRef.current = false;
        callbacksRef.current.onBusyChange(false);
      }
      callbacksRef.current.onPendingChange(false);
    };
  }, []);

  const syncInputFiles = (entries) => {
    const selection = new DataTransfer();
    for (const entry of entries) selection.items.add(entry.file);
    inputRef.current.files = selection.files;
  };

  const updateQueue = (entries) => {
    syncInputFiles(entries);
    queueRef.current = entries;
    setQueue(entries);
    callbacksRef.current.onPendingChange(entries.length > 0);
  };

  const selectImages = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length || disabled || busyRef.current) {
      syncInputFiles(queueRef.current);
      return;
    }
    const added = [];
    try {
      validateImageSelection(files, imagePaths.length + queueRef.current.length);
      for (const file of files) {
        added.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
      }
      updateQueue([...queueRef.current, ...added]);
      setError("");
    } catch (failure) {
      added.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      syncInputFiles(queueRef.current);
      setError(failure.message);
    }
  };

  const uploadImages = async () => {
    if (disabled || busyRef.current || !queueRef.current.length) return;
    const lifetime = lifetimeRef.current;
    busyRef.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const result = await uploadPendingImages({
        queue: queueRef.current, fieldName, uploadedPaths: imagePaths, upload: UploadFileByFieldName,
        isActive: () => lifetime.active,
        onProgress: setActiveId,
        onUploaded: (entry, paths) => {
          callbacksRef.current.onChange(paths);
          URL.revokeObjectURL(entry.previewUrl);
          updateQueue(queueRef.current.filter((pending) => pending.id !== entry.id));
        },
      });
      if (lifetime.active) {
        updateQueue(result.remaining.map((entry, index) => ({ ...entry, failed: Boolean(result.error) && index === 0 })));
        setError(result.error || "");
      }
    } catch (failure) {
      if (lifetime.active) setError(failure.message);
    } finally {
      if (lifetime.active) {
        busyRef.current = false;
        setBusy(false);
        setActiveId(null);
        callbacksRef.current.onBusyChange(false);
      }
    }
  };

  const controls = (name, index, count, move, remove) => (
    <div className={styles.actions}>
      <button type="button" disabled={index === 0} aria-label={`Move ${name} earlier`} title="Move earlier"
        onClick={() => { move(index, index - 1); setError(""); }}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
      </button>
      <button type="button" disabled={index === count - 1} aria-label={`Move ${name} later`} title="Move later"
        onClick={() => { move(index, index + 1); setError(""); }}>
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </button>
      <button type="button" className="btn btn-danger" aria-label={`Remove ${name}`} title="Remove"
        onClick={() => { remove(); setError(""); }}>
        <i className="bi bi-trash" aria-hidden="true" />
      </button>
    </div>
  );
  const occurrences = new Map();
  const total = imagePaths.length + queue.length;
  const retry = queue.some((entry) => entry.failed);

  return (
    <fieldset className={`${styles.editor} ${className}`} disabled={disabled || busy} aria-labelledby={`${fieldName}-label`}>
      <legend id={`${fieldName}-label`} className={eventStyle.boxHeading}>{label}</legend>
      <p id={`${fieldName}-help`} className={styles.help}>
        Up to 10 JPEG, PNG, WebP, or GIF images, 10 MiB each. Upload selected images, then save the event.
      </p>
      <label className="visually-hidden" htmlFor={fieldName}>Add images</label>
      <div className="input-group mb-2">
        <input ref={inputRef} className="form-control" type="file" id={fieldName} name={fieldName} multiple
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          aria-describedby={`${fieldName}-help`} onChange={selectImages} />
        <button type="button" className="btn btn-outline-secondary" onClick={uploadImages}
          disabled={queue.length === 0} aria-label={retry ? "Retry upload" : "Upload selected images"}>
          <ActionLabel action={retry ? "refresh" : "upload"}>{busy ? "Uploading..." : retry ? "Retry upload" : "Upload"}</ActionLabel>
        </button>
      </div>
      <span className={styles.count} aria-live="polite">{total} / {MAX_GALLERY_IMAGES}</span>
      {(error || total > MAX_GALLERY_IMAGES) && <p className={styles.error} role="alert">
        {error || `This gallery contains more than ${MAX_GALLERY_IMAGES} images. Remove images before saving.`}
      </p>}
      {queue.length > 0 &&
        <ul className={styles.grid} aria-label="Selected images">
          {queue.map((entry, index) => <li key={entry.id} className={styles.card}>
            <EventImagePreview src={entry.previewUrl} name={entry.file.name} />
            <span className={styles.filename}>{entry.file.name}</span>
            <span className={styles.status}>{activeId === entry.id ? "Uploading..."
              : entry.failed ? "Upload failed - retry or remove" : "Selected - not uploaded"}</span>
            {controls(entry.file.name, index, queue.length,
              (from, to) => updateQueue(moveImage(queueRef.current, from, to)),
              () => {
                URL.revokeObjectURL(entry.previewUrl);
                updateQueue(queueRef.current.filter((item) => item.id !== entry.id));
              })}
          </li>)}
        </ul>
      }
      {imagePaths.length > 0 && <ul className={styles.grid} aria-label="Uploaded images">
        {imagePaths.map((filename, index) => {
          const occurrence = occurrences.get(filename) || 0;
          occurrences.set(filename, occurrence + 1);
          return <li key={`${filename}-${occurrence}`} className={styles.card}>
            <EventImagePreview src={eventImageUrl(filename)} name={filename} />
            <span className={styles.uploadedFilename}>{filename}</span>
            <span className={styles.status}>Uploaded</span>
            {controls(filename, index, imagePaths.length,
              (from, to) => onChange(moveImage(imagePaths, from, to)),
              () => onChange(imagePaths.filter((name, position) => position !== index)))}
          </li>;
        })}
      </ul>}
    </fieldset>
  );
}

EventImageEditor.propTypes = {
  fieldName: PropTypes.string.isRequired, label: PropTypes.node.isRequired,
  imagePaths: PropTypes.arrayOf(PropTypes.string).isRequired, onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool, onBusyChange: PropTypes.func.isRequired, onPendingChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};
