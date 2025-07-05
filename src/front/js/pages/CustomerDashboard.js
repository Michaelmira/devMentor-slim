import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../store/appContext';
import BookingCalendarWidget from '../component/BookingCalendarWidget';

const CustomerDashboard = () => {
    const { store, actions } = useContext(Context);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [showBookingWidget, setShowBookingWidget] = useState(false);

    // Add cleanup effect for modal backdrop
    useEffect(() => {
        // Remove any lingering modal backdrops
        const modalBackdrops = document.getElementsByClassName('modal-backdrop');
        while (modalBackdrops.length > 0) {
            modalBackdrops[0].remove();
        }
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }, []);

    useEffect(() => {
        const fetchBookings = async () => {
            if (store.currentUserData?.role !== 'customer') {
                setLoading(false);
                return;
            }
            try {
                const userBookings = await actions.getCustomerBookings();
                setBookings(userBookings || []);
            } catch (err) {
                setError('Failed to fetch your bookings. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (store.token) {
            fetchBookings();
        } else {
            setLoading(false);
        }
    }, [store.currentUserData, store.token, actions]);

    const handleSelectSlot = async (slot) => {
        try {
            // Here you would handle the booking process
            // This might involve creating a payment intent, etc.
            const result = await actions.finalizeBooking({
                mentorId: selectedMentor.id,
                sessionStartTime: slot.start_time,
                sessionEndTime: slot.end_time,
                notes: ''
            });

            if (result.success) {
                // Refresh bookings after successful booking
                const userBookings = await actions.getCustomerBookings();
                setBookings(userBookings || []);
                setShowBookingWidget(false);
                setSelectedMentor(null);
            } else {
                setError('Failed to book the session. Please try again.');
            }
        } catch (err) {
            setError('An error occurred while booking the session.');
            console.error(err);
        }
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return 'Not scheduled';
        return new Date(dateTimeStr).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return <div className="container text-center"><h2>Loading Dashboard...</h2></div>;
    }

    if (!store.token || store.currentUserData?.role !== 'customer') {
        return <div className="container"><h2>Please log in as a customer to see your dashboard.</h2></div>;
    }

    if (error) {
        return <div className="container alert alert-danger"><h2>Error</h2><p>{error}</p></div>;
    }

    return (
        <div className="container mt-5">
            <h1>Your Dashboard</h1>

            {showBookingWidget && selectedMentor ? (
                <div className="mb-5">
                    <button
                        className="btn btn-outline-secondary mb-3"
                        onClick={() => {
                            setShowBookingWidget(false);
                            setSelectedMentor(null);
                        }}
                    >
                        ← Back to Dashboard
                    </button>
                    <BookingCalendarWidget
                        mentorId={selectedMentor.id}
                        mentorName={`${selectedMentor.first_name} ${selectedMentor.last_name}`}
                        onSelectSlot={handleSelectSlot}
                        backendUrl={process.env.BACKEND_URL}
                    />
                </div>
            ) : (
                <>
                    <h2 className="mb-4">Your Booked Sessions</h2>
                    {bookings.length > 0 ? (
                        <div className="list-group">
                            {bookings.map(booking => (
                                <div key={booking.id} className="list-group-item list-group-item-action flex-column align-items-start mb-3">
                                    <div className="d-flex w-100 justify-content-between">
                                        <h5 className="mb-1">{`Session with ${booking.mentor_name}`}</h5>
                                        <small>Status: <span className="badge bg-success">{booking.status}</span></small>
                                    </div>
                                    <p className="mb-1">
                                        <strong>Date & Time:</strong> {formatDateTime(booking.session_start_time)}
                                    </p>
                                    {booking.session_end_time && (
                                        <p className="mb-1">
                                            <strong>End Time:</strong> {formatDateTime(booking.session_end_time)}
                                        </p>
                                    )}
                                    <p className="mb-1">
                                        <strong>Duration:</strong> {booking.session_duration || 60} minutes
                                    </p>
                                    {booking.timezone && (
                                        <p className="mb-1">
                                            <strong>Timezone:</strong> {booking.timezone}
                                        </p>
                                    )}
                                    {booking.meeting_url ? (
                                        <p className="mb-1">
                                            <strong>Meeting Link: </strong>
                                            <a href={booking.meeting_url}
                                                className="btn btn-primary btn-sm">
                                                Join Video Meeting
                                            </a>
                                        </p>
                                    ) : booking.status === 'confirmed' && (
                                        <p className="mb-1">
                                            <button
                                                onClick={async () => {
                                                    const result = await actions.createMeetingForBooking(booking.id);
                                                    if (result.success) {
                                                        // Refresh bookings to get the new meeting URL
                                                        await actions.getCurrentUser();
                                                    } else {
                                                        alert('Failed to create meeting room. Please try again.');
                                                    }
                                                }}
                                                className="btn btn-primary btn-sm"
                                            >
                                                Create Meeting Room
                                            </button>
                                        </p>
                                    )}
                                    {booking.invitee_notes && (
                                        <p className="mb-1">
                                            <strong>Notes:</strong> {booking.invitee_notes}
                                        </p>
                                    )}
                                    <small>Booking ID: {booking.id}</small>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="alert alert-info">
                            <p>You have no upcoming bookings.</p>
                            <p>Browse our mentors to schedule your first session!</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CustomerDashboard;