import React, { useRef } from "react";
import ReactQuill from "react-quill";
import { EditorModules } from "./EditorModules";
import { EditorFormats } from "./EditorFormats";
import EditorToolbar from "./EditorToolbar";
import PropTypes from "prop-types";

import "react-quill/dist/quill.snow.css";
import "../../../css/QuillEditor.css";

const QuillEditor = ({ updateContent }) => {
  const [state, setState] = React.useState({ value: null });

  const handleChange = (value) => {
    setState({ value });
    updateContent({ value });
  };

  const editorReference = useRef(null);

  return (
    <div>
      <EditorToolbar />
      <ReactQuill
        ref={editorReference}
        theme="snow"
        value={state.value}
        onChange={handleChange}
        placeholder={"Enter your text here"}
        modules={EditorModules}
        formats={EditorFormats}
      />
    </div>
  );
};

QuillEditor.propTypes = {
  updateContent: PropTypes.func,
};

export default QuillEditor;
