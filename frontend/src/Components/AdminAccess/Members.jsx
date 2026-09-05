import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Axios from "axios";

const Members = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    Axios.get("http://localhost:3000/auth/members")
      .then((result) => {
        if (result.data.Status) {
          setMembers(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  /*
  const handleDelete = (id) => {
    Axios.delete("http://localhost:3000/auth/deleteMember/" + id).then(
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
        <h3>Member List</h3>
      </div>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Account Email</th>
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
                <td>{x.account_email}</td>
                <td>{x.first_name}</td>
                <td>{x.last_name}</td>
                <td>{x.age_group}</td>
                <td>{x.member_email}</td>
                <td>{x.membership_category}</td>
                <td>{x.membership_date}</td>
                <td>
                  <Link
                    //to={"/adminDashboard/editMember/" + member.id}
                    className="btn btn-info btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-warning btn-sm"
                    //onClick={() => handleDelete(member.id)}
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

export default Members;
