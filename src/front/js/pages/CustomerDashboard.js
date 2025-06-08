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
                // First check if we have a token
                const token = store.token || sessionStorage.getItem("token");
                if (!token) {
                    setShowAuthModal(true);
                    setLoading(false);
                    return;
                }

                // Get or refresh user data
                const userData = await actions.getCurrentUser();
                console.log("User data:", userData);

                if (!userData || userData.role !== 'customer') {
                    setShowAuthModal(true);
                    setLoading(false);
                    return;
                }

                // If we get here, we have valid user data, fetch bookings
                const customerBookings = await actions.getCustomerBookings();
                setBookings(customerBookings || []);
                setShowAuthModal(false);
            } catch (err) {
                console.error("Error verifying user:", err);
                setShowAuthModal(true);
            } finally {
                setLoading(false);
            }
        };

        verifyUser();
    }, []); // Run only on mount

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        setLoading(true);
        // Refresh user data and bookings
        actions.getCurrentUser().then(() => {
            actions.getCustomerBookings().then(customerBookings => {
                setBookings(customerBookings || []);
                setLoading(false);
            });
        });
    };

    // Helper function to get the correct date/time to display
    const getBookingDateTime = (booking) => {
        const dateToUse = booking.calendly_event_start_time || booking.scheduled_at;
        if (!dateToUse) return 'Not scheduled';
        return new Date(dateToUse).toLocaleString();
    };

    if (loading) {
        return <div className="container text-center"><h2>Loading...</h2></div>;
    }

    // Show dashboard if we have valid user data
    if (store.currentUserData?.role === 'customer') {
        return (
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
        );
    }

    // Show login prompt and auth modal if not authenticated
    return (
        <>
            <div className="container">
                <h1>Customer Dashboard</h1>
                <p>Please log in to view your dashboard.</p>
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