import { useState } from "react";
import PropTypes from "prop-types";
import styles from "../../../css/EventImageEditor.module.css";

export default function EventImagePreview({ src, name }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={styles.previewError} role="img" aria-label={`${name} preview unavailable`}>
    Preview unavailable
  </span> : <img src={src} alt={name} onError={() => setFailed(true)} decoding="async" />;
}

EventImagePreview.propTypes = { src: PropTypes.string.isRequired, name: PropTypes.string.isRequired };
