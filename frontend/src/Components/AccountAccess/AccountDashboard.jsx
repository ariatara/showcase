import { useParams, useNavigate, Link, Outlet } from "react-router-dom";
import Axios from "axios";

const AccountDashboard = () => {
  Axios.defaults.withCredentials = true;

  const { account_email } = useParams();

  const NavigateTo = useNavigate();

  const handleLogout = () => {
    Axios.get("http://localhost:3000/account/logout")
      .then((result) => {
        if (result.data.Status) {
          sessionStorage.removeItem("loginSession");
          NavigateTo("/");
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="container-fluid pt-6">
      <div className="row flex-nowrap">
        <div className="col-auto col-md-3 col-xl-2 px-sm-2 px-0 bg-dark">
          <div className="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white min-vh-100">
            <Link
              to="/accountDashboard"
              className="d-flex align-items-center pb-3 mb-md-1 mt-md-3 me-md-auto text-white text-decoration-none"
            >
              <span className="fs-5 fw-bolder d-none d-sm-inline">
                Account Menu
              </span>
            </Link>
            <ul
              className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start"
              id="menu"
            >
              <li className="w-100">
                <Link
                  to={"/accountDashboard/" + account_email}
                  className="nav-link text-white px-0 align-middle"
                >
                  <i className="fs-4 bi-boxes ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">
                    Account Dashboard
                  </span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to={"/accountDashboard/" + account_email + "/registerMember"}
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="fs-4 bi-person-plus-fill ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">
                    Register Member
                  </span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  //to={"/accountDashboard/" + account_email + "/viewOrders"}
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="fs-4 bi-bag-fill ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">View Orders</span>
                </Link>
              </li>
              <li className="w-100" onClick={handleLogout}>
                <Link className="nav-link px-0 align-middle text-white">
                  <i className="fs-4 bi-power ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Logout</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="col p-0 m-0">
          <div className="p-2 d-flex justify-content-center shadow">
            <h3>Account Dashboard</h3>
          </div>
          <Outlet></Outlet>
        </div>
      </div>
    </div>
  );
};

export default AccountDashboard;
