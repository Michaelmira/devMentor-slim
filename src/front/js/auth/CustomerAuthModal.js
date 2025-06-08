// CustomerAuthModal.js

import React, { useState, useEffect, useRef } from 'react';
import { CustomerLogin } from './CustomerLogin.js';
import { CustomerSignup } from './CustomerSignup.js';
import { ForgotPsModal } from './ForgotPsModal.js';
import { VerifyCodeModal } from './VerifyCodeModal.js';
import "../../styles/auth.css";

export const CustomerAuthModal = ({ initialTab, show, onHide, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showForgotPs, setShowForgotPs] = useState(false);
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState("");
  const [socialLoginError, setSocialLoginError] = useState("");
  const modalRef = useRef(null);
  const bsModalRef = useRef(null);

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
    if (show && bsModalRef.current) {
      bsModalRef.current.show();
    } else if (!show && bsModalRef.current) {
      bsModalRef.current.hide();
    }
  }, [show]);

  const handleClose = () => {
    if (bsModalRef.current) {
      bsModalRef.current.hide();
    }
  };

  const handleSwitchLogin = () => {
    setActiveTab('login');
    setShowVerifyCode(false);
  };

  const handleSwitchSignUp = () => {
    setActiveTab('signup');
  };

  const handleForgotPsReturn = () => {
    setShowForgotPs(false);
  };

  const handleSignupSuccess = (email) => {
    setEmailForVerification(email);
    setShowVerifyCode(true);
  };

  const handleLoginSuccess = () => {
    handleClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark">
          {!showForgotPs && !showVerifyCode ? (
            <>
              <div className="modal-header border-0">
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleClose}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-4">
                {socialLoginError && (
                  <div className="alert alert-danger" role="alert">
                    {socialLoginError}
                  </div>
                )}
                {activeTab === 'login' ? (
                  <CustomerLogin
                    onSuccess={handleLoginSuccess}
                    switchToSignUp={handleSwitchSignUp}
                    onForgotPs={() => setShowForgotPs(true)}
                  />
                ) : (
                  <CustomerSignup
                    switchToLogin={handleSwitchLogin}
                    onSignupSuccess={handleSignupSuccess}
                  />
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

