import ActionLabel from "../ActionLabel";
import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { usePopup } from "../../Utilities/usePopup";

const RoleTypes = () => {
  const { showAlert } = usePopup("Role Types");
  const [accountRoles, setAccountRoles] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/roleTypes")
      .then(async (result) => {
        if (result.data.Status) {
          setAccountRoles(result.data.Result);
        } else {
          await showAlert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, [showAlert]);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Role Types</h4>
      </div>
      <Link to="/adminDashboard/addRoleType" className="btn btn-primary">
        <ActionLabel action="add">Add Role Type</ActionLabel>
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Role </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {accountRoles.map((x) => (
              <tr key={x.id}>
                <td>{x.role}</td>
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

export default RoleTypes;
