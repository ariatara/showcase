import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";

const AddAgeGroup = () => {
  const [ageGroup, setAgeGroup] = useState();

  const NavigateTo = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/auth/addAgeGroup", { ageGroup })
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/ageGroups");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="addAgeGroupPage d-flex justify-content-center align-items-center h-100">
      <div className="addAgeGroupForm p-5 rounded w-25 border">
        <div className="addAgeGroupError text-warning"></div>
        <h5>Add Age Group:</h5>
        <form onSubmit={handleSubmit}>
          <div className="ageGroupForm my-3">
            <input
              className="form-control rounded-0"
              type="text"
              name="ageGroup"
              placeholder="Enter Age Group (5-18)"
              onChange={(event) => setAgeGroup(event.target.value)}
            />
          </div>
          <button className="btn btn-success w-100 rounded-0 mb-1">
            Add Membership Category
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAgeGroup;
