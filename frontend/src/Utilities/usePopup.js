import { useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import { PopupContext } from "./PopupContext";

export function usePopup(title) {
  const open = useContext(PopupContext);
  const { key } = useLocation();
  if (!open) throw new Error("usePopup must be used inside PopupProvider.");
  const showAlert = useCallback((message) => open({ title, message: String(message), scope: key }), [open, title, key]);
  const showConfirm = useCallback((message, options = {}) => open({
    title, ...options, message: String(message), scope: key, confirmation: true,
  }), [open, title, key]);
  return { showAlert, showConfirm };
}
