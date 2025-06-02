// AuthDebugComponent.js - Add this temporarily to debug authentication

import React, { useState, useEffect } from 'react';

export const AuthDebugComponent = () => {
  const [authState, setAuthState] = useState({});

  useEffect(() => {
    const checkAuthState = () => {
      const authData = {
        // Check all possible token locations
        localStorage_token: localStorage.getItem('token'),
        localStorage_access_token: localStorage.getItem('access_token'),
        localStorage_jwt_token: localStorage.getItem('jwt_token'),
        sessionStorage_token: sessionStorage.getItem('token'),
        sessionStorage_access_token: sessionStorage.getItem('access_token'),
        
        // Check all localStorage keys
        all_localStorage_keys: Object.keys(localStorage),
        all_sessionStorage_keys: Object.keys(sessionStorage),
        
        // Environment variables
        backend_url: process.env.REACT_APP_BACKEND_URL,
        frontend_url: process.env.FRONTEND_URL,
        
        // Current URL
        current_url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search
      };
      
      setAuthState(authData);
    };

    checkAuthState();
  }, []);

  const testMentorLogin = async () => {
    try {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('access_token') || 
                    sessionStorage.getItem('token');
      
      if (!token) {
        alert('No token found. Please log in first.');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/current/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Current user response status:', response.status);
      const responseText = await response.text();
      console.log('Current user response:', responseText);

      if (response.ok) {
        const userData = JSON.parse(responseText);
        alert('Authentication successful! User: ' + JSON.stringify(userData, null, 2));
      } else {
        alert('Authentication failed: ' + responseText);
      }
    } catch (error) {
      console.error('Auth test error:', error);
      alert('Auth test error: ' + error.message);
    }
  };

  return (
    <div className="card mb-4 border-warning">
      <div className="card-header bg-warning">
        <h6 className="mb-0">🐛 Authentication Debug (Remove in Production)</h6>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <strong>Authentication Status:</strong>
          <pre className="bg-light p-2 mt-2" style={{fontSize: '12px', overflow: 'auto'}}>
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>
        
        <div className="d-flex gap-2">
          <button 
            onClick={testMentorLogin}
            className="btn btn-sm btn-outline-primary"
          >
            Test Current User API
          </button>
          
          <button 
            onClick={() => {
              console.log('Current localStorage:', localStorage);
              console.log('Current sessionStorage:', sessionStorage);
            }}
            className="btn btn-sm btn-outline-secondary"
          >
            Log Storage to Console
          </button>
          
          <button 
            onClick={() => {
              // Try to find and log any tokens
              const possibleTokens = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
                  possibleTokens.push({key, value: value.substring(0, 50) + '...'});
                }
              }
              console.log('Possible tokens found:', possibleTokens);
              alert('Check console for possible tokens');
            }}
            className="btn btn-sm btn-outline-info"
          >
            Find Tokens
          </button>
        </div>
      </div>
    </div>
  );
};

