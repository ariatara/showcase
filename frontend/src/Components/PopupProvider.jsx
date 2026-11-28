import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import Popup, { PopupButton } from "./Popup";
import { PopupContext } from "../Utilities/PopupContext";

export default function PopupProvider({ children }) {
  const { key } = useLocation();
  const [requests, setRequests] = useState([]);
  const pending = useRef([]);
  const dialogRef = useRef(null);
  const lastFocus = useRef(null);
  const restoreFrame = useRef(null);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const route = useRef(key);
  route.current = key;
  const request = requests[0];

  const open = useCallback((options) => new Promise((resolve) => {
    if (!mounted.current || options.scope !== route.current) {
      resolve(false);
      return;
    }
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body && !active.closest("dialog")
      ? active : lastFocus.current;
    pending.current.push({ ...options, id: ++sequence.current, resolve, opener });
    setRequests([...pending.current]);
  }), []);

  const finish = (id, accepted) => {
    const current = pending.current[0];
    if (!current || current.id !== id) return;
    pending.current = pending.current.slice(1);
    setRequests([...pending.current]);
    current.resolve(accepted);
    if (!pending.current.length) {
      cancelAnimationFrame(restoreFrame.current);
      restoreFrame.current = requestAnimationFrame(() => {
        if (!pending.current.length && current.opener?.isConnected && !current.opener.matches(":disabled")) {
          current.opener.focus({ preventScroll: true });
        }
      });
    }
  };

  useEffect(() => {
    mounted.current = true;
    const rememberFocus = (event) => {
      if (event.target instanceof HTMLElement && event.target !== document.body && !event.target.closest("dialog")) {
        lastFocus.current = event.target;
      }
    };
    document.addEventListener("focusin", rememberFocus);
    return () => {
      mounted.current = false;
      document.removeEventListener("focusin", rememberFocus);
      cancelAnimationFrame(restoreFrame.current);
      pending.current.forEach((item) => item.resolve(false));
      pending.current = [];
    };
  }, []);

  useEffect(() => {
    const stale = pending.current.filter((item) => item.scope !== key);
    if (!stale.length) return;
    pending.current = pending.current.filter((item) => item.scope === key);
    stale.forEach((item) => item.resolve(false));
    setRequests([...pending.current]);
  }, [key]);

  useEffect(() => {
    if (!request) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, [request]);

  return <PopupContext.Provider value={open}>
    {children}
    {request && <Popup ref={dialogRef} title={request.title} message={request.message}
      onCancel={(event) => { event.preventDefault(); finish(request.id, false); }}
      actions={request.confirmation ? <>
        <PopupButton action="cancel" autoFocus onClick={() => finish(request.id, false)}>Cancel</PopupButton>
        <PopupButton action={request.confirmAction || "confirm"} danger={request.confirmAction === "delete"}
          onClick={() => finish(request.id, true)}>{request.confirmLabel || "OK"}</PopupButton>
      </> : <PopupButton autoFocus onClick={() => finish(request.id, true)}>OK</PopupButton>} />}
  </PopupContext.Provider>;
}

PopupProvider.propTypes = { children: PropTypes.node.isRequired };
