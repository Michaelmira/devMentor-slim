// CalendlyAvailability.js - Simplified version with direct auth and payment
import React, { useState, useEffect, useContext, useRef } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import { Context } from "../store/appContext";
import { useParams, useNavigate } from 'react-router-dom';
import { CustomerLogin } from '../auth/CustomerLogin';
import { CustomerSignup } from '../auth/CustomerSignup';
import { PaymentForm } from './PaymentForm';

const CalendlyAvailability = ({ mentorId, mentor }) => {
  const { store, actions } = useContext(Context);
  const { theid } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(mentor);

  // States for our booking flow
  const [showCalendly, setShowCalendly] = useState(true);
  const [selectedTimeData, setSelectedTimeData] = useState(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState('login');

  // Calendar container reference
  const calendlyContainerRef = useRef(null);

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

  // Enhanced Calendly event listener with better error handling
  useCalendlyEventListener({
    // onEventScheduled is not suitable for "Payment First" if Calendly creates the event immediately.
    // We will now focus on onDateAndTimeSelected for the simplified flow.
    /*
    onEventScheduled: (e) => {
      console.log("--- CALENDLY EVENT SCHEDULED DEBUG START ---");
      console.log("Full event object (e):", e);
      console.log("e.data structure:", e.data);
      console.log("e.data.payload structure:", e.data?.payload);
      // console.log("Full e.data.payload.event object:", JSON.stringify(e.data?.payload?.event, null, 2)); 
      // console.log("Full e.data.payload.invitee object:", JSON.stringify(e.data?.payload?.invitee, null, 2));

      let eventData = null;
      let inviteeData = null;

      if (e.data?.payload?.event?.uri && e.data?.payload?.invitee?.uri) {
        console.log("Found event and invitee URIs in e.data.payload");
        eventData = e.data.payload.event;
        inviteeData = e.data.payload.invitee;
        
        const scheduledEventDetails = inviteeData?.scheduled_event || eventData;

        const plainEventData = {
          uri: eventData.uri, 
          start_time: scheduledEventDetails?.start_time,
          end_time: scheduledEventDetails?.end_time,
          name: scheduledEventDetails?.name,          
          location: typeof scheduledEventDetails?.location === 'string' ? scheduledEventDetails?.location : scheduledEventDetails?.location?.location,
          invitee_uri: inviteeData.uri, 
          invitee_email: inviteeData.email,
          invitee_name: inviteeData.name,
          invitee_questions_and_answers: inviteeData.questions_and_answers, 
        };

        console.log("Successfully extracted event data from onEventScheduled:", plainEventData);
        setSelectedTimeData(plainEventData); 
        setShowCalendly(false);

        if (store.token && store.currentUserData) {
          setShowPaymentForm(true);
        } else {
          setShowAuthForm(true);
        }
      } else {
        console.error("Could not find valid event/invitee URI in onEventScheduled response");
        console.error("Full payload for onEventScheduled:", JSON.stringify(e.data?.payload, null, 2));

        const fallbackData = {
          uri: null, 
          invitee_uri: null, 
          start_time: e.data?.payload?.event?.start_time || new Date().toISOString(),
          end_time: e.data?.payload?.event?.end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          error: "Calendly event scheduling data incomplete. Manual confirmation may be required."
        };

        setSelectedTimeData(fallbackData);
        setShowCalendly(false);

        if (store.token && store.currentUserData) {
          setShowPaymentForm(true);
        } else {
          setShowAuthForm(true);
        }
      }
      console.log("--- CALENDLY EVENT SCHEDULED DEBUG END ---");
    },
    */
    onDateAndTimeSelected: (e) => {
      console.log("Calendly onDateAndTimeSelected Fired. Event data (e.data):", e.data);
      console.log("onDateAndTimeSelected payload (e.data.payload):", JSON.stringify(e.data?.payload, null, 2)); // Primary log for this approach

      // Attempt to extract proposed start and end times
      const proposedStartTime = e.data?.payload?.event?.startTime || e.data?.payload?.startTime || e.data?.payload?.start_time;
      const proposedEndTime = e.data?.payload?.event?.endTime || e.data?.payload?.endTime || e.data?.payload?.end_time;
      // TODO: Determine the correct path to event type name/details if needed for display
      // const eventTypeName = e.data?.payload?.event?.name || e.data?.payload?.name;


      if (proposedStartTime && proposedEndTime) {
        setSelectedTimeData({
          start_time: proposedStartTime,
          end_time: proposedEndTime,
          // name: eventTypeName, // Optional: if you want to display event type name
          uri: null, // No URI at this stage for the simplified flow
          invitee_uri: null, // No URI at this stage
        });
        setShowCalendly(false); // Hide Calendly
        // Proceed to auth/payment
        if (store.token && store.currentUserData) {
          setShowPaymentForm(true);
        } else {
          setShowAuthForm(true);
        }
      } else {
        console.error("onDateAndTimeSelected: Could not extract proposed start/end times from payload.", e.data?.payload);
        // Handle error: Maybe show a message to the user to manually select or try again.
        // For now, we won't proceed if times are not captured.
        alert("Could not capture the selected time from Calendly. Please try selecting a time slot again, or contact support if the issue persists.");
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

  const handleSwitchTab = (tab) => {
    setActiveAuthTab(tab);
  };

  const handlePaymentSuccess = (paymentIntent) => {
    console.log("handlePaymentSuccess called with:", {
      currentMentor: !!currentMentor,
      selectedTimeData: !!selectedTimeData,
      paymentIntent: !!paymentIntent
    });

    // Enhanced validation
    if (!currentMentor) {
      console.error("handlePaymentSuccess: currentMentor is missing");
      alert("Error: Mentor information is missing. Please contact support with your payment confirmation.");
      return;
    }

    if (!selectedTimeData || !selectedTimeData.uri || !selectedTimeData.invitee_uri) {
      console.error("handlePaymentSuccess: selectedTimeData is missing crucial URI information from Calendly.");
      alert("Error: Critical booking information from Calendly is missing. Please try scheduling again or contact support.");
      setShowPaymentForm(false);
      setShowCalendly(true);
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
      status: 'paid'
    };

    console.log("Sending booking data:", bookingData);

    actions.trackMentorBooking(bookingData)
      .then(success => {
        if (success) {
          console.log("Booking successfully tracked by backend");
          console.log("Navigating with selectedTimeData (should include URI):", selectedTimeData);

          navigate('/booking-details', {
            state: {
              mentorId: currentMentor.id,
              calendlyEventData: selectedTimeData,
              paymentIntentData: paymentIntent,
              mentorName: `${currentMentor.first_name} ${currentMentor.last_name}`
            }
          });
        } else {
          console.warn("Failed to track booking with backend, but payment was successful");
          alert("Payment was successful, but there was an issue tracking the booking on our server. Please contact support if your booking doesn't appear.");

          navigate('/booking-details', {
            state: {
              mentorId: currentMentor.id,
              calendlyEventData: selectedTimeData,
              paymentIntentData: paymentIntent,
              mentorName: `${currentMentor.first_name} ${currentMentor.last_name}`,
              trackingError: true
            }
          });
        }
      })
      .catch(error => {
        console.error("Error tracking booking with backend:", error);
        alert("Payment was successful, but a critical error occurred while tracking your booking. Please contact support immediately.");
      });
  };


  const handleCancel = () => {
    // Reset the booking flow
    setShowAuthForm(false);
    setShowPaymentForm(false);
    setShowCalendly(true);
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
              prefill={{
                name: store.currentUserData?.user_data?.name || '',
                email: store.currentUserData?.user_data?.email || '',
              }}
              utm={utm}
              onLoad={handleCalendlyLoad}
              onError={handleCalendlyError}
            />
          </div>
        </>
      );
    } else if (showAuthForm) {
      // Step 2: Authentication form
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <h4 className="text-center mb-4">Authentication Required</h4>

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
      // Step 3: Payment form
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <h4 className="text-center mb-4">Complete Your Booking</h4>

            <PaymentForm
              mentor={currentMentor}
              paidDateTime={selectedTimeData?.date}
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

export default CalendlyAvailability;