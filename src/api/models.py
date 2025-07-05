from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.ext.mutable import MutableList, MutableDict
from sqlalchemy.types import ARRAY, JSON
from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text
from enum import Enum as PyEnum
from sqlalchemy.orm import relationship

import datetime


db = SQLAlchemy()

    
class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(30), unique=False, nullable=False)
    last_name = db.Column(db.String(30), unique=False, nullable=False)
    phone = db.Column(db.String(30), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(256), unique=False, nullable=False)
    is_active = db.Column(db.Boolean(), unique=False,)
    last_active = db.Column(db.DateTime(timezone=True), unique=False)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    about_me = db.Column(db.String(2500), unique=False)
    is_verified = db.Column(db.Boolean(), default=False, nullable=False)
    verification_code = db.Column(db.String(6), nullable=True)

    profile_photo = db.relationship("CustomerImage", back_populates="customer", uselist=False)

    def __repr__(self):
        return f'<Customer {self.email}>'

    def serialize(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "is_active": self.is_active,
            "last_active": self.last_active,
            "date_joined": self.date_joined,
            "profile_photo": self.profile_photo.serialize() if self.profile_photo else None,
            "about_me": self.about_me,
            "is_verified": self.is_verified,
        }
    
class CustomerImage(db.Model):
    """Profile face image to be uploaded by the customer """
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"), nullable=False, unique=True)
    customer = db.relationship("Customer", back_populates="profile_photo", uselist=False)

    def __init__(self, public_id, image_url, customer_id):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.customer_id = customer_id

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
        }
    
class Mentor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True)
    last_active = db.Column(DateTime(timezone=True), unique=False)
    password = db.Column(db.String(256), unique=False, nullable=False)
    first_name = db.Column(db.String(30), unique=False, nullable=False)
    last_name = db.Column(db.String(30), unique=False, nullable=False)
    nick_name = db.Column(db.String(30), unique=False)
    phone = db.Column(db.String(30), nullable=False, index=True)
    city = db.Column(db.String(30), unique=False, nullable=False)
    what_state = db.Column(db.String(30), unique=False, nullable=False)
    country = db.Column(db.String(30), unique=False, nullable=False)
    about_me = db.Column(db.String(2500), unique=False)
    years_exp = db.Column(db.String(30), unique=False)
    skills = db.Column(MutableList.as_mutable(ARRAY(db.String(255))), default=list)
    days = db.Column(MutableList.as_mutable(ARRAY(db.String(255))), default=list) ## Days Available 
    price = db.Column(db.Numeric(10,2), nullable=True)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    google_oauth_credentials = db.Column(db.Text, nullable=True)
    is_verified = db.Column(db.Boolean(), default=False, nullable=False)
    verification_code = db.Column(db.String(6), nullable=True)
    
    profile_photo = db.relationship("MentorImage", back_populates="mentor", uselist=False)
    portfolio_photos = db.relationship("PortfolioPhoto", back_populates="mentor")
    stripe_account_id = db.Column(db.String(255), unique=True, nullable=True)

    def __repr__(self):
        return f'<Mentor {self.email}>'

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "last_active": self.last_active,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "nick_name": self.nick_name,
            "phone": self.phone,
            "city": self.city,
            "what_state": self.what_state,
            "country": self.country,
            "years_exp": self.years_exp,
            "skills": [skill for skill in self.skills] if self.skills is not None else [],
            "days": [day for day in self.days] if self.days is not None else [],
            "profile_photo": self.profile_photo.serialize() if self.profile_photo else None,
            "portfolio_photos": [portfolio_photo.serialize() for portfolio_photo in self.portfolio_photos] if self.portfolio_photos is not None else [],
            "about_me": self.about_me,
            "price": str(self.price)
        }

class MentorImage(db.Model):
    """Profile face image to be uploaded by the mentor for profile """
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentor.id"), nullable=False, unique=True)
    mentor = db.relationship("Mentor", back_populates="profile_photo", uselist=False)
    position_x = db.Column(db.Float, nullable=True)
    position_y = db.Column(db.Float, nullable=True)
    scale = db.Column(db.Float, nullable=True)

    def __init__(self, public_id, image_url, mentor_id, position_x, position_y, scale):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.mentor_id = mentor_id
        self.position_x = position_x
        self.position_y = position_y
        self.scale = scale

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "scale": self.scale
        }
    
class PortfolioPhoto(db.Model):
    """Portfolio Images to be uploaded by the mentor for profile """
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentor.id"), nullable=False)
    mentor = db.relationship("Mentor", back_populates="portfolio_photos")

    def __init__(self, public_id, image_url, mentor_id):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.mentor_id = mentor_id

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
    }

