import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";

const EditAccount = () => {
  const NavigateTo = useNavigate();

  const { id } = useParams();

  const [account, setAccount] = useState({
    first_name: "",
    last_name: "",
    account_email: "",
  });

  useEffect(() => {
    Axios.get("http://localhost:3000/auth/account/" + id)
      .then((result) => {
        setAccount({
          first_name: result.data.Result[0].first_name,
          last_name: result.data.Result[0].last_name,
          account_email: result.data.Result[0].account_email,
        });
      })
      .catch((error) => console.log(error));
  }, []);

  const handleUpdate = (event) => {
    event.preventDefault();

    Axios.put("http://localhost:3000/auth/editAccount/" + id, account)
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/Accounts");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="editAccountPage d-flex justify-content-center align-items-center h-100">
      <div className="editAccountForm p-5 rounded w-50 border">
        <h3>Edit Account</h3>
        <form className="row g-1" onSubmit={handleUpdate}>
          <div className="col-12">
            <label htmlFor="first_name" className="form-label">
              First Name
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="first_name"
              value={account.first_name}
              onChange={(event) =>
                setAccount({ ...account, first_name: event.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="last_name" className="form-label">
              Last Name
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="last_name"
              value={account.last_name}
              onChange={(event) =>
                setAccount({ ...account, last_name: event.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="account_email" className="form-label">
              Email
            </label>
            <input
              type="email"
              className="form-control rounded-0"
              id="account_email"
              value={account.account_email}
              autoComplete="off"
              onChange={(event) =>
                setAccount({ ...account, account_email: event.target.value })
              }
            />
          </div>
          <button className="btn btn-success w-100 rounded-0 my-3">
            Edit Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditAccount;
