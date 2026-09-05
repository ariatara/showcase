import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { ServerLocation } from "../../Utilities/Locations";

const Pages = () => {
  const [pages, setPages] = useState([]); // Fixed: was "events" instead of "pages"

  useEffect(() => {
    const fetchPages = async () => {
      try {
        Axios.get(ServerLocation("/auth/pages")).then((response) => {
          if (response.data.Status) {
            console.log(response.data.Result);
            setPages(response.data.Result);
          } else {
            alert(response.data.Error);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };
    fetchPages();
  }, []);

  // Add this handleDelete function
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this page?")) {
      Axios.delete(ServerLocation("/auth/pages/" + id))
        .then((result) => {
          if (result.data.Status) {
            // Update the pages state by filtering out the deleted page
            setPages(pages.filter(page => page.id !== id));
            alert("Page deleted successfully!");
          } else {
            alert(result.data.Error);
          }
        })
        .catch((error) => {
          console.log(error);
          alert("Failed to delete page. Please try again.");
        });
    }
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Page List</h4>
      </div>
      <Link to="/adminDashboard/createPage" className="btn btn-primary">
        Create Page
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Created By</th>
              <th>Created On</th>
              <th>Modified By</th>
              <th>Modified On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((x) => ( // Changed from "events" to "pages"
              <tr key={x.id}>
                <td>{x.page_title}</td>
                <td>{x.created_by}</td>
                <td>{x.created_on}</td>
                <td>{x.modified_by}</td>
                <td>{x.modified_on}</td>
                <td>
                  <Link
                    to={"/pages/" + x.url}
                    className="btn btn-success btn-sm me-2"
                  >
                    View
                  </Link>
                  <Link
                    //to={"/adminDashboard/editPage/" + x.id}
                    className="btn btn-warning btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <Link
                    //to={"/adminDashboard/copyPage/" + x.id}
                    className="btn btn-info btn-sm me-2"
                  >
                    Copy
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(x.id)} // Fixed: now calls handleDelete with the page ID
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

export default Pages;