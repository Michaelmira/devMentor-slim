import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../store/appContext';
import SessionHistory from '../component/SessionHistory';

const CustomerDashboard = () => {
    const { store, actions } = useContext(Context);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Add cleanup effect for modal backdrop (from your working version)
    useEffect(() => {
        // Remove any lingering modal backdrops
        const modalBackdrops = document.getElementsByClassName('modal-backdrop');
        while (modalBackdrops.length > 0) {
            modalBackdrops[0].remove();
        }
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }, []);

    // Use the EXACT same auth logic from your working dashboard
    useEffect(() => {
        const initialize = async () => {
            // Don't do anything if role check fails
            if (store.currentUserData?.role !== 'customer') {
                setLoading(false);
                return;
            }
            setLoading(false);
        };

        if (store.token) {
            initialize();
        } else {
            setLoading(false);
        }
    }, [store.currentUserData, store.token, actions]);

    if (loading) {
        return <div className="container text-center"><h2>Loading Dashboard...</h2></div>;
    }

    // Use EXACT same auth check from your working dashboard
    if (!store.token || store.currentUserData?.role !== 'customer') {
        return <div className="container"><h2>Please log in as a customer to see your dashboard.</h2></div>;
    }

    if (error) {
        return <div className="container alert alert-danger"><h2>Error</h2><p>{error}</p></div>;
    }

    return (
        <div className="container mt-5">
            <h1>Your Dashboard</h1>

            {/* Welcome Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">
                        Welcome back, {store.currentUserData?.user_data?.first_name || 'Customer'}!
                    </h5>
                    <p className="card-text text-muted">
                        Manage your mentoring sessions and view your learning history.
                    </p>
                </div>
            </div>

            {/* Replace old booking list with SessionHistory */}
            <SessionHistory userType="customer" />
        </div>
    );
};

export default CustomerDashboard;