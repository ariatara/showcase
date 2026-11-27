import ActionLabel from "../ActionLabel";
import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { usePopup } from "../../Utilities/usePopup";

const AgeGroups = () => {
  const { showAlert } = usePopup("Age Groups");
  const [ageGroups, setAgeGroups] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/ageGroups")
      .then(async (result) => {
        if (result.data.Status) {
          setAgeGroups(result.data.Result);
        } else {
          await showAlert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, [showAlert]);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Age Groups</h4>
      </div>
      <Link to="/adminDashboard/addAgeGroup" className="btn btn-primary">
        <ActionLabel action="add">Add Age Group</ActionLabel>
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Groups</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ageGroups.map((x) => (
              <tr key={x.id}>
                <td>{x.group}</td>
                <td>
                  <Link
                    //to={"/adminDashboard/editEmployee/" + value.id}
                    className="btn btn-success btn-sm me-2"
                  >
                    <ActionLabel action="edit">Edit</ActionLabel>
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    //onClick={() => handleDelete(value.id)}
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

export default AgeGroups;
