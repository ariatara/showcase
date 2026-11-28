import { useEffect } from "react";
import PropTypes from "prop-types";
import { resolveEventTemplate } from "../../../Utilities/EventTemplates";
import ClassicEventTemplate from "./ClassicEventTemplate";
import SignatureEventTemplate from "./SignatureEventTemplate";
import FestiveEventTemplate from "./FestiveEventTemplate";

const templates = { signature: SignatureEventTemplate, classic: ClassicEventTemplate, festive: FestiveEventTemplate };
export default function EventViewRenderer({ event, memberProducts }) {
  const id = resolveEventTemplate(event.viewTemplate);
  useEffect(() => {
    if (event.viewTemplate && id !== event.viewTemplate) console.warn("Unavailable Event View template; rendering Signature.");
  }, [event.viewTemplate, id]);
  const Template = templates[id];
  return <Template event={event} memberProducts={memberProducts} />;
}
EventViewRenderer.propTypes = { event: PropTypes.object.isRequired, memberProducts: PropTypes.node };
