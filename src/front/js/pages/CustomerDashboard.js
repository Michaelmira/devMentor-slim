import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../store/appContext';
import { useNavigate } from "react-router-dom";

const CustomerDashboard = () => {
    const { store, actions } = useContext(Context);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const initializeDashboard = async () => {
            try {
                // First check for social login token
                if (actions.handleSocialLoginToken()) {
                    console.log("Social login token found and stored");
                }

                // Then verify the user
                const isVerified = await actions.getCurrentUser();
                if (!isVerified) {
                    console.log("User verification failed, redirecting to login");
                    navigate("/login");
                    return;
                }

                // If we get here, the user is verified
                console.log("User verified successfully");
            } catch (error) {
                console.error("Error initializing dashboard:", error);
                setError("Failed to initialize dashboard. Please try again.");
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };

        initializeDashboard();
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

    // Helper function to get the correct date/time to display
    const getBookingDateTime = (booking) => {
        // Use calendly_event_start_time if available (actual meeting time)
        // Otherwise fall back to scheduled_at (booking creation time)
        const dateToUse = booking.calendly_event_start_time || booking.scheduled_at;

        if (!dateToUse) return 'Not scheduled';

        return new Date(dateToUse).toLocaleString();
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
                                <strong>Date & Time:</strong> {getBookingDateTime(booking)}
                            </p>
                            <p className="mb-1">
                                <strong>Meeting Link:</strong>
                                {booking.google_meet_link ? (
                                    <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer">{booking.google_meet_link}</a>
                                ) : (
                                    <span>Link not available</span>
                                )}
                            </p>
                            <small>Booking ID: {booking.id}</small>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="alert alert-info">
                    <p>You have no upcoming bookings.</p>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;