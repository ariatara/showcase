import { Navigate } from "react-router-dom";
import { ROLES } from "../../Configurations/Roles";

const AdminRoutes = ({ children }) => {
  const loginSession = JSON.parse(sessionStorage.getItem("loginSession"));

  const sessionValid = loginSession.expiry * 1000 > Date.now() ? true : false;

  return sessionValid && loginSession.roles.includes(ROLES.ADMINISTRATOR) ? (
    children
  ) : (
    <Navigate to="/" />
  );
};

/*
const AdminRoutes = ({ children }) => {
  Axios.get("http://localhost:3000/verifyRole/" + ROLES.ADMINISTRATOR)
    .then((result) => {
      if (result.data.Status) {
        console.log("Verify role: " + result.data.Status);

        return children;
      } else {
        return <Navigate to="/" />;
      }
    })
    .catch((error) => console.log(error));
};
*/

export default AdminRoutes;
