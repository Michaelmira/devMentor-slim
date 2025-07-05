// MVPGoogleOAuthButton.js - Fixed Version
import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../store/appContext';
import { useParams } from 'react-router-dom';

export const MVPGoogleOAuthButton = ({ mentor, onSuccess, buttonText }) => {
    const { actions } = useContext(Context);
    const [isLoading, setIsLoading] = useState(false);
    const { theid } = useParams();

    useEffect(() => {
        // Check for MVP Google auth success in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const mvpGoogleAuth = urlParams.get('mvp_google_auth');
        const token = urlParams.get('token');
        const userId = urlParams.get('user_id');
        const userTypeParam = urlParams.get('user_type');
        const newUser = urlParams.get('new_user');
        const mvpAuthError = urlParams.get('mvp_auth_error');

        if (mvpAuthError) {
            let errorMessage = "Google authentication failed. Please try again.";
            switch(mvpAuthError) {
                case 'oauth_denied':
                    errorMessage = "Google authentication was denied.";
                    break;
                case 'state_verification_failed':
                    errorMessage = "Security verification failed. Please try again.";
                    break;
                case 'missing_params':
                    errorMessage = "Missing authentication parameters. Please try again.";
                    break;
                case 'no_email':
                    errorMessage = "Email address is required for authentication.";
                    break;
                case 'network_error':
                    errorMessage = "Network error occurred. Please check your connection.";
                    break;
                case 'server_error':
                    errorMessage = "Server error occurred. Please try again later.";
                    break;
                default:
                    errorMessage = "Google authentication failed. Please try again.";
            }
            console.error("MVP Google OAuth Error:", mvpAuthError);
            alert(errorMessage);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (mvpGoogleAuth === 'success' && token && userId && userTypeParam === 'customer') {
            console.log("MVP Google auth success detected, processing...");
            handleMVPGoogleAuthSuccess(token, userId, newUser === 'true');
        }
    }, []);

    const handleMVPGoogleAuthSuccess = async (token, userId, isNewUser) => {
        try {
            setIsLoading(true);
            console.log("Verifying MVP Google auth...", { userId, isNewUser });
            
            // Use the regular Google verification since MVP creates customer accounts
            const result = await actions.verifyGoogleAuth({
                token,
                user_id: userId,
                user_type: 'customer'
            });

            if (result.success) {
                // Clean URL first
                window.history.replaceState({}, '', window.location.pathname);
                
                console.log("MVP Google auth successful", { isNewUser, userData: result.user_data });
                
                // Small delay to ensure store is updated
                setTimeout(() => {
                    if (isNewUser) {
                        console.log("New Google customer created successfully, proceeding to payment...");
                    } else {
                        console.log("Existing Google customer logged in successfully, proceeding to payment...");
                    }
                    
                    if (onSuccess) {
                        onSuccess(result);
                    }
                    setIsLoading(false);
                }, 100);
            } else {
                console.error("MVP Google auth verification failed:", result);
                alert(result.message || "Google authentication failed. Please try again.");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("MVP Google auth verification error:", error);
            alert("An error occurred during Google authentication. Please try again.");
            setIsLoading(false);
        }
    };

    const handleMVPGoogleLogin = async () => {
        if (isLoading) return;
        
        const mentorId = mentor?.id || theid;
        if (!mentorId) {
            alert("Mentor information is missing. Please refresh the page and try again.");
            return;
        }
        
        console.log("Initiating MVP Google OAuth for mentor:", mentorId);
        setIsLoading(true);
        
        try {
            const result = await actions.initiateMVPGoogleAuth(mentorId);
            
            if (result.success && result.auth_url) {
                console.log("Redirecting to Google OAuth:", result.auth_url);
                // Redirect to Google OAuth
                window.location.href = result.auth_url;
            } else {
                console.error("Failed to initiate MVP Google auth:", result);
                alert(result.message || "Failed to initiate Google authentication.");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("MVP Google OAuth initiation error:", error);
            alert("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleMVPGoogleLogin}
            disabled={isLoading}
            className="btn btn-outline-light w-100 py-2 mb-3 d-flex align-items-center justify-content-center"
            style={{
                border: '1px solid #4285f4',
                backgroundColor: 'transparent',
                color: '#4285f4',
                transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
                if (!isLoading) {
                    e.target.style.backgroundColor = '#4285f4';
                    e.target.style.color = 'white';
                }
            }}
            onMouseLeave={(e) => {
                if (!isLoading) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#4285f4';
                }
            }}
        >
            {isLoading ? (
                <>
                    <div 
                        className="spinner-border spinner-border-sm me-2" 
                        role="status"
                        style={{ width: '16px', height: '16px' }}
                    >
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    Connecting...
                </>
            ) : (
                <>
                    <svg 
                        className="me-2" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            fill="currentColor" 
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path 
                            fill="currentColor" 
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path 
                            fill="currentColor" 
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path 
                            fill="currentColor" 
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    {buttonText || `Continue with Google`}
                </>
            )}
        </button>
    );
};