import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";

const RoleTypes = () => {
  const [accountRoles, setAccountRoles] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/roleTypes")
      .then((result) => {
        if (result.data.Status) {
          setAccountRoles(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Role Types</h4>
      </div>
      <Link to="/adminDashboard/addRoleType" className="btn btn-primary">
        Add Role Type
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
                    className="btn btn-info btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    //onClick={() => handleDelete(value.id)}
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

export default RoleTypes;
