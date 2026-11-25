import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Axios from "axios";
import { ServerLocation } from "../../Utilities/Locations";
import { eventFromRow } from "../../Utilities/EventValidation";
import { parseEventImagePaths } from "../../Utilities/EventImages";
import EventViewRenderer from "./EventTemplates/EventViewRenderer";
import EventMemberProducts from "./EventMemberProducts";
import "../../../css/EditorFonts.css";

export default function ViewEvent() {
  const { event_url } = useParams();
  const [state, setState] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    Axios.get(ServerLocation("/user/events/" + encodeURIComponent(event_url)), { signal: controller.signal })
      .then((response) => {
        if (!response.data.Status || !response.data.Result?.length) throw new Error(response.data.Error || "Event not found.");
        const event = eventFromRow(response.data.Result[0]);
        event.upperHubEventImages = parseEventImagePaths(event.upperHubEventImages);
        event.lowerHubEventImages = parseEventImagePaths(event.lowerHubEventImages);
        if (!controller.signal.aborted) setState({ event, url: event_url });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error: error.response?.data?.Error || error.message, url: event_url });
      });
    return () => controller.abort();
  }, [event_url]);
  if (state.url !== event_url) return <p style={{ marginTop: 100 }}>Loading event...</p>;
  if (state.error) return <p style={{ marginTop: 100 }} role="alert">{state.error}</p>;
  return <EventViewRenderer event={state.event} memberProducts={<EventMemberProducts eventURL={event_url} />} />;
}
