import React, { useEffect, useContext, useState, useRef } from "react";
import { Context } from "../store/appContext";
import { MapPin, Mail, Phone, Calendar, Clock, DollarSign, Award, BookOpen } from 'lucide-react';
import { useParams, Link, useNavigate } from "react-router-dom";
import BookingCalendarWidget from '../component/BookingCalendarWidget';
import { CustomerLogin } from '../auth/CustomerLogin';
import { CustomerSignup } from '../auth/CustomerSignup';
import { VerifyCodeModal } from '../auth/VerifyCodeModal';
import { MVPGoogleOAuthButton } from '../auth/MVPGoogelOAuthButton';
import { MVPGitHubOAuthButton } from '../auth/MVPGitHubOAuthButton';
import { PaymentForm } from '../component/PaymentForm';
import './MentorDetails.css';

export const MentorDetails = () => {
    const { store, actions } = useContext(Context);
    const { theid } = useParams();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);

    // Booking flow states
    const [showCalendar, setShowCalendar] = useState(true);
    const [showAuthForm, setShowAuthForm] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showVerifyCode, setShowVerifyCode] = useState(false);
    const [activeAuthTab, setActiveAuthTab] = useState('login');
    const [emailForVerification, setEmailForVerification] = useState("");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

    // Portfolio modal states
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [selectedPortfolioImage, setSelectedPortfolioImage] = useState(null);

    const bookingSectionRef = useRef(null);

    // Check for OAuth redirect on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mvpGoogleAuth = urlParams.get('mvp_google_auth');
        const mvpGithubAuth = urlParams.get('mvp_github_auth');
        const token = urlParams.get('token');
        const userId = urlParams.get('user_id');
        const userType = urlParams.get('user_type');

        if ((mvpGoogleAuth === 'success' || mvpGithubAuth === 'success') && token && userId && userType === 'customer') {
            console.log("Detected OAuth redirect, processing authentication");

            // Process the OAuth verification
            const processOAuth = async () => {
                try {
                    const authAction = mvpGoogleAuth === 'success' ? 'verifyMVPGoogleAuth' : 'verifyMVPGitHubAuth';
                    const result = await actions[authAction]({
                        token,
                        user_id: userId,
                        user_type: userType
                    });

                    if (result.success) {
                        console.log("OAuth verification successful");
                        // Clean URL
                        window.history.replaceState({}, '', window.location.pathname);

                        // Check if we have a pending booking
                        const pendingSlot = sessionStorage.getItem('pendingTimeSlot');
                        if (pendingSlot) {
                            setSelectedTimeSlot(JSON.parse(pendingSlot));
                            sessionStorage.removeItem('pendingTimeSlot');
                            setShowCalendar(false);
                            setShowPaymentForm(true);

                            // Scroll to booking section after state updates
                            setTimeout(() => {
                                if (bookingSectionRef.current) {
                                    bookingSectionRef.current.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start'
                                    });
                                }
                            }, 100); // Small delay to ensure DOM updates
                        }
                    } else {
                        console.error("OAuth verification failed:", result.message);
                        alert(result.message || "Authentication failed. Please try again.");
                    }
                } catch (error) {
                    console.error("OAuth processing error:", error);
                    alert("An error occurred during authentication. Please try again.");
                }
            };

            setTimeout(processOAuth, 100);
        }
    }, [actions]);

    const openPortfolioModal = (imageUrl) => {
        setSelectedPortfolioImage(imageUrl);
        setShowPortfolioModal(true);
    };

    const closePortfolioModal = () => {
        setShowPortfolioModal(false);
        setSelectedPortfolioImage(null);
    };

    useEffect(() => {
        const fetchMentorDetails = async () => {
            setLoading(true);
            try {
                const mentorData = store.mentors.find(m => m.id.toString() === theid);
                setMentor(mentorData);
            } catch (error) {
                console.error("Error fetching mentor details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (store.mentors.length === 0) {
            actions.getMentors().then(() => fetchMentorDetails());
        } else {
            fetchMentorDetails();
        }
    }, [theid, actions, store.mentors]);

    const handleBookSession = () => {
        if (bookingSectionRef.current) {
            bookingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleTimeSlotSelected = (slot) => {
        setSelectedTimeSlot(slot);

        // Check if user is logged in
        if (store.token && store.customerId) {
            // User is logged in, proceed to payment
            setShowCalendar(false);
            setShowPaymentForm(true);
        } else {
            // User needs to authenticate
            // Save the slot to sessionStorage in case of OAuth redirect
            sessionStorage.setItem('pendingTimeSlot', JSON.stringify(slot));
            setShowCalendar(false);
            setShowAuthForm(true);
        }
    };

    // Auth handlers
    const handleLoginSuccess = () => {
        setShowAuthForm(false);
        setShowPaymentForm(true);
    };

    const handleSignupSuccess = (email) => {
        setEmailForVerification(email);
        setShowAuthForm(false);
        setShowVerifyCode(true);
    };

    const handleVerificationComplete = () => {
        setShowVerifyCode(false);
        setActiveAuthTab('login');
        setShowAuthForm(true);
    };

    const handleMVPOAuthSuccess = (result) => {
        console.log("MVP OAuth success, proceeding to payment");
        setShowAuthForm(false);
        setShowPaymentForm(true);
    };

    const handlePaymentSuccess = async (paymentIntent) => {
        try {
            const bookingData = {
                mentorId: mentor.id,
                sessionStartTime: selectedTimeSlot.start_time,
                sessionEndTime: selectedTimeSlot.end_time,
                paymentIntentId: paymentIntent.id,
                amountPaid: paymentIntent.amount / 100, // Convert from cents
                notes: ''
            };

            const result = await actions.finalizeBooking(bookingData);

            if (result.success) {
                // ✅ CREATE THE FULL MENTOR NAME HERE
                const mentorFullName = `${mentor.first_name} ${mentor.last_name}`;

                // Get customer details for email
                const customerData = store.currentUserData?.user_data;
                const customerFullName = `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim();
                const customerEmail = customerData?.email;

                console.log('🎯 Booking finalized successfully, sending confirmation email...');

                // Send booking confirmation email with Google Calendar integration
                try {
                    const emailResponse = await fetch(process.env.BACKEND_URL + "/api/send-booking-confirmation", {
                        method: "POST",
                        headers: {
                            'Content-Type': "application/json",
                            'Authorization': `Bearer ${store.token}`
                        },
                        body: JSON.stringify({
                            booking_id: result.booking.id,
                            customer_email: customerEmail,
                            customer_name: customerFullName,
                            mentor_name: mentorFullName,
                            mentor_email: mentor.email || '' // Add mentor email if available
                        })
                    });

                    const emailResult = await emailResponse.json();

                    if (emailResult.success) {
                        console.log('✅ Booking confirmation email sent successfully');
                    } else {
                        console.warn('⚠️ Booking was created but email failed to send:', emailResult.message);
                        // Don't block the user flow, but log the issue
                    }
                } catch (emailError) {
                    console.error('❌ Error sending booking confirmation email:', emailError);
                    // Continue with the booking flow even if email fails
                }

                console.log('🎯 Navigating to booking confirmed page with mentor name:', mentorFullName);

                // Navigate to booking confirmed page with mentor info
                navigate(`/booking-confirmed/${result.booking.id}`, {
                    state: {
                        mentorName: mentorFullName,  // ✅ This will fix "Your Mentor"
                        mentorId: mentor.id,
                        sessionStartTime: selectedTimeSlot.start_time,
                        sessionEndTime: selectedTimeSlot.end_time,
                        amountPaid: paymentIntent.amount / 100,
                        bookingId: result.booking.id
                    }
                });
            } else {
                alert('Failed to finalize booking. Please contact support.');
            }
        } catch (error) {
            console.error('Error finalizing booking:', error);
            alert('An error occurred while finalizing your booking. Please contact support.');
        }
    };

    const handleCancel = () => {
        // Reset the booking flow
        setShowAuthForm(false);
        setShowPaymentForm(false);
        setShowVerifyCode(false);
        setShowCalendar(true);
        setSelectedTimeSlot(null);
        setEmailForVerification("");
    };

    // Effect to handle auth state changes
    useEffect(() => {
        if (showAuthForm && store.token && store.customerId) {
            console.log("User is now logged in, proceeding to payment");
            setShowAuthForm(false);
            setShowPaymentForm(true);
        }
    }, [store.token, store.customerId, showAuthForm]);

    if (loading) {
        return (
            <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!mentor) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4 className="alert-heading">Mentor Not Found</h4>
                    <p>We couldn't find the mentor you're looking for. They may no longer be available.</p>
                    <hr />
                    <div className="d-flex justify-content-between">
                        <Link to="/mentor-list" className="btn btn-primary">
                            Return to Mentor List
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const renderBookingStep = () => {
        if (showCalendar) {
            return (
                <BookingCalendarWidget
                    mentorId={mentor.id}
                    mentorName={`${mentor.first_name} ${mentor.last_name}`}
                    onSelectSlot={handleTimeSlotSelected}
                    backendUrl={process.env.BACKEND_URL}
                />
            );
        } else if (showVerifyCode) {
            return (
                <div className="card border-0 shadow p-4">
                    <div className="card-body">
                        <VerifyCodeModal
                            email={emailForVerification}
                            onClose={handleCancel}
                            switchToLogin={handleVerificationComplete}
                        />
                        <div className="text-center mt-3">
                            <button className="btn btn-secondary" onClick={handleCancel}>
                                Back to Calendar
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else if (showAuthForm) {
            return (
                <div className="card border-0 shadow p-4">
                    <div className="card-body">
                        <h4 className="text-center mb-4">Authentication Required</h4>

                        {/* MVP OAuth Buttons */}
                        <div className="mb-4">
                            <MVPGoogleOAuthButton
                                mentor={mentor}
                                onSuccess={handleMVPOAuthSuccess}
                                buttonText={activeAuthTab === 'login' ? 'Login with Google' : 'Sign up with Google'}
                            />

                            <MVPGitHubOAuthButton
                                mentor={mentor}
                                onSuccess={handleMVPOAuthSuccess}
                                buttonText={activeAuthTab === 'login' ? 'Login with GitHub' : 'Sign up with GitHub'}
                            />

                            <div className="d-flex align-items-center my-3">
                                <hr className="flex-grow-1" />
                                <span className="px-3 text-secondary">or</span>
                                <hr className="flex-grow-1" />
                            </div>
                        </div>

                        {/* Auth tabs */}
                        <ul className="nav nav-tabs mb-4">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeAuthTab === 'login' ? 'active' : ''}`}
                                    onClick={() => setActiveAuthTab('login')}
                                >
                                    Login
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeAuthTab === 'signup' ? 'active' : ''}`}
                                    onClick={() => setActiveAuthTab('signup')}
                                >
                                    Sign Up
                                </button>
                            </li>
                        </ul>

                        {/* Auth forms */}
                        {activeAuthTab === 'login' ? (
                            <CustomerLogin
                                onSuccess={handleLoginSuccess}
                                switchToSignUp={() => setActiveAuthTab('signup')}
                                onForgotPs={() => { }}
                            />
                        ) : (
                            <CustomerSignup
                                switchToLogin={() => setActiveAuthTab('login')}
                                onSignupSuccess={handleSignupSuccess}
                            />
                        )}

                        <div className="text-center mt-3">
                            <button className="btn btn-secondary" onClick={handleCancel}>
                                Back to Calendar
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else if (showPaymentForm) {
            return (
                <div className="card border-0 shadow p-4">
                    <div className="card-body">
                        <h4 className="text-center mb-4">Complete Your Booking</h4>

                        {selectedTimeSlot && (
                            <div className="mb-4">
                                <h6>Session Details:</h6>
                                <p className="mb-1">
                                    <strong>Date:</strong> {new Date(selectedTimeSlot.start_time).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                                <p className="mb-1">
                                    <strong>Time:</strong> {new Date(selectedTimeSlot.start_time).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })} - {new Date(selectedTimeSlot.end_time).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </p>
                                <p className="mb-1">
                                    <strong>Duration:</strong> {selectedTimeSlot.duration} minutes
                                </p>
                                <hr />
                            </div>
                        )}

                        <PaymentForm
                            mentor={mentor}
                            onSuccess={handlePaymentSuccess}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="container mt-5 mb-5">
            <div className="row">
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body text-center">
                            {mentor.profile_photo ? (
                                <img
                                    src={mentor.profile_photo.image_url}
                                    alt={`${mentor.first_name} ${mentor.last_name}`}
                                    className="rounded-circle img-fluid mb-3"
                                    style={{ width: "200px", height: "200px", objectFit: "cover" }}
                                />
                            ) : (
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "200px", height: "200px" }}>
                                    <span className="text-white h1">
                                        {mentor.first_name[0]}{mentor.last_name[0]}
                                    </span>
                                </div>
                            )}
                            <h3>{mentor.first_name} {mentor.last_name}</h3>
                            {mentor.nick_name && <p className="text-muted">"{mentor.nick_name}"</p>}

                            <div className="d-grid gap-2">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleBookSession}
                                >
                                    Book a Session
                                </button>
                            </div>
                        </div>

                        <ul className="list-group list-group-flush">
                            <li className="list-group-item">
                                <MapPin className="me-2" size={18} />
                                {mentor.city}, {mentor.what_state}, {mentor.country}
                            </li>
                            <li className="list-group-item">
                                <DollarSign className="me-2" size={18} />
                                ${mentor.price}/session
                            </li>
                            <li className="list-group-item">
                                <Award className="me-2" size={18} />
                                {mentor.years_exp} years of experience
                            </li>
                        </ul>
                    </div>

                    {/* Skills Section */}
                    <div className="card mt-4">
                        <div className="card-header">
                            <h5 className="mb-0">Skills & Expertise</h5>
                        </div>
                        <div className="card-body">
                            <div className="d-flex flex-wrap gap-2">
                                {mentor.skills && mentor.skills.map((skill, index) => (
                                    <span key={index} className="badge bg-primary">{skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    {/* About Section */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">About Me</h5>
                        </div>
                        <div className="card-body">
                            <p style={{ whiteSpace: 'pre-line' }}>{mentor.about_me}</p>
                        </div>
                    </div>

                    {/* Portfolio Section */}
                    {mentor.portfolio_photos && mentor.portfolio_photos.length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h5 className="mb-0">Portfolio</h5>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    {mentor.portfolio_photos.map((photo, index) => (
                                        <div key={index} className="col-md-4">
                                            <img
                                                src={photo.image_url}
                                                alt={`Portfolio ${index + 1}`}
                                                className="img-fluid rounded cursor-pointer"
                                                onClick={() => openPortfolioModal(photo.image_url)}
                                                style={{ cursor: 'pointer', height: '200px', width: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Booking Section */}
                    <div ref={bookingSectionRef} className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Book a Session</h5>
                        </div>
                        <div className="card-body">
                            {renderBookingStep()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Portfolio Modal */}
        // Replace your existing Portfolio Modal section with this:

            {/* Full-Screen Portfolio Modal */}
            {showPortfolioModal && (
                <div
                    className="modal fade show"
                    style={{
                        display: 'block',
                        zIndex: 9999
                    }}
                    tabIndex="-1"
                    onClick={closePortfolioModal} // Click anywhere to close
                >
                    <div
                        className="modal-dialog"
                        style={{
                            maxWidth: '100vw',
                            width: '100vw',
                            height: '100vh',
                            margin: 0,
                            padding: 0
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
                    >
                        <div
                            className="modal-content"
                            style={{
                                height: '100vh',
                                border: 'none',
                                borderRadius: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.95)'
                            }}
                        >
                            <div
                                className="modal-header"
                                style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '20px',
                                    border: 'none',
                                    background: 'transparent',
                                    zIndex: 10000
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={closePortfolioModal}
                                    style={{
                                        fontSize: '1.5rem',
                                        opacity: 0.8
                                    }}
                                ></button>
                            </div>
                            <div
                                className="modal-body d-flex align-items-center justify-content-center"
                                style={{
                                    height: '100vh',
                                    padding: '40px 20px'
                                }}
                            >
                                <img
                                    src={selectedPortfolioImage}
                                    alt="Portfolio"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        cursor: 'pointer'
                                    }}
                                    onClick={closePortfolioModal} // Also allow clicking image to close
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default MentorDetails;