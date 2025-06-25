# src/api/send_email.py
import smtplib
from email.message import EmailMessage
import os
from datetime import datetime
import pytz

# Import the calendar utilities
from api.calendar_utils import generate_google_calendar_url, get_calendar_urls


def send_email(to_email, subject, html_content):
    """
    Sends an email using Gmail's SMTP server.
    """
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 465  # SSL PORT
    MAIL_USERNAME = os.getenv("GMAIL")
    MAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("ERROR: Gmail credentials (GMAIL, GMAIL_PASSWORD) not found in .env file.")
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = MAIL_USERNAME
    msg["To"] = to_email
    msg.add_alternative(html_content, subtype='html')

    try:
        print(f"Attempting to send email from {MAIL_USERNAME} to {to_email}...")
        with smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT) as server:
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        print("Email sent successfully!")
        return True
    except smtplib.SMTPException as e:
        print(f"ERROR: Failed to send email using smtplib: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while sending email: {e}")
        return False


def send_verification_email_code(to_email, code):
    """
    Sends a verification email with a 6-digit code.
    """
    subject = "devMentor - Your Verification Code"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to devMentor!</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{code}</p>
        <p>Please use this code to complete your registration.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br>
        <p>Best,</p>
        <p>The devMentor Team</p>
    </div>
    """
    return send_email(to_email, subject, html_content)


def convert_utc_to_timezone(utc_time_str, target_timezone='America/Los_Angeles'):
    """
    Convert UTC time string to target timezone for display
    """
    if isinstance(utc_time_str, str):
        # Parse the UTC time string
        utc_dt = datetime.fromisoformat(utc_time_str.replace('Z', '+00:00'))
    else:
        utc_dt = utc_time_str
    
    # Ensure it's timezone-aware UTC
    if utc_dt.tzinfo is None:
        utc_dt = pytz.utc.localize(utc_dt)
    elif utc_dt.tzinfo != pytz.utc:
        utc_dt = utc_dt.astimezone(pytz.utc)
    
    # Convert to target timezone
    target_tz = pytz.timezone(target_timezone)
    local_dt = utc_dt.astimezone(target_tz)
    
    return local_dt


def format_dual_timezone_display(utc_start_time, utc_end_time):
    """
    Format time display showing both PST and EST timezones
    Returns a dictionary with formatted strings for both timezones
    """
    # Convert to PST
    pst_start = convert_utc_to_timezone(utc_start_time, 'America/Los_Angeles')
    pst_end = convert_utc_to_timezone(utc_end_time, 'America/Los_Angeles')
    
    # Convert to EST
    est_start = convert_utc_to_timezone(utc_start_time, 'America/New_York')
    est_end = convert_utc_to_timezone(utc_end_time, 'America/New_York')
    
    # Format date (should be the same for both timezones in most cases)
    formatted_date = pst_start.strftime('%A, %B %d, %Y')
    
    # Format times
    pst_start_time = pst_start.strftime('%I:%M %p')
    pst_end_time = pst_end.strftime('%I:%M %p')
    pst_abbr = pst_start.strftime('%Z')
    
    est_start_time = est_start.strftime('%I:%M %p')
    est_end_time = est_end.strftime('%I:%M %p')
    est_abbr = est_start.strftime('%Z')
    
    return {
        'formatted_date': formatted_date,
        'pst_time_range': f"{pst_start_time} - {pst_end_time} {pst_abbr}",
        'est_time_range': f"{est_start_time} - {est_end_time} {est_abbr}",
        'dual_timezone_display': f"{pst_start_time} - {pst_end_time} {pst_abbr} ({est_start_time} - {est_end_time} {est_abbr})"
    }


def send_booking_confirmation_email(customer_email, customer_name, mentor_name, booking_details):
    """
    Send optimized booking confirmation email with Google Calendar integration
    """
    # Extract booking details
    booking_id = booking_details.get('id')
    session_start_time = booking_details.get('session_start_time')
    session_end_time = booking_details.get('session_end_time')
    amount_paid = booking_details.get('amount_paid', 0)
    meeting_url = booking_details.get('meeting_url', '')
    mentor_email = booking_details.get('mentor_email', '')
    session_duration = booking_details.get('session_duration', 60)
    
    # Get dual timezone display
    timezone_info = format_dual_timezone_display(session_start_time, session_end_time)
    
    print(f"DEBUG: Original UTC times - Start: {session_start_time}, End: {session_end_time}")
    print(f"DEBUG: Dual timezone display - {timezone_info['dual_timezone_display']}")
    
    # Generate calendar URLs using the new utility (keep UTC for calendar)
    event_title = f"DevMentor Session with {mentor_name}"
    event_description = f"""
Your mentoring session with {mentor_name} is confirmed!

