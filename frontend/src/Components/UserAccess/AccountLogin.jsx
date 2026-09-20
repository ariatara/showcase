import { useEffect, useRef, useState } from "react";
import Axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeSlash } from "phosphor-react";
import { ROLES } from "../../Configurations/Roles";
import loginStyle from "../../../css/Login.module.css";

const AccountLogin = () => {
  const [accountDetails, setAccountDetails] = useState({
    account_email: "",
    account_password: "",
  });

  const [error, setError] = useState();
  const [showPassword, setShowPassword] = useState(false);
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const loginFormRef = useRef(null);
  const dragRef = useRef(null);
  const NavigateTo = useNavigate();
  Axios.defaults.withCredentials = true;

  useEffect(() => {
    const resetPosition = () => {
      dragRef.current = null;
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
    };
    window.addEventListener("resize", resetPosition);
    return () => window.removeEventListener("resize", resetPosition);
  }, []);

  const handleDragStart = (event) => {
    if (event.button !== 0 || !event.isPrimary || dragRef.current) return;
    if (event.target.closest("input, button, a, label, [data-no-drag]")) return;

    const bounds = loginFormRef.current.getBoundingClientRect();
    const topBoundary =
      document.getElementById("MainNavigation")?.getBoundingClientRect().bottom ?? 0;
    const minX = position.x - bounds.left;
    const minY = position.y - bounds.top + topBoundary;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX - position.x,
      startY: event.clientY - position.y,
      minX,
      minY,
      maxX: minX + Math.max(0, document.documentElement.clientWidth - bounds.width),
      maxY: minY + Math.max(0, window.innerHeight - topBoundary - bounds.height),
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const handleDragMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      handleDragEnd(event);
      return;
    }

    setPosition({
      x: Math.max(drag.minX, Math.min(drag.maxX, event.clientX - drag.startX)),
      y: Math.max(drag.minY, Math.min(drag.maxY, event.clientY - drag.startY)),
    });
  };

  const handleDragEnd = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    Axios.post("http://localhost:3000/user", accountDetails)
      .then((result) => {
        if (result.data.login_status) {
          if (result.data.account_roles.includes(ROLES.ADMINISTRATOR)) {
            sessionStorage.setItem(
              "loginSession",
              JSON.stringify({
                roles: result.data.account_roles,
                expiry: result.data.login_expiry,
              })
            );
            NavigateTo("/adminDashboard");
          } else if (
            result.data.account_roles.includes(ROLES.MEMBER) ||
            result.data.account_roles.includes(ROLES.NONMEMBER)
          ) {
            sessionStorage.setItem(
              "loginSession",
              JSON.stringify({
                roles: result.data.account_roles,
                expiry: result.data.login_expiry,
              })
            );
            NavigateTo("/accountDashboard/" + accountDetails.account_email);
          }
        } else {
          setError(result.data.Error);
        }
      })
      .catch((error) => console.log(error));
  };

  return (
    <div
      className={`${loginStyle.loginPage} d-flex justify-content-center align-items-center vh-100`}
    >
      <div
        ref={loginFormRef}
        className={`${loginStyle.loginForm} ${isDragging ? loginStyle.dragging : ""} p-5 rounded-5 border text-orangered`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        title="Drag an empty area to move the login window"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onLostPointerCapture={handleDragEnd}
      >
        <div className={`${loginStyle.loginError} text-warning`}>
          {error && <span data-no-drag>{error}</span>}
        </div>
        <h3>
          <span data-no-drag>Account Login</span>
        </h3>
        <form onSubmit={handleLogin}>
          <div className="emailForm my-3">
            <input
              className="form-control rounded-0"
              type="email"
              name="email"
              required
              autoComplete="off"
              placeholder="Enter Email"
              onChange={(e) =>
                setAccountDetails({
                  ...accountDetails,
                  account_email: e.target.value,
                })
              }
            />
          </div>
          <div className="passwordForm my-3">
            <div className="position-relative">
              <input
                className="form-control rounded-0 pe-5"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                placeholder="Enter Password"
                onChange={(e) =>
                  setAccountDetails({
                    ...accountDetails,
                    account_password: e.target.value,
                  })
                }
              />
              <button
                type="button"
                className={loginStyle.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeSlash size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            <Link to={"/resetPassword"} className={`${loginStyle.loginLink}`}>
              Forgot Password?
            </Link>
          </div>
          <div className={`${loginStyle.loginLink} text-center`}>
            <div className="agreementBox">
              <input
                className="agreementCheck me-1"
                type="checkbox"
                name="tick"
                id="tick"
                checked={hasAcceptedAgreement}
                onChange={(e) => setHasAcceptedAgreement(e.target.checked)}
                required
              />
              <label htmlFor="tick">
                I have read the Membership Agreement
              </label>
            </div>
            <div>
              <button
                type="submit"
                className={`${loginStyle.loginButton} my-2`}
                disabled={
                  !accountDetails.account_email ||
                  !accountDetails.account_password ||
                  !hasAcceptedAgreement
                }
              >
                Sign In
              </button>
            </div>
            <Link
              to={"/createAccount"}
              className={`${loginStyle.loginButton} mt-5`}
            >
              No account? Sign up here.
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountLogin;
