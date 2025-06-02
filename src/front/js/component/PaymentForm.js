// PaymentForm.js
import React, { useContext } from 'react';
import { Context } from "../store/appContext";
import { StripePaymentComponent } from "./StripePaymentComponent";

export const PaymentForm = ({ mentor, paidDateTime, onSuccess, onCancel }) => {
  const { store } = useContext(Context);

  // Get the current user data
  const userData = store.currentUserData?.user_data || {};

  // Function to handle successful payment
  const handlePaymentSuccess = (paymentIntent) => {
    console.log("Payment successful:", paymentIntent);

    // Call the parent success handler
    if (onSuccess) {
      onSuccess(paymentIntent);
    }
  };

  // Function to handle payment errors
  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
    // You might want to show an error message
    alert(`Payment error: ${error.message || 'Unknown error'}`);
  };

  // Get the amount from mentor data
  const sessionAmount = parseFloat(mentor?.price || 0);

  // Debug output
  console.log("Customer data:", {
    id: userData.id,
    name: `${userData.first_name || ''} ${userData.last_name || ''}`,
    email: userData.email
  });

  return (
    <div className="payment-form-container">
      <div className="session-details mb-4">
        <h4 className="text-center mb-3">Session Details</h4>
        <p><strong>Mentor:</strong> {mentor.first_name} {mentor.last_name}</p>
        <p><strong>Date/Time:</strong> {new Date(paidDateTime).toLocaleString()}</p>
        <p><strong>Session Duration:</strong> {mentor.session_duration || 60} minutes</p>
        <p><strong>Amount:</strong> ${sessionAmount.toFixed(2)}</p>
      </div>

      <div className="stripe-payment-wrapper">
        <StripePaymentComponent
          customerId={userData.id?.toString()}
          customerName={`${userData.first_name || ''} ${userData.last_name || ''}`}
          mentorId={mentor.id.toString()}
          mentorName={`${mentor.first_name} ${mentor.last_name}`}
          amount={sessionAmount}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>

      <div className="text-center mt-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};