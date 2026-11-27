import ActionLabel from "../ActionLabel";
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Axios from "axios";

const MemberRegistrationForm = ({ accountEmail, memberId, initialAccount, submitLabel, centeredActions = false, onSuccess, onCancel, onBusyChange, onError }) => {
  const editing = memberId !== undefined;
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reportError = onError ?? setError;
  const [reload, setReload] = useState(0);
  const [member, setMember] = useState({
    first_name: "",
    last_name: "",
    age_group: "18-45",
    member_email: "",
    membership_category: "Adult",
  });
  const [membershipCategories, setMembershipCategories] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    active.current = true;
    setLoading(true); reportError("");
    const detailsUrl = editing ? "http://localhost:3000/account/members/" + encodeURIComponent(memberId) : null;
    Promise.all([
      Axios.get("http://localhost:3000/account/membershipCategories", { signal: controller.signal }),
      Axios.get("http://localhost:3000/account/ageGroups", { signal: controller.signal }),
      ...(detailsUrl ? [Axios.get(detailsUrl, { signal: controller.signal })] : []),
    ]).then(([categories, groups, details]) => {
      if (controller.signal.aborted) return;
      for (const result of [categories, groups]) {
        if (!result.data.Status || !Array.isArray(result.data.Result) || !result.data.Result.length) {
          throw new Error(result.data.Error || "Member registration options are unavailable.");
        }
      }
      const account = !editing ? initialAccount : undefined;
      const profile = editing ? details?.data?.Result : undefined;
      if (editing && (!details?.data?.Status || !profile ||
        ["first_name", "last_name", "account_email", "member_email", "age_group", "membership_category"].some((field) => typeof profile[field] !== "string") ||
        profile.account_email.toLowerCase() !== accountEmail.toLowerCase())) {
        throw new Error(details?.data?.Error || "Unable to load member for this account. Please try again.");
      }
      const initial = profile ? { first_name: profile.first_name, last_name: profile.last_name, member_email: profile.member_email,
        age_group: profile.age_group, membership_category: profile.membership_category } :
        account ? { first_name: account.first_name, last_name: account.last_name, member_email: account.account_email } : {};
      setMembershipCategories(categories.data.Result); setAgeGroups(groups.data.Result);
      setMember((current) => {
        const next = { ...current, ...initial };
        return { ...next,
          age_group: groups.data.Result.some((item) => item.group === next.age_group) ? next.age_group : "",
          membership_category: categories.data.Result.some((item) => item.category === next.membership_category) ? next.membership_category : "",
        };
      });
    }).catch((failure) => {
      if (!controller.signal.aborted) reportError(failure.response?.data?.Error || failure.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { active.current = false; controller.abort(); };
  }, [accountEmail, editing, memberId, initialAccount, reload, reportError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || loading) return;
    setBusy(true); onBusyChange?.(true); reportError("");
    const message = editing ? "Unable to update member. Please try again." : "Unable to register member. Please try again.";
    try {
      const result = editing ? await Axios.put("http://localhost:3000/account/members/" + encodeURIComponent(memberId), member) :
        await Axios.post("http://localhost:3000/account/registerMember", { ...member, account_email: accountEmail });
      if (!result.data.Status) throw new Error(result.data.Error || message);
      if (active.current) onSuccess();
    } catch (failure) {
      if (active.current) reportError(failure.response?.data?.Error || failure.message || message);
    } finally {
      if (active.current) { setBusy(false); onBusyChange?.(false); }
    }
  };

  return (
    <>
      {!onError && error && <p role="alert">{error}</p>}
      {loading && <p role="status">{editing ? "Loading member details..." : "Loading member options..."}</p>}
      {!loading && (!membershipCategories.length || !ageGroups.length) &&
        <button type="button" className="btn btn-secondary mb-3" onClick={() => setReload((value) => value + 1)}><ActionLabel action="refresh">{editing ? "Reload details" : "Reload options"}</ActionLabel></button>}
      <form onSubmit={handleSubmit}>
        <fieldset className="row g-1 mx-0" disabled={busy || loading || !membershipCategories.length || !ageGroups.length}>
          <div className="col-12">
            <label htmlFor="account_email" className="form-label">
              Account Email
            </label>
            <input
              type="email"
              disabled={true}
              className="form-control rounded-0"
              id="account_email"
              value={accountEmail}
            />
          </div>
          <div className="col-12">
            <label htmlFor="first_name" className="form-label">
              First Name
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="first_name"
              value={member.first_name}
              placeholder="Enter First Name"
              required
              maxLength={128}
              onChange={(event) =>
                setMember({ ...member, first_name: event.target.value })
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
              value={member.last_name}
              placeholder="Enter Last Name"
              required
              maxLength={128}
              onChange={(event) =>
                setMember({ ...member, last_name: event.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="age_group" className="form-label">
              Age Group
            </label>
            <select
              name="age_group"
              id="age_group"
              className="form-select"
              value={member.age_group}
              required
              onChange={(event) =>
                setMember({ ...member, age_group: event.target.value })
              }
            >
              <option value="" disabled>Select an age group</option>
              {ageGroups.map((x) => {
                return <option key={x.id}>{x.group}</option>;
              })}
            </select>
          </div>
          <div className="col-12">
            <label htmlFor="member_email" className="form-label">
              Member Email
            </label>
            <input
              type="email"
              className="form-control rounded-0"
              id="member_email"
              value={member.member_email}
              placeholder="Enter Member Email"
              required
              maxLength={128}
              autoComplete="off"
              onChange={(event) =>
                setMember({ ...member, member_email: event.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="membership_category" className="form-label">
              Membership Category
            </label>
            <select
              name="membership_category"
              id="membership_category"
              className="form-select"
              value={member.membership_category}
              required
              onChange={(event) =>
                setMember({
                  ...member,
                  membership_category: event.target.value,
                })
              }
            >
              <option value="" disabled>Select a membership category</option>
              {membershipCategories.map((value) => {
                return <option key={value.id}>{value.category}</option>;
              })}
            </select>
          </div>
        </fieldset>
        <div className={centeredActions ? "d-flex justify-content-center align-items-center gap-3 my-3" : undefined}>
          <button type="submit" className={centeredActions ? "btn btn-success" : "btn btn-success w-100 rounded-0 my-3"}
            disabled={busy || loading || !membershipCategories.length || !ageGroups.length}>
            <ActionLabel action={editing ? "save" : "register"}>{busy ? "Saving..." : submitLabel ?? (editing ? "Save Changes" : "Register Member")}</ActionLabel>
          </button>
          {onCancel && <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}><ActionLabel action="cancel">Cancel</ActionLabel></button>}
        </div>
      </form>
    </>
  );
};

MemberRegistrationForm.propTypes = {
  accountEmail: PropTypes.string.isRequired, onSuccess: PropTypes.func.isRequired,
  initialAccount: PropTypes.shape({
    first_name: PropTypes.string.isRequired, last_name: PropTypes.string.isRequired, account_email: PropTypes.string.isRequired,
  }),
  memberId: PropTypes.string,
  submitLabel: PropTypes.string, centeredActions: PropTypes.bool,
  onCancel: PropTypes.func, onBusyChange: PropTypes.func, onError: PropTypes.func,
};

export default MemberRegistrationForm;
