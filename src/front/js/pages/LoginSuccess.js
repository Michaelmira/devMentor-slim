import React, { useEffect, useContext } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Context } from '../store/appContext';

export const LoginSuccess = () => {
    const { actions } = useContext(Context);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');
        const error = searchParams.get('error');

        if (token) {
            actions.handleLoginSuccess(token);
            // After handling the login, getCurrentUser will determine the role
            // and redirect to the correct dashboard.
            actions.getCurrentUser().then(success => {
                if (success) {
                    const role = sessionStorage.getItem("isMentorLoggedIn") === "true" ? "mentor" : "customer";
                    if (role === 'mentor') {
                        navigate('/mentor-dashboard');
                    } else {
                        navigate('/customer-dashboard');
                    }
                } else {
                    // Handle case where token is valid but user fetch fails
                    navigate('/');
                }
            });
        } else if (error === 'social_login_failed') {
            // Store the error in sessionStorage so the modal can pick it up
            sessionStorage.setItem('social_login_error', 'Social login failed. Please try again or use email/password login.');
            // Navigate to home page which will show the auth modal
            navigate('/', { replace: true });
        } else {
            // No token found, redirect to home
            navigate('/');
        }
    }, [location, navigate, actions, searchParams]);

    return (
        <div className="container text-center mt-5">
            <h2>Login Successful</h2>
            <p>Redirecting to your dashboard...</p>
        </div>
    );
}; 