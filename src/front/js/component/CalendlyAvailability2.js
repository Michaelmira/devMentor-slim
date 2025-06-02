// CalendlyAvailability2.js - Updated to accept props directly
import React, { useState, useEffect, useContext, useRef } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import { Context } from "../store/appContext";
import { useNavigate } from 'react-router-dom';

const CalendlyAvailability2 = ({ mentor: propMentor, paymentIntentData: propPaymentIntentData, bookingId: propBookingId }) => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentMentor, setCurrentMentor] = useState(null);
    const [paymentIntentData, setPaymentIntentData] = useState(null);
    const [originalBookingId, setOriginalBookingId] = useState(null);

    const calendlyContainerRef = useRef(null);

    useEffect(() => {
        // Use props directly instead of location.state
        if (propMentor) {
            setCurrentMentor(propMentor);
        } else {
            console.error("CalendlyAvailability2: Mentor data not provided in props.");
            setHasError(true);
        }

        if (propPaymentIntentData) {
            setPaymentIntentData(propPaymentIntentData);
        }

        if (propBookingId) {
            setOriginalBookingId(propBookingId);
        }

    }, [propMentor, propPaymentIntentData, propBookingId]);

    const calendlyUrl = currentMentor?.calendly_url;
    const isValidUrl = calendlyUrl && typeof calendlyUrl === 'string' && calendlyUrl.trim() !== '' && calendlyUrl.includes('calendly.com');

    const styles = {
        height: '800px',
        minWidth: '320px',
        position: 'relative',
    };

    // User is already logged in, prefill their details
    const prefill = {
        email: store.currentUserData?.user_data?.email || "",
        name: store.currentUserData?.user_data?.name ||
            ((store.currentUserData?.user_data?.first_name || "") + " " + (store.currentUserData?.user_data?.last_name || "")).trim() || "",
    };

    const utm = {
        utmSource: "mentor_platform_finalize",
        utmMedium: "scheduling_page_step2",
        utmCampaign: "mentorship_booking_final"
    };

    useCalendlyEventListener({
        onEventScheduled: async (e) => {
            // console.log("--- CALENDLY EVENT SCHEDULED (CalendlyAvailability2) --- RAW e.data.payload:", JSON.stringify(e.data.payload, null, 2));

            const minimalEventDetails = e.data.payload?.event;
            const minimalInviteeDetails = e.data.payload?.invitee;

            // console.log("--- Extracted minimalEventDetails ---", JSON.stringify(minimalEventDetails, null, 2));
            // console.log("--- Extracted minimalInviteeDetails ---", JSON.stringify(minimalInviteeDetails, null, 2));

            if (currentMentor && originalBookingId && minimalEventDetails?.uri && minimalInviteeDetails?.uri) {
                try {
                    // console.log(`Attempting to fetch full Calendly details for event URI: ${minimalEventDetails.uri} and update booking ID: ${originalBookingId}`);
                    const backendResponse = await actions.fetchCalendlyDetailsAndUpdateBooking(
                        originalBookingId,
                        minimalEventDetails.uri,
                        minimalInviteeDetails.uri,
                        currentMentor.id
                    );

                    if (backendResponse && backendResponse.success) {
                        console.log("Successfully fetched Calendly details and updated booking from backend.", backendResponse.booking);
                        navigate(`/booking-confirmed/${originalBookingId}`, {
                            state: {
                                bookingDetails: backendResponse.booking,
                                mentorName: `${currentMentor.first_name} ${currentMentor.last_name}`,
                            }
                        });
                    } else {
                        console.warn("Failed to fetch full Calendly details or update booking:", backendResponse?.message);
                        alert(backendResponse?.message || "Could not finalize your booking with full Calendly details. Please contact support.");
                        // Potentially navigate to dashboard or show error message
                        navigate('/dashboard');
                    }
                } catch (error) {
                    console.error("Error in onEventScheduled while fetching/updating details:", error);
                    alert("An unexpected error occurred while finalizing your booking. Please contact support.");
                    navigate('/dashboard');
                }
            } else {
                console.error("Calendly onEventScheduled error: Missing crucial URIs or booking/mentor info.", {
                    payload: e.data.payload,
                    originalBookingId,
                    currentMentor: !!currentMentor
                });
                alert("Your event may be scheduled with Calendly, but we had an issue processing the initial details. Please contact support.");
            }
        },
        onDateAndTimeSelected: (e) => {
            // console.log("Date and Time selected in CalendlyAvailability2 (informational):", e);
        },
        onPageHeightResize: (e) => { /* console.log('height resized', e.data.payload) */ }
    });

    useEffect(() => {
        if (isValidUrl) {
            setIsLoading(true);
            const timer = setTimeout(() => setIsLoading(false), 1500);
            return () => clearTimeout(timer);
        } else if (currentMentor) {
            setIsLoading(false);
            setHasError(true);
        }
    }, [isValidUrl, currentMentor]);

    const handleCancelFinalStep = () => {
        console.log("User cancelled final Calendly selection step.");
        navigate('/dashboard');
        alert("You have cancelled the final booking step. Your payment was processed. Please contact support if you wish to reschedule or need assistance.");
    };

    if (!currentMentor && !hasError) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4 mb-5">
            <div className="row justify-content-center">
                <div className="col-md-10 col-lg-8">
                    <div className="card shadow-sm">
                        <div className="card-header bg-success text-white">
                            <h4 className="mb-0 text-center">Confirm Your Booking Time</h4>
                        </div>
                        <div className="card-body p-4">
                            {hasError && !currentMentor && (
                                <div className="alert alert-danger">
                                    Could not load mentor details. Please try again or contact support.
                                </div>
                            )}
                            {currentMentor && !isValidUrl && (
                                <div className="alert alert-warning">
                                    <p><strong>Scheduling Not Available</strong></p>
                                    <p>The scheduling calendar for {currentMentor.first_name} {currentMentor.last_name} is currently unavailable. Please contact support.</p>
                                </div>
                            )}
                            {currentMentor && isValidUrl && (
                                <>
                                    <p className="text-center mb-3">
                                        Please select your preferred date and time for your session with <strong>{currentMentor.first_name} {currentMentor.last_name}</strong>.
                                    </p>
                                    <p className="text-center text-muted small mb-4">
                                        Your payment is confirmed. This final step reserves your slot directly in the mentor's calendar.
                                    </p>

                                    {isLoading && (
                                        <div className="d-flex justify-content-center my-5">
                                            <div className="spinner-border text-success" style={{ width: "3rem", height: "3rem" }} role="status">
                                                <span className="visually-hidden">Loading Calendar...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{
                                        opacity: isLoading ? 0 : 1,
                                        transition: 'opacity 0.5s ease-in-out',
                                        minHeight: isLoading ? '700px' : 'auto'
                                    }} ref={calendlyContainerRef}>
                                        {!isLoading && (
                                            <InlineWidget
                                                url={calendlyUrl}
                                                styles={styles}
                                                prefill={prefill}
                                                utm={utm}
                                                pageSettings={{
                                                    hideEventTypeDetails: false,
                                                    hideLandingPageDetails: true,
                                                    backgroundColor: 'ffffff',
                                                    primaryColor: '00a2ff',
                                                    textColor: '4d5055'
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="text-center mt-4">
                                        <button className="btn btn-outline-secondary" onClick={handleCancelFinalStep}>
                                            Cancel and Go to Dashboard
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendlyAvailability2;