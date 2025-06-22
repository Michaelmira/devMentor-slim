// Working CalendlyConnectionHandler.js with real OAuth flow

const CalendlyConnectionHandler = {
  // Helper function to get the correct backend URL
  getBackendUrl() {
    const backendUrl = process.env.BACKEND_URL ||
                       'https://verbose-meme-975xp7gqvvwh99jw-3001.app.github.dev';

    console.log('Using backend URL:', backendUrl);
    return backendUrl;
  },

  // Helper function to get token
  getAuthToken() {
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('jwt_token') ||
                  sessionStorage.getItem('token') ||
                  sessionStorage.getItem('access_token');
    
    console.log('Token search result:', !!token);
    return token;
  },

  // Function to initiate Calendly connection
  async handleConnectCalendly() {
    try {
      const token = this.getAuthToken();
      const backendUrl = this.getBackendUrl();
      
      if (!token) {
        alert('You must be logged in as a mentor to connect Calendly. Please log in and try again.');
        return;
      }
      
      console.log('Token available:', !!token);
      console.log('Initiating Calendly OAuth...');
      
      const fullUrl = `${backendUrl}/api/calendly/oauth/initiate`;
      console.log('Full request URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('OAuth initiate response status:', response.status);
      console.log('OAuth initiate response headers:', Object.fromEntries(response.headers.entries()));

      // Check if we got HTML instead of JSON (wrong endpoint)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML instead of JSON - wrong endpoint or routing issue');
        alert('Configuration error: OAuth endpoint not accessible.');
        return;
      }

      if (!response.ok) {
        const responseText = await response.text();
        console.log('OAuth initiate error response:', responseText);
        
        if (response.status === 401 || response.status === 422) {
          alert('Authentication failed. Please log in as a mentor and try again.');
          return;
        }
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.msg || 'Failed to initiate Calendly connection');
        } catch (parseError) {
          throw new Error(`Server returned status ${response.status}: ${responseText.substring(0, 200)}`);
        }
      }

      const data = await response.json();
      
      // Redirect to Calendly authorization page
      if (data.calendly_auth_url) {
        console.log('Redirecting to Calendly OAuth:', data.calendly_auth_url);
        window.location.href = data.calendly_auth_url;
      } else {
        throw new Error('No authorization URL received from server');
      }
    } catch (error) {
      console.error('Error connecting to Calendly:', error);
      alert('Failed to connect to Calendly: ' + error.message);
    }
  },

  // Function to test current connection
  async testCalendlyConnection() {
    try {
      const token = this.getAuthToken();
      const backendUrl = this.getBackendUrl();
      
      if (!token) {
        console.log('No token available for connection test');
        return {
          connected: false,
          error: 'No authentication token available. Please log in as a mentor.'
        };
      }

      console.log('Testing Calendly connection...');
      
      const fullUrl = `${backendUrl}/api/calendly/test-connection`;
      console.log('Full test URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Test connection response status:', response.status);

      if (response.status === 401 || response.status === 422) {
        return {
          connected: false,
          error: 'Authentication failed. Please log in as a mentor.'
        };
      }

      // Check if response is HTML
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('Received HTML instead of JSON:', htmlText.substring(0, 200));
        return {
          connected: false,
          error: 'API endpoint not found. Backend may not have Calendly routes configured.'
        };
      }

      const responseText = await response.text();
      console.log('Test connection response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        return {
          connected: false,
          error: `Invalid server response. Please check backend configuration.`
        };
      }
      
      if (response.ok && data.connected) {
        console.log('Calendly connection test successful:', data);
        return {
          connected: true,
          userName: data.user_name,
          userEmail: data.user_email
        };
      } else {
        console.log('Calendly connection test failed:', data);
        return {
          connected: false,
          error: data.error || `Connection test failed: ${data.msg || 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('Error testing Calendly connection:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  },

  // Function to disconnect Calendly
  async handleDisconnectCalendly() {
    try {
      const token = this.getAuthToken();
      const backendUrl = this.getBackendUrl();
      
      if (!token) {
        alert('You must be logged in as a mentor to disconnect Calendly.');
        return false;
      }
      
      const fullUrl = `${backendUrl}/api/calendly/disconnect`;
      console.log('Disconnect URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Disconnect response status:', response.status);

      if (response.status === 401 || response.status === 422) {
        alert('Authentication failed. Please log in as a mentor and try again.');
        return false;
      }

      // Check for HTML response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        alert('API endpoint not found. Please check backend configuration.');
        return false;
      }

      if (!response.ok) {
        const responseText = await response.text();
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.msg || 'Failed to disconnect Calendly');
        } catch (parseError) {
          throw new Error(`Server returned status ${response.status}: ${responseText.substring(0, 200)}`);
        }
      }

      const data = await response.json();
      console.log('Calendly disconnected successfully:', data);
      return true;
    } catch (error) {
      console.error('Error disconnecting Calendly:', error);
      alert('Failed to disconnect Calendly: ' + error.message);
      return false;
    }
  },

  // Function to handle OAuth callback results
  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('calendly_success') === 'true') {
      console.log('✅ Calendly OAuth callback: Success');
      // Remove URL parameters and refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return 'success';
    } else if (urlParams.has('calendly_error')) {
      const error = urlParams.get('calendly_error');
      const errorDetails = urlParams.get('error_details') || '';
      
      console.log('❌ Calendly OAuth callback: Error -', error, errorDetails);
      
      let errorMessage = 'Failed to connect to Calendly.';
      
      switch (error) {
        case 'state_mismatch':
          errorMessage = 'Security validation failed. Please try again.';
          break;
        case 'missing_code':
          errorMessage = 'Authorization was not completed. Please try again.';
          break;
        case 'config_error':
          errorMessage = 'Server configuration error. Please contact support.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to complete authorization. Please try again.';
          break;
        case 'oauth_error':
          errorMessage = `OAuth error: ${errorDetails}`;
          break;
        case 'timeout':
          errorMessage = 'Connection timed out. Please try again.';
          break;
        case 'network_error':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'missing_user_info':
          errorMessage = 'Session expired during OAuth. Please try again.';
          break;
        default:
          errorMessage = `Connection failed: ${error}`;
      }
      
      console.error('Calendly OAuth error details:', error, errorDetails);
      
      // Clean up URL and show error
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Return error info for the component to handle
      return { error: errorMessage, errorType: error };
    }
    
    return null;
  }
};

export { CalendlyConnectionHandler };