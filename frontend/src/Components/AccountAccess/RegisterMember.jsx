import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";

const RegisterMember = () => {
  const { account_email } = useParams();

  const [member, setMember] = useState({
    account_email: account_email,
    first_name: "",
    last_name: "",
    age_group: "18-45",
    member_email: "",
    membership_category: "Adult",
    membership_date: "",
  });

  const NavigateTo = useNavigate();

  const [membershipCategories, setMembershipCategories] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/account/membershipCategories")
      .then((result) => {
        if (result.data.Status) {
          setMembershipCategories(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const [ageGroups, setAgeGroups] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/account/ageGroups")
      .then((result) => {
        if (result.data.Status) {
          setAgeGroups(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    Axios.post("http://localhost:3000/account/registerMember", member)
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/accountDashboard/" + account_email);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="registerMemberPage d-flex justify-content-center align-items-center h-100">
      <div className="registerMemberForm p-5 rounded w-50 border">
        <div className="registerMemberError text-warning"></div>
        <h3>Register Member</h3>
        <form className="row g-1" onSubmit={handleSubmit}>
          <div className="col-12">
            <label htmlFor="account_email" className="form-label">
              Account Email
            </label>
            <input
              type="email"
              disabled={true}
              className="form-control rounded-0"
              id="account_email"
              value={member.account_email}
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
              placeholder="Enter First Name"
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
              placeholder="Enter Last Name"
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
              onChange={(event) =>
                setMember({ ...member, age_group: event.target.value })
              }
            >
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
              placeholder="Enter Member Email"
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
              onChange={(event) =>
                setMember({
                  ...member,
                  membership_category: event.target.value,
                })
              }
            >
              {membershipCategories.map((value) => {
                return <option key={value.id}>{value.category}</option>;
              })}
            </select>
          </div>
          <button className="btn btn-success w-100 rounded-0 my-3">
            Register Member
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterMember;
