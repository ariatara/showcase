import ActionLabel from "../ActionLabel";
import { useState, useEffect } from "react";
import Axios from "axios";
import { Link, useParams, useLocation } from "react-router-dom";
import { usePopup } from "../../Utilities/usePopup";

const AccountRoles = () => {
  const { showAlert } = usePopup("Account Roles");
  const { account_email } = useParams();
  const { state } = useLocation();

  const [accountRoles, setAccountRoles] = useState([]);
  const [account, setAccount] = useState();
  const [detailsError, setDetailsError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const email = encodeURIComponent(account_email);
    setAccountRoles([]);
    setAccount(undefined);
    setDetailsError("");
    Axios.get("http://localhost:3000/auth/accountRoles/" + email, { signal: controller.signal })
      .then(async (result) => {
        if (result.data.Status) {
          setAccountRoles(result.data.Result);
        } else {
          await showAlert(result.data.Error);
        }
      })
      .catch((error) => { if (!controller.signal.aborted) console.log(error); });
    Axios.get("http://localhost:3000/account/accountDetails/" + email, { signal: controller.signal })
      .then((result) => {
        if (!result.data.Status) {
          setDetailsError(result.data.Error || "Unable to load account details. Please try again.");
        } else if (!result.data.Result?.[0]) {
          setDetailsError("Account not found.");
        } else {
          setAccount(result.data.Result[0]);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setDetailsError(error.response?.data?.Error || "Unable to load account details. Please try again.");
        }
      });
    return () => controller.abort();
  }, [account_email, showAlert]);

  const handleDelete = (id) => {
    Axios.delete("http://localhost:3000/auth/deleteAccountRole/" + id).then(
      async (result) => {
        if (result.data.Status) {
          window.location.reload();
        } else {
          await showAlert(result.data.Error);
        }
      }
    );
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Account Roles</h4>
      </div>
      {state?.memberRegisteredFor === account_email && <p role="status" className="text-white">Member registered and Member role assigned successfully.</p>}
      <section aria-label="Account details" className="mt-5 p-0 text-white">
        {detailsError ? <p role="alert">{detailsError}</p> : account ? (
          <dl className="row mb-0">
            <dt className="col-sm-3">First Name</dt>
            <dd className="col-sm-9">{account.first_name}</dd>
            <dt className="col-sm-3">Last Name</dt>
            <dd className="col-sm-9">{account.last_name}</dd>
            <dt className="col-sm-3">Email Address</dt>
            <dd className="col-sm-9 text-break mb-0">{account.account_email}</dd>
          </dl>
        ) : <p role="status">Loading account details...</p>}
      </section>
      <div className="mt-5">
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
                    <ActionLabel action="delete">Delete</ActionLabel>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        to={"/adminDashboard/addAccountRole/" + account_email}
        className="btn btn-primary"
      >
        <ActionLabel action="add">Add Account Roles</ActionLabel>
      </Link>
    </div>
  );
};

export default AccountRoles;
