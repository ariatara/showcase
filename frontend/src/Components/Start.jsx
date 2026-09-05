import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Axios from "axios";

const Start = () => {
  Axios.defaults.withCredentials = true;

  const NavigateTo = useNavigate();
  useEffect(() => {
    Axios.get("http://localhost:3000/verify")
      .then((result) => {
        if (result.data.Status) {
          if (result.data.role === "admin") {
            NavigateTo("/adminDashboard");
          } else if (result.data.role === "employee") {
            NavigateTo("/employeeDashboard/" + result.data.id);
          }
        }
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <div className="loginPage d-flex justify-content-center align-items-center vh-100">
      <div className="loginForm p-5 rounded w-25 border">
        <h2 className="text-center">Select Role</h2>
        <div className="d-flex justify-content-between mt-5 mb-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              NavigateTo("/employeeLogin");
            }}
          >
            Member
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={() => {
              NavigateTo("/adminLogin");
            }}
          >
            Administrator
          </button>
        </div>
      </div>
    </div>
  );
};

export default Start;
