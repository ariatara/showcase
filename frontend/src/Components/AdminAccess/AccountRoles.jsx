import { useState, useEffect } from "react";
import Axios from "axios";
import { Link, useParams } from "react-router-dom";

const AccountRoles = () => {
  const { account_email } = useParams();

  const [accountRoles, setAccountRoles] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/accountRoles/" + account_email)
      .then((result) => {
        if (result.data.Status) {
          setAccountRoles(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const handleDelete = (id) => {
    Axios.delete("http://localhost:3000/auth/deleteAccountRole/" + id).then(
      (result) => {
        if (result.data.Status) {
          window.location.reload();
        } else {
          alert(result.data.Error);
        }
      }
    );
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Account Roles</h4>
      </div>
      <Link
        to={"/adminDashboard/addAccountRole/" + account_email}
        className="btn btn-primary"
      >
        Add Account Role
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Roles</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {accountRoles.map((x) => (
              <tr key={x.id}>
                <td>{x.account_role}</td>
                <td>
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

export default AccountRoles;
