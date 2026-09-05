import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";

const AddRoleType = () => {
  const [roleType, setRoleType] = useState();

  const NavigateTo = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/auth/addRoleType", {
      roleType,
    })
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/roleTypes");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="addAccountRolePage d-flex justify-content-center align-items-center h-100">
      <div className="addAccountRoleForm p-5 rounded w-25 border">
        <div className="addAccountRoleError text-warning"></div>
        <h5>Add Role Type:</h5>
        <form onSubmit={handleSubmit}>
          <div className="categoryForm my-3">
            <input
              className="form-control rounded-0"
              type="text"
              name="category"
              placeholder="Enter Role Type"
              onChange={(event) => setRoleType(event.target.value)}
            />
          </div>
          <button className="btn btn-success w-100 rounded-0 mb-1">
            Add Role Type
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddRoleType;
