import React, { useState, useContext } from 'react';
import { Context } from '../store/appContext';

export const VerifyCodeModal = ({ email, onClose, switchToLogin }) => {
    const { actions } = useContext(Context);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            setError('Please enter a valid 6-digit code.');
            return;
        }
        setError('');
        const result = await actions.verifyCode(email, code);
        if (result.success) {
            // alert("Verification Successful! You can now log in.");
            switchToLogin();
        } else {
            setError(result.error || 'An unknown error occurred.');
        }
    };

    return (
        <>
            <div className="modal-header border-0 p-0">
                <button
                    type="button"
                    className="btn-close btn-close-white position-absolute top-0 end-0 m-1"
                    onClick={onClose}
                />
            </div>
            <div className="modal-body p-4">
                <h2 className="text-light text-center mt-2 mb-4">Verify Your Account</h2>
                <p className="text-center text-secondary">A 6-digit verification code has been sent to <strong>{email}</strong>. Please enter it below.</p>
                <form onSubmit={handleVerify}>
                    <div className="mb-3">
                        <input
                            type="text"
                            className="form-control bg-dark text-light"
                            style={{ border: '1px solid #414549', padding: '12px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                            maxLength="6"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="_ _ _ _ _ _"
                        />
                    </div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="text-center mt-4 mb-3">
                        <button type="submit" className="btn btn-primary w-100 py-2">Verify Account</button>
                    </div>
                    <div className="text-center text-secondary small-font">
                        <span
                            onClick={switchToLogin}
                            className="ms-1 text-secondary auth-link"
                        >
                            Back to Login
                        </span>
                    </div>
                </form>
            </div>
        </>
    );
}; 