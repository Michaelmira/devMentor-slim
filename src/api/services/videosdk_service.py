import os
import requests
import jwt
from datetime import datetime, timedelta
import json
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class VideoSDKService:
    def __init__(self):
        self.api_key = os.getenv('VIDEOSDK_API_KEY')
        self.secret_key = os.getenv('VIDEOSDK_SECRET_KEY')
        self.api_endpoint = os.getenv('VIDEOSDK_API_ENDPOINT', 'https://api.videosdk.live/v2')
        
        logger.info("🚀 VideoSDKService initialized")
        logger.info(f"📊 Config: API_KEY={self.api_key[:10] if self.api_key else 'None'}..., ENDPOINT={self.api_endpoint}")
        
    def generate_token(self, permissions=None, duration_hours=4):
        """Generate a token for VideoSDK with configurable duration"""
        try:
            logger.info(f"🔑 Generating VideoSDK token with duration: {duration_hours} hours")
            logger.info(f"📊 Permissions requested: {permissions}")
            
            api_key = os.getenv('VIDEOSDK_API_KEY')
            secret_key = os.getenv('VIDEOSDK_SECRET_KEY')
            
            if not api_key or not secret_key:
                logger.error("❌ VideoSDK API key or secret key not found in environment variables")
                raise ValueError("VideoSDK API key or secret key not found in environment variables")

            logger.info(f"✅ API credentials found: API_KEY={api_key[:10]}..., SECRET_KEY={secret_key[:10]}...")

            # If no permissions specified, give full permissions
            if permissions is None:
                permissions = ['allow_join', 'allow_mod', 'allow_record']
                logger.info(f"📊 Using default permissions: {permissions}")

            # Create payload with necessary permissions and longer expiration
            iat_time = datetime.utcnow()
            exp_time = iat_time + timedelta(hours=duration_hours)
            
            payload = {
                'apikey': api_key,
                'permissions': permissions,
                'version': 2,
                'iat': iat_time,
                'exp': exp_time
            }
            
            # Fixed the f-string syntax error here
            payload_for_logging = {
                'apikey': api_key[:10] + '...',
                'permissions': payload['permissions'],
                'version': payload['version'],
                'iat': payload['iat'].isoformat(),
                'exp': payload['exp'].isoformat()
            }
            logger.info(f"📊 JWT Payload: {json.dumps(payload_for_logging, indent=2)}")

            # Generate JWT token
            logger.info("🔄 Encoding JWT token...")
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            # If token is bytes, decode it
            if isinstance(token, bytes):
                token = token.decode('utf-8')
                logger.info("🔄 Decoded token from bytes to string")
                
            logger.info(f"✅ Token generated successfully: {token[:50]}...")
            return token

        except Exception as e:
            logger.error(f"❌ Error generating VideoSDK token: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise
    
    def create_meeting(self, booking_id, mentor_name, customer_name, start_time, duration_minutes=60):
        """Create a meeting room for a booking with improved configuration"""
        try:
            logger.info(f"🎬 Creating meeting for booking {booking_id}")
            logger.info(f"📊 Meeting details: {mentor_name} + {customer_name}, duration: {duration_minutes}min")
            
            # Generate token with longer duration for meeting creation
            logger.info("🔑 Generating token for meeting creation...")
            token = self.generate_token(duration_hours=6)
            
            headers = {
                "Authorization": token,
                "Content-Type": "application/json"
            }
            
            # Fixed f-string here too
            headers_for_logging = {k: v[:50] + '...' if k == 'Authorization' else v for k, v in headers.items()}
            logger.info(f"📊 Request headers: {json.dumps(headers_for_logging, indent=2)}")
            
            # Custom meeting ID based on booking
            custom_id = f"booking_{booking_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            logger.info(f"📊 Custom meeting ID: {custom_id}")
            
            recording_enabled = os.getenv('VIDEOSDK_RECORDING_ENABLED', 'false').lower() == 'true'
            webhook_url = f"{os.getenv('BACKEND_URL')}/api/videosdk/webhook" if os.getenv('BACKEND_URL') else None
            
            logger.info(f"📊 Meeting settings: recording={recording_enabled}, webhook={webhook_url}")
            
            meeting_data = {
                "customRoomId": custom_id,
                "description": f"Mentoring session: {mentor_name} with {customer_name}",
                "autoStartRecording": recording_enabled,
                "webhookUrl": webhook_url,
                "permissions": {
                    "askToJoin": False,
                    "toggleRecording": True,
                    "toggleLivestream": False,
                    "drawOnWhiteboard": True,
                    "toggleWhiteboard": True,
                    "toggleParticipantMic": True,
                    "toggleParticipantWebcam": True,
                    "toggleParticipantScreenShare": True,
                    "toggleParticipantMode": True,
                    "toggleHls": False,
                    "toggleSimulcast": True,
                    "canPin": True,
                    "canRemoveOtherParticipant": True
                },
                "participantCanToggleSelfWebcam": True,
                "participantCanToggleSelfMic": True,
                "participantCanLeave": True,
                "chatEnabled": True,
                "screenShareEnabled": True,
                "pollEnabled": True,
                "whiteboardEnabled": True,
                "participantCanToggleRecording": False,
                "participantCanToggleLivestream": False,
                "participantCanEndMeeting": False,
                "audioEnabled": True,
                "videoEnabled": True,
                "hdMeetingEnabled": True,
                # Add these settings to prevent automatic ending
                "maintainVideoOrder": True,
                "meetingDuration": duration_minutes * 2,  # Set duration to 2x expected duration
                "notify": {
                    "participantJoined": True,
                    "participantLeft": True,
                    "recordingStarted": True,
                    "recordingStopped": True,
                    "meetingStarted": True,
                    "meetingEnded": True
                }
            }
            
            # Remove None values from meeting_data
            meeting_data = {k: v for k, v in meeting_data.items() if v is not None}
            
            logger.info(f"📊 Meeting data: {json.dumps(meeting_data, indent=2, default=str)}")
            
            logger.info(f"🔄 Making POST request to: {self.api_endpoint}/rooms")
            response = requests.post(
                f"{self.api_endpoint}/rooms",
                headers=headers,
                json=meeting_data,
                timeout=30  # Add timeout
            )
            
            logger.info(f"📊 Response status: {response.status_code}")
            logger.info(f"📊 Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Meeting created successfully: {json.dumps(data, indent=2)}")
                
                # Use our frontend meeting route
                meeting_url = f"{os.getenv('FRONTEND_URL')}/video-meeting/{data.get('roomId')}"
                logger.info(f"📊 Generated meeting URL: {meeting_url}")
                
                result = {
                    "success": True,
                    "meeting_id": data.get("roomId"),
                    "custom_id": custom_id,
                    "token": token,
                    "meeting_url": meeting_url
                }
                
                # Fixed f-string here
                result_for_logging = {k: v if k != 'token' else v[:50] + '...' for k, v in result.items()}
                logger.info(f"✅ Returning success result: {json.dumps(result_for_logging, indent=2)}")
                return result
            else:
                logger.error(f"❌ Failed to create meeting. Status: {response.status_code}")
                logger.error(f"❌ Response text: {response.text}")
                
                try:
                    error_data = response.json()
                    logger.error(f"❌ Response JSON: {json.dumps(error_data, indent=2)}")
                except:
                    logger.error("❌ Could not parse response as JSON")
                
                return {
                    "success": False,
                    "error": response.json() if response.text else {"message": "Unknown error"}
                }
        except Exception as e:
            logger.error(f"❌ Exception in create_meeting: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_meeting_details(self, meeting_id):
        """Get details of a specific meeting"""
        try:
            logger.info(f"📊 Getting meeting details for: {meeting_id}")
            
            token = self.generate_token(duration_hours=2)
            headers = {"Authorization": token}
            
            logger.info(f"🔄 Making GET request to: {self.api_endpoint}/rooms/{meeting_id}")
            response = requests.get(
                f"{self.api_endpoint}/rooms/{meeting_id}",
                headers=headers,
                timeout=30
            )
            
            logger.info(f"📊 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Meeting details retrieved: {json.dumps(data, indent=2)}")
                return {"success": True, "data": data}
            else:
                logger.error(f"❌ Failed to get meeting details. Status: {response.status_code}")
                logger.error(f"❌ Response text: {response.text}")
                return {"success": False, "error": response.json() if response.text else {"message": "Unknown error"}}
        except Exception as e:
            logger.error(f"❌ Error getting meeting details: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {"success": False, "error": str(e)}
    
    def end_meeting(self, meeting_id):
        """End an active meeting"""
        try:
            logger.info(f"🛑 Ending meeting: {meeting_id}")
            
            token = self.generate_token(duration_hours=1)
            headers = {"Authorization": token}
            
            logger.info(f"🔄 Making POST request to: {self.api_endpoint}/rooms/{meeting_id}/end")
            response = requests.post(
                f"{self.api_endpoint}/rooms/{meeting_id}/end",
                headers=headers,
                timeout=30
            )
            
            logger.info(f"📊 Response status: {response.status_code}")
            logger.info(f"📊 Response text: {response.text}")
            
            success = response.status_code == 200
            if success:
                logger.info("✅ Meeting ended successfully")
            else:
                logger.error("❌ Failed to end meeting")
                
            return success
        except Exception as e:
            logger.error(f"❌ Error ending meeting: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return False

    def refresh_meeting_token(self, meeting_id, permissions=None):
        """Generate a fresh token for an existing meeting"""
        try:
            logger.info(f"🔄 Refreshing token for meeting: {meeting_id}")
            logger.info(f"📊 Requested permissions: {permissions}")
            
            # Generate a new token with extended duration
            token = self.generate_token(permissions=permissions, duration_hours=4)
            logger.info(f"✅ Token refreshed successfully: {token[:50]}...")
            return token
        except Exception as e:
            logger.error(f"❌ Error refreshing meeting token: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return None