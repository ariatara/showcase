import PropTypes from "prop-types";
import { EVENT_TEMPLATES } from "../../Utilities/EventTemplates";
import styles from "../../../css/EventTemplateSelector.module.css";
import eventStyles from "../../../css/CreateEvent.module.css";

export default function EventTemplateSelector({ value, onChange, disabled }) {
  const available = EVENT_TEMPLATES.some((template) => template.id === value);
  return <fieldset className={styles.selector} disabled={disabled}>
    <legend className={eventStyles.boxHeading}><span className="h6">Event View Template:</span></legend>
    {!available && <p role="alert">This event uses an unavailable template. Select a template before saving.</p>}
    <div className={styles.options}>{EVENT_TEMPLATES.map((template) => <label key={template.id} className={styles.card}>
      <input type="radio" name="eventViewTemplate" value={template.id} checked={value === template.id} onChange={() => onChange(template.id)} />
      <span><span className={`${styles.illustration} ${styles[template.id]}`} aria-hidden="true"><i /><i /><i /></span>
        <strong>{template.name}{template.id === "signature" && <small>Default</small>}</strong>
        <span className={styles.description}>{template.description}</span></span>
    </label>)}</div>
  </fieldset>;
}
EventTemplateSelector.propTypes = { value: PropTypes.string, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool };
