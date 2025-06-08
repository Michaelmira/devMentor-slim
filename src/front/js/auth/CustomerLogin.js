//CustomerLogin.js

import React, { useContext, useState } from "react";
import { Context } from "../store/appContext";
import { ValidateEmail, ValidatePassword } from "../component/Validators"; // Ensure path is correct
import { SocialLogins } from "./SocialLogins";
import { useNavigate } from "react-router-dom";


export const CustomerLogin = ({ onSuccess, switchToSignUp, onForgotPs }) => {
    const { actions } = useContext(Context);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [invalidItems, setInvalidItems] = useState([]);
    const [apiError, setApiError] = useState(""); // To hold API error messages
    const navigate = useNavigate();

    const handleLogin = async () => {
        // Reset errors
        setInvalidItems([]);
        setApiError("");

        const isEmailValid = ValidateEmail(email, setInvalidItems);
        const isPasswordValid = ValidatePassword(password, setInvalidItems);

        // Proceed if validations pass
        if (isEmailValid && isPasswordValid) {
            const result = await actions.logInCustomer({ email, password });
            if (result.success) {
                if (onSuccess) onSuccess();
                navigate("/customer-dashboard");
            } else {
                // Set the error message from the API response
                setApiError(result.message || "Email and/or password is incorrect. Please try again.");
            }
        }
    };

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
        }}>
            <div className="row justify-content-center authDiv">
                <div className="col-12 text-light">
                    <h2 className="text-center mt-2 mb-4">Welcome Back!</h2>
                    <div className="mb-3">
                        <input
                            type="email"
                            className={`form-control bg-dark text-light ${invalidItems.includes("email") ? 'is-invalid' : ''}`}
                            style={{
                                border: invalidItems.includes("email") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                        {invalidItems.includes("email") && (
                            <div className="invalid-feedback">Invalid email format</div>
                        )}
                    </div>
                    <div className="mb-3">
                        <input
                            type="password"
                            className={`form-control bg-dark text-light ${invalidItems.includes("password") ? 'is-invalid' : ''}`}
                            style={{
                                border: invalidItems.includes("password") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        {invalidItems.includes("password") && (
                            <div className="invalid-feedback">Password must be 5-20 characters</div>
                        )}
                    </div>
                    {apiError && <p className="text-danger mb-3">{apiError}</p>}
                    <div className="mb-3">
                        <span
                            onClick={onForgotPs}
                            className="text-secondary auth-link small-font"
                            style={{ cursor: 'pointer' }}
                        >
                            Forgot Password?
                        </span>
                    </div>
                    <button
                        type="submit"
                        className="btn btn-secondary w-100 py-2 mb-3"
                        style={{
                            backgroundColor: '#6c757d',
                            border: 'none',
                            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        Login
                    </button>
                    <div className="text-center text-secondary small-font mb-3">
                        New to our platform?{' '}
                        <span
                            onClick={switchToSignUp}
                            className="text-secondary auth-link"
                            style={{ cursor: 'pointer' }}
                        >
                            Create an account
                        </span>
                    </div>
                    <SocialLogins userType="customer" returnPath="/customer-dashboard" />
                </div>
            </div>
        </form>
    );
};
