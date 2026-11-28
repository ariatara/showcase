import ActionLabel from "../ActionLabel";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";
import { ROLES } from "../../Configurations/Roles";
import MemberRegistrationForm from "../AccountAccess/MemberRegistrationForm";
import Popup, { PopupButton } from "../Popup";

const AddAccountRole = () => {
  const NavigateTo = useNavigate();

  const { account_email } = useParams();
  const requestScope = useRef(null);
  const errorDialog = useRef(null);
  const errorFocus = useRef(null);
  const [account, setAccount] = useState();
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [accountRole, setAccountRole] = useState(ROLES.NONMEMBER);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const alreadyAssigned = assignedRoles.some((role) => role.account_role === accountRole);
  const registerMember = accountRole === ROLES.MEMBER && !alreadyAssigned;
  const cardClass = "card bg-body-tertiary border-0 rounded-3 shadow-sm p-3 mb-3 text-white";

  useEffect(() => {
    if (!error) return;
    const dialog = errorDialog.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (errorFocus.current?.isConnected) errorFocus.current.focus();
    };
  }, [error]);

  const [roleTypes, setRoleTypes] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    requestScope.current = controller;
    setLoading(true); setAccount(undefined); setRoleTypes([]); setAssignedRoles([]); setError("");
    setAccountRole(ROLES.NONMEMBER); setBusy(false);
    Promise.all([
      Axios.get("http://localhost:3000/auth/roleTypes", { signal: controller.signal }),
      Axios.get("http://localhost:3000/account/accountDetails/" + encodeURIComponent(account_email), { signal: controller.signal }),
      Axios.get("http://localhost:3000/auth/accountRoles/" + encodeURIComponent(account_email), { signal: controller.signal }),
    ]).then(([roles, details, assignments]) => {
      if (controller.signal.aborted) return;
      if (!roles.data.Status || !Array.isArray(roles.data.Result) || !roles.data.Result.length) {
        throw new Error(roles.data.Error || "Account role types are unavailable. Please try again.");
      }
      if (!assignments.data.Status || !Array.isArray(assignments.data.Result)) {
        throw new Error(assignments.data.Error || "Unable to load assigned roles. Please try again.");
      }
      const nextAccount = details.data.Result?.[0];
      if (!details.data.Status || !nextAccount ||
        ["first_name", "last_name", "account_email"].some((field) => typeof nextAccount[field] !== "string")) {
        throw new Error(details.data.Error || "Unable to load account details. Please try again.");
      }
      setRoleTypes(roles.data.Result);
      setAssignedRoles(assignments.data.Result);
      setAccount({ first_name: nextAccount.first_name, last_name: nextAccount.last_name, account_email: nextAccount.account_email });
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.response?.data?.Error || failure.message || "Unable to load account details. Please try again.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [account_email, reload]);

  const ready = !loading && account && roleTypes.length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || !ready) return;
    if (alreadyAssigned) {
      setError(`This account already has the ${accountRole} role.`);
      return;
    }
    if (registerMember) return;
    const { signal } = requestScope.current;
    setBusy(true); setError("");
    try {
      const result = await Axios.post("http://localhost:3000/auth/addAccountRole/", { account_role: accountRole, account_email }, { signal });
      if (!result.data.Status) throw new Error(result.data.Error || "Unable to add account role. Please try again.");
      if (!signal.aborted) NavigateTo("/adminDashboard/accountRoles/" + encodeURIComponent(account_email));
    } catch (failure) {
      if (!signal.aborted) setError(failure.response?.data?.Error || failure.message || "Unable to add account role. Please try again.");
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-100 px-3 py-4" style={{ maxWidth: "40rem" }}
      onFocusCapture={(event) => {
        if (!errorDialog.current?.contains(event.target)) errorFocus.current = event.target;
      }}>
      <div className="d-flex justify-content-center mb-4">
        <h4>Add Account Role</h4>
      </div>
      <section aria-label="Account details" className={cardClass}>
        {loading ? <p role="status">Loading account details...</p> : account && (
          <dl className="row mb-0">
            <dt className="col-sm-3">First Name</dt>
            <dd className="col-sm-9">{account.first_name}</dd>
            <dt className="col-sm-3">Last Name</dt>
            <dd className="col-sm-9">{account.last_name}</dd>
            <dt className="col-sm-3">Email Address</dt>
            <dd className="col-sm-9 text-break mb-0">{account.account_email}</dd>
          </dl>
        )}
        {!loading && !ready && <button type="button" className="btn btn-secondary" onClick={() => setReload((value) => value + 1)}><ActionLabel action="refresh">Reload account details</ActionLabel></button>}
      </section>
      <form onSubmit={handleSubmit} aria-label="Account role selection" className={cardClass}>
          <div className="col-12">
            <label htmlFor="account_role" className="form-label fw-semibold">
              Select Role Type:
            </label>
            <select
              name="account_role"
              id="account_role"
              className="form-select"
              value={accountRole}
              disabled={busy || !ready}
              onChange={(event) => {
                const role = event.target.value;
                setAccountRole(role);
                setError(assignedRoles.some((assigned) => assigned.account_role === role) ? `This account already has the ${role} role.` : "");
              }}
            >
              {roleTypes.map((x) => {
                return (
                  <option key={x.id} value={x.role}>
                    {x.role}
                  </option>
                );
              })}
            </select>
          </div>
          {!registerMember && <button className="btn btn-success align-self-center my-3" disabled={busy || !ready}>
            <ActionLabel action="add">Add Role</ActionLabel>
          </button>}
      </form>
      {registerMember && ready && <section aria-labelledby="register-member-title" className={cardClass}>
        <h3 id="register-member-title">Register Member</h3>
        <MemberRegistrationForm key={account_email} accountEmail={account_email} initialAccount={account}
          submitLabel="Register" centeredActions
          onError={setError}
          onBusyChange={setBusy} onCancel={() => setAccountRole(ROLES.NONMEMBER)}
          onSuccess={() => {
            NavigateTo("/adminDashboard/accountRoles/" + encodeURIComponent(account_email), { state: { memberRegisteredFor: account_email } });
          }} />
      </section>}
      <Popup ref={errorDialog} title="Account Role Error" message={error}
        onCancel={(event) => { event.preventDefault(); setError(""); }}
        actions={<PopupButton autoFocus onClick={() => setError("")}>OK</PopupButton>} />
    </div>
  );
};

export default AddAccountRole;