Session Details:
- Booking Reference: #{booking_id}
- Duration: {session_duration} minutes
- Amount Paid: ${amount_paid:.2f}

Meeting Link: {meeting_url if meeting_url else 'Will be provided before the session'}

Questions? Contact {mentor_email}

DevMentor Platform
    """.strip()
    
    # Get all calendar URLs (using original UTC times for calendar systems)
    calendar_urls = get_calendar_urls(
        event_title=event_title,
        start_time=session_start_time,  # Keep UTC for calendar
        end_time=session_end_time,      # Keep UTC for calendar
        description=event_description,
        location=meeting_url if meeting_url else "Online"
    )
    
    # Primary Google Calendar URL
    google_calendar_url = calendar_urls['google']
    outlook_calendar_url = calendar_urls['outlook']
    
    # Email subject
    subject = f"🎉 Booking Confirmed - Session with {mentor_name}"
    
    # Create optimized HTML email template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                line-height: 1.6;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .checkmark {{
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
            }}
            .session-card {{
                background: #f8f9fa;
                border-left: 4px solid #28a745;
                padding: 25px;
                margin: 25px 0;
                border-radius: 8px;
            }}
            .session-title {{
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }}
            .detail-row:last-child {{
                border-bottom: none;
            }}
            .detail-label {{
                font-weight: 600;
                color: #666;
            }}
            .detail-value {{
                color: #333;
                font-weight: 500;
            }}
            .timezone-row {{
                background: #e8f5e8;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
            }}
            .timezone-row .detail-value {{
                font-size: 14px;
                line-height: 1.5;
            }}
            .calendar-buttons {{
                text-align: center;
                margin: 25px 0;
            }}
            .calendar-button {{
                display: inline-block;
                padding: 12px 24px;
                margin: 5px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
                color: white;
            }}
            .google-calendar {{
                background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
            }}
            .outlook-calendar {{
                background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                box-shadow: 0 4px 15px rgba(0, 120, 212, 0.3);
            }}
            .calendar-button:hover {{
                transform: translateY(-2px);
                text-decoration: none;
                color: white;
            }}
            .google-calendar:hover {{
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
            }}
            .outlook-calendar:hover {{
                box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4);
            }}
            .meeting-section {{
                background: #e8f5e8;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }}
            .meeting-url {{
                background: white;
                padding: 12px;
                border-radius: 6px;
                font-family: monospace;
                word-break: break-all;
                margin: 10px 0;
                color: #0066cc;
                text-decoration: none;
                display: block;
            }}
            .next-steps {{
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }}
            .next-steps h3 {{
                color: #856404;
                margin-top: 0;
            }}
            .next-steps ul {{
                color: #856404;
                margin: 0;
                padding-left: 20px;
            }}
            .footer {{
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                border-top: 1px solid #e9ecef;
            }}
            .booking-ref {{
                background: #e3f2fd;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                margin: 20px 0;
                font-family: monospace;
                font-weight: bold;
                color: #1976d2;
            }}
            @media (max-width: 600px) {{
                .container {{
                    margin: 0;
                    border-radius: 0;
                }}
                .content, .header, .footer {{
                    padding: 20px;
                }}
                .detail-row {{
                    flex-direction: column;
                    align-items: flex-start;
                }}
                .detail-value {{
                    margin-top: 5px;
                }}
                .calendar-button {{
                    display: block;
                    margin: 10px auto;
                    width: 80%;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="checkmark">✓</div>
                <h1>Booking Confirmed!</h1>
                <p style="margin: 0; opacity: 0.9;">Your session is successfully scheduled</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hi {customer_name},
                </div>
                
                <p>Great news! Your mentoring session with <strong>{mentor_name}</strong> has been successfully confirmed and paid for.</p>
                
                <div class="session-card">
                    <div class="session-title">📅 Session Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">{timezone_info['formatted_date']}</span>
                    </div>
                    <div class="timezone-row">
                        <div class="detail-label" style="margin-bottom: 10px;">Start Time:</div>
                        <div class="detail-value">
                            <strong>Pacific Time:</strong> {timezone_info['pst_time_range']}<br>
                            <strong>Eastern Time:</strong> {timezone_info['est_time_range']}
                        </div>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">{session_duration} minutes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Mentor:</span>
                        <span class="detail-value">{mentor_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount Paid:</span>
                        <span class="detail-value">${amount_paid:.2f}</span>
                    </div>
                </div>
                
                <div class="booking-ref">
                    Booking Reference: #{booking_id}
                </div>
                
                <div class="calendar-buttons">
                    <p style="margin-bottom: 15px; color: #666; font-weight: 600;">Add to your calendar:</p>
                    <a href="{google_calendar_url}" class="calendar-button google-calendar" target="_blank">
                        📅 Google Calendar
                    </a>
                    <a href="{outlook_calendar_url}" class="calendar-button outlook-calendar" target="_blank">
                        📅 Outlook Calendar
                    </a>
                </div>
                
                {f'''
                <div class="meeting-section">
                    <h3 style="margin-top: 0; color: #28a745;">🎥 Meeting Link</h3>
                    <p>Join your session using the link below:</p>
                    <a href="{meeting_url}" class="meeting-url" target="_blank">{meeting_url}</a>
                </div>
                ''' if meeting_url else '''
                <div class="meeting-section">
                    <h3 style="margin-top: 0; color: #28a745;">🎥 Meeting Link</h3>
                    <p>Your mentor will provide the meeting link before the session starts.</p>
                </div>
                '''}
                
                <div class="next-steps">
                    <h3>📋 What's Next?</h3>
                    <ul>
                        <li>Add this session to your calendar using the buttons above</li>
                        <li>Prepare any specific questions or topics you'd like to discuss</li>
                        <li>Test your camera and microphone before the session</li>
                        <li>Join the meeting 5 minutes early to ensure everything works</li>
                        {f'<li>Contact your mentor at {mentor_email} if you have any questions</li>' if mentor_email else ''}
                    </ul>
                </div>
                
                <p style="margin-top: 30px; color: #666;">
                    Looking forward to your productive session! If you need to reschedule or have any questions, 
                    please contact us as soon as possible.
                </p>
                
                <p style="color: #666;">
                    Best regards,<br>
                    <strong>The DevMentor Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <p style="margin: 0; font-size: 14px;">
                    This email was sent to {customer_email}<br>
                    © 2025 DevMentor. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(customer_email, subject, html_content)


def send_mentor_booking_notification_email(mentor_email, mentor_name, customer_name, booking_details):
    """
    Send booking notification email to mentor when a new booking is made
    """
    # Extract booking details
    booking_id = booking_details.get('id')
    session_start_time = booking_details.get('session_start_time')
    session_end_time = booking_details.get('session_end_time')
    amount_paid = booking_details.get('amount_paid', 0)
    meeting_url = booking_details.get('meeting_url', '')
    customer_email = booking_details.get('customer_email', '')
    session_duration = booking_details.get('session_duration', 60)
    platform_fee = booking_details.get('platform_fee', amount_paid * 0.1)
    mentor_payout = booking_details.get('mentor_payout', amount_paid * 0.9)
    
    # Get dual timezone display
    timezone_info = format_dual_timezone_display(session_start_time, session_end_time)
    
    # Generate calendar URLs for mentor (using UTC times for calendar)
    event_title = f"DevMentor Session with {customer_name}"
    event_description = f"""
