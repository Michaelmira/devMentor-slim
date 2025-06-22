import smtplib
from email.message import EmailMessage
import os

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