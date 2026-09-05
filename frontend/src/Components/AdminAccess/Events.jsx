import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { ServerLocation } from "../../Utilities/Locations";
import Moment from "moment";

const Events = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        Axios.get(ServerLocation("/auth/events")).then((response) => {
          if (response.data.Status) {
            setEvents(response.data.Result);
          } else {
            alert(response.data.Error);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };

    fetchEvents();
  }, []);

  const handleCopy = (id) => {
    const targetEvent = events.find((x) => x.id === id);

    const eventDetails = {
      pageTitle: targetEvent.page_title + " Copy",
      eventURL: targetEvent.url + "_copy",
      eventTitle: targetEvent.event_title + " Copy",
      startDate: targetEvent.start_date.split("T")[0],
      startTime: targetEvent.start_time,
      endDate: targetEvent.end_date.split("T")[0],
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
      isPublished: targetEvent.published,
      createdBy: targetEvent.created_by,
      createdDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
      modifiedBy: targetEvent.modified_by,
      modifiedDateTime: Moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    console.log(eventDetails);

    Axios.post(ServerLocation("/auth/events"), eventDetails)
      .then((result) => {
        if (result.data.Status) {
          window.location.reload();
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

const handleDelete = (id) => {
  if (window.confirm("Are you sure you want to delete this event?")) {
    Axios.delete(ServerLocation("/auth/events/" + id))
      .then((result) => {
        if (result.data.Status) {
          setEvents(events.filter(event => event.id !== id));
          alert("Event deleted successfully!");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => {
        console.log(error);
        alert("Failed to delete event. Please try again.");
      });
  }
};

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Event List</h4>
      </div>
      <Link to="/adminDashboard/addEvent" className="btn btn-custom">
        Add Event
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((x) => (
              <tr key={x.id}>
                <td>{x.event_title}</td>
                <td>{x.venue_address}</td>
                <td>{x.start_date.substring(0, 10)}</td>
                <td>{x.start_time}</td>
                <td>{x.end_date.substring(0, 10)}</td>
                <td>{x.end_time}</td>
                <td>
                  <Link
                    to={"/events/" + x.url}
                    className="btn btn-custom btn-sm me-2"
                  >
                    View
                  </Link>
                  <Link
                    to={"/adminDashboard/editEvent/" + x.url}
                    className="btn btn-custom btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-custom btn-sm me-2"
                    onClick={() => handleCopy(x.id)}
                  >
                    Copy
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(x.id)}
                  >
                    Delete
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
