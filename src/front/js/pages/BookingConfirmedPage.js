import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Context } from '../store/appContext'; // Assuming this is the correct path to your context

export const BookingConfirmedPage = () => {
    const location = useLocation();
    const { bookingId } = useParams(); // Get bookingId from URL
    const { store, actions } = useContext(Context); // Access store and actions

    const [bookingData, setBookingData] = useState(location.state?.bookingDetails || null);
    const [mentorName, setMentorName] = useState(location.state?.mentorName || '');
    const [requiresManualConfirmation, setRequiresManualConfirmation] = useState(location.state?.requiresManualConfirmation || false);
    const [isLoading, setIsLoading] = useState(!bookingData); // If no initial data, we are loading
    const [error, setError] = useState('');

    useEffect(() => {
        if (bookingData && bookingId && bookingData.id?.toString() === bookingId) {
            // If we have bookingData from location.state and its ID matches the URL param, no need to fetch.
            setIsLoading(false);
            // Optionally, update mentorName if not already set and bookingData has it
            if (!mentorName && bookingData.mentor) {
                setMentorName(`${bookingData.mentor.first_name} ${bookingData.mentor.last_name}`);
            }
            return;
        }

        if (bookingId) {
            setIsLoading(true);
            setError('');
            actions.getBookingDetails(bookingId)
                .then(result => {
                    if (result && result.success && result.booking) {
                        setBookingData(result.booking);
                        // Attempt to set mentor name from the fetched booking data if available
                        // This part depends on your booking.serialize() including mentor details or making another fetch
                        if (result.booking.mentor) { // Check if mentor details are directly in booking
                            setMentorName(`${result.booking.mentor.first_name} ${result.booking.mentor.last_name}`);
                        } else if (result.booking.mentor_id) {
                            // If only mentor_id is present, you might need another action to fetch mentor details
                            // For now, we'll leave mentorName potentially blank if not in location.state or direct booking payload
                            console.log("Mentor details not directly in booking, consider fetching by ID:", result.booking.mentor_id);
                        }
                        // requiresManualConfirmation might not be available from a direct fetch, default to false or infer if needed
                        setRequiresManualConfirmation(result.booking.status !== 'CONFIRMED');
                    } else {
                        setError(result?.message || 'Failed to fetch booking details.');
                        setBookingData(null);
                    }
                })
                .catch(err => {
                    console.error("Error fetching booking details:", err);
                    setError('An error occurred while fetching booking details.');
                    setBookingData(null);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // No bookingId in URL, and no data from location.state implies an issue.
            setError('No booking ID found to load details.');
            setIsLoading(false);
            setBookingData(null);
        }
    }, [bookingId, actions, location.state]); // location.state removed as direct dependency to avoid re-fetch if only state changes slightly but bookingId is primary key

    if (isLoading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading booking details...</span>
                </div>
                <p className="mt-2">Loading your booking details...</p>
            </div>
        );
    }

    if (error || !bookingData) {
        return (
            <div className="container mt-5 text-center">
                <div className="alert alert-warning py-4">
                    <h2 className="alert-heading">Booking Confirmation Missing</h2>
                    <p className="mb-0">{error || "We couldn't retrieve your booking details. This might be due to a navigation error or an invalid link."}</p>
                    <p>Please check your dashboard for your bookings, or contact support if you believe this is an error.</p>
                </div>
                <Link to="/dashboard/customer" className="btn btn-info mt-3 me-2">View My Bookings</Link>
                <Link to="/" className="btn btn-secondary mt-3">Go to Homepage</Link>
            </div>
        );
    }

    // Determine mentor name safely
    const displayMentorName = mentorName ||
        (bookingData.mentor ? `${bookingData.mentor.first_name} ${bookingData.mentor.last_name}` :
            (bookingData.mentor_id ? `Mentor ID: ${bookingData.mentor_id}` : 'your mentor'));
    const mentorEmail = bookingData.mentor?.email || 'the mentor directly'; // Get mentor email

    return (
        <div className="container my-5">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-7">
                    <div className="card shadow-lg border-success">
                        <div className="card-header bg-success text-white text-center py-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="currentColor" className="bi bi-check-circle-fill mb-2" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                            </svg>
                            <h2 className="h3 mb-0">Booking Confirmed!</h2>
                        </div>
                        <div className="card-body p-4">
                            <p className="lead text-center mb-4">Your session with <strong>{displayMentorName}</strong> has been successfully scheduled.</p>

                            <div className="alert alert-info">
                                <h5 className="alert-heading">Session Details:</h5>
                                <ul className="list-unstyled mb-0">
                                    <li><strong>Mentor:</strong> {displayMentorName}</li>
                                    <li><strong>Scheduled For:</strong> {bookingData.calendly_event_start_time ? new Date(bookingData.calendly_event_start_time).toLocaleString() : 'N/A'}</li>
                                    {bookingData.calendly_event_end_time &&
                                        <li><strong>Ends At:</strong> {new Date(bookingData.calendly_event_end_time).toLocaleString()}</li>
                                    }
                                    <li><strong>Your Name:</strong> {bookingData.invitee_name || 'N/A'}</li>
                                    <li><strong>Your Email:</strong> {bookingData.invitee_email || 'N/A'}</li>
                                    {bookingData.invitee_notes &&
                                        <li><strong>Notes Provided:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{bookingData.invitee_notes}</span></li>
                                    }
                                    <li><strong>Status:</strong> <span className={`badge bg-${bookingData.status === 'CONFIRMED' ? 'success' : 'warning'}`}>{bookingData.status || 'N/A'}</span></li>
                                </ul>
                            </div>

                            {/* Update requiresManualConfirmation logic based on fetched bookingData status if necessary */}
                            {bookingData.status !== 'CONFIRMED' && (
                                <div className="alert alert-warning mt-3">
                                    <strong>Important:</strong> Please additionally contact your mentor at {mentorEmail} as needed if you would like to open up a dialog.
                                </div>
                            )}

                            <p className="mt-4 text-muted">
                                You should receive a calendar invitation and confirmation email shortly.
                                If this event was booked directly via your mentor's Calendly, please check for an email from Calendly.
                                If you don't receive it within an hour, please check your spam folder or contact support.
                            </p>

                            <div className="text-center mt-4 pt-3 border-top">
                                <Link to="/" className="btn btn-primary btn-lg me-2 mb-2">Go Home</Link>
                                <Link to="/mentor-list" className="btn btn-outline-secondary btn-lg mb-2">Find Another Mentor</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 