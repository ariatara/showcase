import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";

const AddAccountRole = () => {
  const NavigateTo = useNavigate();

  const { account_email } = useParams();

  const [roleTypes, setRoleTypes] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/roleTypes")
      .then((result) => {
        if (result.data.Status) {
          setRoleTypes(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const [accountRole, setAccountRole] = useState({
    account_email: account_email,
    account_role: "Non-Member",
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/auth/addAccountRole/", accountRole)
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/accountRoles/" + account_email);
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
        <form onSubmit={handleSubmit}>
          <div className="col-12">
            <label htmlFor="account_role" className="form-label">
              <h5>Select Role Type:</h5>
            </label>
            <select
              name="account_role"
              id="account_role"
              className="form-select"
              onChange={(event) =>
                setAccountRole({
                  ...accountRole,
                  account_role: event.target.value,
                })
              }
            >
              {roleTypes.map((x) => {
                return (
                  <option key={x.id} selected={x.id == 3}>
                    {x.role}
                  </option>
                );
              })}
            </select>
          </div>
          <button className="btn btn-success w-100 rounded-0 my-3">
            Add Account Role
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAccountRole;
