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
import RatingDisplay from "../component/RatingDisplay";
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

            const processOAuth = async () => {
                try {
                    const authAction = mvpGoogleAuth === 'success'
                        ? actions.verifyMVPGoogleAuth
                        : actions.verifyMVPGitHubAuth;

                    const result = await authAction({
                        token,
                        user_id: userId,
                        user_type: userType
                    });

                    if (result.success) {
                        console.log("OAuth verification successful");

                        // 🔥 ADD THIS: Restore the selected time slot from sessionStorage
                        const pendingTimeSlot = sessionStorage.getItem('pendingTimeSlot');
                        if (pendingTimeSlot) {
                            try {
                                const timeSlot = JSON.parse(pendingTimeSlot);
                                setSelectedTimeSlot(timeSlot);
                                sessionStorage.removeItem('pendingTimeSlot'); // Clean up
                                console.log("Restored time slot from storage:", timeSlot);
                            } catch (e) {
                                console.error("Failed to parse pending time slot:", e);
                            }
                        }

                        // Clean URL
                        window.history.replaceState({}, '', window.location.pathname);

                        // Move to payment
                        setShowCalendar(false);
                        setShowAuthForm(false);
                        setShowPaymentForm(true);
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

    // UPDATED: Enhanced time slot selection with customer timezone support
    const handleTimeSlotSelected = (slot) => {
        console.log("Time slot selected with timezone data:", slot);

        // Ensure the slot has all timezone information
        const enhancedSlot = {
            ...slot,
            // Make sure we have customer timezone (should come from calendar widget)
            customer_timezone: slot.customer_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            mentor_timezone: slot.mentor_timezone
        };

        setSelectedTimeSlot(enhancedSlot);

        // Check if user is logged in
        if (store.token && store.customerId) {
            // User is logged in, proceed to payment
            setShowCalendar(false);
            setShowPaymentForm(true);
        } else {
            // User needs to authenticate
            // Save the enhanced slot to sessionStorage in case of OAuth redirect
            sessionStorage.setItem('pendingTimeSlot', JSON.stringify(enhancedSlot));
            setShowCalendar(false);
            setShowAuthForm(true);
        }
    };

    // Auth handlers
    const handleLoginSuccess = () => {
        setShowAuthForm(false);
        setShowPaymentForm(true);
    };

    const handleSignupSuccess = () => {
        setShowAuthForm(false);
        setShowVerifyCode(true);
    };

    const handleSignupNeedsVerification = (email) => {
        setEmailForVerification(email);
        setShowAuthForm(false);
        setShowVerifyCode(true);
    };

    const handleVerificationSuccess = () => {
        setShowVerifyCode(false);
        setShowPaymentForm(true);
    };

    // UPDATED: Enhanced payment success handler with customer timezone
    const handlePaymentSuccess = async (paymentIntent) => {
        console.log("Payment successful:", paymentIntent);
        console.log("Selected time slot with timezone:", selectedTimeSlot);

        try {
            // Prepare booking data with customer timezone
            const bookingData = {
                mentorId: mentor.id,
                sessionStartTime: selectedTimeSlot.start_time,
                sessionEndTime: selectedTimeSlot.end_time,
                customer_timezone: selectedTimeSlot.customer_timezone, // ✅ ADD CUSTOMER TIMEZONE
                mentor_timezone: selectedTimeSlot.mentor_timezone,     // ✅ ADD MENTOR TIMEZONE  
                paymentIntentId: paymentIntent.id,
                amountPaid: paymentIntent.amount / 100, // Convert cents to dollars
                notes: "" // Can be added later if needed
            };

            console.log("Finalizing booking with timezone data:", bookingData);

            // Call the finalize booking action
            const result = await actions.finalizeBooking(bookingData);

            if (result.success) {
                console.log("Booking finalized successfully!");

                // Prepare names for email
                const customerFullName = `${store.currentUserData?.user_data?.first_name || ''} ${store.currentUserData?.user_data?.last_name || ''}`.trim();
                const mentorFullName = `${mentor.first_name} ${mentor.last_name}`;
                const customerEmail = store.currentUserData?.user_data?.email;

                // Send booking confirmation email
                try {
                    const emailResponse = await fetch(`${process.env.BACKEND_URL}/api/send-booking-confirmation`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${store.token}`
                        },
                        body: JSON.stringify({
                            booking_id: result.booking.id,
                            customer_email: customerEmail,
                            customer_name: customerFullName,
                            mentor_name: mentorFullName,
                            mentor_email: mentor.email || '',
                            customer_timezone: selectedTimeSlot.customer_timezone // ✅ PASS CUSTOMER TIMEZONE TO EMAIL
                        })
                    });

                    const emailResult = await emailResponse.json();

                    if (emailResult.success) {
                        console.log('✅ Booking confirmation email sent successfully with timezone:', selectedTimeSlot.customer_timezone);
                    } else {
                        console.warn('⚠️ Booking was created but email failed to send:', emailResult.message);
                    }
                } catch (emailError) {
                    console.error('❌ Error sending booking confirmation email:', emailError);
                }

                console.log('🎯 Navigating to booking confirmed page');

                // Navigate to booking confirmed page
                navigate(`/booking-confirmed/${result.booking.id}`, {
                    state: {
                        mentorName: mentorFullName,
                        mentorId: mentor.id,
                        sessionStartTime: selectedTimeSlot.start_time,
                        sessionEndTime: selectedTimeSlot.end_time,
                        customerTimezone: selectedTimeSlot.customer_timezone,
                        mentorTimezone: selectedTimeSlot.mentor_timezone,
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
                    <p>We couldn't find the mentor you're looking for. This might be because:</p>
                    <ul>
                        <li>The mentor profile doesn't exist</li>
                        <li>The URL is incorrect</li>
                        <li>The mentor has been removed</li>
                    </ul>
                    <Link to="/" className="btn btn-primary">
                        Browse All Mentors
                    </Link>
                </div>
            </div>
        );
    }

    // Render booking flow based on current state
    const renderBookingFlow = () => {
        if (showVerifyCode) {
            return (
                <div className="card">
                    <div className="card-body">
                        <h4 className="card-title">Verify Your Email</h4>
                        <VerifyCodeModal
                            show={showVerifyCode}
                            email={emailForVerification}
                            onVerifySuccess={handleVerificationSuccess}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            );
        }

        if (showAuthForm) {
            return (
                <div className="card">
                    <div className="card-body">
                        <ul className="nav nav-tabs mb-3" role="tablist">
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

                        <div className="tab-content">
                            {activeAuthTab === 'login' ? (
                                <>
                                    <CustomerLogin
                                        onLoginSuccess={handleLoginSuccess}
                                        onCancel={handleCancel}
                                    />
                                    <div className="text-center mt-3">
                                        <p className="mb-2">Or sign in with:</p>
                                        <div className="d-flex gap-2 justify-content-center">
                                            <MVPGoogleOAuthButton userType="customer" />
                                            <MVPGitHubOAuthButton userType="customer" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CustomerSignup
                                        onSignupSuccess={handleSignupSuccess}
                                        onSignupNeedsVerification={handleSignupNeedsVerification}
                                        onCancel={handleCancel}
                                    />
                                    <div className="text-center mt-3">
                                        <p className="mb-2">Or sign up with:</p>
                                        <div className="d-flex gap-2 justify-content-center">
                                            <MVPGoogleOAuthButton userType="customer" />
                                            <MVPGitHubOAuthButton userType="customer" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (showPaymentForm) {
            return (
                <div className="card">
                    <div className="card-body">
                        <h4 className="card-title">Complete Your Booking</h4>

                        {selectedTimeSlot && (
                            <div className="mb-4">
                                <h6>Session Details:</h6>
                                <p className="mb-1">
                                    <strong>Date:</strong> {selectedTimeSlot.formatted_date}
                                </p>
                                <p className="mb-1">
                                    <strong>Time:</strong> {selectedTimeSlot.formatted_start_time} - {selectedTimeSlot.formatted_end_time}
                                    {selectedTimeSlot.customer_timezone && (
                                        <small className="text-muted ms-2">
                                            (Your local time)
                                        </small>
                                    )}
                                </p>
                                <p className="mb-1">
                                    <strong>Duration:</strong> {selectedTimeSlot.duration} minutes
                                </p>
                                <hr />
                            </div>
                        )}

                        <PaymentForm
                            mentor={mentor}
                            selectedTimeSlot={selectedTimeSlot}
                            onSuccess={handlePaymentSuccess}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            );
        }

        // Default: Show calendar
        return (
            <div className="card">
                <div className="card-body">
                    <h4 className="card-title">Select a Time Slot</h4>
                    <BookingCalendarWidget
                        mentorId={mentor.id}
                        mentorName={`${mentor.first_name} ${mentor.last_name}`}
                        onSelectSlot={handleTimeSlotSelected}
                        backendUrl={process.env.BACKEND_URL}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="mentor-details-page">
            <div className="container mt-5 mb-5">

                <div className="row">
                    <div className="col-md-4">
                        {/* Profile Card */}
                        <div className="card">
                            <div className="card-body text-center">
                                {mentor.profile_photo ? (
                                    <img
                                        src={mentor.profile_photo.image_url}  // ✅ This is correct
                                        alt={`${mentor.first_name} ${mentor.last_name}`}
                                        className="rounded-circle mb-3"
                                        style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div
                                        className="rounded-circle mb-3 d-flex align-items-center justify-content-center bg-secondary text-white"
                                        style={{ width: '150px', height: '150px', margin: '0 auto' }}
                                    >
                                        <span style={{ fontSize: '48px' }}>
                                            {mentor.first_name?.[0]}{mentor.last_name?.[0]}
                                        </span>
                                    </div>
                                )}
                                <h3>{mentor.first_name} {mentor.last_name}</h3>
                                {mentor.nick_name && (
                                    <p className="text-muted">"{mentor.nick_name}"</p>
                                )}
                            </div>
                        </div>

                        {/* Contact & Location Info */}
                        <div className="card mt-3 mb-3 ">
                            <div className="card-header">
                                <h5 className="mb-0">Contact & Location</h5>
                            </div>
                            <div className="card-body">
                                <ul className="list-unstyled">
                                    <li className="mb-2">
                                        <MapPin size={16} className="me-2 text-muted" />
                                        {mentor.city}, {mentor.what_state}
                                        {mentor.country && (
                                            <><br /><small className="text-muted ms-4">{mentor.country}</small></>
                                        )}
                                    </li>
                                    {mentor.email && (
                                        <li className="mb-2">
                                            <Mail size={16} className="me-2 text-muted" />
                                            <a href={`mailto:${mentor.email}`} className="text-decoration-none">
                                                {mentor.email}
                                            </a>
                                        </li>
                                    )}
                                    {mentor.phone && (
                                        <li className="mb-2">
                                            <Phone size={16} className="me-2 text-muted" />
                                            <a href={`tel:${mentor.phone}`} className="text-decoration-none">
                                                {mentor.phone}
                                            </a>
                                        </li>
                                    )}
                                    {(mentor.linkedin_url || mentor.github_url) && (
                                        <li className="mb-2">
                                            <div className="d-flex align-items-center">
                                                <span className="me-2 text-muted" style={{ fontSize: '14px' }}>Social:</span>
                                                <div className="d-flex gap-2">
                                                    {mentor.linkedin_url && (
                                                        <a
                                                            href={mentor.linkedin_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="badge bg-primary text-decoration-none"
                                                            style={{ fontSize: '0.75rem' }}
                                                        >
                                                            <i className="fab fa-linkedin"></i>
                                                        </a>
                                                    )}
                                                    {mentor.github_url && (
                                                        <a
                                                            href={mentor.github_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="badge bg-dark text-decoration-none"
                                                            style={{ fontSize: '0.75rem' }}
                                                        >
                                                            <i className="fab fa-github"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    )}
                                </ul>


                            </div>
                        </div>

                        {/* ADD THIS LINE HERE */}
                        <RatingDisplay mentorId={mentor.id} showInSidebar={false} />

                        {/* Experience & Pricing */}
                        <div className="card mt-3">
                            <div className="card-header">
                                <h5 className="mb-0">Experience & Pricing</h5>
                            </div>
                            <div className="card-body">
                                <ul className="list-unstyled">
                                    {mentor.years_exp && (
                                        <li className="mb-2">
                                            <Award size={16} className="me-2 text-muted" />
                                            {mentor.years_exp} years experience
                                        </li>
                                    )}
                                    {mentor.price && (
                                        <li className="mb-2">
                                            <DollarSign size={16} className="me-2 text-muted" />
                                            ${mentor.price}/hour
                                        </li>
                                    )}
                                </ul>
                                <button
                                    className="btn btn-primary btn-lg w-100 mt-3"
                                    onClick={handleBookSession}
                                >
                                    <Calendar size={20} className="me-2" />
                                    Book a Session
                                </button>
                            </div>
                        </div>

                        {/* Skills Section */}
                        {mentor.skills && mentor.skills.length > 0 && (
                            <div className="card mt-3">
                                <div className="card-header">
                                    <h5 className="mb-0">Skills & Expertise</h5>
                                </div>
                                <div className="card-body">
                                    <div className="d-flex flex-wrap gap-2">
                                        {(Array.isArray(mentor.skills)
                                            ? mentor.skills
                                            : mentor.skills.split(',')
                                        ).map((skill, index) => (
                                            <span key={index} className="badge bg-primary">
                                                {typeof skill === 'string' ? skill.trim() : skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-md-8">
                        {/* About Section */}
                        <div className="card mb-4">
                            <div className="card-header">
                                <h5 className="mb-0">About {mentor.first_name}</h5>
                            </div>
                            <div className="card-body">
                                <p style={{ whiteSpace: 'pre-line' }}>
                                    {mentor.about_me || 'No description provided.'}
                                </p>
                            </div>
                        </div>

                        {/* Portfolio Section */}
                        {mentor.portfolio_photos && mentor.portfolio_photos.length > 0 && (
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h5 className="mb-0">Portfolio</h5>
                                </div>
                                <div className="card-body">
                                    <div className="portfolio-thumbnails-grid">
                                        {mentor.portfolio_photos.map((photo, index) => (
                                            <img
                                                key={index}
                                                src={photo.image_url}
                                                alt={`Portfolio ${index + 1}`}
                                                className="portfolio-thumbnail"
                                                onClick={() => openPortfolioModal(photo.image_url)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Section */}
                        <div ref={bookingSectionRef}>
                            {renderBookingFlow()}
                        </div>
                    </div>
                </div>

                {/* Portfolio Modal */}
                {showPortfolioModal && (
                    <div className="portfolio-modal" onClick={closePortfolioModal}>
                        <span className="portfolio-modal-close" onClick={closePortfolioModal}>
                            &times;
                        </span>
                        <img className="portfolio-modal-content" src={selectedPortfolioImage} alt="Portfolio" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentorDetails;