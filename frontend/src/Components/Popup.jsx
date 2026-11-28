import { forwardRef, useId } from "react";
import PropTypes from "prop-types";
import ActionLabel from "./ActionLabel";
import loginStyle from "../../css/Login.module.css";
import styles from "../../css/Popup.module.css";

export const PopupButton = forwardRef(function PopupButton({ action = "confirm", danger = false, children, className = "", ...props }, ref) {
  return <button ref={ref} type="button" {...props}
    className={`${danger ? `btn btn-danger ${styles.action}` : loginStyle.loginButton} ${className}`}>
    <ActionLabel action={action}>{children}</ActionLabel>
  </button>;
});

PopupButton.propTypes = {
  action: PropTypes.string, danger: PropTypes.bool, children: PropTypes.node.isRequired, className: PropTypes.string,
};

const Popup = forwardRef(function Popup({ title, message, children, actions, headerActions,
  size = "normal", role = "alertdialog", className = "", onKeyDown, ...props }, ref) {
  const id = useId();
  return <dialog ref={ref} role={role}
    aria-labelledby={props["aria-label"] ? undefined : `${id}-title`}
    aria-describedby={message == null ? undefined : `${id}-message`}
    {...props}
    className={`${loginStyle.loginNotification} ${styles.dialog} ${size === "large" ? styles.wide : ""} p-4 rounded-5 border text-center ${className}`}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.getClientRects().length > 0);
      const index = controls.indexOf(document.activeElement);
      if (!controls.length) {
        event.preventDefault();
        event.currentTarget.focus();
      } else if ((event.shiftKey && index <= 0) || (!event.shiftKey && (index < 0 || index === controls.length - 1))) {
        event.preventDefault();
        controls[event.shiftKey ? controls.length - 1 : 0].focus();
      }
    }}>
    <header className={headerActions ? styles.header : undefined}>
      <h2 id={`${id}-title`} className="h5 text-orangered">{title}</h2>
      {headerActions}
    </header>
    {message != null && <p id={`${id}-message`} className={styles.message}>{message}</p>}
    {children}
    {actions !== null && <div className={styles.actions}>
      {actions ?? <form method="dialog"><PopupButton type="submit" autoFocus>OK</PopupButton></form>}
    </div>}
  </dialog>;
});

Popup.propTypes = {
  title: PropTypes.string.isRequired, message: PropTypes.node, children: PropTypes.node,
  actions: PropTypes.node, headerActions: PropTypes.node, size: PropTypes.oneOf(["normal", "large"]),
  role: PropTypes.string, className: PropTypes.string, onKeyDown: PropTypes.func, "aria-label": PropTypes.string,
};

export default Popup;
