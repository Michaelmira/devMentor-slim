import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from "../store/appContext";

export const BookingDetailsForm = ({ mentorId, calendlyEventData, paymentIntentData, mentorName }) => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Pre-fill form data if user is logged in
        if (store.currentUserData?.user_data) {
            setFormData(prevData => ({
                ...prevData,
                name: `${store.currentUserData.user_data.first_name || ''} ${store.currentUserData.user_data.last_name || ''}`.trim(),
                email: store.currentUserData.user_data.email || ''
            }));
        } else if (calendlyEventData?.invitee?.email) {
            // If not logged in, but Calendly has an email (e.g. from prefill in previous step)
            setFormData(prevData => ({
                ...prevData,
                email: calendlyEventData.invitee.email
            }));
        }
    }, [store.currentUserData, calendlyEventData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const finalBookingData = {
                mentorId,
                mentorName,
                inviteeName: formData.name,
                inviteeEmail: formData.email,
                notes: formData.notes,
                calendlyScheduledEventUri: calendlyEventData.uri,
                calendlyInviteeUri: null,
                eventStartTime: calendlyEventData.start_time,
                eventEndTime: calendlyEventData.end_time,
                paymentIntentId: paymentIntentData?.id,
                clientSecret: paymentIntentData?.client_secret,
                amountPaid: paymentIntentData?.amount ? paymentIntentData.amount / 100 : null, // Convert cents to dollars
                currency: 'usd'
            };

            console.log("Final Booking Data to be processed:", finalBookingData);

            // THIS IS THE MISSING CALL - ADD THIS:
            const result = await actions.finalizeBooking(finalBookingData);

            if (result.success) {
                console.log("Booking finalized successfully!", result.bookingDetails);
                setIsLoading(false);
                // Navigate to success page or show success message
                navigate('/booking-confirmed', {
                    state: {
                        bookingDetails: result.bookingDetails,
                        mentorName: mentorName, // Pass mentorName for display
                        requiresManualConfirmation: result.requires_manual_confirmation // Pass this flag too
                    }
                });
            } else {
                setError(result.message || "Failed to finalize booking");
                setIsLoading(false);
            }

        } catch (error) {
            console.error("Error in handleSubmit:", error);
            setError("An error occurred while finalizing your booking");
            setIsLoading(false);
        }
    };

    // Enhanced validation for calendlyEventData
    if (!calendlyEventData) {
        return (
            <div className="alert alert-warning">
                <h5>Missing Booking Information</h5>
                <p>Essential booking details are missing. This could happen due to:</p>
                <ul>
                    <li>A problem with the Calendly integration</li>
                    <li>A network connection issue</li>
                    <li>An incomplete payment process</li>
                </ul>
                <p>Please try booking again. If the problem persists, contact support.</p>
            </div>
        );
    }

    // Show warning if we have fallback data
    const hasLimitedData = calendlyEventData.error === "Limited event data available";

    return (

        <>
            {hasLimitedData && (
                <div className="alert alert-warning mb-3">
                    <strong>Note:</strong> We encountered an issue capturing complete booking details from Calendly.
                    Your session details may need to be confirmed manually. We'll contact you if any adjustments are needed.
                </div>
            )}
            <form onSubmit={handleSubmit} className="p-3 border rounded bg-light">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="mb-3">
                    <label htmlFor="name" className="form-label">Full Name <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        aria-describedby="nameHelp"
                    />
                    <div id="nameHelp" className="form-text">As you'd like it to appear on the calendar invite.</div>
                </div>

                <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email Address <span className="text-danger">*</span></label>
                    <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        aria-describedby="emailHelp"
                    />
                    <div id="emailHelp" className="form-text">The email address where your booking confirmation will be sent.</div>
                </div>

                <div className="mb-3">
                    <label htmlFor="notes" className="form-label">
                        Please share anything that will help your mentor prepare for the meeting (optional)
                    </label>
                    <textarea
                        className="form-control"
                        id="notes"
                        name="notes"
                        rows="4"
                        value={formData.notes}
                        onChange={handleChange}
                        aria-describedby="notesHelp"
                    ></textarea>
                    <div id="notesHelp" className="form-text">E.g., specific questions, topics you'd like to cover, or links to your work.</div>
                </div>

                <hr className="my-4" />

                <div className="mb-3">
                    <h5>Confirm Details:</h5>
                    <p className="mb-1"><strong>Mentor:</strong> {mentorName || 'N/A'}</p>
                    {calendlyEventData.start_time ? (
                        <>
                            <p className="mb-1">
                                <strong>Start Time:</strong> {new Date(calendlyEventData.start_time).toLocaleString()}
                            </p>
                            {calendlyEventData.end_time && (
                                <p className="mb-1">
                                    <strong>End Time:</strong> {new Date(calendlyEventData.end_time).toLocaleString()}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="mb-1 text-warning"><strong>Time:</strong> To be confirmed</p>
                    )}
                    {/* Add any other important details from calendlyEventData or paymentIntentData if needed */}
                </div>

                <button type="submit" className="btn btn-success w-100 btn-lg" disabled={isLoading || !formData.name || !formData.email}>
                    {isLoading ?
                        <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Scheduling...</> :
                        'Confirm & Schedule Event'}
                </button>
            </form>
        </>
    );
}; 