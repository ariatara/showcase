import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Axios from "axios";
import loginStyle from "../../../css/Login.module.css";

const CreateAccount = () => {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passwordNotificationRef = useRef(null);

  const [account, setAccount] = useState({
    first_name: "",
    last_name: "",
    account_email: "",
    account_password: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || created) return;
    setError("");
    if (account.account_password !== confirmPassword) {
      passwordNotificationRef.current?.showModal();
      return;
    }

    setSubmitting(true);
    try {
      const result = await Axios.post("http://localhost:3000/user/createAccount", account);
      if (result.data.Status) {
        setCreated(true);
        setAccount((current) => ({ ...current, account_password: "" }));
        setConfirmPassword("");
      } else {
        setError(result.data.Error || "Unable to create account. Please try again.");
      }
    } catch (failure) {
      setError(failure.response?.data?.Error || "Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`${loginStyle.registrationPage} d-flex justify-content-center align-items-center`}>
      <div className={`${loginStyle.loginForm} ${loginStyle.registrationForm} p-4 p-sm-5 rounded-5 border text-orangered`}>
        {error && <div className="text-warning" role="alert">{error}</div>}
        <h3>Create Account</h3>
        {created ? <p role="status" className="text-white">
          Account created successfully. <Link to="/login" className={loginStyle.loginLink}>Sign in here.</Link>
        </p> : <form className="row g-3" onSubmit={handleSubmit}>
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
              autoComplete="new-password"
              required
              onChange={(event) =>
                setAccount({
                  ...account,
                  account_password: event.target.value,
                })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="confirm_password" className="form-label">
              Re-enter Password
            </label>
            <input
              type="password"
              className="form-control rounded-0"
              id="confirm_password"
              placeholder="Re-enter Account Password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <div className="text-center">
            <button className={`${loginStyle.loginButton} my-2`} disabled={submitting}>
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </form>}
      </div>
      <dialog
        ref={passwordNotificationRef}
        className={`${loginStyle.loginNotification} p-4 rounded-5 border text-center`}
        role="alertdialog"
        aria-labelledby="password-notification-title"
        aria-describedby="password-notification-message"
      >
        <h2 id="password-notification-title" className="h5 text-orangered">
          Create Account
        </h2>
        <p id="password-notification-message">Passwords do not match.</p>
        <form method="dialog" className="mt-4">
          <button type="submit" className={loginStyle.loginButton} autoFocus>
            OK
          </button>
        </form>
      </dialog>
    </main>
  );
};

export default CreateAccount;
