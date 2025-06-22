// MentorAvailability.js
import React, { useState } from 'react';
import { InlineWidget } from 'react-calendly';

// ==========================================
// CALENDLY CONFIGURATION
// ==========================================
// Replace this URL with your actual Calendly link
const CALENDLY_URL = "https://calendly.com/michaelmirisciotta";

// Widget configuration
const CALENDLY_SETTINGS = {
  height: '650px',
  prefill: {
    email: "", // Will be filled with mentor email if available
    firstName: "",
    lastName: ""
  }
};
// ==========================================

export const MentorAvailability = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState(CALENDLY_URL);
  const [urlInput, setUrlInput] = useState(CALENDLY_URL);
  const [errorMessage, setErrorMessage] = useState("");
  
  // URL validation
  const isValidUrl = (url) => {
    return url && 
           typeof url === 'string' && 
           url.trim() !== '' && 
           url.includes('calendly.com');
  }; 
  
  
  // Handle URL save
  const handleSaveUrl = () => {
    if (isValidUrl(urlInput)) {
      setCalendlyUrl(urlInput);
      setIsEditing(false);
      setErrorMessage("");
      
      // You can add code here to save to backend if needed
      // Example:
      // saveToBackend(urlInput);
    } else {
      setErrorMessage("Please enter a valid Calendly URL (e.g., https://calendly.com/your-username)");
    }
  };
  
  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h3 className="m-0">Manage Your Availability</h3>
            </div>
            <div className="card-body">
              <p className="card-text mb-4">
                Connect your Calendly account to let clients book sessions with you.
                With Calendly, you can sync your calendar, set your availability preferences,
                and manage bookings automatically.
              </p>
              
              {isEditing ? (
                <div className="mb-4">
                  <div className="form-group">
                    <label htmlFor="calendlyUrl">Your Calendly URL</label>
                    <div className="input-group">
                      <input 
                        type="text" 
                        className="form-control"
                        id="calendlyUrl"
                        placeholder="https://calendly.com/your-username" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <div className="input-group-append">
                        <button 
                          className="btn btn-success" 
                          onClick={handleSaveUrl}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => {
                            setIsEditing(false);
                            setUrlInput(calendlyUrl);
                            setErrorMessage("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {errorMessage && (
                      <div className="text-danger mt-2">
                        {errorMessage}
                      </div>
                    )}
                    <small className="form-text text-muted">
                      Enter the full URL to your Calendly scheduling page
                    </small>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Your current Calendly URL:</strong>
                      <p className="mb-0">
                        <a href={calendlyUrl} target="_blank" rel="noopener noreferrer">
                          {calendlyUrl}
                        </a>
                      </p>
                    </div>
                    <button 
                      className="btn btn-outline-primary" 
                      onClick={() => setIsEditing(true)}
                    >
                      Change URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isValidUrl(calendlyUrl) && (
        <div className="row">
          <div className="col-12">
            <div className="card mb-4">
              <div className="card-header">
                <h4 className="m-0">Your Availability Calendar</h4>
              </div>
              <div className="card-body p-0">
                <InlineWidget 
                  url={calendlyUrl}
                  styles={{ height: CALENDLY_SETTINGS.height }}
                  prefill={CALENDLY_SETTINGS.prefill}
                />
              </div>
              <div className="card-footer text-muted">
                <small>
                  This is how clients will see your availability when booking sessions.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorAvailability;