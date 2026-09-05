import { useEffect, useState } from "react";
import Axios from "axios";

export const AdminHome = () => {
  const [adminTotal, setAdminTotal] = useState(0);
  const [accountTotal, setAccountTotal] = useState(0);
  const [memberTotal, setMemberTotal] = useState(0);
  const [allAdministrators, setAdministrators] = useState([]);

  useEffect(() => {
    adminCount();
    accountCount();
    memberCount();
    adminRecords();
  }, []);

  const adminCount = () => {
    Axios.get("http://localhost:3000/auth/adminCount").then((result) => {
      if (result.data.Status) {
        setAdminTotal(result.data.Result[0].count);
      }
    });
  };

  const accountCount = () => {
    Axios.get("http://localhost:3000/auth/accountCount").then((result) => {
      if (result.data.Status) {
        setAccountTotal(result.data.Result[0].count);
      }
    });
  };

  const memberCount = () => {
    Axios.get("http://localhost:3000/auth/memberCount").then((result) => {
      if (result.data.Status) {
        setMemberTotal(result.data.Result[0].count);
      }
    });
  };

  const adminRecords = () => {
    Axios.get("http://localhost:3000/auth/adminRecords").then((result) => {
      if (result.data.Status) {
        setAdministrators(result.data.Result);
      } else {
        alert(result.data.Error);
      }
    });
  };

  return (
    <div>
      <div className="p-3 d-flex justify-content-around mt-3 text-white">
        <div className="px-3 pt-2 pb-3 border shadow-sm w-25">
          <div className="text-center pb-1">
            <h4>Admins</h4>
          </div>
          <hr />
          <div className="d-flex justify-content-between">
            <h5>Total:</h5>
            <h5>{adminTotal}</h5>
          </div>
        </div>
        <div className="px-3 pt-2 pb-3 border shadow-sm w-25">
          <div className="text-center pb-1">
            <h4>Accounts</h4>
          </div>
          <hr />
          <div className="d-flex justify-content-between">
            <h5>Total:</h5>
            <h5>{accountTotal}</h5>
          </div>
        </div>
        <div className="px-3 pt-2 pb-3 border shadow-sm w-25">
          <div className="text-center pb-1">
            <h4>Members</h4>
          </div>
          <hr />
          <div className="d-flex justify-content-between">
            <h5>Total:</h5>
            <h5>{memberTotal}</h5>
          </div>
        </div>
      </div>
      <div className="mt-4 px-5 pt-3">
        <h3>List of Administrators</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {allAdministrators.map((x) => (
              <tr key={x.id}>
                <td>{x.account_email}</td>
                <td>
                  <button className="btn btn-custom btn-sm me-2">Edit</button>
                  <button className="btn btn-danger btn-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminHome;
