import { useState } from "react";
import Axios from "axios";
import { Link } from "react-router-dom";
import { Eye, EyeSlash } from "phosphor-react";
import loginStyle from "../../../css/Login.module.css";

const ResetPassword = () => {
	const [accountEmail, setAccountEmail] = useState("");
	const [resetCode, setResetCode] = useState("");
	const [accountPassword, setAccountPassword] = useState("");
	const [step, setStep] = useState("email");
	const [displayedCode, setDisplayedCode] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const handleEmailSubmit = (event) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		Axios.post("http://localhost:3000/user/requestPasswordReset", {
			account_email: accountEmail,
		})
			.then((result) => {
				if (!result.data.Status) {
					setError(result.data.Error);
					return;
				}

				setDisplayedCode(result.data.reset_code);
				setStep("code");
			})
			.catch(() => setError("Unable to request a password reset."))
			.finally(() => setIsSubmitting(false));
	};

	const handleCodeSubmit = (event) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		Axios.post("http://localhost:3000/user/verifyPasswordCode", {
			account_email: accountEmail,
			reset_code: resetCode,
		})
			.then((result) => {
				if (!result.data.Status) {
					setError(result.data.Error);
					return;
				}

				setStep("password");
			})
			.catch(() => setError("Unable to verify the reset code."))
			.finally(() => setIsSubmitting(false));
	};

	const handlePasswordSubmit = (event) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		Axios.post("http://localhost:3000/user/resetPassword", {
			account_email: accountEmail,
			reset_code: resetCode,
			account_password: accountPassword,
		})
			.then((result) => {
				if (!result.data.Status) {
					setError(result.data.Error);
					return;
				}

				setMessage("Your password has been updated successfully.");
				setStep("complete");
			})
			.catch(() => setError("Unable to update your password."))
			.finally(() => setIsSubmitting(false));
	};

	return (
		<div
			className={`${loginStyle.loginPage} d-flex justify-content-center align-items-center vh-100`}
		>
			<div
				className={`${loginStyle.loginForm} p-5 rounded-5 border text-orangered`}
			>
				{error && <div className="text-warning mb-3">{error}</div>}
				{step === "email" && (
					<>
						<h3>Reset your password</h3>
						<p>Enter the email address associated with your account.</p>
						<form onSubmit={handleEmailSubmit}>
							<div className="emailForm my-3">
								<label htmlFor="resetEmail" className="visually-hidden">
									Account email
								</label>
								<input
									className="form-control rounded-0"
									type="email"
									id="resetEmail"
									name="email"
									required
									autoComplete="email"
									placeholder="Enter Email"
									value={accountEmail}
									onChange={(event) => setAccountEmail(event.target.value)}
								/>
							</div>
							<div className="text-center">
								<button
									type="submit"
									className={`${loginStyle.loginButton} my-2`}
									disabled={isSubmitting}
								>
									{isSubmitting ? "Checking..." : "Continue"}
								</button>
							</div>
						</form>
						<div className="text-center mt-3">
							<Link to="/login" className={loginStyle.loginLink}>
								Return to Sign In
							</Link>
						</div>
					</>
				)}
				{step === "code" && (
					<>
						<h3>Enter reset code</h3>
						<p>
							For testing, your reset code is <strong>{displayedCode}</strong>.
						</p>
						<form onSubmit={handleCodeSubmit}>
							<input
								className="form-control rounded-0 my-3"
								type="text"
								inputMode="numeric"
								pattern="[0-9]{6}"
								maxLength="6"
								required
								placeholder="Enter six-digit code"
								value={resetCode}
								onChange={(event) => setResetCode(event.target.value)}
							/>
							<button
								type="submit"
								className={`${loginStyle.loginButton} my-2`}
								disabled={isSubmitting}
							>
								Verify Code
							</button>
						</form>
					</>
				)}
				{step === "password" && (
					<>
						<h3>Choose a new password</h3>
						<form onSubmit={handlePasswordSubmit}>
							<div className="position-relative my-3">
								<input
									className="form-control rounded-0 pe-5"
									type={showPassword ? "text" : "password"}
									required
									minLength="8"
									placeholder="Enter new password"
									value={accountPassword}
									onChange={(event) => setAccountPassword(event.target.value)}
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
							<button
								type="submit"
								className={`${loginStyle.loginButton} my-2`}
								disabled={isSubmitting}
							>
								Update Password
							</button>
						</form>
					</>
				)}
				{step === "complete" && (
					<div role="status">
						<h3>Password updated</h3>
						<p>{message}</p>
					</div>
				)}
				{step !== "email" && step !== "complete" && (
					<button
						type="button"
						className={`${loginStyle.loginLink} btn btn-link p-0`}
						onClick={() => {
							setError("");
							setStep("email");
						}}
					>
						Use a different email
					</button>
				)}
				{step === "complete" && (
					<Link to="/login" className={`${loginStyle.loginButton} mt-3`}>
						Return to Sign In
					</Link>
				)}
			</div>
		</div>
	);
};

export default ResetPassword;