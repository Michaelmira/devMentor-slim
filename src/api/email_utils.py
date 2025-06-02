import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

load_dotenv()

GMAIL_USER = os.getenv("GMAIL")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

def send_booking_confirmation_email(recipient_email, subject, body_html, meeting_details=None):
    if not GMAIL_USER or not GMAIL_PASSWORD:
        print("Gmail credentials not configured. Skipping email.")
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = GMAIL_USER
    msg['To'] = recipient_email

    msg.attach(MIMEText(body_html, 'html'))

    # Basic iCalendar (ICS) data
    if meeting_details:
        ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//My App//NONSGML Event//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{meeting_details['uid']}@devmentor.com
DTSTAMP;TZID=UTC:{meeting_details['dtstamp']}
DTSTART;TZID=UTC:{meeting_details['dtstart']}
DTEND;TZID=UTC:{meeting_details['dtend']}
SUMMARY:{meeting_details['summary']}
DESCRIPTION:{meeting_details['description']}
LOCATION:{meeting_details['location']}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder
TRIGGER:-PT15M
END:VALARM
END:VEVENT
END:VCALENDAR"""
        
        # Attach ICS file
        part = MIMEApplication(ics_content.encode('utf-8'), Name="event.ics")
        part['Content-Disposition'] = 'attachment; filename="event.ics"'
        part.add_header('Content-Type', 'text/calendar; method=REQUEST; charset=UTF-8')
        msg.attach(part)


    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp_server:
            smtp_server.login(GMAIL_USER, GMAIL_PASSWORD)
            smtp_server.sendmail(GMAIL_USER, recipient_email, msg.as_string())
        print(f"Email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

if __name__ == '__main__':
    # Example usage (for testing this module directly)
    # Make sure .env file is in the same directory as this script or specify path in load_dotenv
    
    # Test 1: Simple confirmation
    # test_recipient = "test@example.com"  # Replace with a test email address
    # test_subject = "Test Booking Confirmation"
    # test_body_html = "<h1>Your booking is confirmed!</h1><p>Thank you for booking with us.</p>"
    # send_booking_confirmation_email(test_recipient, test_subject, test_body_html)

    # Test 2: Confirmation with meeting details (for calendar event)
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    test_meeting_details = {
        'uid': 'testevent123',
        'dtstamp': now.strftime('%Y%m%dT%H%M%SZ'),
        'dtstart': (now + timedelta(days=1, hours=2)).strftime('%Y%m%dT%H%M%SZ'),
        'dtend': (now + timedelta(days=1, hours=3)).strftime('%Y%m%dT%H%M%SZ'),
        'summary': 'Mentorship Session',
        'description': 'Your mentorship session is scheduled. Details: ...',
        'location': 'Online / Google Meet'
    }
    # test_recipient_calendar = "test_calendar@example.com" # Replace
    # test_subject_calendar = "Mentorship Session Scheduled - Add to Calendar"
    # test_body_html_calendar = f"""
    # <h1>Session Confirmed: {test_meeting_details['summary']}</h1>
    # <p>Hi there,</p>
    # <p>Your session with your mentor is confirmed.</p>
    # <p><strong>Time:</strong> {test_meeting_details['dtstart']} to {test_meeting_details['dtend']} (UTC)</p>
    # <p><strong>Location:</strong> {test_meeting_details['location']}</p>
    # <p>An iCalendar (.ics) file should be attached to this email to help you add it to your calendar. If not, please use the details above.</p>
    # <p>We look forward to seeing you!</p>
    # """
    # send_booking_confirmation_email(test_recipient_calendar, test_subject_calendar, test_body_html_calendar, meeting_details=test_meeting_details)
    print("Email utility module ready. Run with specific tests if needed.") 