import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Axios from "axios";

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    Axios.get("http://localhost:3000/auth/accounts")
      .then((result) => {
        if (result.data.Status) {
          setAccounts(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  /*
  const handleDelete = (id) => {
    Axios.delete("http://localhost:3000/auth/deleteAccount/" + id).then(
      (result) => {
        if (result.data.Status) {
          window.location.reload();
        } else {
          alert(result.data.Error);
        }
      }
    );
  };
  */

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Account List</h3>
      </div>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Account Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((x) => (
              <tr key={x.id}>
                <td>{x.first_name}</td>
                <td>{x.last_name}</td>
                <td>{x.account_email}</td>
                <td>
                  <Link
                    to={"/accountDashboard/" + x.account_email}
                    className="btn btn btn-secondary btn-sm me-2"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={"/adminDashboard/accountRoles/" + x.account_email}
                    className="btn btn-success btn-sm me-2"
                  >
                    Roles
                  </Link>
                  <Link
                    to={"/adminDashboard/editAccount/" + x.id}
                    className="btn btn-info btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    //onClick={() => handleDelete(account.id)}
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

export default Accounts;
