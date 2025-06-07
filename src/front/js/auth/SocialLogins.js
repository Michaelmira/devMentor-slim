import React from 'react';

export const SocialLogins = () => {
    const handleSocialLogin = (provider) => {
        window.location.href = `${process.env.BACKEND_URL}/api/login/${provider}`;
    };

    return (
        <React.Fragment>
            <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1" />
                <span className="px-2 text-muted">or</span>
                <hr className="flex-grow-1" />
            </div>
            <div className="d-grid gap-2">
                <button className="btn btn-outline-light" onClick={() => handleSocialLogin('google')}>
                    <i className="fab fa-google me-2"></i> Continue with Google
                </button>
                <button className="btn btn-outline-light" onClick={() => handleSocialLogin('github')}>
                    <i className="fab fa-github me-2"></i> Continue with GitHub
                </button>
            </div>
        </React.Fragment>
    );
}; 