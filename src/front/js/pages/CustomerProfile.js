import React, { useState, useContext, useEffect } from 'react';
import { Context } from '../store/appContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CustomerProfile = () => {
    const { store, actions } = useContext(Context);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchCustomerData = async () => {
            if (store.currentUserData?.role === 'customer') {
                setCustomer(store.currentUserData.user_data);
            }
            setLoading(false);
        };
        fetchCustomerData();
    }, [store.currentUserData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const success = await actions.editCustomer(customer);
            if (success) {
                toast.success("Profile updated successfully!");
                // Optionally refresh user data
                await actions.getCurrentUser();
            } else {
                toast.error("Failed to update profile.");
            }
        } catch (error) {
            toast.error("An error occurred while updating.");
            console.error("Error updating customer profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="container text-center"><h2>Loading Profile...</h2></div>;
    }

    if (!store.token || !customer) {
        return <div className="container"><h2>Please log in as a customer to see your profile.</h2></div>;
    }

    return (
        <div className="container mt-5">
            <ToastContainer />
            <div className="card shadow-sm">
                <div className="card-header">
                    <h2>Your Profile</h2>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="first_name" className="form-label">First Name</label>
                            <input type="text" name="first_name" id="first_name" className="form-control" value={customer.first_name || ''} onChange={handleChange} />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="last_name" className="form-label">Last Name</label>
                            <input type="text" name="last_name" id="last_name" className="form-control" value={customer.last_name || ''} onChange={handleChange} />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input type="email" name="email" id="email" className="form-control" value={customer.email || ''} onChange={handleChange} disabled />
                            <small className="text-muted">Email cannot be changed.</small>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="phone" className="form-label">Phone Number</label>
                            <input type="text" name="phone" id="phone" className="form-control" value={customer.phone || ''} onChange={handleChange} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CustomerProfile; 