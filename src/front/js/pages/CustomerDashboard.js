import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../store/appContext';
import { useNavigate } from "react-router-dom";
import { CustomerAuthModal } from "../auth/CustomerAuthModal.js";

const CustomerDashboard = () => {
    const { store, actions } = useContext(Context);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyUser = async () => {
            try {
                // Check for social login token
                const hasSocialToken = actions.handleSocialLoginToken();
                console.log("Social token check:", hasSocialToken);

                // Get the token from sessionStorage
                const token = sessionStorage.getItem("token");
                if (!token) {
                    console.log("No token found, showing auth modal");
                    setShowAuthModal(true);
                    setLoading(false);
                    return;
                }

                // Verify the user
                const userData = await actions.getCurrentUser();
                console.log("User data:", userData);

                if (!userData || userData.role !== 'customer') {
                    console.log("User is not a customer, showing auth modal");
                    setShowAuthModal(true);
                    setLoading(false);
                    return;
                }

                // Fetch customer bookings
                const customerBookings = await actions.getCustomerBookings();
                setBookings(customerBookings || []);
            } catch (err) {
                console.error("Error verifying user:", err);
                setShowAuthModal(true);
            } finally {
                setLoading(false);
            }
        };

        verifyUser();
    }, []);

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        window.location.reload(); // Refresh the page to get the latest data
    };

    // Helper function to get the correct date/time to display
    const getBookingDateTime = (booking) => {
        // Use calendly_event_start_time if available (actual meeting time)
        // Otherwise fall back to scheduled_at (booking creation time)
        const dateToUse = booking.calendly_event_start_time || booking.scheduled_at;

        if (!dateToUse) return 'Not scheduled';

        return new Date(dateToUse).toLocaleString();
    };

    if (loading) {
        return <div className="container text-center"><h2>Loading...</h2></div>;
    }

    return (
        <>
            <div className="container">
                <h1>Customer Dashboard</h1>
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

            <CustomerAuthModal
                show={showAuthModal}
                onHide={() => setShowAuthModal(false)}
                initialTab="login"
                onSuccess={handleAuthSuccess}
            />
        </>
    );
};

export default CustomerDashboard;