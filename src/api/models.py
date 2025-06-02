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

    profile_photo = db.relationship("CustomerImage", back_populates="customer", uselist=False)
    # sessions = db.relationship("Session", back_populates="customer", lazy="dynamic")

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
            # "sessions": [session.id for session in self.sessions]
        }
    
class CustomerImage(db.Model):
    """Profile face image to be uploaded by the customer """

    # __table_args__ = (
    #     db.UniqueConstraint("user_username", name="unique_user_image"),
    # )
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
    calendly_url = db.Column(db.String(500), nullable=True)
    calendly_access_token = db.Column(Text, nullable=True)
    calendly_refresh_token = db.Column(Text, nullable=True)
    calendly_token_expires_at = db.Column(DateTime(timezone=True), nullable=True)
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
    days = db.Column(MutableList.as_mutable(ARRAY(db.String(255))), default=list) ## Days Avaiable 
    price = db.Column(db.Numeric(10,2), nullable=True)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    google_oauth_credentials = db.Column(db.Text, nullable=True)
    # confirmed_sessions = db.relationship("Session", back_populates="mentor")
    

    profile_photo = db.relationship("MentorImage", back_populates="mentor", uselist=False)   ######
    portfolio_photos = db.relationship("PortfolioPhoto", back_populates="mentor")   ######

    stripe_account_id = db.Column(db.String(255), unique=True, nullable=True)

    def __repr__(self):
        return f'<Mentor {self.email}>'

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
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
            # "confirmed_sessions": [session.serialize() for session in self.confirmed_sessions] if self.confirmed_sessions else [],
            "days": [day for day in self.days] if self.days is not None else [],
            "calendly_url": self.calendly_url,
            "is_calendly_connected": True if self.calendly_access_token else False,
            # OAuth tokens should NOT be serialized by default for security
            "profile_photo": self.profile_photo.serialize() if self.profile_photo else None,
            "portfolio_photos": [portfolio_photo.serialize() for portfolio_photo in self.portfolio_photos] if self.portfolio_photos is not None else [],
            "about_me": self.about_me,
            "price": str(self.price)
        }

class MentorImage(db.Model):
    """Profile face image to be uploaded by the mentor for profile """

    # __table_args__ = (
    #     db.UniqueConstraint("user_username", name="unique_user_image"),
    # )
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

    # __table_args__ = (
    #     db.UniqueConstraint("user_username", name="unique_user_image"),
    # )
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

# NEW Booking Model
class BookingStatus(PyEnum):
    PENDING_PAYMENT = "pending_payment"       # Initial state before payment
    PAID = "paid"                             # Payment confirmed, pending final Calendly scheduling
    CONFIRMED = "confirmed"                   # Successfully scheduled in Calendly
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
    paid_at = db.Column(DateTime(timezone=True), nullable=True) # When payment was successfully processed
    scheduled_at = db.Column(DateTime(timezone=True), nullable=True) # When Calendly event was confirmed

    # Original Calendly selection details (from onDateAndTimeSelected)
    calendly_event_uri = db.Column(Text, nullable=True) # e.g., "https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2"
    calendly_invitee_uri = db.Column(Text, nullable=True) # e.g., "https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2/invitees/AAAAAAAAAAAAAAAA"
    calendly_event_start_time = db.Column(DateTime(timezone=True), nullable=True)
    calendly_event_end_time = db.Column(DateTime(timezone=True), nullable=True)

    # Invitee details provided in the second form
    invitee_name = db.Column(db.String(200), nullable=True)
    invitee_email = db.Column(db.String(120), nullable=True)
    invitee_notes = db.Column(Text, nullable=True)

    # Payment details
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True, index=True)
    amount_paid = db.Column(Numeric(10,2), nullable=True)
    currency = db.Column(db.String(10), default="usd")
    platform_fee = db.Column(Numeric(10,2), nullable=True)
    mentor_payout_amount = db.Column(Numeric(10,2), nullable=True)

    status = db.Column(Enum(BookingStatus), default=BookingStatus.PENDING_PAYMENT, nullable=False)

    # Relationships
    mentor = relationship("Mentor", backref=db.backref("bookings", lazy=True))
    customer = relationship("Customer", backref=db.backref("bookings", lazy=True))

    def __repr__(self):
        return f'<Booking {self.id} - Mentor: {self.mentor_id} Customer: {self.customer_id} Status: {self.status.value}>'

    def serialize(self):
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "customer_id": self.customer_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            
            "calendly_event_uri": self.calendly_event_uri,
            "calendly_invitee_uri": self.calendly_invitee_uri,
            "calendly_event_start_time": self.calendly_event_start_time.isoformat() if self.calendly_event_start_time else None,
            "calendly_event_end_time": self.calendly_event_end_time.isoformat() if self.calendly_event_end_time else None,
            
            "invitee_name": self.invitee_name,
            "invitee_email": self.invitee_email,
            "invitee_notes": self.invitee_notes,
            
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "amount_paid": str(self.amount_paid) if self.amount_paid is not None else None,
            "currency": self.currency,
            "platform_fee": str(self.platform_fee) if self.platform_fee is not None else None,
            "mentor_payout_amount": str(self.mentor_payout_amount) if self.mentor_payout_amount is not None else None,
            
            "status": self.status.value, # Return the string value of the enum
            
            # Optional: include serialized mentor/customer details
            "mentor": self.mentor.serialize() if self.mentor else None, 
            "customer": self.customer.serialize() if self.customer else None,
        }