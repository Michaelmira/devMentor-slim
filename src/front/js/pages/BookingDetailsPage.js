import React from 'react';
import { BookingDetailsForm } from '../component/BookingDetailsForm';
import { useLocation, Link } from 'react-router-dom'; // Added Link for fallback

export const BookingDetailsPage = () => {
    const location = useLocation();
    // Log the entire location.state and specifically calendlyEventData for better inspection
    console.log("BookingDetailsPage location.state:", location.state);
    if (location.state && location.state.calendlyEventData) {
        console.log("BookingDetailsPage calendlyEventData object:", JSON.parse(JSON.stringify(location.state.calendlyEventData)));
    } else {
        console.log("BookingDetailsPage calendlyEventData is missing in location.state");
    }

    // Destructure with fallback for mentorName, and provide default for trackingError
    const { mentorId, calendlyEventData, paymentIntentData, mentorName, trackingError = false } = location.state || {};

    // Check if calendlyEventData and its nested properties exist before accessing them
    const eventStartTime = calendlyEventData && calendlyEventData.payload && calendlyEventData.payload.event && calendlyEventData.payload.event.start_time;

    if (!mentorId || !calendlyEventData || !eventStartTime) { // Also check for eventStartTime
        return (
            <div className="container mt-5 text-center">
                <div className="alert alert-danger">
                    <h4>Booking Error</h4>
                    <p>Essential booking information is missing. This could be due to a network issue or an incomplete payment process.</p>
                    <p>Please try scheduling your session again. If the problem persists, contact support.</p>
                </div>
                <Link to="/" className="btn btn-primary me-2">Go to Homepage</Link>
                <Link to={-1} className="btn btn-secondary">Go Back</Link> {/* Allows user to go back to try again */}
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                    <div className="card shadow-sm">
                        <div className="card-header bg-primary text-white">
                            <h2 className="h4 mb-0">Complete Your Booking with {mentorName || 'Your Mentor'}</h2>
                        </div>
                        <div className="card-body">
                            {trackingError && (
                                <div className="alert alert-warning">
                                    Note: Your payment was successful, but there was an issue confirming the booking on our server. Please complete the details below, and we will attempt to finalize it. Contact support if you don't receive a confirmation.
                                </div>
                            )}
                            <p className="mb-3">Please provide a few more details to finalize your session scheduled for <strong className='text-success'>{new Date(eventStartTime).toLocaleString()}</strong>.</p>
                            <BookingDetailsForm
                                mentorId={mentorId}
                                calendlyEventData={calendlyEventData}
                                paymentIntentData={paymentIntentData}
                                mentorName={mentorName}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 