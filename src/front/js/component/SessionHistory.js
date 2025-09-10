import React, { useState, useEffect, useContext } from 'react';
import { Context } from '../store/appContext';
import { useNavigate } from 'react-router-dom';

const SessionHistory = ({ userType }) => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();
    const [currentSessions, setCurrentSessions] = useState([]);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [sessionToRate, setSessionToRate] = useState(null);

    // Load sessions on component mount
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            let result;
            if (userType === 'customer') {
                result = await actions.getCustomerSessions();
            } else {
                result = await actions.getMentorSessions();
            }

            if (result && result.success) {
                setCurrentSessions(result.current_sessions || result.currentSessions || []);
                setSessionHistory(result.session_history || result.sessionHistory || []);
            } else {
                console.error('Failed to load sessions:', result?.message);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRating = async (sessionId, rating, notes = '') => {
        try {
            const result = await actions.submitRating(sessionId, rating, notes);
            if (result && result.success) {
                setShowRatingModal(false);
                setSessionToRate(null);
                await loadSessions(); // Refresh to show updated sessions
                alert('Thank you for your rating!');
            } else {
                alert(result.message || 'Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Error submitting rating. Please try again.');
        }
    };

    const handleBookAgain = (session) => {
        const mentorId = session.mentor_id || session.mentorId;
        if (mentorId) {
            navigate(`/mentor-details/${mentorId}`);
        } else {
            const mentor = store.mentors.find(m =>
                `${m.first_name} ${m.last_name}` === session.mentor_name
            );
            if (mentor) {
                navigate(`/mentor-details/${mentor.id}`);
            } else {
                alert('Unable to find mentor details. Please browse mentors manually.');
            }
        }
    };

    const handleFlagSession = async (session) => {
        try {
            const result = await actions.flagSession(session.id);
            if (result.success) {
                await loadSessions();
            } else {
                alert(result.message || 'Failed to flag session');
            }
        } catch (error) {
            console.error('Error flagging session:', error);
            alert('Error flagging session. Please try again.');
        }
    };

    // UPDATED: Modified finish session to directly open rating modal for customers
    const handleFinishSession = async (session) => {
        try {
            if (userType === 'customer') {
                // For customers: Open rating modal immediately without changing DB status
                setSessionToRate(session);
                setShowRatingModal(true);
            } else {
                // For mentors: Change status to requires_rating (customer will rate later)
                const result = await actions.finishSession(session.id);
                if (result.success) {
                    await loadSessions();
                    alert('Session marked as completed! The customer will be prompted to rate the session.');
                } else {
                    alert(result.message || 'Failed to finish session');
                }
            }
        } catch (error) {
            console.error('Error finishing session:', error);
            alert('Error finishing session. Please try again.');
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

    const getBootstrapBadgeColor = (status) => {
        const statusColors = {
            'paid': 'bg-success',
            'confirmed': 'bg-success',
            'requires_rating': 'bg-warning',
            'completed': 'bg-primary'
        };
        return statusColors[status] || 'bg-secondary';
    };

    const getStatusText = (status) => {
        const statusTexts = {
            'paid': 'Scheduled',
            'confirmed': 'Confirmed',
            'requires_rating': 'Awaiting Rating',  // UPDATED: Changed from "Rate Session"
            'completed': 'Completed'
        };
        return statusTexts[status] || status;
    };

    const renderStars = (rating) => {
        if (!rating) return null;

        return (
            <span>
                {[...Array(5)].map((_, index) => (
                    <span key={index} className={index < rating ? 'text-warning' : 'text-muted'}>
                        ★
                    </span>
                ))}
                <span className="ms-1">({rating}/5)</span>
            </span>
        );
    };

    const SessionCard = ({ session, isHistory = false }) => {
        const partnerName = userType === 'customer' ?
            session.mentor_name : session.customer_name || session.student_name;

        return (
            <div className="list-group-item">
                <div className="d-flex w-100 justify-content-between">
                    <h5 className="mb-1">Session with {partnerName}</h5>
                    <small className={`badge ${getBootstrapBadgeColor(session.status)}`}>
                        {getStatusText(session.status)}
                    </small>
                </div>

                <p className="mb-1">
                    <strong>Date & Time:</strong> {formatDateTime(session.session_start_time)}
                    <br />
                    <strong>Duration:</strong> {session.session_duration || 60} minutes
                </p>

                {/* Meeting Link for current sessions */}
                {!isHistory && session.meeting_url && (
                    <p className="mb-1">
                        <strong>Meeting Link:</strong>
                        <a href={session.meeting_url}
                            className="ms-2 btn btn-primary btn-sm">
                            Join Video Meeting
                        </a>
                        <small className="d-block mt-1 text-muted">
                            Click to join your video meeting session. The meeting room will be available at your scheduled time.
                        </small>
                    </p>
                )}

                {/* Create Meeting button if no meeting URL exists */}
                {!isHistory && session.status === 'confirmed' && !session.meeting_url && (
                    <p className="mb-1">
                        <button
                            onClick={async () => {
                                try {
                                    const result = await actions.createMeetingForBooking(session.id);
                                    if (result.success) {
                                        await loadSessions();
                                        alert('Meeting room created successfully!');
                                    } else {
                                        alert(result.message || 'Failed to create meeting room. Please try again.');
                                    }
                                } catch (error) {
                                    console.error('Error creating meeting room:', error);
                                    alert('Error creating meeting room. Please try again.');
                                }
                            }}
                            className="btn btn-primary btn-sm me-2"
                        >
                            Create Meeting Room
                        </button>
                        <small className="d-block mt-1 text-muted">
                            Click to create your video meeting room.
                        </small>
                    </p>
                )}

                {isHistory && session.customer_rating && (
                    <div className="mb-1">
                        <strong>Customer Rating:</strong> {renderStars(session.customer_rating)}
                        {userType === 'mentor' && (
                            <div className="text-muted small">
                                This session was rated by your student
                            </div>
                        )}
                    </div>
                )}

                {isHistory && userType === 'mentor' && !session.customer_rating && (
                    <div className="mb-1">
                        <strong>Customer Rating:</strong> <span className="text-muted">Not rated yet</span>
                    </div>
                )}

                {/* Flagged Message - Shows when session is flagged */}
                {(() => {
                    const isFlagged = userType === 'customer' ?
                        session.flagged_by_customer : session.flagged_by_mentor;

                    if (isFlagged) {
                        return (
                            <div className="alert alert-warning mt-2 mb-2">
                                <small>
                                    <strong>Your session has been flagged for review.</strong><br />
                                    If you're experiencing an issue with this session, please contact our support team at <strong>devmentorllc@gmail.com</strong> with details about your concern.<br />
                                    We review all flagged sessions promptly and will follow up with you as needed.
                                </small>
                            </div>
                        );
                    }
                    return null;
                })()}

                <div className="mt-2">
                    {/* Finish Session button for current confirmed sessions */}
                    {!isHistory && session.status === 'confirmed' && (
                        <button
                            onClick={() => handleFinishSession(session)}
                            className="btn btn-success btn-sm me-2"
                        >
                            {userType === 'customer' ? 'Finish & Rate Session' : 'Mark Session Complete'}
                        </button>
                    )}

                    {/* REMOVED: Rate Session button for requires_rating status */}
                    {/* This is no longer needed as customers will rate immediately when finishing */}
                    {session.status === 'requires_rating' && userType === 'customer' && (
                        <button
                            onClick={() => {
                                setSessionToRate(session);
                                setShowRatingModal(true);
                            }}
                            className="btn btn-warning btn-sm me-2"
                        >
                            Rate Session
                        </button>
                    )}

                    {/* Book Again button for completed sessions */}
                    {isHistory && userType === 'customer' && (
                        <button
                            onClick={() => handleBookAgain(session)}
                            className="btn btn-secondary btn-sm me-2"
                        >
                            Book Again
                        </button>
                    )}

                    {/* Flag for Review button */}
                    {(() => {
                        const isFlagged = userType === 'customer' ?
                            session.flagged_by_customer : session.flagged_by_mentor;

                        return (
                            <button
                                onClick={() => handleFlagSession(session)}
                                className={`btn btn-sm ${isFlagged ? 'btn-danger' : 'btn-outline-danger'}`}
                            >
                                {isFlagged ? 'Flagged' : 'Flag for Review'}
                            </button>
                        );
                    })()}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="text-center"><h4>Loading sessions...</h4></div>;
    }

    return (
        <div>
            {/* Current Sessions */}
            <div className="mb-5">
                <h3>Current Sessions</h3>
                {currentSessions.length === 0 ? (
                    <div className="alert alert-info">
                        <p className="mb-0">No current sessions</p>
                    </div>
                ) : (
                    <div className="list-group">
                        {currentSessions.map(session => (
                            <SessionCard key={session.id} session={session} isHistory={false} />
                        ))}
                    </div>
                )}
            </div>

            {/* Session History */}
            <div>
                <h3>Session History</h3>
                {sessionHistory.length === 0 ? (
                    <div className="alert alert-info">
                        <p className="mb-0">No completed sessions yet</p>
                    </div>
                ) : (
                    <div className="list-group">
                        {sessionHistory.map(session => (
                            <SessionCard key={session.id} session={session} isHistory={true} />
                        ))}
                    </div>
                )}
            </div>

            {/* Rating Modal - UPDATED to complete session upon submission */}
            {showRatingModal && sessionToRate && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Rate Your Session</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => {
                                        setShowRatingModal(false);
                                        setSessionToRate(null);
                                    }}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>How was your session with {sessionToRate.mentor_name || sessionToRate.customer_name}?</p>

                                <div className="form-group">
                                    <label>Rating:</label>
                                    <div>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span
                                                key={star}
                                                style={{
                                                    fontSize: '24px',
                                                    cursor: 'pointer',
                                                    color: star <= (sessionToRate.tempRating || 0) ? '#ffc107' : '#e9ecef'
                                                }}
                                                onClick={() => {
                                                    setSessionToRate({ ...sessionToRate, tempRating: star });
                                                }}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group mt-3">
                                    <label>Additional Notes (Optional):</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={sessionToRate.tempNotes || ''}
                                        onChange={(e) => {
                                            setSessionToRate({ ...sessionToRate, tempNotes: e.target.value });
                                        }}
                                        placeholder="Share your experience..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowRatingModal(false);
                                        setSessionToRate(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!sessionToRate.tempRating}
                                    onClick={() => {
                                        if (sessionToRate.tempRating) {
                                            handleSubmitRating(
                                                sessionToRate.id,
                                                sessionToRate.tempRating,
                                                sessionToRate.tempNotes || ''
                                            );
                                        }
                                    }}
                                >
                                    Submit Rating
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionHistory;