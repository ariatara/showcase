import { Link, Outlet, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import Axios from "axios";

const AdminDashboard = () => {
  const NavigateTo = useNavigate();

  Axios.defaults.withCredentials = true;

  const handleLogout = () => {
    Axios.get("http://localhost:3000/auth/logout").then((result) => {
      if (result.data.Status) {
        sessionStorage.removeItem("loginSession");
        NavigateTo("/");
      }
    });
  };

  return (
    <div data-bs-theme="dark" className="container-fluid pt-6 bg-dark">
      <div className="row flex-nowrap">
        <div className="col-auto col-md-3 col-xl-2 px-sm-2 px-0 bg-dark bg-opacity-75">
          <div className="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white min-vh-100">
            <Link
              to="/adminDashboard"
              className="d-flex align-items-center pb-3 mb-md-1 mt-md-3 me-md-auto text-white text-decoration-none"
            >
              <span className="fs-5 fw-bolder d-none d-sm-inline">
                Admin Menu
              </span>
            </Link>
            <ul
              className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start"
              id="menu"
            >
              <li className="w-100">
                <Link
                  to="/adminDashboard"
                  className="nav-link text-white px-0 align-middle"
                >
                  <i className="bi-speedometer2 ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">
                    Admin Dashboard
                  </span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to="/adminDashboard/roleTypes"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-crosshair ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Role Types</span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to="/adminDashboard/ageGroups"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-brilliance ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Age Groups</span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to="/adminDashboard/membershipCategories"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-columns ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">
                    Membership Categories
                  </span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to="/adminDashboard/membershipPrices"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-currency-dollar ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">
                    Membership Prices
                  </span>
                </Link>
              </li>
              <hr></hr>
              <li className="w-100">
                <Link
                  to="/adminDashboard/accounts"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-people ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Account List</span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to="/adminDashboard/members"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-people-fill ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Member List</span>
                </Link>
              </li>
              <hr></hr>
              <li className="w-100">
                <Link
                  to="/adminDashboard/productTypes"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-ticket-detailed ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Product Types</span>
                </Link>
              </li>
              <hr></hr>
              <li className="w-100">
                <Link
                  to="/adminDashboard/events"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="fs-4 bi-calendar2-event ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Event List</span>
                </Link>
              </li>
              <li className="w-100">
                <Link
                  to="/adminDashboard/pages"
                  className="nav-link px-0 align-middle text-white"
                >
                  <i className="bi-file-post ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Page List</span>
                </Link>
              </li>
              <hr></hr>
              <li className="w-100" onClick={handleLogout}>
                <Link className="nav-link px-0 align-middle text-warning">
                  <i className="bi-box-arrow-right ms-2"></i>
                  <span className="ms-2 d-none d-sm-inline">Logout</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="col p-0 m-0">
          <div className="p-2 d-flex justify-content-center shadow text-white">
            <h3>Administrator Dashboard</h3>
          </div>
          <Outlet></Outlet>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
