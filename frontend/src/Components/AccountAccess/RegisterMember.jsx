import { useNavigate, useParams } from "react-router-dom";
import MemberRegistrationForm from "./MemberRegistrationForm";

const RegisterMember = () => {
  const { account_email } = useParams();
  const navigate = useNavigate();
  return (
    <div className="registerMemberPage d-flex justify-content-center align-items-center h-100">
      <div className="registerMemberForm p-5 rounded w-50 border">
        <h3>Register Member</h3>
        <MemberRegistrationForm key={account_email} accountEmail={account_email}
          onSuccess={() => navigate("/accountDashboard/" + encodeURIComponent(account_email))} />
      </div>
    </div>
  );
};

export default RegisterMember;
