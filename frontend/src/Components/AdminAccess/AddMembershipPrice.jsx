import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";

const AddMembershipPrice = () => {
  const NavigateTo = useNavigate();

  const [membershipCategories, setMembershipCategories] = useState([]);

  useEffect(() => {
    Axios.get("http://localhost:3000/auth/membershipCategories")
      .then((result) => {
        if (result.data.Status) {
          setMembershipCategories(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  const [membershipPrice, setMembershipPrice] = useState({
    category: "Adult",
    price: "",
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    Axios.post("http://localhost:3000/auth/addMembershipPrice", membershipPrice)
      .then((result) => {
        if (result.data.Status) {
          NavigateTo("/adminDashboard/membershipPrices");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="addMembershipPricePage d-flex justify-content-center align-items-center h-100">
      <div className="addMembershipPriceForm p-5 rounded w-25 border">
        <div className="addMembershipPriceError text-warning"></div>
        <h5>Add Membership Price:</h5>
        <form onSubmit={handleSubmit}>
          <div className="priceForm my-3">
            <input
              className="form-control rounded-0"
              type="text"
              name="category"
              placeholder="Enter Membership Price"
              onChange={(event) =>
                setMembershipPrice({
                  ...membershipPrice,
                  price: event.target.value,
                })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="categories" className="form-label">
              <h5>Select Category:</h5>
            </label>
            <select
              name="category"
              id="category"
              className="form-select"
              onChange={(event) =>
                setMembershipPrice({
                  ...membershipPrice,
                  category: event.target.value,
                })
              }
            >
              {membershipCategories.map((x) => {
                return <option key={x.id}>{x.category}</option>;
              })}
            </select>
          </div>
          <button className="btn btn-success w-100 rounded-0 my-3">
            Add Membership Price
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMembershipPrice;
