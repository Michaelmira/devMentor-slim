"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
import logging
from datetime import datetime, timedelta, date, time as datetime_time 
import stripe

from flask import Flask, request, jsonify, url_for, Blueprint, current_app, redirect, session, Response
from flask_cors import CORS, cross_origin
import jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm.attributes import flag_modified

import cloudinary.uploader as uploader
from cloudinary.uploader import destroy
from cloudinary.api import delete_resources_by_tag

from api.services.videosdk_service import VideoSDKService

from api.models import db, Mentor, Customer, MentorImage, PortfolioPhoto, Booking, BookingStatus, MentorAvailability, CalendarSettings, MentorUnavailability
from api.utils import generate_sitemap, APIException
from api.decorators import mentor_required, customer_required
from api.send_email import send_email, send_verification_email_code

import pytz
from enum import Enum as PyEnum

# from .googlemeet import meet_service
from urllib.parse import urlencode

# from .mentorGoogleCalendar import calendar_service
import json
from google.oauth2.credentials import Credentials
import requests # For making HTTP requests to Calendly
import secrets # For generating secure state tokens for OAuth

from datetime import datetime as dt
from decimal import Decimal
import time

from api.calendar_utils import generate_icalendar_content



from dotenv import load_dotenv

# Load environment variables
load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL") or "http://localhost:3000"
BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:3001"

# Stripe API Setup
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_CLIENT_ID = os.getenv("STRIPE_CLIENT_ID")
STRIPE_CALLBACK_URL = f"{os.getenv('BACKEND_URL')}/api/stripe/callback"
stripe.api_key = STRIPE_SECRET_KEY


api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

import random
import string

def generate_verification_code():
    return "".join(random.choices(string.digits, k=6))

@api.route('/current/user')
@jwt_required()
@cross_origin(origins=[os.getenv("FRONTEND_URL") or "http://localhost:3000"])
def get_current_user():
    user_id = get_jwt_identity()
    role = get_jwt()['role']

    if role == 'mentor':
        mentor = Mentor.query.get(user_id)
        if mentor is None:
            return jsonify({"msg": "No user with this email exists."}), 404
        return jsonify(role = "mentor", user_data = mentor.serialize())
    
    if role == 'customer':
        customer = Customer.query.get(user_id)
        if customer is None:
            return jsonify({"msg": "No user with this email exists."}), 404
        return jsonify(role = "customer", user_data = customer.serialize())


# Mentor routes Start # Mentor routes Start # Mentor routes Start
# Mentor routes Start # Mentor routes Start # Mentor routes Start
# Mentor routes Start # Mentor routes Start # Mentor routes Start
# Mentor routes Start # Mentor routes Start # Mentor routes Start


@api.route('/mentor/signup', methods=['POST'])
def mentor_signup():

    email = request.json.get("email", None)
    password = request.json.get("password", None)
    first_name = request.json.get("first_name", None)
    last_name = request.json.get("last_name", None)
    city = request.json.get("city", None)
    what_state = request.json.get("what_state", None)
    country = request.json.get("country", None)
    phone = request.json.get("phone", "None")

    if email is None or password is None or first_name is None or last_name is None or city is None or what_state is None or country is None or phone is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
    existingMentorEmail = Mentor.query.filter_by(email=email).one_or_none()
    if existingMentorEmail:
        return jsonify({"msg": "An account associated with the email already exists"}), 409
    existingMentorPhone = Mentor.query.filter_by(phone=phone).one_or_none()
    if existingMentorPhone:
        return jsonify({"msg": "An account associated with this number already exists. Please try a different phone number."}), 409

    verification_code = generate_verification_code()
    mentor = Mentor(
        email=email, 
        password=generate_password_hash(password), 
        first_name=first_name, 
        last_name=last_name, 
        city=city, 
        what_state=what_state, 
        country=country, 
        phone=phone,
        is_verified=False,
        verification_code=verification_code
    )
    db.session.add(mentor)
    db.session.commit()
    
    # Send verification email
    send_verification_email_code(email, verification_code)

    db.session.refresh(mentor)
    response_body = {
        "msg": "Mentor Account successfully created! Please check your email to verify your account.",
        "mentor":mentor.serialize()
    }
    return jsonify(response_body), 201

@api.route('/mentor/login', methods=['POST'])
def mentor_login():
    email = request.json.get("email", None)
    password = request.json.get("password", None)

    if email is None or password is None:
        return jsonify({"msg": "Email and password are required."}), 400
    
    mentor = Mentor.query.filter_by(email=email).one_or_none()
    if mentor is None:
        return jsonify({"msg": "No user with this email exists."}), 404
    
    if not check_password_hash(mentor.password, password):
        return jsonify({"msg": "Incorrect password, please try again."}), 401

    if not mentor.is_verified:
        return jsonify({"msg": "Please verify your email address before logging in."}), 403

    access_token = create_access_token(
        identity=mentor.id, 
        additional_claims={"role": "mentor"},
    )
    return jsonify({
        "access_token":access_token,
        "mentor_id": mentor.id,
        "mentor_data": mentor.serialize()
    }), 200

@api.route('/verify-code', methods=['POST'])
def verify_code():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return jsonify({"msg": "Email and code are required"}), 400

    mentor = Mentor.query.filter_by(email=email).first()
    customer = Customer.query.filter_by(email=email).first()

    user = mentor or customer
    user_type = 'mentor' if mentor else 'customer'

    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Developer bypass code
    if code == "999000":
        user.is_verified = True
        user.verification_code = None
        db.session.commit()
        return jsonify({"msg": "Email verified successfully"}), 200

    if user.verification_code == code:
        user.is_verified = True
        user.verification_code = None
        db.session.commit()
        return jsonify({"msg": "Email verified successfully"}), 200
    else:
        return jsonify({"msg": "Invalid verification code"}), 400

@api.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    
    if not email:
        return jsonify({"message": "Email is required"}), 400
    
    user = Mentor.query.filter_by(email=email).first() or Customer.query.filter_by(email=email).first()
    if user is None:
        return jsonify({"message": "Email does not exist"}), 400
    
    expiration_time = datetime.utcnow() + timedelta(hours=3)
    token = jwt.encode({"email": email, "exp": expiration_time}, os.getenv("FLASK_APP_KEY"), algorithm="HS256")

    reset_link = f"{os.getenv('FRONTEND_URL')}/?token={token}"
    
    email_html = f"""
    <html>
    <body style="color: #333;">
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello {user.first_name},</p>
            <p>We received a request to reset your password for your devMentor account. If you didn't make this request, you can safely ignore this email.</p>
            <p>To reset your password, please click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #4CAF50; 
                          color: white; 
                          padding: 12px 24px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you're having trouble clicking the button, you can also copy and paste the link from the button into your browser.</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
                Best regards,<br>
                The devMentor Team
            </p>
        </div>
    </body>
    </html>
    """
    
    send_email(email, email_html, "Password Reset Request: devMentor")
    return jsonify({"message": "Recovery password email has been sent!"}), 200

@api.route("/reset-password/<token>", methods=["PUT"])
def reset_password(token):
    data = request.get_json()
    password = data.get("password")

    if not password:
        return jsonify({"message": "Please provide a new password."}), 400

    try:
        decoded_token = jwt.decode(token, os.getenv("FLASK_APP_KEY"), algorithms=["HS256"])
        email = decoded_token.get("email")
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token has expired"}), 400
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 400

    # Query both tables
    mentor = Mentor.query.filter_by(email=email).first()
    customer = Customer.query.filter_by(email=email).first()

    # Check if email exists in either table
    if not mentor and not customer:
        return jsonify({"message": "Email does not exist"}), 400

    # Generate hashed password once
    hashed_password = generate_password_hash(password)

    # Update password in relevant table(s)
    if mentor:
        mentor.password = hashed_password
    if customer:
        customer.password = hashed_password

    db.session.commit()

    # Determine roles for response
    roles = []
    if mentor:
        roles.append("mentor")
    if customer:
        roles.append("customer")

    send_email(email, "Your password has been changed successfully.", "Password Change Notification")

    return jsonify({
        "message": "Password successfully changed.", 
        "roles": roles,
        "email": email
    }), 200


@api.route("/change-password", methods=["PUT"])
@jwt_required()  # This ensures that the request includes a valid JWT token
def change_password():
    data = request.json
    password = data.get("password")
    if not password:
        return jsonify({"message": "Please provide a new password."}), 400
    
    try:
        # This will now work because @jwt_required() has validated the token
        user_id = get_jwt_identity()
        print(f"Decoded JWT Identity: {user_id}")

        user = Mentor.query.get(user_id) or Customer.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        user.password = generate_password_hash(password)
        db.session.commit()
        
        # Send an email notification after the password has been changed
        email_body = "Your password has been changed successfully. If you did not request this change, please contact support."
        send_email(user.email, email_body, "Password Change Notification")

        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        print(f"Token decryption failed: {str(e)}")
        logging.error(f"Error changing password: {str(e)}")
        return jsonify({"message": "An error occurred. Please try again later."}), 500

@api.route('/mentors', methods=['GET'])
def all_mentors():
   mentors = Mentor.query.all()
   return jsonify([mentor.serialize() for mentor in mentors]), 200

@api.route('/mentorsnosession', methods=['GET'])
def all_mentors_no_sessions():
    mentors = Mentor.query.all()
    serialized_mentors = [mentor.serialize() for mentor in mentors]
    # Remove confirmed_sessions from each mentor's data
    for mentor in serialized_mentors:
        mentor.pop('confirmed_sessions', None)
    return jsonify(serialized_mentors), 200

@api.route('/mentor/<int:mentor_id>', methods=['GET'])
def get_mentor_by_id(mentor_id):
    mentor = Mentor.query.get(mentor_id)
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    return jsonify(mentor.serialize()), 200

@api.route('/mentor', methods=['GET'])
@mentor_required
def mentor_by_id():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    # Add calendar settings to response if needed
    settings = CalendarSettings.query.filter_by(mentor_id=mentor_id).first()
    mentor_data = mentor.serialize()
    if settings:
        mentor_data['calendar_settings'] = settings.serialize()
    
    return jsonify(mentor_data), 200

