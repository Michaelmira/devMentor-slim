import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Context } from '../store/appContext';

export const BookingConfirmedPage = () => {
    const location = useLocation();
    const { bookingId } = useParams();
    const { store, actions } = useContext(Context);

    const [bookingData, setBookingData] = useState(location.state?.bookingDetails || null);
    const [mentorName, setMentorName] = useState(location.state?.mentorName || '');
    const [requiresManualConfirmation, setRequiresManualConfirmation] = useState(location.state?.requiresManualConfirmation || false);
    const [isLoading, setIsLoading] = useState(!bookingData);
    const [error, setError] = useState('');

    useEffect(() => {
        // This function will fetch the booking details from the backend.
        const fetchBooking = async () => {
            setIsLoading(true);
            setError('');
            try {
                const result = await actions.getBookingDetails(bookingId);
                if (result && result.success && result.booking) {
                    setBookingData(result.booking);
                    if (result.booking.mentor) {
                        setMentorName(`${result.booking.mentor.first_name} ${result.booking.mentor.last_name}`);
                    }
                    setRequiresManualConfirmation(result.booking.status !== 'confirmed');
                } else {
                    setError(result?.message || 'Failed to fetch booking details.');
                    setBookingData(null);
                }
            } catch (err) {
                console.error("Error fetching booking details:", err);
                setError('An error occurred while fetching booking details.');
                setBookingData(null);
            } finally {
                setIsLoading(false);
            }
        };

        if (!bookingId) {
            setError('No booking ID found to load details.');
            setIsLoading(false);
            setBookingData(null);
            return;
        }

        // If we already have the correct booking data (from location.state), don't fetch.
        if (bookingData && bookingData.id?.toString() === bookingId) {
            setIsLoading(false);
            if (!mentorName && bookingData.mentor) {
                setMentorName(`${bookingData.mentor.first_name} ${bookingData.mentor.last_name}`);
            }
            return;
        }

        // Otherwise, fetch the data.
        fetchBooking();

    }, [bookingId, actions]);

    // Helper function to safely format date/time
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'Not scheduled yet';

        try {
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) {
                console.error('Invalid date:', dateTimeString);
                return 'Invalid date';
            }

            return date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error("Error formatting date:", error, dateTimeString);
            return 'Invalid date';
        }
    };

    // Helper function to calculate end time if not provided
    const calculateEndTime = (startTime, duration) => {
        if (!startTime || !duration) return null;

        try {
            const start = new Date(startTime);
            if (isNaN(start.getTime())) return null;

            const end = new Date(start.getTime() + duration * 60000); // duration in minutes
            return end.toISOString();
        } catch (error) {
            console.error("Error calculating end time:", error);
            return null;
        }
    };

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
                <Link to="/customer-dashboard" className="btn btn-info mt-3 me-2">View My Bookings</Link>
                <Link to="/" className="btn btn-secondary mt-3">Go to Homepage</Link>
            </div>
        );
    }

    // Determine mentor name safely
    const displayMentorName = mentorName ||
        (bookingData.mentor ? `${bookingData.mentor.first_name} ${bookingData.mentor.last_name}` :
            (bookingData.mentor_id ? `Mentor ID: ${bookingData.mentor_id}` : 'your mentor'));

    const mentorEmail = bookingData.mentor?.email || 'the mentor directly';

    // Get session start time - check multiple possible fields
    const sessionStartTime = bookingData.session_start_time ||
        bookingData.calendly_event_start_time ||
        bookingData.start_time;

    // Get session end time - check multiple possible fields or calculate from duration
    const sessionEndTime = bookingData.session_end_time ||
        bookingData.calendly_event_end_time ||
        bookingData.end_time ||
        calculateEndTime(sessionStartTime, bookingData.session_duration || bookingData.duration);

    // Get duration - check multiple possible fields
    const sessionDuration = bookingData.session_duration || bookingData.duration || 60;

    // Get customer email
    const customerEmail = bookingData.customer_email ||
        bookingData.invitee_email ||
        bookingData.customer?.email ||
        store.currentUserData?.user_data?.email ||
        'N/A';

    // Get customer name
    const customerName = bookingData.invitee_name ||
        (bookingData.customer ? `${bookingData.customer.first_name} ${bookingData.customer.last_name}` : null) ||
        (store.currentUserData?.user_data ? `${store.currentUserData.user_data.first_name} ${store.currentUserData.user_data.last_name}` : 'N/A');

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
                            <p className="lead text-center mb-4">
                                Your session with <strong>{displayMentorName}</strong> has been successfully scheduled.
                            </p>

                            <div className="alert alert-info">
                                <h5 className="alert-heading">Session Details:</h5>
                                <ul className="list-unstyled mb-0">
                                    <li className="mb-2">
                                        <strong>Mentor:</strong> {displayMentorName}
                                    </li>
                                    <li className="mb-2">
                                        <strong>Scheduled For:</strong> {formatDateTime(sessionStartTime)}
                                    </li>
                                    {sessionEndTime && (
                                        <li className="mb-2">
                                            <strong>Ends At:</strong> {formatDateTime(sessionEndTime)}
                                        </li>
                                    )}
                                    <li className="mb-2">
                                        <strong>Duration:</strong> {sessionDuration} minutes
                                    </li>
                                    <li className="mb-2">
                                        <strong>Your Name:</strong> {customerName}
                                    </li>
                                    <li className="mb-2">
                                        <strong>Your Email:</strong> {customerEmail}
                                    </li>
                                    {bookingData.notes && (
                                        <li className="mb-2">
                                            <strong>Notes:</strong>
                                            <span style={{ whiteSpace: "pre-wrap" }}> {bookingData.notes}</span>
                                        </li>
                                    )}
                                    <li className="mb-2">
                                        <strong>Status:</strong>
                                        <span className={`badge bg-${bookingData.status === 'confirmed' ? 'success' : 'warning'} ms-2`}>
                                            {bookingData.status || 'pending'}
                                        </span>
                                    </li>
                                    {bookingData.meeting_url ? (
                                        <li className="mb-2">
                                            <strong>Meeting Link:</strong>
                                            <a href={bookingData.meeting_url}
                                                className="ms-2 btn btn-primary btn-sm">
                                                Join Video Meeting
                                            </a>
                                            <small className="d-block mt-1 text-muted">
                                                Click to join your video meeting session. The meeting room will be available at your scheduled time.
                                            </small>
                                        </li>
                                    ) : (
                                        <li className="mb-2">
                                            <strong>Meeting:</strong>
                                            <button
                                                onClick={async () => {
                                                    const result = await actions.createMeetingForBooking(bookingData.id);
                                                    if (result.success) {
                                                        // Refresh booking details to get the new meeting URL
                                                        const updatedBooking = await actions.getBookingDetails(bookingData.id);
                                                        if (updatedBooking.success) {
                                                            setBookingData(updatedBooking.booking);
                                                        }
                                                    } else {
                                                        alert('Failed to create meeting room. Please try again.');
                                                    }
                                                }}
                                                className="btn btn-primary btn-sm ms-2"
                                            >
                                                Create Meeting Room
                                            </button>
                                            <small className="d-block mt-1 text-muted">
                                                Click to create your video meeting room.
                                            </small>
                                        </li>
                                    )}
                                    <li className="mb-0">
                                        <strong>Booking Reference:</strong>
                                        <code className="ms-2">#{bookingData.id}</code>
                                    </li>
                                </ul>
                            </div>

                            {bookingData.status !== 'confirmed' && (
                                <div className="alert alert-warning mt-3">
                                    <strong>Important:</strong> Your booking is currently pending confirmation.
                                    You may want to contact your mentor at {mentorEmail} to confirm the session details.
                                </div>
                            )}

                            <div className="alert alert-light mt-3">
                                <h6 className="alert-heading">What's Next?</h6>
                                <ul className="mb-0">
                                    <li>You'll receive a confirmation email shortly with all the session details</li>
                                    <li>Add this session to your calendar</li>
                                    {bookingData.meeting_url ? (
                                        <li>Join the session using the meeting link provided above</li>
                                    ) : (
                                        <li>Your mentor will share the meeting link before the session</li>
                                    )}
                                    <li>Prepare any questions or topics you'd like to discuss</li>
                                </ul>
                            </div>

                            <div className="text-center mt-4 pt-3 border-top">
                                <Link to="/customer-dashboard" className="btn btn-primary btn-lg me-2 mb-2">
                                    Go to Dashboard
                                </Link>
                                <Link to="/mentor-list" className="btn btn-outline-secondary btn-lg mb-2">
                                    Find Another Mentor
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};