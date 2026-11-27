import PropTypes from "prop-types";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "../../css/ActionLabel.module.css";

const actionIcons = {
  add: "plus-circle",
  edit: "pencil-square",
  view: "eye",
  copy: "copy",
  delete: "trash",
  roles: "shield-lock",
  dashboard: "speedometer2",
  save: "floppy",
  register: "person-plus",
  upload: "upload",
  cancel: "x-circle",
  confirm: "check-circle",
  refresh: "arrow-clockwise",
  login: "box-arrow-in-right",
  logout: "box-arrow-right",
  cart: "cart-plus",
  checkout: "credit-card",
  previous: "arrow-left",
  next: "arrow-right",
};

export default function ActionLabel({ action, children }) {
  if (!Object.hasOwn(actionIcons, action)) throw new Error(`Unsupported button action: ${action}`);
  const icon = actionIcons[action];
  return <span className={styles.content} data-action={action}>
    <i className={`bi bi-${icon}`} aria-hidden="true" />
    <span>{children}</span>
  </span>;
}

ActionLabel.propTypes = {
  action: PropTypes.oneOf(Object.keys(actionIcons)).isRequired,
  children: PropTypes.node.isRequired,
};
