import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Context } from '../store/appContext';
import VideoMeeting from '../component/VideoMeeting';

export const VideoMeetingPage = () => {
    const { meetingId } = useParams();
    const { store, actions } = useContext(Context);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userName, setUserName] = useState('Participant');
    const [isModerator, setIsModerator] = useState(false);

    useEffect(() => {
        const initializeMeeting = async () => {
            try {
                // First ensure we're authenticated
                if (!store.token) {
                    // Try to restore session from storage
                    const success = await actions.checkStorageMentor() || await actions.checkStorage();
                    if (!success) {
                        setError('Please log in to join the meeting.');
                        setLoading(false);
                        return;
                    }
                }

                // Now get the meeting token
                const response = await fetch(`${process.env.BACKEND_URL}/api/videosdk/meeting-token/${meetingId}`, {
                    headers: {
                        'Authorization': 'Bearer ' + (store.token || sessionStorage.getItem('token'))
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.msg || 'Failed to get meeting access');
                }

                const data = await response.json();
                
                if (data.success) {
                    setToken(data.token);
                    setUserName(data.userName || 'Participant');
                    setIsModerator(data.isModerator || false);
                } else {
                    setError('Failed to get meeting access. Please try again.');
                }
            } catch (err) {
                setError(err.message || 'An error occurred while joining the meeting.');
                console.error('Meeting initialization error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (meetingId) {
            initializeMeeting();
        }
    }, [meetingId, store.token, actions]);

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Initializing meeting...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4 className="alert-heading">Meeting Error</h4>
                    <p>{error}</p>
                    {error.includes('Please log in') && (
                        <div className="mt-3">
                            <button
                                className="btn btn-primary me-2"
                                onClick={() => window.location.href = '/mentor-login'}
                            >
                                Mentor Login
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.href = '/customer-login'}
                            >
                                Customer Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4 className="alert-heading">Access Denied</h4>
                    <p>You don't have permission to join this meeting.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="video-meeting-page">
            <VideoMeeting 
                meetingId={meetingId} 
                token={token}
                userName={userName}
                isModerator={isModerator}
            />
        </div>
    );
};