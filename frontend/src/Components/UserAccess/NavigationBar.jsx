import { Link } from "react-router-dom";
import { ShoppingCart } from "phosphor-react";

const NavigationBar = () => {
  return (
    <nav
      className="navbar navbar-expand-lg fixed-top bg-dark"
      data-bs-theme="dark"
      id="MainNavigation"
    >
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <img
            src="Images/Uttoron-Logo.png"
            alt=""
            width="151"
            height="42"
            className="d-inline-block align-text-top"
          ></img>
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarResponsive"
          aria-controls="navbarResponsive"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarResponsive">
          <ul className="navbar-nav me-auto ms-10 mb-2 mb-lg-0">
            <li className="nav-item">
              <a className="nav-link fw-semibold text-orangered" href="#">
                Charter
              </a>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle fw-semibold text-orangered"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Membership
              </a>
              <ul className="dropdown-menu bg-dark">
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Membership Benefits
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Become A Member
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Membership Agreement
                  </a>
                </li>
                <li>
                  <hr
                    className="dropdown-divider"
                    style={{ "background-color": "white" }}
                  />
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Membership FAQ
                  </a>
                </li>
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle fw-semibold text-orangered"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Events
              </a>
              <ul className="dropdown-menu bg-dark">
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Event Calendar
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Summer Picnic
                  </a>
                </li>
                <li>
                  <hr
                    className="dropdown-divider"
                    style={{ "background-color": "white" }}
                  />
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Event FAQ
                  </a>
                </li>
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle fw-semibold text-orangered"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Youth of Uttoron (YOU)
              </a>
              <ul className="dropdown-menu bg-dark">
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Event Calendar
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Bangla School
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Submit Program Ideas
                  </a>
                </li>
                <li>
                  <hr
                    className="dropdown-divider"
                    style={{ "background-color": "white" }}
                  />
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    YOU FAQ
                  </a>
                </li>
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle fw-semibold text-orangered"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Resources
              </a>
              <ul className="dropdown-menu bg-dark">
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    New To Seattle
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Publications
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Cultural Program Policy
                  </a>
                </li>
                <li>
                  <hr
                    className="dropdown-divider"
                    style={{ "background-color": "white" }}
                  />
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Communication FAQ
                  </a>
                </li>
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle fw-semibold text-orangered"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Fund Raising
              </a>
              <ul className="dropdown-menu bg-dark">
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Sponsor Events
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Donate to Uttoron
                  </a>
                </li>
              </ul>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle fw-semibold text-orangered"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                About Us
              </a>
              <ul className="dropdown-menu bg-dark">
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Organization
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Constitution
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    By-Laws
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Amendments
                  </a>
                </li>
                <li>
                  <hr
                    className="dropdown-divider"
                    style={{ "background-color": "white" }}
                  />
                </li>
                <li>
                  <a className="dropdown-item text-orangered" href="#">
                    Past Executive Committees
                  </a>
                </li>
              </ul>
            </li>
          </ul>
          <ul className="navbar-nav me-right mb-lg-0">
            {/*
            <li className="nav-item">
              <Link
                to={"/"}
                className="btn btn-custom text-white rounded-5 me-2"
              >
                <i className="bi bi-box-arrow-in-right"></i> Login
              </Link>
            </li>
            */}
            {/*
            <li className="nav-item">
              <Link
                to={"/createAccount"}
                className="btn btn-primary text-white rounded-5 me-2"
              >
                Register
              </Link>
            </li>
            */}
            <li className="nav-item">
              <Link to={"#"}>
                <ShoppingCart size={32} className="text-white me-2" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
