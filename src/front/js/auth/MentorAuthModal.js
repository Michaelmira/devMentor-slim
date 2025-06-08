import React, { useState, useEffect, useRef } from 'react';
import { MentorLogin } from "./MentorLogin.js";
import { MentorSignup } from "./MentorSignup.js";
import { ForgotPsModal } from './ForgotPsModal.js';
import { VerifyCodeModal } from './VerifyCodeModal.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import "../../styles/auth.css";


export const MentorAuthModal = ({ initialTab, show, onHide }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showForgotPs, setShowForgotPs] = useState(false);
    const [showVerifyCode, setShowVerifyCode] = useState(false);
    const [emailForVerification, setEmailForVerification] = useState("");
    const [searchParams] = useSearchParams();
    const [socialLoginError, setSocialLoginError] = useState("");
    const modalRef = useRef(null);
    const bsModalRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for social login error in sessionStorage
        const error = sessionStorage.getItem('social_login_error');
        if (error) {
            setSocialLoginError(error);
            // Clear the error from sessionStorage
            sessionStorage.removeItem('social_login_error');
        }
    }, []);

    useEffect(() => {
        if (modalRef.current && window.bootstrap) {
            bsModalRef.current = new window.bootstrap.Modal(modalRef.current, {});
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                if (onHide) onHide();
                setShowForgotPs(false);
                setShowVerifyCode(false);
                setSocialLoginError(""); // Clear any error when modal is closed
            });
        }
        return () => {
            try {
                if (bsModalRef.current?.dispose) bsModalRef.current.dispose();
            } catch (error) {
                console.error('Error disposing modal:', error);
            }
            bsModalRef.current = null;
        };
    }, [onHide]);

    useEffect(() => {
        if (bsModalRef.current) {
            if (show) {
                setActiveTab(initialTab);
                bsModalRef.current.show();
            } else {
                bsModalRef.current.hide();
            }
        }
    }, [show, initialTab]);

    useEffect(() => {
        const modal = bsModalRef.current;
        if (modal && modal._config) {
            const isSubModalActive = showForgotPs || showVerifyCode;
            modal._config.keyboard = !isSubModalActive;
            modal._config.backdrop = isSubModalActive ? 'static' : true;
        }
    }, [showForgotPs, showVerifyCode]);

    const handleClose = () => {
        if (bsModalRef.current) {
            bsModalRef.current.hide();
        }
    };

    const handleSignupSuccess = (email) => {
        setEmailForVerification(email);
        setShowVerifyCode(true);
    };

    const handleForgotPsReturn = () => {
        setShowForgotPs(false);
        setActiveTab('login');
    };


    const handleSwitchLogin = () => {
        setShowVerifyCode(false);
        setActiveTab('login');
    }

    const handleSwitchSignUp = () => {
        setActiveTab('signup');
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div
            className="modal fade auth"
            id="mentorAuthModal"
            tabIndex="-1"
            aria-hidden="true"
            ref={modalRef}
        >
            {/* <div className="modal-dialog modal-dialog-centered"> */}
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div
                    className="modal-content bg-dark"
                    style={{
                        boxShadow: '0 0 30px rgba(0, 0, 0, 0.7)',
                    }}
                >
                    {!showForgotPs && !showVerifyCode ? (
                        <>
                            <div className="modal-header border-0 p-0">
                                <div className="d-flex w-100 position-relative">
                                    <button
                                        className={`flex-fill border-0 auth-tab login-tab ${activeTab === 'login'
                                            ? 'active text-white'
                                            : 'text-secondary'
                                            }`}
                                        onClick={() => handleTabChange('login')}
                                    >
                                        Login
                                    </button>
                                    <div className="vr" style={{ backgroundColor: '#6c757d', marginTop: '15px', marginBottom: '15px' }}></div>
                                    <button
                                        className={`flex-fill border-0 auth-tab signup-tab ${activeTab === 'signup'
                                            ? 'active text-white'
                                            : 'text-secondary'
                                            }`}
                                        onClick={() => handleTabChange('signup')}
                                    >
                                        Sign Up
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white position-absolute top-0 end-0 m-1"
                                        onClick={handleClose}
                                    />
                                </div>
                            </div>
                            <div className="modal-body p-4">
                                {socialLoginError && (
                                    <div className="alert alert-danger" role="alert">
                                        {socialLoginError}
                                    </div>
                                )}
                                {activeTab === 'login' ? (
                                    <MentorLogin
                                        onSuccess={() => {
                                            console.log('Login successful, rerouting to the mentor dashboard page');
                                            handleClose();
                                            navigate("/mentor-dashboard");
                                        }}
                                        switchToSignUp={handleSwitchSignUp}
                                        onForgotPs={() => setShowForgotPs(true)}
                                    />
                                ) : (
                                    <MentorSignup switchToLogin={handleSwitchLogin} onSignupSuccess={handleSignupSuccess} />
                                )}
                            </div>
                        </>
                    ) : showForgotPs ? (
                        <ForgotPsModal
                            onClose={handleClose}
                            switchToLogin={handleForgotPsReturn}
                        />
                    ) : (
                        <VerifyCodeModal
                            email={emailForVerification}
                            onClose={handleClose}
                            switchToLogin={handleSwitchLogin}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};