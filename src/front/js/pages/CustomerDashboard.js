import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../store/appContext';
import { useNavigate } from "react-router-dom";
import { CustomerAuthModal } from "../auth/CustomerAuthModal.js";

const CustomerDashboard = () => {
    const { store, actions } = useContext(Context);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyUser = async () => {
            try {
                // First check if we have a token
                const token = store.token || sessionStorage.getItem("token");
                if (!token) {
                    navigate("/login");
                    setLoading(false);
                    return;
                }

                // Get or refresh user data
                const userData = await actions.getCurrentUser();
                console.log("User data:", userData);

                if (!userData || userData.role !== 'customer') {
                    navigate("/login");
                    setLoading(false);
                    return;
                }

                // If we get here, we have valid user data, fetch bookings
                const customerBookings = await actions.getCustomerBookings();
                setBookings(customerBookings || []);
            } catch (err) {
                console.error("Error verifying user:", err);
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };

        verifyUser();
    }, []); // Run only on mount

    // Helper function to get the correct date/time to display
    const getBookingDateTime = (booking) => {
        const dateToUse = booking.calendly_event_start_time || booking.scheduled_at;
        if (!dateToUse) return 'Not scheduled';
        return new Date(dateToUse).toLocaleString();
    };

    if (loading) {
        return <div className="container text-center"><h2>Loading...</h2></div>;
    }

    // Only render the dashboard since auth is handled by navigation
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
};

export default CustomerDashboard;