import { useState, useEffect } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";

const MembershipPrices = () => {
  const [membershipPrices, setMembershipPrices] = useState([]);
  useEffect(() => {
    Axios.get("http://localhost:3000/auth/membershipPrices")
      .then((result) => {
        if (result.data.Status) {
          setMembershipPrices(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h4>Membership Prices</h4>
      </div>
      <Link to="/adminDashboard/addMembershipPrice" className="btn btn-primary">
        Add Membership Price
      </Link>
      <div className="mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Category </th>
              <th>Price </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {membershipPrices.map((x) => (
              <tr key={x.id}>
                <td>{x.category}</td>
                <td>{x.price}</td>
                <td>
                  <Link
                    //to={"/adminDashboard/editEmployee/" + value.id}
                    className="btn btn-info btn-sm me-2"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    //onClick={() => handleDelete(value.id)}
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

export default MembershipPrices;
