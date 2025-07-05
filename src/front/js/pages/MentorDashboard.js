import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import MentorAvailabilitySettings from '../component/MentorAvailabilitySettings';
import SessionHistory from '../component/SessionHistory';

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
			completionRate: 0,
			totalRatings: 0
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

	const renderRatingDisplay = () => {
		const { averageRating, totalRatings } = dashboardData.stats;
		
		if (totalRatings === 0) {
			return (
				<span className="text-muted">
					No ratings yet
				</span>
			);
		}
		
		if (totalRatings < 5) {
			return (
				<span className="text-muted">
					{totalRatings} rating{totalRatings !== 1 ? 's' : ''} (need 5+ to display)
				</span>
			);
		}
		
		return (
			<span>
				{averageRating.toFixed(1)} ⭐ ({totalRatings} reviews)
			</span>
		);
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
							Overview & Sessions
						</button>
						<button
							className={`list-group-item list-group-item-action ${activeTab === 'availability' ? 'active' : ''}`}
							onClick={() => setActiveTab('availability')}
						>
							Availability Settings
						</button>
					</div>
				</div>

				<div className="col-md-9">
					{activeTab === 'overview' && (
						<div>
							<h2 className="mb-4">Dashboard Overview</h2>

							{/* Stats Cards */}
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
											<h5 className="card-title">Rating</h5>
											<div className="h4">{renderRatingDisplay()}</div>
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

							{/* Rating Summary - Condensed Version */}
							{dashboardData.stats.totalRatings > 0 && (
								<div className="card mb-4">
									<div className="card-header">
										<h5 className="mb-0">
											<i className="fas fa-star text-warning me-2"></i>
											Rating Summary
										</h5>
									</div>
									<div className="card-body">
										<div className="row">
											<div className="col-md-6">
												<h4 className="mb-2">{renderRatingDisplay()}</h4>
												{dashboardData.stats.totalRatings >= 5 ? (
													<p className="text-success mb-0">
														✓ Your rating is displayed on your public profile
													</p>
												) : (
													<p className="text-muted mb-0">
														Complete {5 - dashboardData.stats.totalRatings} more rated sessions to display your rating publicly
													</p>
												)}
											</div>
											<div className="col-md-6 text-end">
												<small className="text-muted">
													Based on {dashboardData.stats.totalRatings} customer rating{dashboardData.stats.totalRatings !== 1 ? 's' : ''}
												</small>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* All Sessions with Ratings - SessionHistory Component */}
							<div className="card">
								<div className="card-header">
									<h5 className="mb-0">All Sessions & Ratings</h5>
								</div>
								<div className="card-body">
									<SessionHistory userType="mentor" />
								</div>
							</div>
						</div>
					)}

					{activeTab === 'availability' && (
						<MentorAvailabilitySettings />
					)}
				</div>
			</div>
		</div>
	);
};