import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Axios from "axios";
import AccountMembers from "./AccountMembers";

const AccountHome = () => {
  Axios.defaults.withCredentials = true;

  const { account_email } = useParams();
  const [account, setAccount] = useState([]);

  useEffect(() => {
    Axios.get("http://localhost:3000/account/accountDetails/" + account_email)
      .then((result) => {
        setAccount(result.data.Result[0]);
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-center flex-column align-items-center my-5">
        <h4>
          Account: {account.first_name} {account.last_name}
        </h4>
        <h4>Email: {account.account_email}</h4>
      </div>
      <hr className="border border-2 border-dark" />
      <div>
        <AccountMembers account_email={account_email}></AccountMembers>
      </div>
    </div>
  );
};

export default AccountHome;
