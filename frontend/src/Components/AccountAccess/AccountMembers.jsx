import ActionLabel from "../ActionLabel";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import Axios from "axios";
import Popup, { PopupButton } from "../Popup";

const AccountMembers = () => {
  const { account_email } = useParams();
  const { state } = useLocation();

  const requestScope = useRef(null);
  const deleteDialog = useRef(null);
  const [members, setMembers] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!pendingDelete) return;
    const dialog = deleteDialog.current;
    dialog.showModal();
    return () => dialog.close();
  }, [pendingDelete]);

  useEffect(() => {
    const controller = new AbortController();
    requestScope.current = controller;
    setMembers([]); setDeleting(null); setPendingDelete(null); setError("");
    setNotice(state?.memberUpdatedFor === account_email ? "Member updated successfully." : "");
    Axios.get(
      "http://localhost:3000/account/" + encodeURIComponent(account_email) + "/accountMembers", { signal: controller.signal }
    )
      .then((result) => {
        if (!result.data.Status) throw new Error(result.data.Error || "Unable to load members. Please try again.");
        if (!controller.signal.aborted) setMembers(result.data.Result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.response?.data?.Error || failure.message || "Unable to load members. Please try again.");
      });
    return () => controller.abort();
  }, [account_email, state?.memberUpdatedFor]);

  const handleDelete = async (id) => {
    if (deleting !== null) return;
    const { signal } = requestScope.current;
    setDeleting(id); setError(""); setNotice("");
    try {
      const result = await Axios.delete("http://localhost:3000/account/members/" + id, { signal });
      if (!result.data.Status) throw new Error(result.data.Error || "Unable to delete member. Please try again.");
      if (!signal.aborted) {
        setMembers((current) => current.filter((member) => member.id !== id));
      }
    } catch (failure) {
      if (!signal.aborted) setError(failure.response?.data?.Error || failure.message || "Unable to delete member. Please try again.");
    } finally {
      if (!signal.aborted) setDeleting(null);
    }
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Member List</h3>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Age Group</th>
              <th>Member Email</th>
              <th>Membership Category</th>
              <th>Membership Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((x) => (
              <tr key={x.id}>
                <td>{x.first_name}</td>
                <td>{x.last_name}</td>
                <td>{x.age_group}</td>
                <td>{x.member_email}</td>
                <td>{x.membership_category}</td>
                <td>{x.membership_date}</td>
                <td>
                  <Link
                    to={"/accountDashboard/" + encodeURIComponent(account_email) + "/editMember/" + x.id}
                    className="btn btn-success btn-sm me-2"
                  >
                    <ActionLabel action="edit">Edit</ActionLabel>
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={deleting !== null}
                    onClick={() => setPendingDelete(x)}
                  >
                    <ActionLabel action="delete">{deleting === x.id ? "Deleting..." : "Delete"}</ActionLabel>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Popup ref={deleteDialog} title="Delete Member"
        message={pendingDelete && <>Delete <strong>{pendingDelete.first_name} {pendingDelete.last_name}</strong> ({pendingDelete.member_email})? This cannot be undone.</>}
        onCancel={(event) => { event.preventDefault(); setPendingDelete(null); }}
        actions={pendingDelete && <>
          <PopupButton action="cancel" autoFocus onClick={() => setPendingDelete(null)}>Cancel</PopupButton>
          <PopupButton action="delete" danger onClick={() => {
            setPendingDelete(null);
            handleDelete(pendingDelete.id);
          }}>Delete</PopupButton>
        </>} />
    </div>
  );
};

export default AccountMembers;