Mentoring session with {customer_name}

Session Details:
- Student: {customer_name}
- Contact: {customer_email}
- Booking Reference: #{booking_id}
- Duration: {session_duration} minutes
- Your Payout: ${mentor_payout:.2f}

Meeting Link: {meeting_url if meeting_url else 'Create meeting room in dashboard'}

DevMentor Platform
    """.strip()
    
    # Get calendar URLs
    calendar_urls = get_calendar_urls(
        event_title=event_title,
        start_time=session_start_time,  # Keep UTC for calendar
        end_time=session_end_time,      # Keep UTC for calendar
        description=event_description,
        location=meeting_url if meeting_url else "Online"
    )
    
    google_calendar_url = calendar_urls['google']
    outlook_calendar_url = calendar_urls['outlook']
    
    # Email subject
    subject = f"🎓 New Student Booking - {customer_name}"
    
    # Create mentor notification email template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Student Booking</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                line-height: 1.6;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .icon {{
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
            }}
            .session-card {{
                background: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 25px;
                margin: 25px 0;
                border-radius: 8px;
            }}
            .session-title {{
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }}
            .detail-row:last-child {{
                border-bottom: none;
            }}
            .detail-label {{
                font-weight: 600;
                color: #666;
            }}
            .detail-value {{
                color: #333;
                font-weight: 500;
            }}
            .timezone-row {{
                background: #e8f5e8;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
            }}
            .timezone-row .detail-value {{
                font-size: 14px;
                line-height: 1.5;
            }}
            .calendar-buttons {{
                text-align: center;
                margin: 25px 0;
            }}
            .calendar-button {{
                display: inline-block;
                padding: 12px 24px;
                margin: 5px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
                color: white;
            }}
            .google-calendar {{
                background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
            }}
            .outlook-calendar {{
                background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                box-shadow: 0 4px 15px rgba(0, 120, 212, 0.3);
            }}
            .calendar-button:hover {{
                transform: translateY(-2px);
                text-decoration: none;
                color: white;
            }}
            .google-calendar:hover {{
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
            }}
            .outlook-calendar:hover {{
                box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4);
            }}
            .meeting-section {{
                background: #e8f5e8;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }}
            .meeting-url {{
                background: white;
                padding: 12px;
                border-radius: 6px;
                font-family: monospace;
                word-break: break-all;
                margin: 10px 0;
                color: #0066cc;
                text-decoration: none;
                display: block;
            }}
            .payout-section {{
                background: #d4edda;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
                border: 1px solid #c3e6cb;
            }}
            .payout-amount {{
                font-size: 24px;
                font-weight: bold;
                color: #155724;
                margin: 10px 0;
            }}
            .action-items {{
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }}
            .action-items h3 {{
                color: #856404;
                margin-top: 0;
            }}
            .action-items ul {{
                color: #856404;
                margin: 0;
                padding-left: 20px;
            }}
            .footer {{
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                border-top: 1px solid #e9ecef;
            }}
            .booking-ref {{
                background: #e3f2fd;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                margin: 20px 0;
                font-family: monospace;
                font-weight: bold;
                color: #1976d2;
            }}
            .student-info {{
                background: #e8f5e8;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            @media (max-width: 600px) {{
                .container {{
                    margin: 0;
                    border-radius: 0;
                }}
                .content, .header, .footer {{
                    padding: 20px;
                }}
                .detail-row {{
                    flex-direction: column;
                    align-items: flex-start;
                }}
                .detail-value {{
                    margin-top: 5px;
                }}
                .calendar-button {{
                    display: block;
                    margin: 10px auto;
                    width: 80%;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="icon">🎓</div>
                <h1>New Student Booking!</h1>
                <p style="margin: 0; opacity: 0.9;">You have a new mentoring session</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hi {mentor_name},
                </div>
                
                <p>Great news! <strong>{customer_name}</strong> has booked a mentoring session with you. Here are the details:</p>
                
                <div class="session-card">
                    <div class="session-title">📅 Session Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">{timezone_info['formatted_date']}</span>
                    </div>
                    <div class="timezone-row">
                        <div class="detail-label" style="margin-bottom: 10px;">Time:</div>
                        <div class="detail-value">
                            <strong>Pacific Time:</strong> {timezone_info['pst_time_range']}<br>
                            <strong>Eastern Time:</strong> {timezone_info['est_time_range']}
                        </div>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">{session_duration} minutes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Student:</span>
                        <span class="detail-value">{customer_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Student Email:</span>
                        <span class="detail-value">{customer_email}</span>
                    </div>
                </div>
                
                <div class="booking-ref">
                    Booking Reference: #{booking_id}
                </div>
                
                <div class="payout-section">
                    <h3 style="margin-top: 0; color: #155724;">💰 Your Payout</h3>
                    <div class="payout-amount">${mentor_payout:.2f}</div>
                    <p style="color: #155724; margin: 5px 0;">Session Fee: ${amount_paid:.2f} | Platform Fee: ${platform_fee:.2f}</p>
                </div>
                
                <div class="calendar-buttons">
                    <p style="margin-bottom: 15px; color: #666; font-weight: 600;">Add to your calendar:</p>
                    <a href="{google_calendar_url}" class="calendar-button google-calendar" target="_blank">
                        📅 Google Calendar
                    </a>
                    <a href="{outlook_calendar_url}" class="calendar-button outlook-calendar" target="_blank">
                        📅 Outlook Calendar
                    </a>
                </div>
                
                {f'''
                <div class="student-info">
                    <h3 style="margin-top: 0; color: #28a745;">🎥 Meeting Link</h3>
                    <p>Your meeting room is ready:</p>
                    <a href="{meeting_url}" style="color: #0066cc; word-break: break-all;" target="_blank">{meeting_url}</a>
                </div>
                ''' if meeting_url else '''
                <div class="student-info">
                    <h3 style="margin-top: 0; color: #28a745;">🎥 Meeting Setup</h3>
                    <p>Please create a meeting room in your dashboard before the session starts.</p>
                </div>
                '''}
                
                <div class="action-items">
                    <h3>📋 Action Items</h3>
                    <ul>
                        <li>Add this session to your calendar using the buttons above</li>
                        <li>Review the student's information and prepare accordingly</li>
                        {f'<li>Set up the meeting room: {meeting_url}</li>' if meeting_url else '<li>Create a meeting room in your dashboard</li>'}
                        <li>Contact the student at {customer_email} if needed</li>
                        <li>Prepare any materials or resources for the session</li>
                    </ul>
                </div>
                
                <p style="margin-top: 30px; color: #666;">
                    We're excited for your upcoming session! If you need to reschedule or have any questions, 
                    please contact us or reach out to your student directly.
                </p>
                
                <p style="color: #666;">
                    Best regards,<br>
                    <strong>The DevMentor Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <p style="margin: 0; font-size: 14px;">
                    This email was sent to {mentor_email}<br>
                    © 2025 DevMentor. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(mentor_email, subject, html_content)