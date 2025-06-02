// StripePaymentComponent.js

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import axios from 'axios';
import '../../styles/StripePayment.css';

// Initialize Stripe with your public key from env variables
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Payment Form Component
const CheckoutForm = ({ customerId, customerName, mentorId, mentorName, amount, onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if we have all required data
  const hasRequiredData = customerId && mentorId && amount > 0 && stripe && elements;
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!hasRequiredData) {
      setError('Missing required payment information. Please ensure you are logged in.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the token from sessionStorage
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        setError('You must be logged in to make a payment');
        setLoading(false);
        return;
      }
      
      // Log the data being sent for debugging
      console.log('Payment data:', {
        customer_id: customerId,
        customer_name: customerName,
        mentor_id: mentorId,
        mentor_name: mentorName,
        amount: Math.round(amount * 100) // Convert to cents and ensure it's an integer
      });
      
      // First, create the payment intent and get the client secret
      const response = await axios.post(
        `${process.env.BACKEND_URL}/api/create-payment-intent`,
        {
          customer_id: customerId,
          customer_name: customerName,
          mentor_id: mentorId,
          mentor_name: mentorName,
          amount: Math.round(amount * 100) // Convert to cents and ensure it's an integer
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const clientSecret = response.data.clientSecret;
      
      // Now confirm the card payment
      const cardElement = elements.getElement(CardElement);
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerName
          }
        }
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        setError(error.message);
        if (onPaymentError) onPaymentError(error);
      } else if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent);
        if (onPaymentSuccess) onPaymentSuccess(paymentIntent);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || err.message || 'Payment failed');
      if (onPaymentError) onPaymentError(err);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="form-group">
        <div className="payment-details">
          <h4>Payment Details</h4>
          <p>Customer: {customerName}</p>
          <p>Mentor: {mentorName}</p>
          <p className="price">Amount: ${amount?.toFixed(2)}</p>
        </div>
        
        <div className="card-element-container">
          <CardElement options={cardStyle} />
        </div>
        
        {!hasRequiredData && (
          <div className="payment-error">
            <p>Missing required payment information. Please ensure you are logged in.</p>
          </div>
        )}
        
        {error && (
          <div className="payment-error">
            <p>{error}</p>
          </div>
        )}
        
        <button 
          disabled={!hasRequiredData || loading} 
          className={`payment-button ${loading ? 'loading' : ''}`}
          type="submit"
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </form>
  );
};

// Main Payment Component
export const StripePaymentComponent = ({ 
  customerId, 
  customerName, 
  mentorId, 
  mentorName, 
  amount, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  return (
    <div className="stripe-payment-container">
      <Elements stripe={stripePromise}>
        <CheckoutForm 
          customerId={customerId}
          customerName={customerName}
          mentorId={mentorId}
          mentorName={mentorName}
          amount={amount} 
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      </Elements>
    </div>
  );
};