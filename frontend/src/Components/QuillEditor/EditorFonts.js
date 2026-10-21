import { Quill } from "react-quill";
import "../../../css/EditorFonts.css";

export const EditorFontOptions = [
  { value: "arial", label: "Arial" },
  { value: "gill-sans", label: "Gill Sans" },
  { value: "courier-new", label: "Courier New" },
  { value: "georgia", label: "Georgia" },
  { value: "verdana", label: "Verdana" },
  { value: "lucida", label: "Lucida" },
];

const Font = Quill.import("formats/font");
Font.whitelist = EditorFontOptions.map(({ value }) => value);
Quill.register(Font, true);

const Delta = Quill.import("delta");

// Quill 1's clipboard infers class keys by the last hyphen, missing multiword fonts.
export function matchEditorFont(node, delta) {
  const font = EditorFontOptions.find(({ value }) => node.classList.contains(`ql-font-${value}`));
  if (!font) return delta;
  return delta.reduce(
    (result, op) => result.insert(op.insert, { font: font.value, ...op.attributes }),
    new Delta()
  );
}
