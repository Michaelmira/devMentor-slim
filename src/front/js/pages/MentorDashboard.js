import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import MentorAvailabilitySettings from '../component/MentorAvailabilitySettings';

export const MentorDashboard = () => {
	const { store, actions } = useContext(Context);
	const [activeTab, setActiveTab] = useState('overview');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dashboardData, setDashboardData] = useState({
		upcomingBookings: [],
		pastBookings: [],
		stats: {
			totalSessions: 0,
			totalHours: 0,
			averageRating: 0,
			completionRate: 0
		}
	});

	// First useEffect to ensure auth state is synchronized
	useEffect(() => {
		const initializeAuth = async () => {
			if (!store.token && sessionStorage.getItem("token")) {
				await actions.checkStorageMentor();
			}
		};
		initializeAuth();
	}, []);

	// Second useEffect to fetch dashboard data once auth is ready
	useEffect(() => {
		if (store.token && store.isMentorLoggedIn) {
			fetchDashboardData();
		} else if (!loading) {
			setError("Please log in as a mentor to view your dashboard.");
		}
	}, [store.token, store.isMentorLoggedIn]);

	const fetchDashboardData = async () => {
		try {
			const response = await fetch(process.env.BACKEND_URL + '/api/mentor/dashboard', {
				headers: {
					'Authorization': 'Bearer ' + store.token
				}
			});

			const data = await response.json();

			if (response.ok) {
				setDashboardData(data);
			} else {
				if (response.status === 422) {
					// Token validation failed
					actions.logOut();
					setError("Your session has expired. Please log in again.");
				} else {
					setError(data.msg || 'Failed to load dashboard data');
				}
			}
		} catch (err) {
			console.error("Dashboard fetch error:", err);
			setError('Error loading dashboard data');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <div className="text-center">Loading...</div>;
	}

	if (!store.token || !store.isMentorLoggedIn) {
		return <div className="container"><h2>Please log in as a mentor to view your dashboard.</h2></div>;
	}

	if (error) {
		return <div className="container alert alert-danger"><h2>Error</h2><p>{error}</p></div>;
	}

	return (
		<div className="container py-4">
			<div className="row">
				<div className="col-md-3">
					<div className="list-group">
						<button
							className={`list-group-item list-group-item-action ${activeTab === 'overview' ? 'active' : ''}`}
							onClick={() => setActiveTab('overview')}
						>
							Overview
						</button>
						<button
							className={`list-group-item list-group-item-action ${activeTab === 'availability' ? 'active' : ''}`}
							onClick={() => setActiveTab('availability')}
						>
							Availability Settings
						</button>
						<button
							className={`list-group-item list-group-item-action ${activeTab === 'bookings' ? 'active' : ''}`}
							onClick={() => setActiveTab('bookings')}
						>
							Bookings
						</button>
					</div>
				</div>

				<div className="col-md-9">
					{activeTab === 'overview' && (
						<div>
							<h2 className="mb-4">Dashboard Overview</h2>

							<div className="row mb-4">
								<div className="col-md-3">
									<div className="card">
										<div className="card-body text-center">
											<h5 className="card-title">Total Sessions</h5>
											<p className="h2">{dashboardData.stats.totalSessions}</p>
										</div>
									</div>
								</div>
								<div className="col-md-3">
									<div className="card">
										<div className="card-body text-center">
											<h5 className="card-title">Total Hours</h5>
											<p className="h2">{dashboardData.stats.totalHours}</p>
										</div>
									</div>
								</div>
								<div className="col-md-3">
									<div className="card">
										<div className="card-body text-center">
											<h5 className="card-title">Avg. Rating</h5>
											<p className="h2">{dashboardData.stats.averageRating.toFixed(1)} ⭐</p>
										</div>
									</div>
								</div>
								<div className="col-md-3">
									<div className="card">
										<div className="card-body text-center">
											<h5 className="card-title">Completion Rate</h5>
											<p className="h2">{dashboardData.stats.completionRate}%</p>
										</div>
									</div>
								</div>
							</div>

							<div className="card mb-4">
								<div className="card-header">
									<h3 className="h5 mb-0">Upcoming Sessions</h3>
								</div>
								<div className="card-body">
									{dashboardData.upcomingBookings.length === 0 ? (
										<p className="text-muted">No upcoming sessions</p>
									) : (
										<div className="table-responsive">
											<table className="table">
												<thead>
													<tr>
														<th>Student</th>
														<th>Date</th>
														<th>Time</th>
														<th>Duration</th>
														<th>Status</th>
														<th>Meeting</th>
													</tr>
												</thead>
												<tbody>
													{dashboardData.upcomingBookings.map((booking) => (
														<tr key={booking.id}>
															<td>{booking.student_name}</td>
															<td>{new Date(booking.start_time).toLocaleDateString()}</td>
															<td>{new Date(booking.start_time).toLocaleTimeString()}</td>
															<td>{booking.duration} min</td>
															<td>
																<span className={`badge bg-${booking.status === 'confirmed' ? 'success' : 'warning'}`}>
																	{booking.status}
																</span>
															</td>
															<td>

																{booking.meeting_url ? (
																	<a href={booking.meeting_url}  // Use meeting_url like CustomerDashboard does
																		className="btn btn-primary btn-sm">
																		Join Meeting
																	</a>
																) : (
																	<button
																		onClick={async () => {
																			try {
																				const result = await actions.createMeetingForBooking(booking.id);
																				if (result.success) {
																					await fetchDashboardData();
																				} else {
																					alert('Failed to create meeting room. Please try again.');
																				}
																			} catch (error) {
																				console.error('Error creating meeting:', error);
																				alert('Failed to create meeting room. Please try again.');
																			}
																		}}
																		className="btn btn-outline-primary btn-sm"
																	>
																		Create Meeting
																	</button>
																)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{activeTab === 'availability' && (
						<MentorAvailabilitySettings />
					)}

					{activeTab === 'bookings' && (
						<div>
							<h2 className="mb-4">Session History</h2>
							<div className="card">
								<div className="card-body">
									{dashboardData.pastBookings.length === 0 ? (
										<p className="text-muted">No past sessions</p>
									) : (
										<div className="table-responsive">
											<table className="table">
												<thead>
													<tr>
														<th>Student</th>
														<th>Date</th>
														<th>Duration</th>
														<th>Status</th>
														<th>Rating</th>
													</tr>
												</thead>
												<tbody>
													{dashboardData.pastBookings.map((booking) => (
														<tr key={booking.id}>
															<td>{booking.student_name}</td>
															<td>{new Date(booking.start_time).toLocaleDateString()}</td>
															<td>{booking.duration} min</td>
															<td>
																<span className={`badge bg-${booking.status === 'completed' ? 'success' :
																	booking.status === 'cancelled' ? 'danger' :
																		'warning'
																	}`}>
																	{booking.status}
																</span>
															</td>
															<td>
																{booking.rating ? (
																	<span>{booking.rating} ⭐</span>
																) : (
																	<span className="text-muted">No rating</span>
																)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
