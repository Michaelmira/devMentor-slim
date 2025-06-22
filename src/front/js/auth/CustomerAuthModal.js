// CustomerAuthModal.js

import React, { useState, useEffect, useRef } from 'react';
import { CustomerLogin } from './CustomerLogin.js';
import { CustomerSignup } from './CustomerSignup.js';
import { ForgotPsModal } from './ForgotPsModal.js';
import { VerifyCodeModal } from './VerifyCodeModal.js';
import { GoogleOAuthButton } from './GoogleOAuthButtons.js';
import { GitHubOAuthButton } from './GitHubOAuthButton.js';
import "../../styles/auth.css";
import { useNavigate } from 'react-router-dom';


export const CustomerAuthModal = ({ initialTab, show, onHide }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showForgotPs, setShowForgotPs] = useState(false);
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState("");
  const modalRef = useRef(null);
  const bsModalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (modalRef.current && window.bootstrap) {
      bsModalRef.current = new window.bootstrap.Modal(modalRef.current, {});
      modalRef.current.addEventListener('hidden.bs.modal', () => {
        if (onHide) onHide();
        setShowForgotPs(false);
        setShowVerifyCode(false);
        const modalBackdrops = document.getElementsByClassName('modal-backdrop');
        while (modalBackdrops.length > 0) {
          modalBackdrops[0].remove();
        }
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    }
    return () => {
      try {
        if (bsModalRef.current?.dispose) {
          bsModalRef.current.dispose();
          const modalBackdrops = document.getElementsByClassName('modal-backdrop');
          while (modalBackdrops.length > 0) {
            modalBackdrops[0].remove();
          }
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }
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
    // Clean up any modal artifacts
    const modalBackdrops = document.getElementsByClassName('modal-backdrop');
    while (modalBackdrops.length > 0) {
      modalBackdrops[0].remove();
    }
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Clear any existing modals from the DOM
    const modals = document.getElementsByClassName('modal');
    Array.from(modals).forEach(modal => {
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
    });
  };

  const cleanupAndNavigate = (path) => {
    handleClose();
    // Force cleanup of any remaining modal elements
    setTimeout(() => {
      const modalBackdrops = document.getElementsByClassName('modal-backdrop');
      while (modalBackdrops.length > 0) {
        modalBackdrops[0].remove();
      }
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Clear any existing modals from the DOM
      const modals = document.getElementsByClassName('modal');
      Array.from(modals).forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
      });

      navigate(path);
    }, 300);
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
  };

  const handleSwitchSignUp = () => {
    setActiveTab('signup');
  };

  const handleTabChange = (tab) => {
    console.log('Changing tab to:', tab);
    setActiveTab(tab);
  };

  const handleGoogleAuthSuccess = () => {
    console.log('Google auth successful, cleaning up and navigating');
    cleanupAndNavigate("/customer-dashboard");
  };

  return (
    <div
      className="modal fade auth"
      id="customerAuthModal"
      tabIndex="-1"
      aria-hidden="true"
      ref={modalRef}
    >
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
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-1"
                  onClick={handleClose}
                />
              </div>
              <div className="modal-body p-4">
                {/* OAuth Buttons */}
                <div className="mb-4">
                  <GoogleOAuthButton 
                    userType="customer" 
                    onSuccess={handleGoogleAuthSuccess}
                    buttonText={activeTab === 'login' ? 'Login with Google' : 'Sign up with Google'}
                  />
                  
                  <GitHubOAuthButton 
                    userType="customer" 
                    onSuccess={handleGoogleAuthSuccess}
                    buttonText={activeTab === 'login' ? 'Login with GitHub' : 'Sign up with GitHub'}
                  />
                  
                  {/* Divider */}
                  <div className="d-flex align-items-center my-3">
                    <hr className="flex-grow-1" style={{ borderColor: '#6c757d' }} />
                    <span className="px-3 text-secondary">or</span>
                    <hr className="flex-grow-1" style={{ borderColor: '#6c757d' }} />
                  </div>
                </div>

                {activeTab === 'login' ? (
                  <CustomerLogin
                    onSuccess={() => {
                      console.log('Login successful, cleaning up and navigating');
                      cleanupAndNavigate("/customer-dashboard");
                    }}
                    switchToSignUp={handleSwitchSignUp}
                    onForgotPs={() => setShowForgotPs(true)}
                  />
                ) : (
                  <CustomerSignup switchToLogin={handleSwitchLogin} onSignupSuccess={handleSignupSuccess} />
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