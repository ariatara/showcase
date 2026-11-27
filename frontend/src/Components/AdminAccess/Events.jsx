import ActionLabel from "../ActionLabel";
import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { ServerLocation } from "../../Utilities/Locations";
import Moment from "moment";
import { usePopup } from "../../Utilities/usePopup";

const Events = () => {
  const { showAlert, showConfirm } = usePopup("Events");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        Axios.get(ServerLocation("/auth/events")).then(async (response) => {
          if (response.data.Status) {
            setEvents(response.data.Result);
          } else {
            await showAlert(response.data.Error);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };

    fetchEvents();
  }, [showAlert]);

  const handleCopy = (id) => {
    const targetEvent = events.find((x) => x.id === id);

    const eventDetails = {
      pageTitle: targetEvent.page_title + " Copy",
      eventURL: targetEvent.url + "_copy",
      eventTitle: targetEvent.event_title ? targetEvent.event_title + " Copy" : null,
      startDate: targetEvent.start_date?.split("T")[0] ?? null,
      startTime: targetEvent.start_time,
      endDate: targetEvent.end_date?.split("T")[0] ?? null,
      endTime: targetEvent.end_time,
      venueAddress: targetEvent.venue_address,
      mapLink: targetEvent.map_link,
      bannerBackground: targetEvent.banner_background_image_name,
      upperHubContent: targetEvent.upper_hub_content,
      upperHubBackground: targetEvent.upper_hub_background_image_name,
      upperHubEventImages: targetEvent.upper_hub_event_image_names,
      lowerHubContent: targetEvent.lower_hub_content,
      lowerHubBackground: targetEvent.lower_hub_background_image_name,
      lowerHubEventImages: targetEvent.lower_hub_event_image_names,
      isPublished: false,
      viewTemplate: targetEvent.view_template ?? "signature",
      createdBy: targetEvent.created_by,
      createdDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
      modifiedBy: targetEvent.modified_by,
      modifiedDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    console.log(eventDetails);

    Axios.post(ServerLocation("/auth/events"), eventDetails)
      .then(async (result) => {
        if (result.data.Status) {
          window.location.reload();
        } else {
          await showAlert(result.data.Error);
        }
      })
      .catch(async (error) => await showAlert(error.response?.data?.Error || error.message));
  };

const handleDelete = async (id) => {
  if (await showConfirm("Are you sure you want to delete this event?", { title: "Delete Event", confirmLabel: "Delete", confirmAction: "delete" })) {
    Axios.delete(ServerLocation("/auth/events/" + id))
      .then(async (result) => {
        if (result.data.Status) {
          setEvents((current) => current.filter(event => event.id !== id));
          await showAlert("Event deleted successfully!");
        } else {
          await showAlert(result.data.Error);
        }
      })
      .catch(async (error) => {
        console.log(error);
        await showAlert(error.response?.data?.Error || "Failed to delete event. Please try again.");
      });
  }
};

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Event List</h4>
      </div>
      <Link to="/adminDashboard/addEvent" className="btn btn-primary">
        <ActionLabel action="add">Create Event</ActionLabel>
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Venue</th>
              <th>Start Date</th>
              <th>Start Time</th>
              <th>End Date</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((x) => (
              <tr key={x.id}>
                <td>{x.event_title || x.page_title}</td>
                <td>{x.venue_address}</td>
                <td>{x.start_date?.substring(0, 10) || "-"}</td>
                <td>{x.start_time}</td>
                <td>{x.end_date?.substring(0, 10) || "-"}</td>
                <td>{x.end_time}</td>
                <td>{x.published ? "Published" : "Draft"}</td>
                <td>
                  {Boolean(x.published) && <Link
                    to={"/events/" + encodeURIComponent(x.url)}
                    className="btn btn-custom btn-sm me-2"
                  >
                    <ActionLabel action="view">View</ActionLabel>
                  </Link>}
                  <Link
                    to={"/adminDashboard/editEvent/" + encodeURIComponent(x.url)}
                    className="btn btn-success btn-sm me-2"
                  >
                    <ActionLabel action="edit">Edit</ActionLabel>
                  </Link>
                  <button
                    className="btn btn-copy btn-sm me-2"
                    onClick={() => handleCopy(x.id)}
                  >
                    <ActionLabel action="copy">Copy</ActionLabel>
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(x.id)}
                  >
                    <ActionLabel action="delete">Delete</ActionLabel>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Events;