@api.route('/mentor/edit-self', methods=['PUT'])
@mentor_required
def mentor_edit_self():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"msg": "Mentor not found"}), 404

    data = request.json
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    # Define a list of fields that are safe to update directly from the main profile form
    updatable_fields = [
        'first_name', 'last_name', 'nick_name', 'phone', 'city',
        'what_state', 'country', 'about_me', 'years_exp', 'skills',
        'days', 'price'
    ]

    try:
        for key, value in data.items():
            if key in updatable_fields:
                # Special handling for price to ensure it's a Decimal or None
                if key == 'price':
                    if value is None or value == 'None' or str(value).strip() == '':
                        setattr(mentor, key, None)
                    else:
                        try:
                            from decimal import Decimal
                            setattr(mentor, key, Decimal(value))
                        except Exception:
                            current_app.logger.warning(f"Could not convert price '{value}' to Decimal for mentor {mentor_id}. Skipping update for this field.")
                            continue
                else:
                    setattr(mentor, key, value)
        
        db.session.commit()
        
        # After successful commit, refresh the object to get the latest state from the DB
        db.session.refresh(mentor)
        
        current_app.logger.info(f"Successfully updated profile for mentor {mentor_id}")
        return jsonify({"msg": "User updated successfully", "user": mentor.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating mentor {mentor_id}: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({"msg": "An internal error occurred while updating the profile."}), 500

@api.route('/mentor/bookings', methods=['GET'])
@mentor_required
def get_mentor_bookings():
    mentor_id = get_jwt_identity()
    bookings = Booking.query.filter_by(mentor_id=mentor_id).all()
    return jsonify([b.serialize_for_mentor() for b in bookings]), 200

@api.route('/mentor/upload-photo', methods =['POST'])
@mentor_required
def mentor_upload_photo():

    mentor =  Mentor.query.get(get_jwt_identity())
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    position_x = request.form.get("position_x")
    position_y = request.form.get("position_y")
    scale = request.form.get("scale")

    images = request.files.getlist("file")
    mentor_img=MentorImage.query.filter_by(mentor_id=mentor.id).all()
    for image_file in images:
        response = uploader.upload(image_file)
        print(response)
        if len(mentor_img) == 1:
            print(f"{response.items()}")
            mentor_img[0].image_url=response['secure_url']
            uploader.destroy(mentor_img[0].public_id)
            mentor_img[0].public_id=response['public_id']
            mentor_img[0].position_x=position_x
            mentor_img[0].position_y=position_y
            mentor_img[0].scale=scale
            db.session.commit()
        if len(mentor_img) == 0:
            new_image = MentorImage(public_id=response["public_id"], image_url=response["secure_url"],mentor_id=mentor.id, position_x=position_x, position_y=position_y, scale=scale)
            db.session.add(new_image)
            db.session.commit()

    return jsonify ({"Msg": "Image Sucessfully Uploaded"})

@api.route('/mentor/delete-photo', methods =['DELETE'])
@mentor_required
def mentor_delete_photo():
    mentor =  Mentor.query.get(get_jwt_identity())

    mentor_img=MentorImage.query.filter_by(mentor_id=get_jwt_identity()).first()
    uploader.destroy(mentor_img.public_id)
    db.session.delete(mentor_img)
    db.session.commit()

    return jsonify ({"Msg": "Image Sucessfully Deleted", "mentor": mentor.serialize()})


@api.route('/mentor/upload-portfolio-image', methods =['POST'])
@mentor_required
def mentor_upload_portfolio():

    mentor =  Mentor.query.filter_by(id=get_jwt_identity()).first()
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404

    images = request.files.getlist("file")
    print(images)
    for image_file in images:
        response = uploader.upload(image_file)
        if response["secure_url"] is None:
            return jsonify({"Msg": "An error occured while uploading 1 or more images"}), 500
        print(f"{response.items()}")
        new_image = PortfolioPhoto(public_id=response["public_id"], image_url=response["secure_url"],mentor_id=mentor.id)
        db.session.add(new_image)
        db.session.commit()
        db.session.refresh(mentor)

    return jsonify ({"Msg": "Image Sucessfully Uploaded"})

@api.route('/mentor/delete-portfolio-images', methods=['DELETE'])
@mentor_required
def delete_portfolio_images():
    mentor = Mentor.query.get(get_jwt_identity())
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404

    image_indices = request.json.get('indices', [])
    images_to_delete = [mentor.portfolio_photos[i] for i in image_indices if i < len(mentor.portfolio_photos)]
    
    for image in images_to_delete:
        uploader.destroy(image.public_id)
        db.session.delete(image)
    
    db.session.commit()
    return jsonify({"msg": "Images successfully deleted"}), 200

@api.route('/mentor/delete/<int:cust_id>', methods =['DELETE'])
def delete_mentor(cust_id):
    mentor = Mentor.query.get(cust_id)
    if mentor is None:
        return jsonify({"msg": "mentor not found" }), 404
    
    # picture_public_ids = [image.image_url.split("/")[-1].split(".")[0] for image in work_order.images]

    # for public_id in picture_public_ids:
    #     delete_response = destroy(public_id)
    #     if delete_response.get("result") != "ok":
    #         print(f"Failed to delete picture with public ID: {public_id}")

    db.session.delete(mentor)
    db.session.commit()
    return jsonify({"msg": "mentor successfully deleted"}), 200


def get_mentor_id_from_token(token):
    try: 
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms = ['HS256'])
        print(f"Token payload: {payload}")
        return payload.get("mentor_id") or payload['sub']
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid Token: {e}")
        return None
    except KeyError: 
        print("mentor_id key not found")
        return None
    
@api.route('/mentor/deactivate', methods=['PUT'])
@jwt_required()
def deactivate_mentor():
    mentor_id = get_jwt_identity()
    if not mentor_id: 
        return jsonify({"msg": "invalid token"}), 401
    
    mentor = Mentor.query.get(mentor_id)
    if mentor:
        mentor.is_active = False
        db.session.commit()
        return jsonify({"msg": "Account deactivated successfully"}), 200
    else:
        return jsonify({"msg": "Mentor not found"}), 404

@api.route('/mentor/reactivate', methods=['PUT'])
@jwt_required()
def reactivate_mentor():
    mentor_id = get_jwt_identity()
    if not mentor_id: 
        return jsonify({"msg": "invalid token"}), 401
    
    mentor = Mentor.query.get(mentor_id)
    if mentor:
        mentor.is_active = True
        db.session.commit()
        return jsonify({"msg": "Account reactivated successfully"}), 200
    else:
        return jsonify({"msg": "Mentor not found"}), 404
    

# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End
# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End
# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End
# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End


# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start
# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start
# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start
# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start

@api.route('/customers', methods=['GET'])
def all_customers():
   customers = Customer.query.all()
   return jsonify([customer.serialize() for customer in customers]), 200

# @api.route('/customer/<int:cust_id>', methods=['GET'])
# # @mentor_required()
# def customer_by_id(cust_id):
#     # current_user_id = get_jwt_identity()
#     # current_user = User.query.get(current_user_id)

#     customer = Customer.query.get(cust_id)
#     if customer is None:
#         return jsonify({"msg": "No customer found"}), 404
    
#     return jsonify(customer.serialize()), 200

@api.route('/customer/signup', methods=['POST'])
def customer_signup():
   
    email = request.json.get("email", None)
    password = request.json.get("password", None)
    first_name = request.json.get("first_name", None)
    last_name = request.json.get("last_name", None)
    phone = request.json.get("phone", None)
    
    
    if first_name is None or last_name is None  or phone is None or email is None or password is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
    existingCustomerEmail = Customer.query.filter_by(email=email).one_or_none()
    if existingCustomerEmail:
        return jsonify({"msg": "An account associated with the email already exists"}), 409
    existingCustomerPhone = Customer.query.filter_by(phone=phone).one_or_none()
    if existingCustomerPhone:
        return jsonify({"msg": "An account associated with this phone number already exists. Please try a different phone number."}), 409
    
    verification_code = generate_verification_code()
    customer = Customer(
        email=email, 
        password=generate_password_hash(password),
        first_name=first_name, 
        last_name=last_name, 
        phone=phone,
        is_verified=False,
        verification_code=verification_code
    ) 
    db.session.add(customer)
    db.session.commit()

    # Send verification email
    send_verification_email_code(email, verification_code)

    db.session.refresh(customer)
    response_body = {"msg": "Account succesfully created! Please check your email to verify your account.", "customer":customer.serialize()}
    return jsonify(response_body), 201

@api.route('/customer/login', methods=['POST'])
def customer_login():
    email = request.json.get("email", None)
    password = request.json.get("password", None)
    if email is None or password is None:
        return jsonify({"msg": "No email or password"}), 400
    
    customer = Customer.query.filter_by(email=email).one_or_none()
    if customer is None:
        return jsonify({"msg": "no such user"}), 404
    if not check_password_hash(customer.password, password):
        return jsonify({"msg": "Bad email or password"}), 401
    
    if not customer.is_verified:
        return jsonify({"msg": "Please verify your email address before logging in."}), 403

    access_token = create_access_token(
        identity=customer.id,
        additional_claims = {"role": "customer"} 
    )
    return jsonify({
        "access_token":access_token,
        "customer_id": customer.id,
        "customer_data": customer.serialize()
    }), 201

@api.route('/customer/edit-self', methods=['PUT'])
@customer_required
def handle_customer_edit_by_customer():
    customer_id = get_jwt_identity()
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"msg": "Customer not found"}), 404

    data = request.json
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    updatable_fields = ['first_name', 'last_name', 'phone', 'city', 'what_state', 'country', 'about_me']
    
    try:
        for key, value in data.items():
            if key in updatable_fields:
                setattr(customer, key, value)
        
        db.session.commit()
        db.session.refresh(customer)
        
        return jsonify({"msg": "Customer profile updated successfully", "customer": customer.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating customer {customer_id}: {str(e)}")
        return jsonify({"msg": "An internal error occurred while updating the profile."}), 500

@api.route('/current-customer', methods=['GET'])
@jwt_required()
def get_current_customer():
    
    customer = Customer.query.get(get_jwt_identity())
    if customer is None:
        return jsonify({"msg": "No customer found"}), 404
    
    return jsonify(customer.serialize()), 200

@api.route('/customer/delete/<int:cust_id>', methods =['DELETE'])
def delete_customer(cust_id):
    customer = Customer.query.get(cust_id)
    if customer is None:
        return jsonify({"msg": "work order not found" }), 404
    
    # picture_public_ids = [image.image_url.split("/")[-1].split(".")[0] for image in work_order.images]

    # for public_id in picture_public_ids:
    #     delete_response = destroy(public_id)
    #     if delete_response.get("result") != "ok":
    #         print(f"Failed to delete picture with public ID: {public_id}")

    db.session.delete(customer)
    db.session.commit()
    return jsonify({"msg": "customer successfully deleted"}), 200

@customer_required
def get_current_customer():
    
    customer = Customer.query.get(get_jwt_identity())
    if customer is None:
        return jsonify({"msg": "No customer found"}), 404
    
    return jsonify(customer.serialize()), 200

@api.route('/customer/bookings', methods=['GET'])
@customer_required
def get_customer_bookings():
    customer_id = get_jwt_identity()
    bookings = Booking.query.filter_by(customer_id=customer_id).all()
    # You might want a different serializer for the customer view
    return jsonify([b.serialize_for_customer() for b in bookings]), 200

@api.route('/bookings/<int:booking_id>', methods=['GET'])
@jwt_required()
def get_booking_by_id(booking_id):
    """Get a specific booking by ID"""
    try:
        current_user_id = get_jwt_identity()
        role = get_jwt()['role']
        
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"success": False, "message": "Booking not found"}), 404
        
        # Check authorization - user must be either the customer or mentor for this booking
        if role == 'customer' and booking.customer_id != current_user_id:
            return jsonify({"success": False, "message": "Unauthorized"}), 403
        elif role == 'mentor' and booking.mentor_id != current_user_id:
            return jsonify({"success": False, "message": "Unauthorized"}), 403
        
        # Get mentor and customer details
        mentor = Mentor.query.get(booking.mentor_id)
        customer = Customer.query.get(booking.customer_id)
        
        # Prepare response based on role
        booking_data = {
            "id": booking.id,
            "mentor_name": f"{mentor.first_name} {mentor.last_name}" if mentor else "Unknown",
            "customer_name": f"{customer.first_name} {customer.last_name}" if customer else "Unknown",
            "session_start_time": booking.session_start_time.isoformat() if booking.session_start_time else None,
            "session_end_time": booking.session_end_time.isoformat() if booking.session_end_time else None,
            "session_duration": booking.session_duration,
            "timezone": booking.timezone,
            "amount_paid": str(booking.amount_paid) if booking.amount_paid else None,
            "status": booking.status.value,
            "meeting_id": booking.meeting_id,
            "meeting_url": booking.meeting_url,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
            "invitee_notes": booking.invitee_notes
        }
        
        # Add role-specific information
        if role == 'mentor':
            booking_data.update({
                "customer_email": customer.email if customer else None,
                "customer_phone": customer.phone if customer else None,
                "mentor_payout_amount": str(booking.mentor_payout_amount) if booking.mentor_payout_amount else None,
                "platform_fee": str(booking.platform_fee) if booking.platform_fee else None
            })
        else:  # customer
            booking_data.update({
                "mentor_email": mentor.email if mentor else None,
                "mentor_phone": mentor.phone if mentor else None,
                "mentor_city": mentor.city if mentor else None,
                "mentor_state": mentor.what_state if mentor else None
            })
        
        return jsonify({
            "success": True,
            "booking": booking_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching booking {booking_id}: {str(e)}")
        return jsonify({
            "success": False,
            "message": "An error occurred while fetching the booking"
        }), 500

@api.route('/create-payment-intent', methods=['POST'])
@jwt_required()
def create_payment_intent():
    try:
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        
        data = request.get_json()
        customer_id = data.get('customer_id')
        customer_name = data.get('customer_name')
        mentor_id = data.get('mentor_id')
        mentor_name = data.get('mentor_name')
        amount = data.get('amount')  # Amount in cents
        
        # Validate data
        if not customer_id or not mentor_id or not amount:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Create the payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            metadata={
                "customer_id": customer_id,
                "customer_name": customer_name,
                "mentor_id": mentor_id,
                "mentor_name": mentor_name
            }
        )
        
        return jsonify({
            'clientSecret': payment_intent.client_secret
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")  # You'll need to add this to your .env file
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return jsonify({"error": "Invalid signature"}), 400
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        
        # Extract the metadata we stored
        customer_id = payment_intent.metadata.get('customer_id')
        customer_name = payment_intent.metadata.get('customer_name')
        mentor_id = payment_intent.metadata.get('mentor_id')
        mentor_name = payment_intent.metadata.get('mentor_name')
        amount = payment_intent.amount
        
        # Log the payment (you could also save to a database if needed)
        current_app.logger.info(f"Payment succeeded: ${amount/100} from {customer_name} (ID: {customer_id}) to {mentor_name} (ID: {mentor_id})")
        
        # Here you could also send email notifications to the mentor and customer
        
    return jsonify({"status": "success"}), 200


@api.route('/track-booking', methods=['POST'])
@jwt_required()
def track_booking():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        mentor_id = data.get('mentorId')
        paid_date_time_str = data.get('paidDateTime')
        amount_str = data.get('amount')
        stripe_payment_intent_id = data.get('stripePaymentIntentId')
        
        if not all([mentor_id, paid_date_time_str, amount_str]):
            current_app.logger.error(f"Track booking missing required fields: mentor_id={mentor_id}, paid_date_time={paid_date_time_str}, amount={amount_str}")
            return jsonify({"error": "Missing required fields"}), 400
        
        customer = Customer.query.get(user_id)
        if not customer:
            current_app.logger.error(f"Customer not found for ID: {user_id}")
            return jsonify({"error": "Customer not found"}), 404

        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            current_app.logger.error(f"Mentor not found for ID: {mentor_id}")
            return jsonify({"error": "Mentor not found"}), 404

        try:
            paid_date_time = dt.fromisoformat(paid_date_time_str.replace('Z', '+00:00'))
            amount = Decimal(amount_str)
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Invalid data format: {e}")
            return jsonify({"error": "Invalid data format"}), 400

        platform_fee = amount * Decimal('0.10')
        mentor_payout = amount - platform_fee

        new_booking = Booking(
            mentor_id=mentor_id,
            customer_id=user_id,
            paid_at=paid_date_time,
            invitee_name=f"{customer.first_name} {customer.last_name}",
            invitee_email=customer.email,
            stripe_payment_intent_id=stripe_payment_intent_id,
            amount_paid=amount,
            currency='usd',
            platform_fee=platform_fee,
            mentor_payout_amount=mentor_payout,
            status=BookingStatus.PAID
        )
        
        db.session.add(new_booking)
        db.session.commit()
        db.session.refresh(new_booking)
        
        current_app.logger.info(f"Booking {new_booking.id} tracked successfully for mentor {mentor_id}, customer {user_id}")
        
        return jsonify({
            "success": True, 
            "id": new_booking.id,
            "message": "Booking tracked successfully, pending final Calendly confirmation.",
            "booking": new_booking.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error tracking booking: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({"error": "An internal error occurred while tracking the booking."}), 500

# Make sure to import Decimal if using it for precise fee calculations
from decimal import Decimal

def get_user_for_reschedule(user_id, role):
    # Logic to fetch user based on role
    return Mentor.query.get(user_id) if role == 'mentor' else Customer.query.get(user_id)

# NEW 3/18/25 DOWN
# Add this route to redirect mentors to Stripe OAuth for account connection


# Get Stripe Connection Status
@api.route("/mentor/stripe-status", methods=["GET"])
@mentor_required
def get_stripe_status():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)  # Query directly by ID

    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    return jsonify({"isConnected": bool(mentor.stripe_account_id)})

# Connect Stripe - Redirect to Stripe OAuth
@api.route("/connect-stripe", methods=["GET"])
@mentor_required
def connect_stripe():
    try:
        # Get the mentor ID from the JWT token
        mentor_id = get_jwt_identity()

        # Query the mentor directly by ID
        mentor = Mentor.query.get(mentor_id)

        if not mentor:
            return jsonify({"error": "Mentor not found"}), 404

        # Create a state token with the mentor_id
        callback_state = jwt.encode({"mentor_id": mentor_id}, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

        # Use the dedicated callback URI from env
        stripe_url = (
            f"https://connect.stripe.com/oauth/authorize?"
            f"response_type=code&client_id={STRIPE_CLIENT_ID}&"
            f"scope=read_write&state={callback_state}&"
            f"redirect_uri={STRIPE_CALLBACK_URL}"
        )

        return jsonify({"url": stripe_url})
    except Exception as e:
        import traceback
        print(f"Connect Stripe Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# Handle Stripe OAuth Callback
@api.route("/stripe/callback", methods=["GET"])
def stripe_callback():
    auth_code = request.args.get("code")
    error = request.args.get("error")
    state = request.args.get("state")

    if error:
        logging.error(f"Stripe returned error: {error}")
        return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-profile?stripe=error&message={error}")

    try:
        # Log incoming parameters
        logging.info(f"Stripe callback received - code: {auth_code[:5] if auth_code else 'None'}... state: {state[:10] if state else 'None'}...")
        if not auth_code or not state:
            return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-profile?stripe=error&message=InvalidCallback")

        # Decode the state to get mentor_id
        decoded_state = jwt.decode(state, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        mentor_id = decoded_state["mentor_id"]
        logging.info(f"Decoded mentor_id: {mentor_id}")

        # Exchange the authorization code for an access token
        # The `stripe.api_key` set at the module level is used for authentication.
        response = stripe.OAuth.token(
            grant_type="authorization_code",
            code=auth_code,
        )
        stripe_account_id = response["stripe_user_id"]
        logging.info(f"Received stripe_account_id: {stripe_account_id[:5]}...")

        mentor = Mentor.query.get(mentor_id)
        if mentor:
            mentor.stripe_account_id = stripe_account_id
            db.session.commit()
            logging.info(f"Updated mentor {mentor_id} with Stripe account")
        else:
            logging.error(f"Mentor {mentor_id} not found in database")

        # Redirect back to the frontend
        return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-profile?stripe=success")

    except jwt.InvalidTokenError:
        logging.error("Stripe callback error: Invalid state token.")
        return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-profile?stripe=error&message=InvalidState")
    except stripe.oauth_error.InvalidGrantError as e:
        logging.error(f"Stripe OAuth Invalid Grant Error: {str(e)}")
        # This specific error indicates a key mismatch or expired code.
        return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-profile?stripe=error&message=StripeConnectionFailed")
    except Exception as e:
        import traceback
        full_traceback = traceback.format_exc()
        logging.error(f"Stripe callback error: {str(e)}")
        logging.error(f"Full traceback: {full_traceback}")

        # Keep a generic error for other issues
        return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-profile?stripe=error&message=ProcessingError")

@api.route('/bookings/reschedule', methods=['POST'])
@jwt_required()
def reschedule_booking():
    data = request.get_json()
    booking_id = data.get('bookingId')
    new_start_time_str = data.get('newStartTime')
    new_end_time_str = data.get('newEndTime')

    if not booking_id or not new_start_time_str or not new_end_time_str:
        return jsonify({"error": "Missing bookingId or new start/end time"}), 400

    try:
        new_start_time = dt.fromisoformat(new_start_time_str.replace('Z', '+00:00'))
        new_end_time = dt.fromisoformat(new_end_time_str.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({"error": "Invalid date format for new start/end time"}), 400

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    booking.calendly_event_start_time = new_start_time
    booking.calendly_event_end_time = new_end_time
    booking.status = BookingStatus.PENDING

    db.session.add(booking)
    db.session.commit()
    db.session.refresh(booking)

    return jsonify({"success": True, "message": "Booking rescheduled successfully"}), 200

# Replace the Google OAuth routes in routes.py with these improved versions


import base64


# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = f"{os.getenv('BACKEND_URL')}/api/auth/google/callback"

def create_signed_state(user_type):
    """Create a signed state parameter that doesn't rely on sessions"""
    import time
    import hmac
    import hashlib
    
    # Create payload with user_type and timestamp
    payload = {
        'user_type': user_type,
        'timestamp': int(time.time()),
        'nonce': secrets.token_urlsafe(16)
    }
    
    # Convert to JSON and base64 encode
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    
    # Create HMAC signature
    secret_key = os.getenv('FLASK_APP_KEY').encode()
    signature = hmac.new(secret_key, payload_b64.encode(), hashlib.sha256).hexdigest()
    
    # Combine payload and signature
    return f"{payload_b64}.{signature}"

def verify_signed_state(state_param):
    """Verify and decode the signed state parameter"""
    import time
    import hmac
    import hashlib
    
    try:
        # Split payload and signature
        payload_b64, signature = state_param.split('.')
        
        # Verify signature
        secret_key = os.getenv('FLASK_APP_KEY').encode()
        expected_signature = hmac.new(secret_key, payload_b64.encode(), hashlib.sha256).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            return None, "Invalid signature"
        
        # Decode payload
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        
        # Check timestamp (valid for 10 minutes)
        current_time = int(time.time())
        if current_time - payload['timestamp'] > 600:  # 10 minutes
            return None, "State expired"
        
        return payload, None
        
    except Exception as e:
        return None, f"Invalid state format: {str(e)}"

@api.route('/auth/google/initiate', methods=['POST'])
def google_oauth_initiate():
    """Initiate Google OAuth flow"""
    data = request.get_json()
    user_type = data.get('user_type')  # 'mentor' or 'customer'
    
    if user_type not in ['mentor', 'customer']:
        return jsonify({"error": "Invalid user type"}), 400
    
    # Create signed state parameter
    state = create_signed_state(user_type)
    
    # Google OAuth URL
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'scope': 'openid email profile',
        'response_type': 'code',
        'state': state,
        'access_type': 'offline',
        'prompt': 'consent'
    }
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    current_app.logger.info(f"Generated Google OAuth URL for {user_type}")
    return jsonify({"auth_url": auth_url}), 200

@api.route('/auth/google/callback', methods=['GET'])
def google_oauth_callback():
    """Handle Google OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        current_app.logger.error(f"Google OAuth error: {error}")
        return redirect(f"{FRONTEND_URL}/?auth_error=oauth_denied")
    
    if not code or not state:
        current_app.logger.error("Missing code or state parameter")
        return redirect(f"{FRONTEND_URL}/?auth_error=missing_params")
    
    # Verify and decode state
    payload, error_msg = verify_signed_state(state)
    if error_msg:
        current_app.logger.error(f"State verification failed: {error_msg}")
        return redirect(f"{FRONTEND_URL}/?auth_error=state_verification_failed")
    
    user_type = payload['user_type']
    current_app.logger.info(f"Processing Google OAuth callback for {user_type}")
    
    try:
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': GOOGLE_REDIRECT_URI,
        }
        
        current_app.logger.info("Exchanging authorization code for access token")
        token_response = requests.post(token_url, data=token_data, timeout=30)
        token_response.raise_for_status()
        tokens = token_response.json()
        
        # Get user info from Google
        user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={tokens['access_token']}"
        user_response = requests.get(user_info_url, timeout=30)
        user_response.raise_for_status()
        google_user = user_response.json()
        
        current_app.logger.info(f"Retrieved Google user info for: {google_user.get('email', 'unknown')}")
        
        # Extract user data
        email = google_user.get('email')
        first_name = google_user.get('given_name', '')
        last_name = google_user.get('family_name', '')
        google_id = google_user.get('id')
        
        if not email:
            current_app.logger.error("No email received from Google")
            return redirect(f"{FRONTEND_URL}/?auth_error=no_email")
        
        # Check if user already exists
        if user_type == 'mentor':
            existing_user = Mentor.query.filter_by(email=email).first()
            UserModel = Mentor
            dashboard_route = "/mentor-dashboard"
        else:
            existing_user = Customer.query.filter_by(email=email).first()
            UserModel = Customer
            dashboard_route = "/customer-dashboard"
        
        if existing_user:
            # User exists, log them in
            current_app.logger.info(f"Existing {user_type} found, logging in: {email}")
            access_token = create_access_token(
                identity=existing_user.id,
                additional_claims={"role": user_type}
            )
            
            # Create success URL with token
            success_url = f"{FRONTEND_URL}{dashboard_route}?google_auth=success&token={access_token}&user_id={existing_user.id}&user_type={user_type}"
            return redirect(success_url)
        
        else:
            # Create new user
            current_app.logger.info(f"Creating new {user_type} account for: {email}")
            if user_type == 'mentor':
                new_user = Mentor(
                    email=email,
                    password=generate_password_hash(secrets.token_urlsafe(32)),  # Random password
                    first_name=first_name or 'User',
                    last_name=last_name or 'Google',
                    phone="000-000-0000",  # Placeholder
                    city="Not specified",  # Placeholder
                    what_state="Not specified",  # Placeholder
                    country="United States of America (USA)",  # Default
                    is_verified=True,  # Auto-verify Google users
                    verification_code=None
                )
            else:
                new_user = Customer(
                    email=email,
                    password=generate_password_hash(secrets.token_urlsafe(32)),  # Random password
                    first_name=first_name or 'User',
                    last_name=last_name or 'Google',
                    phone="000-000-0000",  # Placeholder
                    is_verified=True,  # Auto-verify Google users
                    verification_code=None
                )
            
            db.session.add(new_user)
            db.session.commit()
            db.session.refresh(new_user)
            
            current_app.logger.info(f"Successfully created {user_type} account with ID: {new_user.id}")
            
            # Create access token for new user
            access_token = create_access_token(
                identity=new_user.id,
                additional_claims={"role": user_type}
            )
            
            # Create success URL with token and new user flag
            success_url = f"{FRONTEND_URL}{dashboard_route}?google_auth=success&new_user=true&token={access_token}&user_id={new_user.id}&user_type={user_type}"
            return redirect(success_url)
    
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"HTTP request error during Google OAuth: {str(e)}")
        return redirect(f"{FRONTEND_URL}/?auth_error=network_error")
    except Exception as e:
        current_app.logger.error(f"Unexpected error during Google OAuth: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return redirect(f"{FRONTEND_URL}/?auth_error=server_error")

@api.route('/auth/google/verify', methods=['POST'])
def verify_google_auth():

    """Verify Google auth token and log user in"""
    data = request.get_json()
    token = data.get('token')
    user_id = data.get('user_id')
    user_type = data.get('user_type')
    
    if not all([token, user_id, user_type]):
        return jsonify({"error": "Missing required parameters"}), 400
    
    try:
        # Verify the token
        decoded_token = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        token_user_id = decoded_token.get('sub')
        token_role = decoded_token.get('role')
        
        if str(token_user_id) != str(user_id) or token_role != user_type:
            return jsonify({"error": "Invalid token"}), 401
        
        # Get user data
        if user_type == 'mentor':
            user = Mentor.query.get(user_id)
        else:
            user = Customer.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        current_app.logger.info(f"Successfully verified Google auth for {user_type}: {user.email}")
        
        return jsonify({
            "success": True,
            "access_token": token,
            f"{user_type}_id": user.id,
            f"{user_type}_data": user.serialize(),
            "role": user_type
        }), 200
        
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Server error"}), 500


# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = f"{os.getenv('BACKEND_URL')}/api/authorize/github"

@api.route('/auth/github/initiate', methods=['POST'])
def github_oauth_initiate():
    """Initiate GitHub OAuth flow"""
    data = request.get_json()
    user_type = data.get('user_type')  # 'mentor' or 'customer'
    
    if user_type not in ['mentor', 'customer']:
        return jsonify({"error": "Invalid user type"}), 400
    
    # Create signed state parameter (reusing the same function as Google)
    state = create_signed_state(user_type)
    
    # GitHub OAuth URL
    github_auth_url = "https://github.com/login/oauth/authorize"
    params = {
        'client_id': GITHUB_CLIENT_ID,
        'redirect_uri': GITHUB_REDIRECT_URI,
        'scope': 'user:email',
        'state': state,
        'allow_signup': 'true'
    }
    
    auth_url = f"{github_auth_url}?{urlencode(params)}"
    current_app.logger.info(f"Generated GitHub OAuth URL for {user_type}")
    return jsonify({"auth_url": auth_url}), 200

@api.route('/authorize/github', methods=['GET'])
def github_oauth_callback():
    """Handle GitHub OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    error_description = request.args.get('error_description')
    
    if error:
        current_app.logger.error(f"GitHub OAuth error: {error} - {error_description}")
        return redirect(f"{FRONTEND_URL}/?auth_error=oauth_denied")
    
    if not code or not state:
        current_app.logger.error("Missing code or state parameter from GitHub")
        return redirect(f"{FRONTEND_URL}/?auth_error=missing_params")
    
    # Verify and decode state
    payload, error_msg = verify_signed_state(state)
    if error_msg:
        current_app.logger.error(f"GitHub state verification failed: {error_msg}")
        return redirect(f"{FRONTEND_URL}/?auth_error=state_verification_failed")
    
    user_type = payload['user_type']
    current_app.logger.info(f"Processing GitHub OAuth callback for {user_type}")
    
    try:
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            'client_id': GITHUB_CLIENT_ID,
            'client_secret': GITHUB_CLIENT_SECRET,
            'code': code,
        }
        
        headers = {
            'Accept': 'application/json'
        }
        
        current_app.logger.info("Exchanging GitHub authorization code for access token")
        token_response = requests.post(token_url, data=token_data, headers=headers, timeout=30)
        token_response.raise_for_status()
        token_data = token_response.json()
        
        access_token = token_data.get('access_token')
        if not access_token:
            current_app.logger.error("No access token received from GitHub")
            return redirect(f"{FRONTEND_URL}/?auth_error=no_token")
        
        # Get user info from GitHub
        user_headers = {
            'Authorization': f'token {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        # Get basic user info
        user_response = requests.get('https://api.github.com/user', headers=user_headers, timeout=30)
        user_response.raise_for_status()
        github_user = user_response.json()
        
        # Get user email (GitHub requires separate API call for emails)
        email_response = requests.get('https://api.github.com/user/emails', headers=user_headers, timeout=30)
        email_response.raise_for_status()
        emails = email_response.json()
        
        # Find primary email
        primary_email = None
        for email_data in emails:
            if email_data.get('primary', False):
                primary_email = email_data.get('email')
                break
        
        if not primary_email and emails:
            # Fallback to first email if no primary found
            primary_email = emails[0].get('email')
        
        current_app.logger.info(f"Retrieved GitHub user info for: {primary_email or 'unknown'}")
        
        # Extract user data
        email = primary_email
        name = github_user.get('name', '')
        login = github_user.get('login', '')
        github_id = github_user.get('id')
        
        # Parse first and last name from full name
        if name:
            name_parts = name.strip().split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
        else:
            # Use login as first name if no real name provided
            first_name = login or 'User'
            last_name = 'GitHub'
        
        if not email:
            current_app.logger.error("No email received from GitHub")
            return redirect(f"{FRONTEND_URL}/?auth_error=no_email")
        
        # Check if user already exists
        if user_type == 'mentor':
            existing_user = Mentor.query.filter_by(email=email).first()
            UserModel = Mentor
            dashboard_route = "/mentor-dashboard"
        else:
            existing_user = Customer.query.filter_by(email=email).first()
            UserModel = Customer
            dashboard_route = "/customer-dashboard"
        
        if existing_user:
            # User exists, log them in
            current_app.logger.info(f"Existing {user_type} found, logging in: {email}")
            access_token = create_access_token(
                identity=existing_user.id,
                additional_claims={"role": user_type}
            )
            
            # Create success URL with token
            success_url = f"{FRONTEND_URL}{dashboard_route}?github_auth=success&token={access_token}&user_id={existing_user.id}&user_type={user_type}"
            return redirect(success_url)
        
        else:
            # Create new user
            current_app.logger.info(f"Creating new {user_type} account for: {email}")
            if user_type == 'mentor':
                new_user = Mentor(
                    email=email,
                    password=generate_password_hash(secrets.token_urlsafe(32)),  # Random password
                    first_name=first_name,
                    last_name=last_name,
                    phone="000-000-0000",  # Placeholder
                    city="Not specified",  # Placeholder
                    what_state="Not specified",  # Placeholder
                    country="United States of America (USA)",  # Default
                    is_verified=True,  # Auto-verify GitHub users
                    verification_code=None
                )
            else:
                new_user = Customer(
                    email=email,
                    password=generate_password_hash(secrets.token_urlsafe(32)),  # Random password
                    first_name=first_name,
                    last_name=last_name,
                    phone="000-000-0000",  # Placeholder
                    is_verified=True,  # Auto-verify GitHub users
                    verification_code=None
                )
            
            db.session.add(new_user)
            db.session.commit()
            db.session.refresh(new_user)
            
            current_app.logger.info(f"Successfully created {user_type} account with ID: {new_user.id}")
            
            # Create access token for new user
            access_token = create_access_token(
                identity=new_user.id,
                additional_claims={"role": user_type}
            )
            
            # Create success URL with token and new user flag
            success_url = f"{FRONTEND_URL}{dashboard_route}?github_auth=success&new_user=true&token={access_token}&user_id={new_user.id}&user_type={user_type}"
            return redirect(success_url)
    
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"HTTP request error during GitHub OAuth: {str(e)}")
        return redirect(f"{FRONTEND_URL}/?auth_error=network_error")
    except Exception as e:
        current_app.logger.error(f"Unexpected error during GitHub OAuth: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return redirect(f"{FRONTEND_URL}/?auth_error=server_error")

@api.route('/auth/github/verify', methods=['POST'])
def verify_github_auth():
    """Verify GitHub auth token and log user in"""
    data = request.get_json()
    token = data.get('token')
    user_id = data.get('user_id')
    user_type = data.get('user_type')
    
    if not all([token, user_id, user_type]):
        return jsonify({"error": "Missing required parameters"}), 400
    
    try:
        # Verify the token (reusing the same JWT verification as Google)
        decoded_token = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        token_user_id = decoded_token.get('sub')
        token_role = decoded_token.get('role')
        
        if str(token_user_id) != str(user_id) or token_role != user_type:
            return jsonify({"error": "Invalid token"}), 401
        
        # Get user data
        if user_type == 'mentor':
            user = Mentor.query.get(user_id)
        else:
            user = Customer.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        current_app.logger.info(f"Successfully verified GitHub auth for {user_type}: {user.email}")
        
        return jsonify({
            "success": True,
            "access_token": token,
            f"{user_type}_id": user.id,
            f"{user_type}_data": user.serialize(),
            "role": user_type
        }), 200
        
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        current_app.logger.error(f"GitHub token verification error: {str(e)}")
        return jsonify({"error": "Server error"}), 500

# MVP GOOGLE AND GITHUB SIGNUP AND LOGIN 
# MVP GOOGLE AND GITHUB SIGNUP AND LOGIN 
# MVP GOOGLE AND GITHUB SIGNUP AND LOGIN 
# MVP GOOGLE AND GITHUB SIGNUP AND LOGIN 

@api.route('/auth/mvp/google/initiate', methods=['POST'])
def mvp_google_oauth_initiate():
    """Initiate Google OAuth flow for MVP booking"""
    data = request.get_json()
    mentor_id = data.get('mentor_id')
    
    if not mentor_id:
        return jsonify({"error": "Mentor ID is required"}), 400
    
    # Create signed state parameter with mentor_id for MVP flow
    state_data = {
        'user_type': 'customer',
        'flow_type': 'mvp_booking',
        'mentor_id': mentor_id,
        'timestamp': int(time.time()),
        'nonce': secrets.token_urlsafe(16)
    }
    
    state = create_mvp_signed_state(state_data)
    
    # Google OAuth URL
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': f"{os.getenv('BACKEND_URL')}/api/auth/mvp/google/callback",
        'scope': 'openid email profile',
        'response_type': 'code',
        'state': state,
        'access_type': 'offline',
        'prompt': 'consent'
    }

      # ADD THIS DEBUG LINE:
    current_app.logger.info(f"MVP Google redirect URI being sent: {params['redirect_uri']}")
    current_app.logger.info(f"MVP Google client ID being used: {GOOGLE_CLIENT_ID}")
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    current_app.logger.info(f"Generated MVP Google OAuth URL for mentor {mentor_id}")
    return jsonify({"auth_url": auth_url}), 200

@api.route('/auth/mvp/google/callback', methods=['GET'])
def mvp_google_oauth_callback():
    """Handle Google OAuth callback for MVP booking"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        current_app.logger.error(f"MVP Google OAuth error: {error}")
        return redirect(f"{FRONTEND_URL}/mentor-details/1?mvp_auth_error=oauth_denied")
    
    if not code or not state:
        current_app.logger.error("Missing code or state parameter in MVP Google OAuth")
        return redirect(f"{FRONTEND_URL}/mentor-details/1?mvp_auth_error=missing_params")
    
    # Verify and decode state
    payload, error_msg = verify_mvp_signed_state(state)
    if error_msg:
        current_app.logger.error(f"MVP Google state verification failed: {error_msg}")
        return redirect(f"{FRONTEND_URL}/mentor-details/1?mvp_auth_error=state_verification_failed")
    
    mentor_id = payload['mentor_id']
    current_app.logger.info(f"Processing MVP Google OAuth callback for mentor {mentor_id}")
    
    try:
        # Exchange code for tokens (same as regular Google OAuth)
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': f"{os.getenv('BACKEND_URL')}/api/auth/mvp/google/callback",
        }
        
        current_app.logger.info("Exchanging authorization code for access token (MVP)")
        token_response = requests.post(token_url, data=token_data, timeout=30)
        token_response.raise_for_status()
        tokens = token_response.json()
        
        # Get user info from Google
        user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={tokens['access_token']}"
        user_response = requests.get(user_info_url, timeout=30)
        user_response.raise_for_status()
        google_user = user_response.json()
        
        current_app.logger.info(f"Retrieved Google user info for MVP: {google_user.get('email', 'unknown')}")
        
        # Extract user data
        email = google_user.get('email')
        first_name = google_user.get('given_name', '')
        last_name = google_user.get('family_name', '')
        
        if not email:
            current_app.logger.error("No email received from Google (MVP)")
            return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=no_email")
        
        # Check if customer already exists
        existing_customer = Customer.query.filter_by(email=email).first()
        
        if existing_customer:
            # Customer exists, log them in
            current_app.logger.info(f"Existing MVP customer found, logging in: {email}")
            access_token = create_access_token(
                identity=existing_customer.id,
                additional_claims={"role": "customer"}
            )
            
            # Redirect back to mentor-details page with success
            success_url = f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_google_auth=success&token={access_token}&user_id={existing_customer.id}&user_type=customer"
            return redirect(success_url)
        
        else:
            # Create new customer
            current_app.logger.info(f"Creating new MVP customer account for: {email}")
            new_customer = Customer(
                email=email,
                password=generate_password_hash(secrets.token_urlsafe(32)),  # Random password
                first_name=first_name or 'User',
                last_name=last_name or 'Google',
                phone="000-000-0000",  # Placeholder
                is_verified=True,  # Auto-verify Google users
                verification_code=None
            )
            
            db.session.add(new_customer)
            db.session.commit()
            db.session.refresh(new_customer)
            
            current_app.logger.info(f"Successfully created MVP customer account with ID: {new_customer.id}")
            
            # Create access token for new customer
            access_token = create_access_token(
                identity=new_customer.id,
                additional_claims={"role": "customer"}
            )
            
            # Redirect back to mentor-details page with success and new user flag
            success_url = f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_google_auth=success&new_user=true&token={access_token}&user_id={new_customer.id}&user_type=customer"
            return redirect(success_url)
    
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"HTTP request error during MVP Google OAuth: {str(e)}")
        return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=network_error")
    except Exception as e:
        current_app.logger.error(f"Unexpected error during MVP Google OAuth: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=server_error")

GITHUB_CLIENT_ID_MVP = os.getenv('GITHUB_CLIENT_ID_MVP')
GITHUB_CLIENT_SECRET_MVP = os.getenv('GITHUB_CLIENT_MVP_SECRET')

@api.route('/auth/mvp/github/initiate', methods=['POST'])
def mvp_github_oauth_initiate():
    """Initiate GitHub OAuth flow for MVP booking"""
    data = request.get_json()
    mentor_id = data.get('mentor_id')
    
    if not mentor_id:
        return jsonify({"error": "Mentor ID is required"}), 400
    
    # Create signed state parameter with mentor_id for MVP flow
    state_data = {
        'user_type': 'customer',
        'flow_type': 'mvp_booking',
        'mentor_id': mentor_id,
        'timestamp': int(time.time()),
        'nonce': secrets.token_urlsafe(16)
    }
    
    state = create_mvp_signed_state(state_data)
    
    # GitHub OAuth URL
    github_auth_url = "https://github.com/login/oauth/authorize"
    params = {
        'client_id': GITHUB_CLIENT_ID_MVP,  # ✅ CHANGED: Use MVP client ID
        'redirect_uri': f"{os.getenv('BACKEND_URL')}/api/auth/mvp/github/callback",
        'scope': 'user:email',
        'state': state,
        'allow_signup': 'true'
    }
    
    auth_url = f"{github_auth_url}?{urlencode(params)}"
    current_app.logger.info(f"Generated MVP GitHub OAuth URL for mentor {mentor_id}")
    return jsonify({"auth_url": auth_url}), 200

@api.route('/auth/mvp/github/callback', methods=['GET'])
def mvp_github_oauth_callback():
    """Handle GitHub OAuth callback for MVP booking"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    error_description = request.args.get('error_description')
    
    if error:
        current_app.logger.error(f"MVP GitHub OAuth error: {error} - {error_description}")
        return redirect(f"{FRONTEND_URL}/mentor-details/1?mvp_auth_error=oauth_denied")
    
    if not code or not state:
        current_app.logger.error("Missing code or state parameter from GitHub (MVP)")
        return redirect(f"{FRONTEND_URL}/mentor-details/1?mvp_auth_error=missing_params")
    
    # Verify and decode state
    payload, error_msg = verify_mvp_signed_state(state)
    if error_msg:
        current_app.logger.error(f"MVP GitHub state verification failed: {error_msg}")
        return redirect(f"{FRONTEND_URL}/mentor-details/1?mvp_auth_error=state_verification_failed")
    
    mentor_id = payload['mentor_id']
    current_app.logger.info(f"Processing MVP GitHub OAuth callback for mentor {mentor_id}")
    
    try:
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            'client_id': GITHUB_CLIENT_ID_MVP,        # ✅ CHANGED: Use MVP client ID
            'client_secret': GITHUB_CLIENT_SECRET_MVP, # ✅ CHANGED: Use MVP client secret
            'code': code,
        }
        
        headers = {
            'Accept': 'application/json'
        }
        
        current_app.logger.info("Exchanging GitHub authorization code for access token (MVP)")
        token_response = requests.post(token_url, data=token_data, headers=headers, timeout=30)
        token_response.raise_for_status()
        token_data = token_response.json()
        
        access_token = token_data.get('access_token')
        if not access_token:
            current_app.logger.error("No access token received from GitHub (MVP)")
            return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=no_token")
        
        # Get user info from GitHub
        user_headers = {
            'Authorization': f'token {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        # Get basic user info
        user_response = requests.get('https://api.github.com/user', headers=user_headers, timeout=30)
        user_response.raise_for_status()
        github_user = user_response.json()
        
        # Get user email
        email_response = requests.get('https://api.github.com/user/emails', headers=user_headers, timeout=30)
        email_response.raise_for_status()
        emails = email_response.json()
        
        # Find primary email
        primary_email = None
        for email_data in emails:
            if email_data.get('primary', False):
                primary_email = email_data.get('email')
                break
        
        if not primary_email and emails:
            primary_email = emails[0].get('email')
        
        current_app.logger.info(f"Retrieved GitHub user info for MVP: {primary_email or 'unknown'}")
        
        # Extract user data
        email = primary_email
        name = github_user.get('name', '')
        login = github_user.get('login', '')
        
        # Parse first and last name
        if name:
            name_parts = name.strip().split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
        else:
            first_name = login or 'User'
            last_name = 'GitHub'
        
        if not email:
            current_app.logger.error("No email received from GitHub (MVP)")
            return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=no_email")
        
        # Check if customer already exists
        existing_customer = Customer.query.filter_by(email=email).first()
        
        if existing_customer:
            # Customer exists, log them in
            current_app.logger.info(f"Existing MVP customer found, logging in: {email}")
            access_token = create_access_token(
                identity=existing_customer.id,
                additional_claims={"role": "customer"}
            )
            
            # Redirect back to mentor-details page with success
            success_url = f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_github_auth=success&token={access_token}&user_id={existing_customer.id}&user_type=customer"
            return redirect(success_url)
        
        else:
            # Create new customer
            current_app.logger.info(f"Creating new MVP customer account for: {email}")
            new_customer = Customer(
                email=email,
                password=generate_password_hash(secrets.token_urlsafe(32)),  # Random password
                first_name=first_name,
                last_name=last_name,
                phone="000-000-0000",  # Placeholder
                is_verified=True,  # Auto-verify GitHub users
                verification_code=None
            )
            
            db.session.add(new_customer)
            db.session.commit()
            db.session.refresh(new_customer)
            
            current_app.logger.info(f"Successfully created MVP customer account with ID: {new_customer.id}")
            
            # Create access token for new customer
            access_token = create_access_token(
                identity=new_customer.id,
                additional_claims={"role": "customer"}
            )
            
            # Redirect back to mentor-details page with success and new user flag
            success_url = f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_github_auth=success&new_user=true&token={access_token}&user_id={new_customer.id}&user_type=customer"
            return redirect(success_url)
    
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"HTTP request error during MVP GitHub OAuth: {str(e)}")
        return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=network_error")
    except Exception as e:
        current_app.logger.error(f"Unexpected error during MVP GitHub OAuth: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return redirect(f"{FRONTEND_URL}/mentor-details/{mentor_id}?mvp_auth_error=server_error")

# Helper functions for MVP OAuth state management
def create_mvp_signed_state(state_data):
    """Create a signed state parameter for MVP OAuth that doesn't rely on sessions"""
    import time
    import hmac
    import hashlib
    
    # Convert to JSON and base64 encode
    payload_json = json.dumps(state_data)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    
    # Create HMAC signature
    secret_key = os.getenv('FLASK_APP_KEY').encode()
    signature = hmac.new(secret_key, payload_b64.encode(), hashlib.sha256).hexdigest()
    
    # Combine payload and signature
    return f"{payload_b64}.{signature}"

def verify_mvp_signed_state(state_param):
    """Verify and decode the signed state parameter for MVP OAuth"""
    import time
    import hmac
    import hashlib
    
    try:
        # Split payload and signature
        payload_b64, signature = state_param.split('.')
        
        # Verify signature
        secret_key = os.getenv('FLASK_APP_KEY').encode()
        expected_signature = hmac.new(secret_key, payload_b64.encode(), hashlib.sha256).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            return None, "Invalid signature"
        
        # Decode payload
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        
        # Check timestamp (valid for 10 minutes)
        current_time = int(time.time())
        if current_time - payload['timestamp'] > 600:  # 10 minutes
            return None, "State expired"
        
        return payload, None
        
    except Exception as e:
        return None, f"Invalid state format: {str(e)}"

# Calendar System Endpoints
@api.route('/mentor/availability', methods=['GET'])
@mentor_required
def get_mentor_availability():
    """Get current mentor's availability settings"""
    mentor_id = get_jwt_identity()
    availabilities = MentorAvailability.query.filter_by(
        mentor_id=mentor_id, 
        is_active=True
    ).all()
    
    settings = CalendarSettings.query.filter_by(mentor_id=mentor_id).first()
    if not settings:
        # Create default settings
        settings = CalendarSettings(mentor_id=mentor_id)
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({
        "availabilities": [a.serialize() for a in availabilities],
        "settings": settings.serialize()
    }), 200

@api.route('/mentor/availability', methods=['POST'])
@mentor_required
def set_mentor_availability():
    """Set or update mentor's weekly availability"""
    mentor_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Clear existing availability
        MentorAvailability.query.filter_by(mentor_id=mentor_id).delete()
        
        # Add new availability slots
        for slot in data.get('availabilities', []):
            availability = MentorAvailability(
                mentor_id=mentor_id,
                day_of_week=slot['day_of_week'],
                start_time=datetime.strptime(slot['start_time'], '%H:%M').time(),
                end_time=datetime.strptime(slot['end_time'], '%H:%M').time(),
                timezone=slot.get('timezone', 'America/Los_Angeles')
            )
            db.session.add(availability)
        
        # Update settings
        settings = CalendarSettings.query.filter_by(mentor_id=mentor_id).first()
        if not settings:
            settings = CalendarSettings(mentor_id=mentor_id)
            db.session.add(settings)
        
        settings.session_duration = data.get('session_duration', 60)
        settings.buffer_time = data.get('buffer_time', 15)
        settings.advance_booking_days = data.get('advance_booking_days', 30)
        settings.minimum_notice_hours = data.get('minimum_notice_hours', 24)
        settings.timezone = data.get('timezone', 'America/Los_Angeles')
        
        db.session.commit()
        
        return jsonify({"message": "Availability updated successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating availability: {str(e)}")
        return jsonify({"error": "Failed to update availability"}), 500

@api.route('/mentor/unavailability', methods=['POST'])
@mentor_required
def add_mentor_unavailability():
    """Add dates when mentor is unavailable"""
    mentor_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        unavailability = MentorUnavailability(
            mentor_id=mentor_id,
            start_datetime=datetime.fromisoformat(data['start_datetime'].replace('Z', '+00:00')),
            end_datetime=datetime.fromisoformat(data['end_datetime'].replace('Z', '+00:00')),
            reason=data.get('reason', '')
        )
        db.session.add(unavailability)
        db.session.commit()
        
        return jsonify({"message": "Unavailability added", "id": unavailability.id}), 201
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding unavailability: {str(e)}")
        return jsonify({"error": "Failed to add unavailability"}), 500

@api.route('/mentor/unavailability/<int:unavail_id>', methods=['DELETE'])
@mentor_required
def remove_mentor_unavailability(unavail_id):
    """Remove a specific unavailability period"""
    mentor_id = get_jwt_identity()
    
    unavailability = MentorUnavailability.query.filter_by(
        id=unavail_id, 
        mentor_id=mentor_id
    ).first()
    
    if not unavailability:
        return jsonify({"error": "Unavailability not found"}), 404
    
    db.session.delete(unavailability)
    db.session.commit()
    
    return jsonify({"message": "Unavailability removed"}), 200

@api.route('/mentor/<int:mentor_id>/available-slots', methods=['GET'])
def get_available_slots(mentor_id):
    """Get available booking slots for a specific mentor"""
    try:
        # Query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            # Default to next 30 days
            start_date = datetime.utcnow().date()
            end_date = start_date + timedelta(days=30)
        else:
            start_date = datetime.fromisoformat(start_date_str).date()
            end_date = datetime.fromisoformat(end_date_str).date()
        
        # Get mentor's availability settings
        availabilities = MentorAvailability.query.filter_by(
            mentor_id=mentor_id, 
            is_active=True
        ).all()
        
        settings = CalendarSettings.query.filter_by(mentor_id=mentor_id).first()
        if not settings:
            return jsonify({"error": "Mentor has not configured availability"}), 404
        
        # Get existing bookings
        existing_bookings = Booking.query.filter(
            Booking.mentor_id == mentor_id,
            Booking.session_start_time >= datetime.combine(start_date, datetime_time.min),
            Booking.session_end_time <= datetime.combine(end_date + timedelta(days=1), datetime_time.min),
            Booking.status.in_([BookingStatus.PAID, BookingStatus.CONFIRMED])
        ).all()
        
        # Get unavailability periods
        unavailabilities = MentorUnavailability.query.filter(
            MentorUnavailability.mentor_id == mentor_id,
            MentorUnavailability.start_datetime <= datetime.combine(end_date + timedelta(days=1), datetime_time.min),
            MentorUnavailability.end_datetime >= datetime.combine(start_date, datetime_time.min)
        ).all()
        
        # Generate available slots
        available_slots = []
        current_date = start_date
        
        # Get timezone
        tz = pytz.timezone(settings.timezone)
        
        while current_date <= end_date:
            day_of_week = current_date.weekday()
            
            # Get availability for this day
            day_availabilities = [a for a in availabilities if a.day_of_week == day_of_week]
            
            for availability in day_availabilities:
                # Generate time slots
                # Create naive datetime first, then localize
                slot_start_naive = datetime.combine(current_date, availability.start_time)
                slot_end_naive = datetime.combine(current_date, availability.end_time)
                
                # Localize to the mentor's timezone
                current_time = tz.localize(slot_start_naive)
                end_time = tz.localize(slot_end_naive)
                
                while current_time + timedelta(minutes=settings.session_duration) <= end_time:
                    slot_end = current_time + timedelta(minutes=settings.session_duration)
                    
                    # Check if slot is available
                    is_available = True
                    
                    # Check minimum notice
                    now_utc = datetime.utcnow()
                    now_tz = tz.normalize(pytz.utc.localize(now_utc).astimezone(tz))
                    
                    if current_time < now_tz + timedelta(hours=settings.minimum_notice_hours):
                        is_available = False
                    
                    # Check against existing bookings
                    if is_available:
                        for booking in existing_bookings:
                            # Convert booking times to timezone-aware for comparison
                            booking_start = booking.session_start_time
                            booking_end = booking.session_end_time
                            
                            # If booking times are naive, assume they're in UTC
                            if booking_start.tzinfo is None:
                                booking_start = pytz.utc.localize(booking_start)
                            if booking_end.tzinfo is None:
                                booking_end = pytz.utc.localize(booking_end)
                            
                            # Convert to mentor's timezone for comparison
                            booking_start_tz = booking_start.astimezone(tz)
                            booking_end_tz = booking_end.astimezone(tz)
                            
                            if (current_time < booking_end_tz and slot_end > booking_start_tz):
                                is_available = False
                                break
                    
                    # Check against unavailabilities
                    if is_available:
                        for unavail in unavailabilities:
                            unavail_start = unavail.start_datetime
                            unavail_end = unavail.end_datetime
                            
                            # If unavailability times are naive, assume they're in UTC
                            if unavail_start.tzinfo is None:
                                unavail_start = pytz.utc.localize(unavail_start)
                            if unavail_end.tzinfo is None:
                                unavail_end = pytz.utc.localize(unavail_end)
                            
                            # Convert to mentor's timezone for comparison
                            unavail_start_tz = unavail_start.astimezone(tz)
                            unavail_end_tz = unavail_end.astimezone(tz)
                            
                            if (current_time < unavail_end_tz and slot_end > unavail_start_tz):
                                is_available = False
                                break
                    
                    if is_available:
                        # Convert to UTC for storage/transmission
                        slot_start_utc = current_time.astimezone(pytz.utc)
                        slot_end_utc = slot_end.astimezone(pytz.utc)
                        
                        available_slots.append({
                            "start_time": slot_start_utc.isoformat(),
                            "end_time": slot_end_utc.isoformat(),
                            "date": current_date.isoformat(),
                            "duration": settings.session_duration
                        })
                    
                    # Move to next slot with buffer
                    current_time = slot_end + timedelta(minutes=settings.buffer_time)
            
            current_date += timedelta(days=1)
        
        return jsonify({
            "mentor_id": mentor_id,
            "available_slots": available_slots,
            "timezone": settings.timezone
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_available_slots: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error", "message": str(e)}), 500



@api.route('/finalize-booking', methods=['POST'])
@jwt_required()
def finalize_booking():
    """Finalize a booking after successful payment"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        current_app.logger.info(f"Finalize booking called with data: {data}")
        
        # Extract booking details - handle both camelCase and snake_case
        mentor_id = data.get('mentorId') or data.get('mentor_id')
        session_start_time = data.get('sessionStartTime') or data.get('session_start_time')
        session_end_time = data.get('sessionEndTime') or data.get('session_end_time')
        payment_intent_id = data.get('paymentIntentId') or data.get('payment_intent_id')
        amount_paid = data.get('amountPaid') or data.get('amount_paid') or data.get('price')
        notes = data.get('notes', '')
        
        current_app.logger.info(f"Extracted data - mentor_id: {mentor_id}, start: {session_start_time}, end: {session_end_time}, payment: {payment_intent_id}, amount: {amount_paid}")
        
        # Validate required fields
        if not all([mentor_id, session_start_time, session_end_time, payment_intent_id]):
            current_app.logger.error(f"Missing required fields")
            return jsonify({"msg": "Missing required booking information"}), 400
        
        # Get customer and mentor
        customer = Customer.query.get(current_user_id)
        if not customer:
            current_app.logger.error(f"Customer not found for ID: {current_user_id}")
            return jsonify({"msg": "Customer not found"}), 404
            
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            current_app.logger.error(f"Mentor not found for ID: {mentor_id}")
            return jsonify({"msg": "Mentor not found"}), 404
        
        current_app.logger.info(f"Found customer: {customer.email} and mentor: {mentor.email}")
        
        # Parse datetime strings
        try:
            if isinstance(session_start_time, str):
                session_start_dt = datetime.fromisoformat(session_start_time.replace('Z', '+00:00'))
            else:
                session_start_dt = session_start_time
                
            if isinstance(session_end_time, str):
                session_end_dt = datetime.fromisoformat(session_end_time.replace('Z', '+00:00'))
            else:
                session_end_dt = session_end_time
                
        except ValueError as e:
            current_app.logger.error(f"Invalid datetime format: {e}")
            return jsonify({"msg": "Invalid datetime format"}), 400
        
        # Calculate duration
        duration = int((session_end_dt - session_start_dt).total_seconds() / 60)
        
        # Ensure amount_paid is a number
        try:
            amount_paid = float(amount_paid) if amount_paid else 0
        except (ValueError, TypeError):
            amount_paid = 0
        
        # Calculate platform fee and mentor payout (optional)
        from decimal import Decimal
        amount_decimal = Decimal(str(amount_paid))
        platform_fee = amount_decimal * Decimal('0.10')  # 10% platform fee
        mentor_payout = amount_decimal - platform_fee
        
        # Create new booking - Using CORRECT field names from your model
        new_booking = Booking(
            customer_id=current_user_id,
            mentor_id=mentor_id,
            session_start_time=session_start_dt,
            session_end_time=session_end_dt,
            session_duration=duration,
            amount_paid=amount_decimal,
            currency='usd',
            platform_fee=platform_fee,
            mentor_payout_amount=mentor_payout,
            status=BookingStatus.CONFIRMED,
            stripe_payment_intent_id=payment_intent_id,
            invitee_notes=notes,  # ✅ CORRECT: invitee_notes, not notes
            invitee_name=f"{customer.first_name} {customer.last_name}",
            invitee_email=customer.email,
            paid_at=datetime.utcnow()  # Set paid timestamp
        )
        
        current_app.logger.info("Creating new booking in database...")
        
        db.session.add(new_booking)
        db.session.commit()
        db.session.refresh(new_booking)
        
        current_app.logger.info(f"Booking created successfully with ID: {new_booking.id}")
        
        # Create VideoSDK meeting (optional - wrap in try/catch)
        try:
            from api.services.videosdk_service import VideoSDKService
            videosdk_service = VideoSDKService()
            meeting_result = videosdk_service.create_meeting(
                booking_id=new_booking.id,
                mentor_name=f"{mentor.first_name} {mentor.last_name}",
                customer_name=f"{customer.first_name} {customer.last_name}",
                start_time=session_start_dt,
                duration_minutes=duration
            )
            
            if meeting_result['success']:
                new_booking.meeting_id = meeting_result['meeting_id']
                new_booking.meeting_url = meeting_result['meeting_url']
                new_booking.meeting_token = meeting_result['token']
                db.session.commit()
                current_app.logger.info(f"Meeting created successfully: {meeting_result['meeting_id']}")
            else:
                error_msg = meeting_result.get('error', 'Unknown error')
                current_app.logger.error(f"Failed to create VideoSDK meeting: {error_msg}")
                
        except Exception as e:
            current_app.logger.error(f"Exception creating VideoSDK meeting: {str(e)}")
            # Don't fail the booking if video meeting creation fails
        
        # Return booking details
        booking_response = {
            "id": new_booking.id,
            "mentor_id": new_booking.mentor_id,
            "customer_id": new_booking.customer_id,
            "session_start_time": new_booking.session_start_time.isoformat(),
            "session_end_time": new_booking.session_end_time.isoformat(),
            "duration": new_booking.session_duration,
            "price": float(new_booking.amount_paid),
            "status": new_booking.status.value,
            "meeting_id": getattr(new_booking, 'meeting_id', None),
            "meeting_url": getattr(new_booking, 'meeting_url', None),
            "stripe_payment_intent_id": new_booking.stripe_payment_intent_id
        }
        
        current_app.logger.info(f"Returning successful response for booking {new_booking.id}")
        
        return jsonify({
            "msg": "Booking created successfully",
            "booking": booking_response
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error in finalize_booking: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({"msg": "Failed to create booking", "error": str(e)}), 500


@api.route('/mentor/dashboard', methods=['GET'])
@mentor_required
def get_mentor_dashboard():
    """Get mentor dashboard data"""
    mentor_id = get_jwt_identity()
    
    try:
        # Get upcoming bookings
        upcoming_bookings = Booking.query.filter(
            Booking.mentor_id == mentor_id,
            Booking.session_start_time >= datetime.utcnow(),
            Booking.status.in_([BookingStatus.PAID, BookingStatus.CONFIRMED])
        ).order_by(Booking.session_start_time).all()
        
        # Get past bookings
        past_bookings = Booking.query.filter(
            Booking.mentor_id == mentor_id,
            Booking.session_start_time < datetime.utcnow(),
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED])
        ).order_by(Booking.session_start_time.desc()).limit(10).all()
        
        # Calculate statistics
        total_sessions = Booking.query.filter(
            Booking.mentor_id == mentor_id,
            Booking.status == BookingStatus.COMPLETED
        ).count()
        
        # Calculate total hours
        completed_bookings = Booking.query.filter(
            Booking.mentor_id == mentor_id,
            Booking.status == BookingStatus.COMPLETED
        ).all()
        
        total_hours = sum(
            (booking.session_duration or 60) / 60.0 
            for booking in completed_bookings
        )
        
        # For now, using placeholder values for rating and completion rate
        # You can implement actual rating system later
        average_rating = 4.5
        completion_rate = 95
        
        # Format the upcoming bookings response
        upcoming_data = []
        for booking in upcoming_bookings:
            customer = Customer.query.get(booking.customer_id)
            upcoming_data.append({
                "id": booking.id,
                "student_name": f"{customer.first_name} {customer.last_name}" if customer else "Unknown",
                "start_time": booking.session_start_time.isoformat() if booking.session_start_time else None,
                "duration": booking.session_duration or 60,
                "status": booking.status.value,
                # Include meeting URL and meeting ID from the database
                "meeting_url": booking.meeting_url,
                "meeting_id": booking.meeting_id,
                "has_meeting": bool(booking.meeting_url)  # Helper boolean for frontend
            })
        
        # Format the past bookings response
        past_data = []
        for booking in past_bookings:
            customer = Customer.query.get(booking.customer_id)
            past_data.append({
                "id": booking.id,
                "student_name": f"{customer.first_name} {customer.last_name}" if customer else "Unknown",
                "start_time": booking.session_start_time.isoformat() if booking.session_start_time else None,
                "duration": booking.session_duration or 60,
                "status": booking.status.value,
                "rating": None  # Implement rating system later
            })
        
        return jsonify({
            "upcomingBookings": upcoming_data,
            "pastBookings": past_data,
            "stats": {
                "totalSessions": total_sessions,
                "totalHours": round(total_hours, 1),
                "averageRating": average_rating,
                "completionRate": completion_rate
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_mentor_dashboard: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to load dashboard data"}), 500
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
## WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW
# WWORKING WITH OPUS BELOW

@api.route('/mentor/unavailability', methods=['GET'])
@mentor_required
def get_mentor_unavailability():
    """Get all unavailability periods for the current mentor"""
    mentor_id = get_jwt_identity()
    
    try:
        unavailabilities = MentorUnavailability.query.filter_by(
            mentor_id=mentor_id
        ).order_by(MentorUnavailability.start_datetime).all()
        
        return jsonify({
            "unavailabilities": [u.serialize() for u in unavailabilities]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting unavailabilities: {str(e)}")
        return jsonify({"error": "Failed to fetch unavailabilities"}), 500

@api.route('/mentor/<int:mentor_id>/unavailabilities', methods=['GET'])
def get_mentor_unavailabilities_public(mentor_id):
    """Get unavailability periods for a specific mentor (public endpoint for customers)"""
    try:
        # Get current date range from query params
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # Build query
        query = MentorUnavailability.query.filter_by(mentor_id=mentor_id)
        
        # If date range provided, filter to that range
        if start_date_str and end_date_str:
            start_date = datetime.fromisoformat(start_date_str).replace(hour=0, minute=0, second=0)
            end_date = datetime.fromisoformat(end_date_str).replace(hour=23, minute=59, second=59)
            
            query = query.filter(
                MentorUnavailability.start_datetime <= end_date,
                MentorUnavailability.end_datetime >= start_date
            )
        
        unavailabilities = query.order_by(MentorUnavailability.start_datetime).all()
        
        return jsonify({
            "unavailabilities": [u.serialize() for u in unavailabilities]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting mentor unavailabilities: {str(e)}")
        return jsonify({"error": "Failed to fetch unavailabilities"}), 500

@api.route('/videosdk/meeting-token/<meeting_id>', methods=['GET'])
@jwt_required()
def get_videosdk_meeting_token(meeting_id):
    """Get a token for joining a specific VideoSDK meeting with extended duration"""
    try:
        current_app.logger.info(f"🔑 TOKEN REQUEST: Meeting ID: {meeting_id}")
        
        # Get the current user
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"📊 Current user ID: {current_user_id}")
        
        # Find the booking associated with this meeting
        booking = Booking.query.filter_by(meeting_id=meeting_id).first()
        if not booking:
            current_app.logger.error(f"❌ Meeting not found: {meeting_id}")
            return jsonify({"msg": "Meeting not found", "success": False}), 404
            
        current_app.logger.info(f"📊 Booking found: ID={booking.id}, mentor_id={booking.mentor_id}, customer_id={booking.customer_id}")
        
        # Check if the current user is either the mentor or the customer
        if not (booking.mentor_id == current_user_id or booking.customer_id == current_user_id):
            current_app.logger.error(f"❌ Unauthorized access: user {current_user_id} not in booking")
            return jsonify({"msg": "Unauthorized to join this meeting", "success": False}), 403
            
        # Generate a token for the meeting with extended duration
        videosdk_service = VideoSDKService()
        
        # Determine user role and permissions
        is_mentor = booking.mentor_id == current_user_id
        permissions = ['allow_join', 'allow_mod', 'allow_record'] if is_mentor else ['allow_join']
        
        current_app.logger.info(f"📊 User role: {'mentor' if is_mentor else 'customer'}")
        current_app.logger.info(f"📊 Permissions: {permissions}")
        
        # Generate token with 4-hour duration to prevent expiration during meeting
        current_app.logger.info("🔄 Generating VideoSDK token...")
        token = videosdk_service.generate_token(permissions, duration_hours=4)
        current_app.logger.info(f"✅ Token generated: {token[:50]}...")
        
        # Get user name for the meeting
        if is_mentor:
            mentor = Mentor.query.get(current_user_id)
            user_name = f"{mentor.first_name} {mentor.last_name}" if mentor else "Mentor"
        else:
            customer = Customer.query.get(current_user_id)
            user_name = f"{customer.first_name} {customer.last_name}" if customer else "Customer"
        
        current_app.logger.info(f"📊 User name: {user_name}")
        
        response_data = {
            "token": token,
            "success": True,
            "meetingId": meeting_id,
            "userName": user_name,
            "isModerator": is_mentor,
            "tokenExpiryHours": 4
        }
        
        current_app.logger.info(f"✅ Returning successful token response for user: {user_name}")
        return jsonify(response_data)
        
    except Exception as e:
        current_app.logger.error(f"❌ Error generating meeting token: {str(e)}")
        import traceback
        current_app.logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({
            "msg": "Failed to generate meeting token",
            "error": str(e),
            "success": False
        }), 500

@api.route('/videosdk/refresh-token/<meeting_id>', methods=['POST'])
@jwt_required()
def refresh_videosdk_token(meeting_id):
    """Refresh VideoSDK token for an ongoing meeting"""
    try:
        current_app.logger.info(f"🔄 TOKEN REFRESH REQUEST: Meeting ID: {meeting_id}")
        
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"📊 Current user ID: {current_user_id}")
        
        # Find the booking associated with this meeting
        booking = Booking.query.filter_by(meeting_id=meeting_id).first()
        if not booking:
            current_app.logger.error(f"❌ Meeting not found for refresh: {meeting_id}")
            return jsonify({"success": False, "msg": "Meeting not found"}), 404
            
        # Check authorization
        if not (booking.mentor_id == current_user_id or booking.customer_id == current_user_id):
            current_app.logger.error(f"❌ Unauthorized refresh attempt: user {current_user_id}")
            return jsonify({"success": False, "msg": "Unauthorized"}), 403
            
        # Generate fresh token
        videosdk_service = VideoSDKService()
        is_mentor = booking.mentor_id == current_user_id
        permissions = ['allow_join', 'allow_mod', 'allow_record'] if is_mentor else ['allow_join']
        
        current_app.logger.info(f"📊 Refreshing token for {'mentor' if is_mentor else 'customer'}")
        current_app.logger.info(f"📊 Permissions: {permissions}")
        
        fresh_token = videosdk_service.refresh_meeting_token(meeting_id, permissions)
        
        if fresh_token:
            current_app.logger.info(f"✅ Token refreshed successfully: {fresh_token[:50]}...")
            return jsonify({
                "success": True,
                "token": fresh_token,
                "tokenExpiryHours": 4
            })
        else:
            current_app.logger.error("❌ Failed to generate fresh token")
            return jsonify({
                "success": False,
                "msg": "Failed to refresh token"
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"❌ Error refreshing token: {str(e)}")
        import traceback
        current_app.logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "msg": "Failed to refresh token"
        }), 500

@api.route('/videosdk/meeting-status/<meeting_id>', methods=['GET'])
@jwt_required()
def get_meeting_status(meeting_id):
    """Get the current status of a VideoSDK meeting"""
    try:
        current_app.logger.info(f"📊 MEETING STATUS REQUEST: {meeting_id}")
        
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"📊 Current user ID: {current_user_id}")
        
        # Find the booking associated with this meeting
        booking = Booking.query.filter_by(meeting_id=meeting_id).first()
        if not booking:
            current_app.logger.error(f"❌ Meeting not found for status: {meeting_id}")
            return jsonify({"success": False, "msg": "Meeting not found"}), 404
            
        # Check authorization
        if not (booking.mentor_id == current_user_id or booking.customer_id == current_user_id):
            current_app.logger.error(f"❌ Unauthorized status request: user {current_user_id}")
            return jsonify({"success": False, "msg": "Unauthorized"}), 403
            
        # Get meeting details from VideoSDK
        current_app.logger.info("🔄 Fetching meeting details from VideoSDK...")
        videosdk_service = VideoSDKService()
        meeting_details = videosdk_service.get_meeting_details(meeting_id)
        
        if meeting_details['success']:
            current_app.logger.info("✅ Meeting details retrieved successfully")
            return jsonify({
                "success": True,
                "meetingId": meeting_id,
                "status": "active",
                "details": meeting_details['data']
            })
        else:
            current_app.logger.error(f"❌ Failed to get meeting details: {meeting_details.get('error')}")
            return jsonify({
                "success": False,
                "msg": "Failed to get meeting status",
                "error": meeting_details.get('error')
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"❌ Error getting meeting status: {str(e)}")
        import traceback
        current_app.logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "msg": "Failed to get meeting status"
        }), 500

@api.route('/videosdk/end-meeting/<meeting_id>', methods=['POST'])
@jwt_required()
def end_videosdk_meeting(meeting_id):
    """End a VideoSDK meeting (for moderators only)"""
    try:
        current_app.logger.info(f"🛑 END MEETING REQUEST: {meeting_id}")
        
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"📊 Current user ID: {current_user_id}")
        
        # Find the booking associated with this meeting
        booking = Booking.query.filter_by(meeting_id=meeting_id).first()
        if not booking:
            current_app.logger.error(f"❌ Meeting not found for ending: {meeting_id}")
            return jsonify({"success": False, "msg": "Meeting not found"}), 404
            
        # Only mentors can end meetings
        if booking.mentor_id != current_user_id:
            current_app.logger.error(f"❌ Unauthorized end request: user {current_user_id} is not mentor")
            return jsonify({"success": False, "msg": "Only mentors can end meetings"}), 403
            
        # End the meeting
        current_app.logger.info("🔄 Ending meeting via VideoSDK...")
        videosdk_service = VideoSDKService()
        success = videosdk_service.end_meeting(meeting_id)
        
        if success:
            current_app.logger.info("✅ Meeting ended successfully")
            # Update booking status
            booking.status = BookingStatus.COMPLETED
            db.session.commit()
            current_app.logger.info(f"📊 Booking {booking.id} marked as completed")
            
            return jsonify({
                "success": True,
                "msg": "Meeting ended successfully"
            })
        else:
            current_app.logger.error("❌ Failed to end meeting via VideoSDK")
            return jsonify({
                "success": False,
                "msg": "Failed to end meeting"
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"❌ Error ending meeting: {str(e)}")
        import traceback
        current_app.logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "msg": "Failed to end meeting"
        }), 500

@api.route('/videosdk/webhook', methods=['POST'])
def videosdk_webhook():
    """Handle VideoSDK webhooks for recording, etc."""
    try:
        current_app.logger.info("🔔 VIDEOSDK WEBHOOK RECEIVED")
        current_app.logger.info(f"📊 Headers: {dict(request.headers)}")
        
        # Get webhook secret from environment
        webhook_secret = os.getenv('VIDEOSDK_WEBHOOK_SECRET')
        if not webhook_secret:
            current_app.logger.error("❌ VIDEOSDK_WEBHOOK_SECRET not set in environment variables")
            return jsonify({"success": False, "error": "Webhook secret not configured"}), 500

        # Get signature from headers
        signature = request.headers.get('Authorization')
        current_app.logger.info(f"📊 Signature received: {signature[:20] if signature else 'None'}...")
        
        if not signature:
            current_app.logger.error("❌ No signature provided in webhook")
            return jsonify({"success": False, "error": "No signature provided"}), 401

        # Verify signature
        if signature != webhook_secret:
            current_app.logger.error("❌ Invalid webhook signature")
            return jsonify({"success": False, "error": "Invalid signature"}), 401

        data = request.json
        current_app.logger.info(f"📊 Webhook data: {json.dumps(data, indent=2)}")
        
        webhook_type = data.get("webhook_type")
        current_app.logger.info(f"📊 Webhook type: {webhook_type}")
        
        if webhook_type == "recording-completed":
            current_app.logger.info("🎥 Processing recording completed webhook")
            
            meeting_id = data.get("data", {}).get("meetingId")
            recording_url = data.get("data", {}).get("file", {}).get("url")
            
            current_app.logger.info(f"📊 Recording details: meeting_id={meeting_id}, url={recording_url}")
            
            # Update booking with recording URL
            booking = Booking.query.filter_by(meeting_id=meeting_id).first()
            if booking:
                booking.recording_url = recording_url
                db.session.commit()
                current_app.logger.info(f"✅ Updated recording URL for booking {booking.id}")
            else:
                current_app.logger.warning(f"⚠️ No booking found for meeting {meeting_id}")
        else:
            current_app.logger.info(f"📊 Unhandled webhook type: {webhook_type}")
        
        return jsonify({"success": True}), 200
        
    except Exception as e:
        current_app.logger.error(f"❌ Webhook error: {str(e)}")
        import traceback
        current_app.logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500
    """End a VideoSDK meeting (for moderators only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find the booking associated with this meeting
        booking = Booking.query.filter_by(meeting_id=meeting_id).first()
        if not booking:
            return jsonify({"success": False, "msg": "Meeting not found"}), 404
            
        # Only mentors can end meetings
        if booking.mentor_id != current_user_id:
            return jsonify({"success": False, "msg": "Only mentors can end meetings"}), 403
            
        # End the meeting
        videosdk_service = VideoSDKService()
        success = videosdk_service.end_meeting(meeting_id)
        
        if success:
            # Update booking status
            booking.status = BookingStatus.COMPLETED
            db.session.commit()
            
            return jsonify({
                "success": True,
                "msg": "Meeting ended successfully"
            })
        else:
            return jsonify({
                "success": False,
                "msg": "Failed to end meeting"
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Error ending meeting: {str(e)}")
        return jsonify({
            "success": False,
            "msg": "Failed to end meeting"
        }), 500


@api.route('/booking/<int:booking_id>/calendar.ics', methods=['GET'])
@jwt_required()
def download_booking_calendar(booking_id):
    """
    Generate and download an iCalendar (.ics) file for a booking
    """
    try:
        current_user_id = get_jwt_identity()
        role = get_jwt()['role']
        
        # Get the booking
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Check authorization - user must be either the customer or mentor for this booking
        if role == 'customer' and booking.customer_id != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        elif role == 'mentor' and booking.mentor_id != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get mentor and customer details
        mentor = Mentor.query.get(booking.mentor_id)
        customer = Customer.query.get(booking.customer_id)
        
        if not mentor or not customer:
            return jsonify({"error": "Missing mentor or customer data"}), 404
        
        # Generate event details
        mentor_name = f"{mentor.first_name} {mentor.last_name}"
        customer_name = f"{customer.first_name} {customer.last_name}"
        
        event_title = f"DevMentor Session with {mentor_name}"
        event_description = f"""DevMentor Session

Mentor: {mentor_name}
Customer: {customer_name}
Duration: {booking.session_duration} minutes
Booking Reference: #{booking.id}

Meeting Link: {booking.meeting_url if booking.meeting_url else 'Will be provided before the session'}

Questions? Contact {mentor.email}

DevMentor Platform"""
        
        # Generate iCalendar content
        ical_content = generate_icalendar_content(
            event_title=event_title,
            start_time=booking.session_start_time,
            end_time=booking.session_end_time,
            description=event_description,
            location=booking.meeting_url if booking.meeting_url else "Online"
        )
        
        # Create the response with proper headers for file download
        response = Response(
            ical_content,
            mimetype='text/calendar',
            headers={
                'Content-Disposition': f'attachment; filename=devmentor-session-{booking_id}.ics',
                'Content-Type': 'text/calendar; charset=utf-8'
            }
        )
        
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error generating calendar file for booking {booking_id}: {str(e)}")
        return jsonify({"error": "Failed to generate calendar file"}), 500



# Replace your current send_booking_confirmation route with this complete version

@api.route('/send-booking-confirmation', methods=['POST'])
@jwt_required()
def send_booking_confirmation():
    """
    Send booking confirmation email to customer and notification email to mentor
    """
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        current_app.logger.info(f"Send booking confirmation called with data: {data}")
        
        # Extract data from request
        booking_id = data.get('booking_id')
        customer_email = data.get('customer_email')
        customer_name = data.get('customer_name')
        mentor_name = data.get('mentor_name')
        mentor_email = data.get('mentor_email', '')
        
        # Validate required fields
        if not all([booking_id, customer_email, customer_name, mentor_name]):
            return jsonify({
                "success": False, 
                "message": "Missing required fields"
            }), 400
        
        # Get booking details from database
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                "success": False, 
                "message": "Booking not found"
            }), 404
        
        # Get customer and mentor details
        customer = Customer.query.get(booking.customer_id)
        mentor = Mentor.query.get(booking.mentor_id)
        
        if not customer or not mentor:
            return jsonify({
                "success": False, 
                "message": "Customer or mentor not found"
            }), 404
        
        # Get mentor's timezone from calendar settings
        from api.models import CalendarSettings
        calendar_settings = CalendarSettings.query.filter_by(mentor_id=mentor.id).first()
        mentor_timezone = calendar_settings.timezone if calendar_settings else 'America/Los_Angeles'
        
        current_app.logger.info(f"Using timezone: {mentor_timezone} for booking {booking_id}")
        
        # Prepare booking details for BOTH emails (customer AND mentor)
        booking_details = {
            'id': booking.id,
            'session_start_time': booking.session_start_time.isoformat() if booking.session_start_time else None,
            'session_end_time': booking.session_end_time.isoformat() if booking.session_end_time else None,
            'amount_paid': float(booking.amount_paid) if booking.amount_paid else 0,
            'platform_fee': float(booking.platform_fee) if booking.platform_fee else 0,
            'mentor_payout': float(booking.mentor_payout_amount) if booking.mentor_payout_amount else 0,
            'meeting_url': booking.meeting_url,
            'mentor_email': mentor.email,
            'customer_email': customer.email,
            'session_duration': booking.session_duration or 60,
            'timezone': mentor_timezone  # ✅ CRITICAL: This timezone info goes to BOTH emails
        }
        
        current_app.logger.info(f"Prepared booking details with timezone {mentor_timezone}: {booking_details}")
        
        # Import email functions
        try:
            from api.send_email import send_booking_confirmation_email, send_mentor_booking_notification_email
            
            # Send email to customer (with timezone info)
            current_app.logger.info(f"Sending customer email with timezone: {mentor_timezone}")
            customer_email_sent = send_booking_confirmation_email(
                customer_email=customer.email,
                customer_name=f"{customer.first_name} {customer.last_name}",
                mentor_name=f"{mentor.first_name} {mentor.last_name}",
                booking_details=booking_details  # Contains timezone info
            )
            
            # Send email to mentor (with SAME timezone info)
            current_app.logger.info(f"Sending mentor email with timezone: {mentor_timezone}")
            mentor_email_sent = send_mentor_booking_notification_email(
                mentor_email=mentor.email,
                mentor_name=f"{mentor.first_name} {mentor.last_name}",
                customer_name=f"{customer.first_name} {customer.last_name}",
                booking_details=booking_details  # ✅ SAME booking_details with timezone
            )
            
            # Track results
            email_results = {
                "customer_email_sent": customer_email_sent,
                "mentor_email_sent": mentor_email_sent,
                "timezone_used": mentor_timezone
            }
            
            if customer_email_sent and mentor_email_sent:
                current_app.logger.info(f"Both emails sent successfully for booking {booking_id} using timezone {mentor_timezone}")
                return jsonify({
                    "success": True,
                    "message": "Booking confirmation emails sent to both customer and mentor",
                    "details": email_results
                }), 200
            elif customer_email_sent or mentor_email_sent:
                current_app.logger.warning(f"Partial email success for booking {booking_id}: {email_results}")
                return jsonify({
                    "success": True,
                    "message": "Some emails sent successfully",
                    "details": email_results
                }), 200
            else:
                current_app.logger.error(f"Failed to send both emails for booking {booking_id}")
                return jsonify({
                    "success": False,
                    "message": "Failed to send emails",
                    "details": email_results
                }), 500
                
        except ImportError as e:
            current_app.logger.error(f"Could not import email functions: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Email functionality not available"
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Error in send_booking_confirmation: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500