import { useNavigate, useParams } from "react-router-dom";
import MemberRegistrationForm from "./MemberRegistrationForm";

const EditMember = () => {
  const { account_email, id } = useParams();
  const navigate = useNavigate();
  const dashboard = "/accountDashboard/" + encodeURIComponent(account_email);
  return (
    <div className="registerMemberPage d-flex justify-content-center align-items-center h-100">
      <div className="registerMemberForm p-4 m-3 rounded border w-100" style={{ maxWidth: "36rem" }}>
        <h3>Edit Member</h3>
        <MemberRegistrationForm key={`${account_email}:${id}`} accountEmail={account_email} memberId={id}
          onCancel={() => navigate(dashboard)}
          onSuccess={() => navigate(dashboard, { state: { memberUpdatedFor: account_email } })} />
      </div>
    </div>
  );
};

export default EditMember;
