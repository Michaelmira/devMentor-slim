import React, { useState, useEffect, useContext } from 'react'; // Assuming useContext might be used for auth token
import { useLocation, useNavigate } from 'react-router-dom';
// import { Context } from "../store/appContext"; // Example if using Flux for auth token

const BookingDetailsForm = (props) => {
    // const { store, actions } = useContext(Context); // Example for Flux
    const navigate = useNavigate();
    const location = useLocation(); // If props are not directly passed, but this form is rendered by BookingDetailsPage which gets route state.
    // Assuming props like mentorId, calendlyEventData, paymentIntentData, mentorName are passed directly.

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Props expected: mentorId, mentorName, calendlyEventData, paymentIntentData
    const { mentorId, mentorName, calendlyEventData, paymentIntentData } = props;

    useEffect(() => {
        // Pre-fill name/email if available (e.g., from logged-in user or Calendly data)
        // This logic might already exist based on Phase 1 summary.
        // For example, if a user object is in localStorage or context:
        const currentUser = JSON.parse(localStorage.getItem('user_info')); // Or from context
        if (currentUser) {
            if (currentUser.name) setName(currentUser.name);
            if (currentUser.email) setEmail(currentUser.email);
        }
        // Or from calendlyEventData if it contains invitee email (less common for this stage)
        // if (calendlyEventData && calendlyEventData.invitee_email) {
        // setEmail(calendlyEventData.invitee_email);
        // }
    }, []); // Ensure dependencies are correct if currentUser or calendlyEventData can change

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        if (!mentorId || !calendlyEventData || !paymentIntentData) {
            setError("Missing critical booking information. Please go back and try again.");
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('token'); // Or from context: store.token

        if (!token) {
            setError("You must be logged in to complete the booking.");
            setIsLoading(false);
            // Optionally, redirect to login: navigate('/login');
            return;
        }

        // calendlyEventData is now expected to be the plain object: { uri: ..., start_time: ..., end_time: ... }
        if (!calendlyEventData || !calendlyEventData.uri || !calendlyEventData.start_time) { // Check for essential fields
            setError("Calendly event data is missing crucial details. Please try again.");
            setIsLoading(false);
            return;
        }
        // const actualCalendlyEvent = calendlyEventData.event; // No longer needed, calendlyEventData is the plain event details

        const payload = {
            mentorId: mentorId,
            calendlyScheduledEventUri: calendlyEventData.uri,         // Direct access
            eventStartTime: calendlyEventData.start_time,   // Direct access
            eventEndTime: calendlyEventData.end_time,     // Direct access
            inviteeName: name,
            inviteeEmail: email,
            notes: notes,
            paymentIntentId: paymentIntentData.id, // Assuming paymentIntentData has an 'id' field
            amountPaid: paymentIntentData.amount / 100, // Assuming amount is in cents
            currency: paymentIntentData.currency // Assuming paymentIntentData has a 'currency' field
        };

        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/finalize-booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || data.message || `Failed to finalize booking. Status: ${response.status}`);
            }

            // Navigate to confirmation page with booking details from API
            navigate('/booking-confirmed', {
                state: {
                    bookingDetails: data.bookingDetails,
                    mentorName: mentorName // Pass mentorName for display
                }
            });

        } catch (err) {
            console.error("Error finalizing booking:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ... existing JSX for the form ...
    // Ensure the form calls handleSubmit on submit
    // Example: <form onSubmit={handleSubmit}> ... </form>
    // Display {error} and handle {isLoading} state in JSX

    // ... existing code ...
    return (
        <form onSubmit={handleSubmit} className="p-4 border rounded shadow-lg">
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="mb-3">
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                    type="text"
                    className="form-control"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label htmlFor="notes" className="form-label">Notes for the Mentor (Optional)</label>
                <textarea
                    className="form-control"
                    id="notes"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                ></textarea>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Confirm Booking'}
            </button>
        </form>
    );
};

export default BookingDetailsForm;
// ... existing code ... 