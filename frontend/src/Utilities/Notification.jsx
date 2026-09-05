import { Alert, Snackbar } from "@mui/material";
import React from "react";
import PropTypes from "prop-types";

const Notification = (props) => {
  const { notify, setNotify } = props;

  return (
    <Snackbar
      open={notify.isOpen}
      autoHideDuration={3000}
      onClose={() => setNotify({ ...notify, isOpen: false })}
    >
      <Alert
        severity="{notify.type}"
        onClose={() => setNotify({ ...notify, isOpen: false })}
        sx={{ width: "100%" }}
      >
        {notify.message}
      </Alert>
    </Snackbar>
  );
};
Notification.propTypes = {
  notify: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  setNotify: PropTypes.func.isRequired,
};

export default Notification;
