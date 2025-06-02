import React, { useContext, useState, useEffect } from "react";
import { Context } from "../store/appContext";
import CalendlyAvailability from "../component/CalendlyAvailability";
import { MentorAvailability } from "../component/MentorAvailability";

export const MentorDashboard = () => {
	const { store, actions } = useContext(Context);
	const [mentorData, setMentorData] = useState(store.currentUserData?.user_data);

	useEffect(() => {
		if (!store.currentUserData?.user_data) {
			actions.getCurrentUser().then(data => {
				if (data && data.user_data) setMentorData(data.user_data);
			});
		} else {
			setMentorData(store.currentUserData.user_data);
		}
	}, [store.currentUserData, actions]);

	return (
		<div className="container mt-5">
			<h1 className="text-center mb-5">MENTOR DASHBOARD</h1>

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
