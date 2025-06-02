import React, { useEffect, useContext } from "react";
import { Context } from "./store/appContext";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";

import { Home } from "./pages/home";

import { Single } from "./pages/single";
import injectContext from "./store/appContext";

import { Navbar } from "./component/Navbar";
import { Footer } from "./component/footer";

import { MentorList } from "./pages/mentorList";
import { MentorDashboard } from "./pages/MentorDashboard";
import { MentorProfile } from "./pages/MentorProfile";
import { MentorDetails } from "./pages/MentorDetails";
import { BookingDetailsPage } from "./pages/BookingDetailsPage";
import { BookingConfirmedPage } from "./pages/BookingConfirmedPage";


//create your first component
const Layout = () => {
    //the basename is used when your project is published in a subdirectory and not in the root of the domain
    // you can set the basename on the .env file located at the root of this project, E.g: BASENAME=/react-hello-webapp/
    const basename = process.env.BASENAME || "";

    if (!process.env.BACKEND_URL || process.env.BACKEND_URL == "") return <BackendURL />;

    const { store, actions } = useContext(Context);

    //useEffect to handle token exp. instances
    useEffect(() => {
        if (store.token) {
            actions.getCurrentUser();
        }

        const interval = setInterval(() => {
            if (store.token) {
                actions.getCurrentUser();
            } else {
                // Handle no token case
                console.log('User not authenticated');
            }
            // actions.getCurrentUser()
        }, 60000);

        // Cleanup function
        return () => clearInterval(interval);
    }, [store.token]);

    return (
        <div>
            <BrowserRouter basename={basename}>
                <ScrollToTop>
                    <Navbar />
                    <Routes>
                        <Route element={<Home />} path="/" />
                        <Route element={<MentorProfile />} path="/mentor-profile" />
                        <Route element={<Single />} path="/single/:theid" />
                        <Route element={<MentorList />} path="/mentor-list" />
                        <Route element={<MentorDashboard />} path="/mentor-dashboard" />
                        <Route element={<MentorDetails />} path="/mentor-details/:theid" />
                        <Route element={<BookingDetailsPage />} path="/booking-details" />
                        <Route element={<BookingConfirmedPage />} path="/booking-confirmed/:bookingId" />
                        <Route element={<h1>Not found!</h1>} path="*" />
                    </Routes>
                    <Footer />
                </ScrollToTop>
            </BrowserRouter>
        </div>
    );
};

export default injectContext(Layout);
