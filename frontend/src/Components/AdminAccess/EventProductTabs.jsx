import { useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "../../../css/EventProductTabs.module.css";

const tabs = ["Member Products", "Non-Member Products"];

export default function EventProductTabs({ children, nonMemberProducts, disabled = false }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    if (disabled) return;
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next].focus();
  };

  return <div className={styles.card}>
    <div role="tablist" aria-label="Event product categories" className={styles.tabs}>
      {tabs.map((label, index) => <button key={label} type="button" role="tab"
        ref={(element) => { tabRefs.current[index] = element; }}
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`}
        aria-selected={active === index} tabIndex={active === index ? 0 : -1}
        disabled={disabled} className={styles.tab}
        onClick={() => setActive(index)} onKeyDown={(event) => handleKeyDown(event, index)}>
        {label}
      </button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`}
      hidden={active !== 0} tabIndex={0} className={styles.panel}>
      {children}
    </div>
    <div role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`}
      hidden={active !== 1} tabIndex={0} className={styles.panel}>
      {nonMemberProducts}
    </div>
  </div>;
}

EventProductTabs.propTypes = { children: PropTypes.node.isRequired, nonMemberProducts: PropTypes.node.isRequired, disabled: PropTypes.bool };
