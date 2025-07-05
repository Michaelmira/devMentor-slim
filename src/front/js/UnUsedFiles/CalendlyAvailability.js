// CalendlyAvailability.js - Updated with MVP OAuth buttons
import React, { useState, useEffect, useContext, useRef } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import { Context } from "../store/appContext";
import { useParams } from 'react-router-dom';
import { CustomerLogin } from '../auth/CustomerLogin';
import { CustomerSignup } from '../auth/CustomerSignup';
import { VerifyCodeModal } from '../auth/VerifyCodeModal';
import { MVPGoogleOAuthButton } from '../auth/MVPGoogelOAuthButton';
import { MVPGitHubOAuthButton } from '../auth/MVPGitHubOAuthButton';

import { PaymentForm } from '../component/PaymentForm';

export const CalendlyAvailability = ({ mentorId, mentor, onPaymentSuccess, onCancel }) => {
  const { store, actions } = useContext(Context);
  const { theid } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(mentor);

  // States for our booking flow
  const [showCalendly, setShowCalendly] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState('login');
  const [emailForVerification, setEmailForVerification] = useState("");

  // Calendar container reference
  const calendlyContainerRef = useRef(null);

  // Check for OAuth redirect on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mvpGoogleAuth = urlParams.get('mvp_google_auth');
    const mvpGithubAuth = urlParams.get('mvp_github_auth');
    const token = urlParams.get('token');
    const userId = urlParams.get('user_id');
    const userType = urlParams.get('user_type');
    
    // If we're returning from OAuth, process it directly here
    if ((mvpGoogleAuth === 'success' || mvpGithubAuth === 'success') && token && userId && userType === 'customer') {
      console.log("Detected OAuth redirect, processing authentication");
      console.log("OAuth params:", { mvpGoogleAuth, mvpGithubAuth, token: !!token, userId });
      
      // Hide Calendly and show auth form first
      setShowCalendly(false);
      setShowAuthForm(true);
      
      // Process the OAuth verification directly
      const processOAuth = async () => {
        try {
          const authAction = mvpGoogleAuth === 'success' ? 'verifyMVPGoogleAuth' : 'verifyMVPGitHubAuth';
          const result = await actions[authAction]({
            token,
            user_id: userId,
            user_type: userType
          });

          if (result.success) {
            console.log("OAuth verification successful, proceeding to payment");
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            // Move to payment
            setShowAuthForm(false);
            setShowPaymentForm(true);
          } else {
            console.error("OAuth verification failed:", result.message);
            alert(result.message || "Authentication failed. Please try again.");
          }
        } catch (error) {
          console.error("OAuth processing error:", error);
          alert("An error occurred during authentication. Please try again.");
        }
      };
      
      // Small delay to ensure component is ready
      setTimeout(processOAuth, 100);
    }
  }, [actions]);

  useEffect(() => {
    // If mentor object is directly passed, use it
    if (mentor) {
      setCurrentMentor(mentor);
      return;
    }

    // Otherwise, get mentor ID from props or params
    const targetMentorId = mentorId || theid;

    // Find mentor in store if available
    if (store.mentors.length > 0) {
      const foundMentor = store.mentors.find(m => m.id.toString() === targetMentorId?.toString());
      if (foundMentor) {
        setCurrentMentor(foundMentor);
      }
    } else if (targetMentorId) {
      // If not in store, fetch it
      actions.getMentorById(targetMentorId).then(data => {
        if (data) setCurrentMentor(data);
      });
    }
  }, [mentor, mentorId, theid, store.mentors, actions]);

  // Check if we have a valid Calendly URL
  const calendlyUrl = currentMentor?.calendly_url;
  const isValidUrl = calendlyUrl &&
    typeof calendlyUrl === 'string' &&
    calendlyUrl.trim() !== '' &&
    calendlyUrl.includes('calendly.com');

  // Widget styling - ensure full visibility
  const styles = {
    height: '700px',
    minWidth: '320px',
    position: 'relative',
  };

  // Optional prefill with mentor's info if available
  const prefill = {
    email: "",
    name: ""
  };

  // UTM parameters for tracking
  const utm = {
    utmSource: "mentor_platform",
    utmMedium: "scheduling_page",
    utmCampaign: "mentorship_booking"
  };

  // Listener to move to auth/payment after a time is selected
  useCalendlyEventListener({
    onDateAndTimeSelected: () => {
      // console.log("Calendly: Date and time selected by user. Proceeding to auth/payment."); // Informative, can be kept or commented
      setShowCalendly(false);
      if (store.token && store.currentUserData) {
        setShowPaymentForm(true);
      } else {
        setShowAuthForm(true);
      }
    }
  });

  // Loading state management
  useEffect(() => {
    if (isValidUrl) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [isValidUrl, calendlyUrl]);

  const handleCalendlyLoad = () => {
    setIsLoading(false);
  };

  const handleCalendlyError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Auth form handlers
  const handleLoginSuccess = () => {
    setShowAuthForm(false);
    setShowPaymentForm(true);
  };

  const handleSignupSuccess = (email) => {
    setEmailForVerification(email);
    setShowAuthForm(false);
    setShowVerifyCode(true);
  };

  const handleVerificationComplete = () => {
    setShowVerifyCode(false);
    setActiveAuthTab('login'); // Switch back to login tab
    setShowAuthForm(true); // Show auth form again for login
  };

  const handleSwitchTab = (tab) => {
    setActiveAuthTab(tab);
  };

  // MVP OAuth success handlers
  const handleMVPOAuthSuccess = (result) => {
    // OAuth was successful, proceed to payment
    console.log("MVP OAuth success, proceeding to payment step");
    setShowAuthForm(false);
    setShowPaymentForm(true);
  };

  // Effect to handle OAuth redirect and auto-progression
  useEffect(() => {
    // If we're showing auth form but user is now logged in (from OAuth), proceed to payment
    if (showAuthForm && store.token && store.currentUserData) {
      console.log("User is now logged in via OAuth, proceeding to payment");
      setShowAuthForm(false);
      setShowPaymentForm(true);
    }
  }, [store.token, store.currentUserData, showAuthForm]);

  // Effect to scroll to payment when payment form is shown (NEW - just the scroll feature)
  useEffect(() => {
    if (showPaymentForm) {
      setTimeout(() => {
        if (calendlyContainerRef.current) {
          calendlyContainerRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  }, [showPaymentForm]);

  const handlePaymentSuccess = (paymentIntent) => {
    // console.log("handlePaymentSuccess called with:", { // Can be removed, data logged below
    //   currentMentor: !!currentMentor,
    //   paymentIntent: !!paymentIntent
    // });

    // Enhanced validation
    if (!currentMentor) {
      console.error("handlePaymentSuccess: currentMentor is missing");
      alert("Error: Mentor information is missing. Please contact support with your payment confirmation.");
      return;
    }

    // Record the successful payment
    const now = new Date();
    const currentDateTime = now.toISOString();

    const bookingData = {
      mentorId: currentMentor.id,
      paidDateTime: currentDateTime,
      clientEmail: store.currentUserData?.user_data?.email || '',
      amount: parseFloat(currentMentor.price || 0),
      mentorPayout: parseFloat(currentMentor.price || 0) * 0.9,
      platformFee: parseFloat(currentMentor.price || 0) * 0.1,
      status: 'paid',
      stripePaymentIntentId: paymentIntent?.id || null
    };

    // console.log("Sending booking data (including Stripe ID if available):", bookingData); // Verbose, can be removed

    actions.trackMentorBooking(bookingData)
      .then(bookingResult => {
        if (bookingResult && bookingResult.success && bookingResult.data && bookingResult.data.id) {
          console.log("Booking successfully tracked by backend. ID:", bookingResult.data.id); // Good to keep

          // Instead of navigating, call the parent component's callback
          if (onPaymentSuccess) {
            onPaymentSuccess(paymentIntent, bookingResult.data.id, currentMentor);
          }

        } else {
          console.warn("Payment was successful, but backend booking tracking did not yield a valid booking ID from bookingResult.data.id. Proceeding to final Calendly selection without automated linking.", bookingResult);
          alert("Your payment was successful but we encountered an issue linking it to our system. We're proceeding to the final scheduling step. Please note: there might be a slight delay for this booking to fully appear in your account, or it may require support to manually link. Please complete your time selection.");

          // Still call the callback even without booking ID, passing null
          if (onPaymentSuccess) {
            onPaymentSuccess(paymentIntent, null, currentMentor);
          }
        }
      })
      .catch(error => {
        console.error("Error tracking booking with backend:", error);
        alert("Payment was successful, but a critical error occurred while tracking your booking. Please contact support immediately.");

        // Even on error, we can still proceed to scheduling since payment succeeded
        if (onPaymentSuccess) {
          onPaymentSuccess(paymentIntent, null, currentMentor);
        }
      });
  };

  const handleCancel = () => {
    // Reset the booking flow
    setShowAuthForm(false);
    setShowPaymentForm(false);
    setShowVerifyCode(false);
    setShowCalendly(true);
    setEmailForVerification("");

    // Call parent component's cancel callback if provided
    if (onCancel) {
      onCancel();
    }
  };

  // Render the appropriate booking step
  const renderBookingStep = () => {
    if (showCalendly) {
      // Step 1: Calendly booking
      return (
        <>
          {isLoading && (
            <div className="d-flex justify-content-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading Calendly...</span>
              </div>
            </div>
          )}

          <div style={{ opacity: isLoading ? 0.3 : 1 }}>
            <InlineWidget
              url={calendlyUrl}
              styles={styles}
              prefill={prefill}
              utm={utm}
              onLoad={handleCalendlyLoad}
              onError={handleCalendlyError}
            />
          </div>
        </>
      );
    } else if (showVerifyCode) {
      // Step 2: Email verification
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <VerifyCodeModal
              email={emailForVerification}
              onClose={handleCancel}
              switchToLogin={handleVerificationComplete}
            />

            <div className="text-center mt-3">
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                Back to Calendar
              </button>
            </div>
          </div>
        </div>
      );
    } else if (showAuthForm) {
      // Step 3: Authentication form with MVP OAuth buttons
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <h4 className="text-center mb-4">Authentication Required</h4>

            {/* MVP OAuth Buttons */}
            <div className="mb-4">
              <MVPGoogleOAuthButton 
                mentor={currentMentor}
                onSuccess={handleMVPOAuthSuccess}
                buttonText={activeAuthTab === 'login' ? 'Login with Google' : 'Sign up with Google'}
              />
              
              <MVPGitHubOAuthButton 
                mentor={currentMentor}
                onSuccess={handleMVPOAuthSuccess}
                buttonText={activeAuthTab === 'login' ? 'Login with GitHub' : 'Sign up with GitHub'}
              />
              
              {/* Divider */}
              <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1" style={{ borderColor: '#6c757d' }} />
                <span className="px-3 text-secondary">or</span>
                <hr className="flex-grow-1" style={{ borderColor: '#6c757d' }} />
              </div>
            </div>

            {/* Auth tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeAuthTab === 'login' ? 'active' : ''}`}
                  onClick={() => handleSwitchTab('login')}
                >
                  Login
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeAuthTab === 'signup' ? 'active' : ''}`}
                  onClick={() => handleSwitchTab('signup')}
                >
                  Sign Up
                </button>
              </li>
            </ul>

            {/* Auth form */}
            <div className="auth-form-container">
              {activeAuthTab === 'login' ? (
                <CustomerLogin
                  onSuccess={handleLoginSuccess}
                  switchToSignUp={() => handleSwitchTab('signup')}
                  onForgotPs={() => { }}
                />
              ) : (
                <CustomerSignup
                  switchToLogin={() => handleSwitchTab('login')}
                  onSignupSuccess={handleSignupSuccess}
                />
              )}
            </div>

            <div className="text-center mt-3">
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                Back to Calendar
              </button>
            </div>
          </div>
        </div>
      );
    } else if (showPaymentForm) {
      // Step 4: Payment form
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <h4 className="text-center mb-4">Complete Your Booking</h4>

            <PaymentForm
              mentor={currentMentor}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      );
    }

    // Fallback
    return <div>Something went wrong. Please try again.</div>;
  };

  return (
    <div className="calendly-container" ref={calendlyContainerRef}>
      {!currentMentor && (
        <div className="alert alert-info">
          Loading mentor information...
        </div>
      )}

      {currentMentor && !isValidUrl && (
        <div className="alert alert-warning">
          <p><strong>No scheduling link available</strong></p>
          <p>This mentor hasn't set up their availability calendar yet. Please contact them directly to arrange a session.</p>
          {currentMentor.email && (
            <p><strong>Contact:</strong> {currentMentor.email}</p>
          )}
        </div>
      )}

      {isValidUrl && renderBookingStep()}

      {hasError && (
        <div className="alert alert-danger mt-3">
          <p><strong>Error loading calendar</strong></p>
          <p>There was a problem loading the scheduling calendar. Please try again later or contact the mentor directly.</p>
        </div>
      )}
    </div>
  );
};