import PropTypes from "prop-types";

const UploadedFileNames = ({ fileNames }) =>
  typeof fileNames === "string" &&
  fileNames && (
    <small
      className="ms-2 text-muted fw-normal"
      style={{ fontSize: "0.65em" }}
    >
      {fileNames.split(",").join(", ")}
    </small>
  );

UploadedFileNames.propTypes = {
  fileNames: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

export default UploadedFileNames;
