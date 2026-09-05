import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";

const AddMembershipCategory = () => {
  const [membershipCategory, setMembershipCategory] = useState();

  const NavigateTo = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/auth/addMembershipCategory", {
      membershipCategory,
    })
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/membershipCategories");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="addMembershipCategoryPage d-flex justify-content-center align-items-center h-100">
      <div className="addMembershipCategoryForm p-5 rounded w-25 border">
        <div className="addMembershipCategoryError text-warning"></div>
        <h5>Add Membership Category:</h5>
        <form onSubmit={handleSubmit}>
          <div className="categoryForm my-3">
            <input
              className="form-control rounded-0"
              type="text"
              name="category"
              placeholder="Enter Membership Category"
              onChange={(event) => setMembershipCategory(event.target.value)}
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

export default AddMembershipCategory;
