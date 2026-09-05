import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";

const CreateAccount = () => {
  const NavigateTo = useNavigate();

  const [account, setAccount] = useState({
    first_name: "",
    last_name: "",
    account_email: "",
    account_password: "",
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    Axios.post("http://localhost:3000/user/createAccount", account)
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/login");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div>
      <div className="container-fluid pt-6">
        <div className="p-2 d-flex justify-content-center shadow">
          <h3>Account Registration</h3>
        </div>
        <div className="createAccountPage d-flex justify-content-center align-items-center h-100">
          <div className="createAccountForm p-5 rounded w-50 border">
            <div className="createAccountError text-warning"></div>
            <h3>Create Account</h3>
            <form className="row g-1" onSubmit={handleSubmit}>
              <div className="col-12">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  id="firstName"
                  placeholder="Enter First Name"
                  onChange={(event) =>
                    setAccount({ ...account, first_name: event.target.value })
                  }
                />
              </div>
              <div className="col-12">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-control rounded-0"
                  id="lastName"
                  placeholder="Enter Last Name"
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
                  placeholder="Enter Account Email"
                  autoComplete="off"
                  onChange={(event) =>
                    setAccount({
                      ...account,
                      account_email: event.target.value,
                    })
                  }
                />
              </div>
              <div className="col-12">
                <label htmlFor="account_password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control rounded-0"
                  id="account_password"
                  placeholder="Enter Account Password"
                  onChange={(event) =>
                    setAccount({
                      ...account,
                      account_password: event.target.value,
                    })
                  }
                />
              </div>
              <button className="btn btn-success w-100 rounded-0 my-3">
                Create Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;
