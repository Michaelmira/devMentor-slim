// GitHubOAuthButton.js
import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../store/appContext';
import { useNavigate } from 'react-router-dom';

export const GitHubOAuthButton = ({ userType, onSuccess, buttonText }) => {
    const { actions } = useContext(Context);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for GitHub auth success in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const githubAuth = urlParams.get('github_auth');
        const token = urlParams.get('token');
        const userId = urlParams.get('user_id');
        const userTypeParam = urlParams.get('user_type');
        const newUser = urlParams.get('new_user');
        const authError = urlParams.get('auth_error');

        if (authError) {
            let errorMessage = "GitHub authentication failed. Please try again.";
            switch(authError) {
                case 'oauth_denied':
                    errorMessage = "GitHub authentication was denied.";
                    break;
                case 'state_verification_failed':
                    errorMessage = "Security verification failed. Please try again.";
                    break;
                case 'missing_params':
                    errorMessage = "Missing authentication parameters. Please try again.";
                    break;
                case 'no_email':
                    errorMessage = "Email address is required for authentication. Please make sure your GitHub email is public or primary.";
                    break;
                case 'no_token':
                    errorMessage = "Failed to receive access token from GitHub. Please try again.";
                    break;
                case 'network_error':
                    errorMessage = "Network error occurred. Please check your connection.";
                    break;
                case 'server_error':
                    errorMessage = "Server error occurred. Please try again later.";
                    break;
                default:
                    errorMessage = "GitHub authentication failed. Please try again.";
            }
            alert(errorMessage);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (githubAuth === 'success' && token && userId && userTypeParam === userType) {
            handleGitHubAuthSuccess(token, userId, newUser === 'true');
        }
    }, [userType]);

    const handleGitHubAuthSuccess = async (token, userId, isNewUser) => {
        try {
            setIsLoading(true);
            
            console.log('🔄 Processing GitHub auth success:', {
                userType,
                userId,
                isNewUser,
                tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
            });
            
            const result = await actions.verifyGitHubAuth({
                token,
                user_id: userId,
                user_type: userType
            });

            console.log('📊 GitHub auth verification result:', result);

            if (result.success) {
                // Clean URL FIRST
                window.history.replaceState({}, '', window.location.pathname);
                
                // IMPORTANT: Ensure token is properly stored in sessionStorage
                // This is crucial for the video meeting authentication
                const storedToken = sessionStorage.getItem('token');
                if (!storedToken) {
                    console.error('❌ Token not found in sessionStorage after GitHub auth');
                    console.error('📊 SessionStorage contents:', {
                        token: sessionStorage.getItem('token'),
                        isMentorLoggedIn: sessionStorage.getItem('isMentorLoggedIn'),
                        isCustomerLoggedIn: sessionStorage.getItem('isCustomerLoggedIn'),
                        mentorId: sessionStorage.getItem('mentorId'),
                        customerId: sessionStorage.getItem('customerId')
                    });
                    alert('Authentication incomplete. Please try logging in again.');
                    return;
                }
                
                // Log success for debugging
                console.log('✅ GitHub auth successful:', {
                    userType: result.userType,
                    userId: userId,
                    tokenExists: !!storedToken,
                    tokenPreview: storedToken.substring(0, 20) + '...',
                    isNewUser
                });
                
                if (isNewUser) {
                    alert(`Welcome! Your ${userType} account has been created successfully with GitHub. Please complete your profile information.`);
                } else {
                    alert(`Welcome back! You've been logged in successfully with GitHub.`);
                }
                
                if (onSuccess) {
                    onSuccess();
                } else {
                    // Default navigation
                    const dashboardRoute = userType === 'mentor' ? '/mentor-dashboard' : '/customer-dashboard';
                    navigate(dashboardRoute);
                }
            } else {
                console.error('❌ GitHub auth verification failed:', result);
                alert(result.message || "GitHub authentication failed. Please try again.");
            }
        } catch (error) {
            console.error("❌ GitHub auth verification error:", error);
            alert("An error occurred during GitHub authentication. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGitHubLogin = async () => {
        if (isLoading) return;
        
        setIsLoading(true);
        try {
            console.log(`🔄 Initiating GitHub OAuth for ${userType}`);
            const result = await actions.initiateGitHubAuth(userType);
            
            console.log('📊 GitHub OAuth initiation result:', result);
            
            if (result.success && result.auth_url) {
                console.log('✅ GitHub OAuth URL generated, redirecting...');
                // Redirect to GitHub OAuth
                window.location.href = result.auth_url;
            } else {
                console.error('❌ Failed to initiate GitHub OAuth:', result);
                alert(result.message || "Failed to initiate GitHub authentication.");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("❌ GitHub OAuth initiation error:", error);
            alert("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="btn btn-outline-light w-100 py-2 mb-3 d-flex align-items-center justify-content-center"
            style={{
                border: '1px solid #333',
                backgroundColor: 'transparent',
                color: '#fff',
                transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
                if (!isLoading) {
                    e.target.style.backgroundColor = '#333';
                    e.target.style.color = 'white';
                }
            }}
            onMouseLeave={(e) => {
                if (!isLoading) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#fff';
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
                        fill="currentColor"
                    >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    {buttonText || `Continue with GitHub`}
                </>
            )}
        </button>
    );
};