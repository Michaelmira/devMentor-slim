import React, { useEffect, useContext, useState } from "react";
import { Context } from "./store/appContext";
import { BrowserRouter, Route, Routes, useSearchParams } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";

import { Home } from "./pages/home";
import { Single } from "./pages/single";
import injectContext from "./store/appContext";

import { Navbar } from "./component/Navbar";
import { Footer } from "./component/footer";
import { CustomerAuthModal } from "./auth/CustomerAuthModal";
import { MentorAuthModal } from "./auth/MentorAuthModal";

import { MentorList } from "./pages/mentorList";
import { MentorDashboard } from "./pages/MentorDashboard";
import { MentorProfile } from "./pages/MentorProfile";
import { MentorDetails } from "./pages/MentorDetails";
import { BookingDetailsPage } from "./pages/BookingDetailsPage";
import { BookingConfirmedPage } from "./pages/BookingConfirmedPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import { LoginSuccess } from "./pages/LoginSuccess";

const MainLayout = () => {
    const [searchParams] = useSearchParams();
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showMentorModal, setShowMentorModal] = useState(false);

    useEffect(() => {
        const error = searchParams.get('error');
        const userType = searchParams.get('user_type');
        const message = searchParams.get('message');

        if (error === 'social_login_failed') {
            let errorMessage = 'Social login failed. Please try again or use email/password login.';

            // Handle specific error messages
            if (message === 'email_exists_as_customer') {
                errorMessage = 'This email is already registered as a customer. Please use the customer login instead.';
            } else if (message === 'email_exists_as_mentor') {
                errorMessage = 'This email is already registered as a mentor. Please use the mentor login instead.';
            }

            // Store the error in sessionStorage
            sessionStorage.setItem('social_login_error', errorMessage);

            // Show the appropriate modal
            if (userType === 'mentor') {
                setShowMentorModal(true);
            } else {
                setShowCustomerModal(true);
            }

            // Clean up the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [searchParams]);

    return (
        <>
            <Navbar />
            <Routes>
                <Route element={<Home />} path="/" />
                <Route element={<MentorList />} path="/mentor-list" />
                <Route element={<MentorDetails />} path="/mentor-details/:theid" />
                <Route element={<CustomerProfile />} path="/customer-profile" />
                <Route element={<CustomerDashboard />} path="/customer-dashboard" />
                <Route element={<MentorProfile />} path="/mentor-profile" />
                <Route element={<MentorDashboard />} path="/mentor-dashboard" />
                <Route element={<LoginSuccess />} path="/login-success" />
                <Route element={<BookingDetailsPage />} path="/booking-details" />
                <Route element={<BookingConfirmedPage />} path="/booking-confirmed/:bookingId" />
                <Route element={<h1>Not found!</h1>} path="*" />
            </Routes>
            <Footer />

            <CustomerAuthModal
                show={showCustomerModal}
                onHide={() => setShowCustomerModal(false)}
                initialTab="login"
            />
            <MentorAuthModal
                show={showMentorModal}
                onHide={() => setShowMentorModal(false)}
                initialTab="login"
            />
        </>
    );
};

//create your first component
const Layout = () => {
    //the basename is used when your project is published in a subdirectory and not in the root of the domain
    // you can set the basename on the .env file located at the root of this project, E.g: BASENAME=/react-hello-webapp/
    const basename = process.env.BASENAME || "";

    if (!process.env.BACKEND_URL || process.env.BACKEND_URL == "") return <BackendURL />;

    const { store, actions } = useContext(Context);

    useEffect(() => {
        // Only check user data if we have a token but no current user data
        if (store.token && !store.currentUserData) {
            actions.getCurrentUser();
        }

        // Set up a less frequent interval for token validation
        const interval = setInterval(() => {
            const token = store.token;
            if (token) {
                // Only call getCurrentUser if we have a token but no current user data
                if (!store.currentUserData) {
                    actions.getCurrentUser();
                }
            }
        }, 300000); // Check every 5 minutes instead of every minute

        return () => clearInterval(interval);
    }, [store.token, store.currentUserData]); // Add currentUserData as dependency

    return (
        <div>
            <BrowserRouter basename={basename}>
                <ScrollToTop>
                    <MainLayout />
                </ScrollToTop>
            </BrowserRouter>
        </div>
    );
};

export default injectContext(Layout);
