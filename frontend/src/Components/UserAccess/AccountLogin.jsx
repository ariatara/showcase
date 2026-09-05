import { useState } from "react";
import Axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ROLES } from "../../Configurations/Roles";
import loginStyle from "../../../css/Login.module.css";

const AccountLogin = () => {
  const [accountDetails, setAccountDetails] = useState({
    account_email: "",
    account_password: "",
  });

  const [error, setError] = useState();
  const NavigateTo = useNavigate();
  Axios.defaults.withCredentials = true;

  const handleLogin = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/user", accountDetails)
      .then((result) => {
        if (result.data.login_status) {
          if (result.data.account_roles.includes(ROLES.ADMINISTRATOR)) {
            sessionStorage.setItem(
              "loginSession",
              JSON.stringify({
                roles: result.data.account_roles,
                expiry: result.data.login_expiry,
              })
            );
            NavigateTo("/adminDashboard");
          } else if (
            result.data.account_roles.includes(ROLES.MEMBER) ||
            result.data.account_roles.includes(ROLES.NONMEMBER)
          ) {
            sessionStorage.setItem(
              "loginSession",
              JSON.stringify({
                roles: result.data.account_roles,
                expiry: result.data.login_expiry,
              })
            );
            NavigateTo("/accountDashboard/" + accountDetails.account_email);
          }
        } else {
          setError(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div
      className={`${loginStyle.loginPage} d-flex justify-content-center align-items-center vh-100`}
    >
      <div
        className={`${loginStyle.loginForm} p-5 rounded-5 border text-orangered`}
      >
        <div className={`${loginStyle.loginError} text-warning`}>
          {error && error}
        </div>
        <h3>Account Login</h3>
        <form onSubmit={handleLogin}>
          <div className="emailForm my-3">
            <input
              className="form-control rounded-0"
              type="email"
              name="email"
              autoComplete="off"
              placeholder="Enter Email"
              onChange={(e) =>
                setAccountDetails({
                  ...accountDetails,
                  account_email: e.target.value,
                })
              }
            />
          </div>
          <div className="passwordForm my-3">
            <input
              className="form-control rounded-0"
              type="password"
              name="password"
              placeholder="Enter Password"
              onChange={(e) =>
                setAccountDetails({
                  ...accountDetails,
                  account_password: e.target.value,
                })
              }
            />
            <Link to={"/resetPassword"} className={`${loginStyle.loginLink}`}>
              Forgot Password?
            </Link>
          </div>
          <div className={`${loginStyle.loginLink} text-center`}>
            <button className={`${loginStyle.loginButton} my-2`}>
              Sign In
            </button>
            <div className="agreementBox">
              <input
                className="agreementCheck me-1"
                type="checkbox"
                name="tick"
                id="tick"
                checked={true}
                disabled={true}
              />
              <label htmlFor="Agreement">
                I have read the Membership Agreement
              </label>
            </div>
            <Link
              to={"/createAccount"}
              className={`${loginStyle.loginButton} mt-5`}
            >
              No account? Sign up here.
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountLogin;
