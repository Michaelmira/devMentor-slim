import React, { useContext, useState, useEffect } from "react";
import { Context } from "../store/appContext";
import { CalendlyAvailability } from "../component/CalendlyAvailability";
import { MentorAvailability } from "../component/MentorAvailability";
import { useNavigate } from "react-router-dom";

export const MentorDashboard = () => {
	const { store, actions } = useContext(Context);
	const [mentorData, setMentorData] = useState(store.currentUserData?.user_data);
	const [bookings, setBookings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
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
					console.log("No token found, redirecting to login");
					navigate("/login");
					return;
				}

				// Verify the user
				const userData = await actions.getCurrentUser();
				console.log("User data:", userData);

				if (!userData || userData.role !== 'mentor') {
					console.log("User is not a mentor, redirecting to login");
					navigate("/login");
					return;
				}

				// Set mentor data
				setMentorData(userData.user_data);

				// Fetch mentor bookings
				const mentorBookings = await actions.getMentorBookings();
				setBookings(mentorBookings || []);
			} catch (err) {
				console.error("Error verifying user:", err);
				navigate("/login");
			} finally {
				setLoading(false);
			}
		};

		verifyUser();
	}, []);

	if (loading) {
		return <div className="container text-center"><h2>Loading Dashboard...</h2></div>;
	}

	if (error) {
		return <div className="container alert alert-danger"><h2>Error</h2><p>{error}</p></div>;
	}

	return (
		<div className="container mt-5">
			<h1 className="text-center mb-4">MENTOR DASHBOARD</h1>

			<div className="card mb-5">
				<div className="card-header">
					<h2 className="h4 mb-0">Upcoming Bookings</h2>
				</div>
				<div className="card-body">
					{bookings.length > 0 ? (
						<div className="list-group">
							{bookings.map(booking => (
								<div key={booking.id} className="list-group-item">
									<div className="d-flex w-100 justify-content-between">
										<h5 className="mb-1">{`Session with ${booking.customer_name}`}</h5>
										<span className={`badge bg-success`}>{booking.status}</span>
									</div>
									<p className="mb-1">
										<strong>Date & Time:</strong> {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : 'Not Scheduled'}
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
						<div className="alert alert-info mb-0">You have no upcoming bookings.</div>
					)}
				</div>
			</div>

			<div className="row">
				<div className="col-md-6 mb-4">
					<h2 className="text-center h4 mb-3">Your Public Calendly Page</h2>
					<p className="text-center text-muted small">This is a preview of your main Calendly scheduling page that clients might see. Actual bookings will go through the integrated system.</p>
					{mentorData && mentorData.calendly_url ? (
						<div className="card"><div className="card-body p-0"><CalendlyAvailability mentor={mentorData} /></div></div>
					) : (
						<div className="alert alert-light text-center">
							<p>Your public Calendly URL is not set. You can set it in your <a href="/mentor-profile">profile</a>.</p>
							<small>Note: Even without this public URL, integrated bookings will work once Calendly is connected in your profile.</small>
						</div>
					)}
				</div>
				<div className="col-md-6 mb-4">
					<h2 className="text-center h4 mb-3">Internal Availability Overview</h2>
					<p className="text-center text-muted small">This component might show your general availability settings within our platform (if applicable).</p>
					<div className="card"><div className="card-body"><MentorAvailability /></div></div>
				</div>
			</div>
		</div>
	);
};
