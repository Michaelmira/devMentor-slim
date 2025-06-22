import React, { useState, useEffect } from 'react';

export const StripeConnect = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get the backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'https://turbo-robot-r44p4pp7grxjh54gp-3001.app.github.dev';

    useEffect(() => {
        // Check for success or error messages in URL params (after redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const stripeStatus = urlParams.get('stripe');

        if (stripeStatus === 'error') {
            setError(urlParams.get('message') || 'An error occurred with Stripe connection');
        }

        const fetchStatus = async () => {
            try {
                const token = sessionStorage.getItem('token');
                console.log("JWT Token (first 10 chars):", token ? token.substring(0, 10) + "..." : "No token");

                const response = await fetch(`${backendUrl}/api/mentor/stripe-status`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 422) {
                    console.error("JWT validation error - token might be invalid");
                    setError("Session expired. Please log in again.");
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to fetch Stripe connection status");
                }

                const data = await response.json();
                setIsConnected(data.isConnected);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching Stripe status:", error);
                setError(error.message || "Could not check Stripe connection status");
                setLoading(false);
            }
        };

        fetchStatus();
    }, [backendUrl]);

    const handleConnectStripe = async () => {
        setLoading(true);
        setError(null);

        // Get the token from sessionStorage
        const token = sessionStorage.getItem('token');

        // Check if token exists
        if (!token) {
            setError("You need to be logged in to connect Stripe");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/connect-stripe`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Make sure there's a space after "Bearer"
                }
            });

            if (response.status === 422) {
                throw new Error("Invalid authentication token. Please log in again.");
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to initiate Stripe connection");
            }

            const data = await response.json();

            if (data.url) {
                window.top.location.href = data.url;
            } else {
                throw new Error("Stripe URL not found in response");
            }
        } catch (error) {
            console.error("Error connecting to Stripe:", error);
            setError(error.message || "Could not connect to Stripe. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div style={{
            maxWidth: "400px",
            margin: "auto",
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "15px"
        }}>
            <h2>Stripe Connection</h2>

            {error && (
                <div style={{
                    padding: "10px",
                    marginBottom: "15px",
                    backgroundColor: "#ffeeee",
                    color: "#d32f2f",
                    borderRadius: "4px"
                }}>
                    {error}
                </div>
            )}

            {loading ? (
                <p>Loading Stripe connection status...</p>
            ) : (
                <>
                    <p>
                        {isConnected
                            ? "Your Stripe account is connected. You can now receive payments."
                            : "Connect your Stripe account to receive payments from customers."}
                    </p>
                    {!isConnected && (
                        <button
                            onClick={handleConnectStripe}
                            disabled={loading}
                            style={{
                                padding: "10px 20px",
                                marginTop: "10px",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer"
                            }}
                        >
                            {loading ? "Connecting..." : "Connect with Stripe"}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}; 