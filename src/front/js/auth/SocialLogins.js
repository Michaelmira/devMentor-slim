import React, { useState } from 'react';

export const SocialLogins = ({ userType = 'customer' }) => {
    const [error, setError] = useState('');

    const handleSocialLogin = (provider) => {
        try {
            // Add userType to the URL to indicate whether this is a mentor or customer login
            window.location.href = `${process.env.BACKEND_URL}/api/login/${provider}?user_type=${userType}`;
        } catch (err) {
            setError('Failed to initiate social login. Please try again.');
            console.error('Social login error:', err);
        }
    };

    return (
        <React.Fragment>
            <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1" />
                <span className="px-2 text-muted">or</span>
                <hr className="flex-grow-1" />
            </div>
            {error && (
                <div className="alert alert-danger mb-3" role="alert">
                    {error}
                </div>
            )}
            <div className="d-grid gap-2">
                <button
                    className="btn btn-outline-light"
                    onClick={() => handleSocialLogin('google')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    <i className="fab fa-google"></i>
                    Continue with Google
                </button>
                <button
                    className="btn btn-outline-light"
                    onClick={() => handleSocialLogin('github')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    <i className="fab fa-github"></i>
                    Continue with GitHub
                </button>
            </div>
        </React.Fragment>
    );
}; 