# NEW Calendar Models
class MentorAvailability(db.Model):
    """Stores mentor's recurring weekly availability"""
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    timezone = db.Column(db.String(50), default='America/Los_Angeles', nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    mentor = relationship("Mentor", backref=db.backref("availabilities", lazy=True))
    
    def serialize(self):
        return {
            "id": self.id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "timezone": self.timezone,
            "is_active": self.is_active
        }

class MentorUnavailability(db.Model):
    """Stores specific dates/times when mentor is unavailable (vacations, holidays, etc.)"""
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor.id'), nullable=False)
    start_datetime = db.Column(DateTime(timezone=True), nullable=False)
    end_datetime = db.Column(DateTime(timezone=True), nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    
    mentor = relationship("Mentor", backref=db.backref("unavailabilities", lazy=True))
    
    def serialize(self):
        return {
            "id": self.id,
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "reason": self.reason
        }

class CalendarSettings(db.Model):
    """Stores mentor's calendar preferences"""
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor.id'), nullable=False, unique=True)
    session_duration = db.Column(db.Integer, default=60)  # in minutes
    buffer_time = db.Column(db.Integer, default=15)  # minutes between sessions
    advance_booking_days = db.Column(db.Integer, default=30)  # how far in advance can book
    minimum_notice_hours = db.Column(db.Integer, default=24)  # minimum hours before booking
    timezone = db.Column(db.String(50), default='America/Los_Angeles')
    
    mentor = relationship("Mentor", backref=db.backref("calendar_settings", uselist=False))
    
    def serialize(self):
        return {
            "session_duration": self.session_duration,
            "buffer_time": self.buffer_time,
            "advance_booking_days": self.advance_booking_days,
            "minimum_notice_hours": self.minimum_notice_hours,
            "timezone": self.timezone
        }

# Updated Booking Model
class BookingStatus(PyEnum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    CONFIRMED = "confirmed"
    CANCELLED_BY_CUSTOMER = "cancelled_by_customer"
    CANCELLED_BY_MENTOR = "cancelled_by_mentor"
    COMPLETED = "completed"
    REFUNDED = "refunded"

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, ForeignKey('mentor.id'), nullable=False)
    customer_id = db.Column(db.Integer, ForeignKey('customer.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    paid_at = db.Column(DateTime(timezone=True), nullable=True)
    scheduled_at = db.Column(DateTime(timezone=True), nullable=True)

    # Session fields (renamed from calendly_event_*)
    session_start_time = db.Column(DateTime(timezone=True), nullable=True)
    session_end_time = db.Column(DateTime(timezone=True), nullable=True)
    session_duration = db.Column(db.Integer, nullable=True)  # in minutes
    timezone = db.Column(db.String(50), default='America/Los_Angeles')

    invitee_name = db.Column(db.String(255), nullable=True)
    invitee_email = db.Column(db.String(255), nullable=True)
    invitee_notes = db.Column(db.Text, nullable=True)

    # Stripe specific fields
    stripe_payment_intent_id = db.Column(db.String(255), unique=True, nullable=True)
    amount_paid = db.Column(Numeric(10,2), nullable=True)
    currency = db.Column(db.String(10), nullable=True, default='usd')
    
    # Financials
    platform_fee = db.Column(Numeric(10,2), nullable=True)
    mentor_payout_amount = db.Column(Numeric(10,2), nullable=True)
    
    status = db.Column(Enum(BookingStatus), default=BookingStatus.PENDING_PAYMENT, nullable=False)
    google_meet_link = db.Column(db.String(255), nullable=True)

    # Meeting fields
    meeting_id = db.Column(db.String(100), nullable=True)
    meeting_url = db.Column(db.String(500), nullable=True)
    meeting_token = db.Column(db.Text, nullable=True)
    recording_url = db.Column(db.String(500), nullable=True)

    # Relationships
    mentor = relationship("Mentor", backref=db.backref("bookings", lazy=True))
    customer = relationship("Customer", backref=db.backref("bookings", lazy=True))

    def __repr__(self):
        return f'<Booking {self.id} - Mentor: {self.mentor_id} Customer: {self.customer_id} Status: {self.status.value}>'

    def serialize_for_mentor(self):
        return {
            "id": self.id,
            "customer_name": self.customer.first_name + " " + self.customer.last_name if self.customer else "N/A",
            "scheduled_at": self.session_start_time.isoformat() if self.session_start_time else None,
            "status": self.status.value,
            "amount_paid": str(self.amount_paid),
            "mentor_payout_amount": str(self.mentor_payout_amount),
            "google_meet_link": self.google_meet_link,
            "meeting_id": self.meeting_id,
            "meeting_url": self.meeting_url,
            "has_recording": bool(self.recording_url)
        }

    def serialize_for_customer(self):
        return {
            "id": self.id,
            "mentor_name": self.mentor.first_name + " " + self.mentor.last_name if self.mentor else "N/A",
            "session_start_time": self.session_start_time.isoformat() if self.session_start_time else None,
            "session_end_time": self.session_end_time.isoformat() if self.session_end_time else None,
            "session_duration": self.session_duration,
            "status": self.status.value,
            "amount_paid": str(self.amount_paid),
            "google_meet_link": self.google_meet_link,
            "invitee_name": self.invitee_name,
            "invitee_email": self.invitee_email,
            "invitee_notes": self.invitee_notes,
            "timezone": self.timezone,
            "meeting_id": self.meeting_id,
            "meeting_url": self.meeting_url,
            "has_recording": bool(self.recording_url)
        }

    def serialize(self):
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "customer_id": self.customer_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            
            "session_start_time": self.session_start_time.isoformat() if self.session_start_time else None,
            "session_end_time": self.session_end_time.isoformat() if self.session_end_time else None,
            "session_duration": self.session_duration,
            "timezone": self.timezone,
            
            "invitee_name": self.invitee_name,
            "invitee_email": self.invitee_email,
            "invitee_notes": self.invitee_notes,
            
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "amount_paid": str(self.amount_paid) if self.amount_paid is not None else None,
            "currency": self.currency,
            "platform_fee": str(self.platform_fee) if self.platform_fee is not None else None,
            "mentor_payout_amount": str(self.mentor_payout_amount) if self.mentor_payout_amount is not None else None,
            
            "status": self.status.value,
            "google_meet_link": self.google_meet_link,
            
            # Optional: include serialized mentor/customer details
            "mentor": self.mentor.serialize() if self.mentor else None, 
            "customer": self.customer.serialize() if self.customer else None,
        }
        