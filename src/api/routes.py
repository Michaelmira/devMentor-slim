"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
import logging
from datetime import datetime, timedelta, date
import stripe

from flask import Flask, request, jsonify, url_for, Blueprint, current_app, redirect, session
from flask_cors import CORS
import jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm.attributes import flag_modified

import cloudinary.uploader as uploader
from cloudinary.uploader import destroy
from cloudinary.api import delete_resources_by_tag

from api.models import db, Mentor, Customer, MentorImage, PortfolioPhoto, Booking, BookingStatus
from api.utils import generate_sitemap, APIException
from api.decorators import mentor_required, customer_required
from api.send_email import send_email


import pytz
from enum import Enum as PyEnum

# from .googlemeet import meet_service
from urllib.parse import urlencode

# from .mentorGoogleCalendar import calendar_service
import json
from google.oauth2.credentials import Credentials
import requests # For making HTTP requests to Calendly
import secrets # For generating secure state tokens for OAuth

from .email_utils import send_booking_confirmation_email
from datetime import datetime as dt


api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)



@api.route('/current/user')
@jwt_required()
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

    mentor = Mentor(
        email=email, 
        password=generate_password_hash(password), 
        first_name=first_name, 
        last_name=last_name, 
        city=city, 
        what_state=what_state, 
        country=country, 
        phone=phone
    )
    db.session.add(mentor)
    db.session.commit()
    db.session.refresh(mentor)
    response_body = {
        "msg": "Mentor Account successfully created!",
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

    access_token = create_access_token(
        identity=mentor.id, 
        additional_claims={"role": "mentor"},
    )
    return jsonify({
        "access_token":access_token,
        "mentor_id": mentor.id,
        "mentor_data": mentor.serialize()
    }), 200

# @api.route("/forgot-password", methods=["POST"])
# def forgot_password():
#     data=request.json
#     email=data.get("email")
#     # want to get user type in the same fashion as email
#     if not email:
#         return jsonify({"message": "Email is required"}), 400
    
#     user = Mentor.query.filter_by(email=email).first() or Customer.query.filter_by(email=email).first()
#     if user is None:
#         return jsonify({"message": "Email does not exist"}), 400
    
#     expiration_time = datetime.utcnow() + timedelta(hours=1)
#     token = jwt.encode({"email": email, "exp": expiration_time}, os.getenv("FLASK_APP_KEY"), algorithm="HS256")

#     # /?userType = {usertype} in the email value
#     # email_value = f"Here is the password recovery link!\n{os.getenv('FRONTEND_URL')}/reset-password?token={token}"
#     email_value = f"Here is the password recovery link!\n{os.getenv('FRONTEND_URL')}/?token={token}"
#     send_email(email, email_value, "Subject: Password recovery for devMentor")
#     return jsonify({"message": "Recovery password email has been sent!"}), 200

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

# @api.route("/reset-password/<token>", methods=["PUT"])
# def reset_password(token):
#     data = request.get_json()
#     password = data.get("password")

#     if not password:
#         return jsonify({"message": "Please provide a new password."}), 400

#     try:
#         decoded_token = jwt.decode(token, os.getenv("FLASK_APP_KEY"), algorithms=["HS256"])
#         email = decoded_token.get("email")
#     # except Exception as e:
#     #     return jsonify({"message": "Invalid or expired token."}), 400
#     except jwt.ExpiredSignatureError:
#         return jsonify({"message": "Token has expired"}), 400
#     except jwt.InvalidTokenError:
#         return jsonify({"message": "Invalid token"}), 400

#     # email = json_secret.get('email')
#     # if not email:
#     #     return jsonify({"message": "Invalid token data."}), 400

#     mentor = Mentor.query.filter_by(email=email).first()
#     customer = Customer.query.filter_by(email=email).first()

#     user = Mentor.query.filter_by(email=email).first() or Customer.query.filter_by(email=email).first()
#     if not user:
#         return jsonify({"message": "Email does not exist"}), 400

#     # user.password = hashlib.sha256(password.encode()).hexdigest()
#     user.password = generate_password_hash(password)
#     db.session.commit()

#     send_email(email, "Your password has been changed successfully.", "Password Change Notification")

#     return jsonify({
#         "message": "Password successfully changed.", 
#         "role": "mentor" if mentor else "customer" if customer else None
#     }), 200

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

    return jsonify(mentor.serialize()), 200

@api.route('/mentor/edit-self', methods={'PUT'})
@mentor_required
def mentor_edit_self():
    email = request.json.get("email")
    is_active = request.json.get("is_active")
    first_name = request.json.get("first_name")
    last_name = request.json.get("last_name")
    nick_name = request.json.get("nick_name")
    phone = request.json.get("phone")
    city = request.json.get("city")
    what_state = request.json.get("what_state")
    country = request.json.get("country")
    years_exp = request.json.get("years_exp")
    skills = request.json.get("skills")
    days = request.json.get("days")
    price = request.json.get("price")
    about_me = request.json.get("about_me")
    calendly_url = request.json.get("calendly_url")
    
    profile_photo = request.json.get("profile_photo")
    position_x = profile_photo.get("position_x")
    position_y = profile_photo.get("position_y")
    scale = profile_photo.get("scale")

    print("position_x", position_x)
    print("position_y", position_y)
    print("Scale", scale)
    
    if email is None or first_name is None or last_name is None or city is None or what_state is None or country is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
    
    mentor =  Mentor.query.filter_by(id=get_jwt_identity()).first()
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    mentor_img=MentorImage.query.filter_by(mentor_id=mentor.id).first()
    if mentor_img:
        if position_x:
            mentor_img.position_x=position_x
        if position_y:
            mentor_img.position_y=position_y
        if scale:
            mentor_img.scale=scale
    
    mentor.email=email
    mentor.is_active=is_active
    mentor.first_name=first_name
    mentor.last_name=last_name
    mentor.nick_name=nick_name
    mentor.phone=phone
    mentor.city=city    
    mentor.what_state=what_state
    mentor.country=country
    mentor.years_exp=years_exp
    mentor.skills=skills
    mentor.days=days
    mentor.price=price
    mentor.about_me=about_me
    mentor.calendly_url=calendly_url

    db.session.commit()
    db.session.refresh(mentor)

    response_body = {"msg": "Mentor Account sucessfully edited",
    "mentor":mentor.serialize()
    }
    return jsonify(response_body, 201)

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
    
    customer = Customer(
        email=email, 
        password=generate_password_hash(password),
        first_name=first_name, 
        last_name=last_name, 
        phone=phone,
    ) 
    db.session.add(customer)
    db.session.commit()
    db.session.refresh(customer)
    response_body = {"msg": "Account succesfully created!", "customer":customer.serialize()}
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
    email = request.json.get("email")
    first_name = request.json.get("first_name")
    last_name = request.json.get("last_name")
    city = request.json.get("city")
    what_state = request.json.get("what_state",None)
    country = request.json.get("country",None)
    phone = request.json.get("phone")
    
    if email is None or first_name is None or last_name is None or city is None or what_state is None is None or country is None or phone is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
   
    customer = Customer.query.filter_by(id=get_jwt_identity()).first()
    if customer is None:
        return jsonify({"msg": "No customer found"}), 404
    
    customer.email=email 
    customer.first_name=first_name   
    customer.last_name=last_name 
    customer.city=city    
    customer.what_state=what_state    
    customer.country=country    
    customer.phone=phone
    db.session.commit()
    db.session.refresh(customer)
    
    response_body = {"msg": "Account succesfully edited!", "customer":customer.serialize()}
    return jsonify(response_body), 201

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
        role = get_jwt()['role']
        data = request.get_json()
        
        # Required fields
        mentor_id = data.get('mentorId')
        paid_date_time = data.get('paidDateTime')
        client_email = data.get('clientEmail')
        amount = data.get('amount')
        status = data.get('status', 'paid')  # Default to 'paid'
        
        # Optional fields
        mentor_payout = data.get('mentorPayout')
        platform_fee = data.get('platformFee')
        
        # Validate data
        if not mentor_id or not paid_date_time or not amount:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Here you would add the booking to your database
        # This is just a placeholder - you'll need to create a Booking model
        # booking = Booking(
        #     mentor_id=mentor_id,
        #     customer_id=user_id if role == 'customer' else None,
        #     paid_date_time=paid_date_time,
        #     client_email=client_email,
        #     amount=amount,
        #     mentor_payout=mentor_payout,
        #     platform_fee=platform_fee,
        #     status=status
        # )
        # db.session.add(booking)
        # db.session.commit()
        
        # For now, just log it
        current_app.logger.info(f"Booking tracked: Mentor ID {mentor_id}, Date/Time: {paid_date_time}, Amount: ${amount}, Status: {status}")
        
        return jsonify({"success": True, "message": "Booking tracked successfully"}), 201
        
    except Exception as e:
        current_app.logger.error(f"Error tracking booking: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Calendly OAuth Configuration (should be in .env and loaded via os.getenv)
# CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
# CALENDLY_CLIENT_SECRET = os.getenv("CALENDLY_CLIENT_SECRET")
# CALENDLY_REDIRECT_URI = os.getenv("CALENDLY_REDIRECT_URI") # e.g., http://localhost:3001/api/calendly/oauth/callback or your production URI

@api.route('/calendly/debug', methods=['GET'])
def debug_calendly_endpoint():
    """Debug endpoint to test if API routing is working"""
    return jsonify({
        "message": "Calendly debug endpoint is working",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoint": "/api/calendly/debug"
    }), 200

# Add these debug endpoints anywhere in your routes.py
@api.route('/debug/test', methods=['GET'])
def debug_test():
    """Simple endpoint to test if API routing is working"""
    return jsonify({
        "message": "API is working!",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoint": "/api/debug/test"
    }), 200

@api.route('/debug/auth-test', methods=['GET'])
@jwt_required()
def debug_auth_test():
    """Test authenticated endpoint"""
    mentor_id = get_jwt_identity()
    return jsonify({
        "message": "Authentication working!",
        "mentor_id": mentor_id,
        "timestamp": datetime.utcnow().isoformat()
    }), 200



@api.route('/calendly/oauth/initiate', methods=['GET'])
@mentor_required 
def calendly_oauth_initiate():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"msg": "Mentor not found"}), 404

    CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
    CALENDLY_REDIRECT_URI = os.getenv("CALENDLY_REDIRECT_URI")

    if not CALENDLY_CLIENT_ID or not CALENDLY_REDIRECT_URI:
        current_app.logger.error("Calendly OAuth environment variables not set.")
        return jsonify({"msg": "Calendly integration is not configured correctly on the server."}), 500

    # Use 'default' scope as that's the only one Calendly supports
    scopes = "default"
    current_app.logger.info(f"Requesting Calendly scopes: {scopes}")

    state_param = secrets.token_urlsafe(32)
    
    # Store session data with explicit session configuration
    session.permanent = True
    session['calendly_oauth_state'] = state_param
    session['calendly_oauth_mentor_id'] = mentor_id
    
    # Force session to be saved
    session.modified = True
    
    current_app.logger.info(f"Generated OAuth state for mentor {mentor_id}: {state_param}")
    current_app.logger.info(f"Session after storing: {dict(session)}")

    # Also store in database as backup (temporary approach)
    # You might want to create a temporary OAuth state table, but for now let's use a simple approach
    # Store the state and mentor_id in a way that survives the redirect
    
    params = {
        'response_type': 'code',
        'client_id': CALENDLY_CLIENT_ID,
        'redirect_uri': CALENDLY_REDIRECT_URI,
        'scope': scopes,
        'state': f"{state_param}:{mentor_id}"  # Include mentor_id in state for backup
    }
    authorization_url = f"https://auth.calendly.com/oauth/authorize?{urlencode(params)}"
    
    current_app.logger.info(f"Generated authorization URL: {authorization_url}")
    return jsonify({"calendly_auth_url": authorization_url}), 200


@api.route('/calendly/oauth/callback', methods=['GET'])
def calendly_oauth_callback():
    authorization_code = request.args.get('code')
    received_state = request.args.get('state')
    error = request.args.get('error')
    error_description = request.args.get('error_description')
    
    # Check for OAuth errors first
    if error:
        current_app.logger.error(f"Calendly OAuth error: {error} - {error_description}")
        FRONTEND_PROFILE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000") + "/mentor-profile"
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=oauth_error&error_details={error}", code=302)
    
    FRONTEND_PROFILE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000") + "/mentor-profile"

    current_app.logger.info(f"Callback session contents: {dict(session)}")
    current_app.logger.info(f"Received state: {received_state}")

    # Try to get from session first
    stored_state = session.pop('calendly_oauth_state', None)
    retrieved_mentor_id_from_session = session.pop('calendly_oauth_mentor_id', None)

    # Backup: extract mentor_id from state if session failed
    mentor_id = None
    state_param = None
    
    if received_state and ':' in received_state:
        try:
            state_param, mentor_id_str = received_state.rsplit(':', 1)
            mentor_id = int(mentor_id_str)
            current_app.logger.info(f"Extracted mentor_id {mentor_id} from state parameter")
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Failed to extract mentor_id from state: {e}")
    
    # Use session data if available, otherwise use extracted data
    if retrieved_mentor_id_from_session:
        mentor_id = retrieved_mentor_id_from_session
        final_state = stored_state
    elif state_param:
        final_state = state_param
    else:
        current_app.logger.error("No state validation possible - neither session nor state parameter worked")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=state_mismatch", code=302)

    current_app.logger.info(f"Using mentor_id: {mentor_id}, comparing states - received: {state_param or received_state}, stored: {final_state}")

    # Validate state (either from session or extracted from parameter)
    if not final_state or (state_param and final_state != state_param):
        current_app.logger.warning(f"Calendly OAuth state validation failed. Expected: {final_state}, Received: {state_param}")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=state_mismatch", code=302)

    if not mentor_id:
        current_app.logger.error("No mentor_id available from session or state parameter")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=missing_user_info", code=302)

    if not authorization_code:
        current_app.logger.error("Calendly OAuth callback missing authorization code.")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=missing_code", code=302)

    CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
    CALENDLY_CLIENT_SECRET = os.getenv("CALENDLY_CLIENT_SECRET")
    CALENDLY_REDIRECT_URI = os.getenv("CALENDLY_REDIRECT_URI")

    if not CALENDLY_CLIENT_ID or not CALENDLY_CLIENT_SECRET or not CALENDLY_REDIRECT_URI:
        current_app.logger.error("Calendly OAuth environment variables for token exchange not set.")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=config_error", code=302)

    token_url = "https://auth.calendly.com/oauth/token"
    payload = {
        'grant_type': 'authorization_code',
        'code': authorization_code,
        'redirect_uri': CALENDLY_REDIRECT_URI,
        'client_id': CALENDLY_CLIENT_ID,
        'client_secret': CALENDLY_CLIENT_SECRET
    }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    try:
        current_app.logger.info(f"Attempting token exchange for mentor {mentor_id}")
        response = requests.post(token_url, data=payload, headers=headers, timeout=30)
        
        current_app.logger.info(f"Token exchange response status: {response.status_code}")
        
        if response.status_code != 200:
            current_app.logger.error(f"Token exchange failed with status {response.status_code}: {response.text}")
            return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=token_exchange_failed&status={response.status_code}", code=302)
        
        response.raise_for_status()
        token_data = response.json()
        current_app.logger.info(f"Token exchange successful. Token data keys: {list(token_data.keys())}")

        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        expires_in = token_data.get('expires_in')

        if not access_token:
            current_app.logger.error("Token exchange response missing access_token")
            return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=missing_access_token", code=302)

        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            current_app.logger.error(f"Mentor with ID {mentor_id} not found during Calendly callback.")
            return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=user_not_found", code=302)

        mentor.calendly_access_token = access_token
        mentor.calendly_refresh_token = refresh_token
        if expires_in:
            mentor.calendly_token_expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
        
        db.session.commit()
        
        # Test the token by making a call to get user info
        test_response = requests.get(
            'https://api.calendly.com/users/me',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        if test_response.status_code == 200:
            user_data = test_response.json()
            current_app.logger.info(f"Successfully connected Calendly for mentor {mentor_id}. User: {user_data.get('resource', {}).get('name', 'Unknown')}")
        else:
            current_app.logger.warning(f"Token test failed with status {test_response.status_code}, but tokens were saved")
        
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_success=true", code=302)

    except requests.exceptions.Timeout:
        current_app.logger.error("Calendly token exchange request timed out")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=timeout", code=302)
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Calendly token exchange request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            current_app.logger.error(f"Calendly error response: {e.response.text}")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=network_error", code=302)
    except Exception as e:
        current_app.logger.error(f"Unexpected error processing Calendly callback: {str(e)}")
        return redirect(f"{FRONTEND_PROFILE_URL}?calendly_error=internal_error", code=302)


# Keep your existing test-connection and disconnect endpoints as they are working fine
@api.route('/calendly/test-connection', methods=['GET'])
@jwt_required()
def test_calendly_connection():
    mentor_id = get_jwt_identity()
    current_app.logger.info(f"Testing Calendly connection for mentor {mentor_id}")
    
    access_token, token_error_msg = get_valid_calendly_access_token(mentor_id)
    
    if token_error_msg or not access_token:
        current_app.logger.warning(f"No valid token for mentor {mentor_id}: {token_error_msg}")
        return jsonify({"connected": False, "error": token_error_msg or "No valid access token"}), 200
    
    try:
        response = requests.get(
            'https://api.calendly.com/users/me',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        current_app.logger.info(f"Calendly API test response status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            return jsonify({
                "connected": True,
                "user_name": user_data.get('resource', {}).get('name'),
                "user_email": user_data.get('resource', {}).get('email')
            }), 200
        else:
            current_app.logger.error(f"Calendly API test failed: {response.status_code} - {response.text}")
            return jsonify({"connected": False, "error": f"Token validation failed: {response.status_code}"}), 200
            
    except Exception as e:
        current_app.logger.error(f"Unexpected error in test_calendly_connection: {str(e)}")
        return jsonify({"connected": False, "error": f"Internal error: {str(e)}"}), 500


@api.route('/calendly/disconnect', methods=['POST'])
@jwt_required()
def disconnect_calendly():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    
    if not mentor:
        return jsonify({"msg": "Mentor not found"}), 404
    
    # Clear tokens
    mentor.calendly_access_token = None
    mentor.calendly_refresh_token = None
    mentor.calendly_token_expires_at = None
    
    db.session.commit()
    
    return jsonify({"msg": "Calendly disconnected successfully"}), 200


def get_valid_calendly_access_token(mentor_id):
    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        current_app.logger.error(f"[Calendly Token Helper] Mentor not found: {mentor_id}")
        return None, "Mentor not found"

    if not mentor.calendly_refresh_token:
        current_app.logger.warning(f"[Calendly Token Helper] Mentor {mentor_id} has not connected Calendly")
        return None, "Mentor has not connected their Calendly account."

    # Check if current access token is valid
    if mentor.calendly_access_token and mentor.calendly_token_expires_at:
        # Simple fix: convert both datetimes to naive for comparison
        now = datetime.utcnow()
        expires_at = mentor.calendly_token_expires_at
        
        # If expires_at is timezone-aware, convert to naive UTC
        if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is not None:
            expires_at = expires_at.replace(tzinfo=None)
            
        # Compare naive datetimes
        if now < (expires_at - timedelta(minutes=5)):
            current_app.logger.info(f"[Calendly Token Helper] Using existing valid access token for mentor {mentor_id}")
            return mentor.calendly_access_token, None

    # Refresh token logic (same as before)
    current_app.logger.info(f"[Calendly Token Helper] Refreshing Calendly access token for mentor {mentor_id}")
    CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
    CALENDLY_CLIENT_SECRET = os.getenv("CALENDLY_CLIENT_SECRET")

    if not CALENDLY_CLIENT_ID or not CALENDLY_CLIENT_SECRET:
        current_app.logger.error("[Calendly Token Helper] Calendly credentials not configured for refresh")
        return None, "Calendly integration is not properly configured."

    token_url = "https://auth.calendly.com/oauth/token"
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': mentor.calendly_refresh_token,
        'client_id': CALENDLY_CLIENT_ID,
        'client_secret': CALENDLY_CLIENT_SECRET
    }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    try:
        response = requests.post(token_url, data=payload, headers=headers, timeout=30)
        response.raise_for_status()
        new_token_data = response.json()

        new_access_token = new_token_data.get('access_token')
        new_refresh_token = new_token_data.get('refresh_token')
        new_expires_in = new_token_data.get('expires_in')

        if not new_access_token:
            current_app.logger.error(f"[Calendly Token Helper] Token refresh missing access_token for mentor {mentor_id}")
            return None, "Failed to refresh Calendly token (missing token in response)."

        mentor.calendly_access_token = new_access_token
        if new_refresh_token:
            mentor.calendly_refresh_token = new_refresh_token
        if new_expires_in:
            # Store as naive datetime
            mentor.calendly_token_expires_at = datetime.utcnow() + timedelta(seconds=int(new_expires_in))
        
        db.session.commit()
        current_app.logger.info(f"[Calendly Token Helper] Successfully refreshed token for mentor {mentor_id}")
        return new_access_token, None
    
    except requests.exceptions.HTTPError as e:
        current_app.logger.error(f"[Calendly Token Helper] HTTP error during refresh for mentor {mentor_id}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            current_app.logger.error(f"[Calendly Token Helper] Error response: {e.response.status_code} - {e.response.text}")
            if e.response.status_code in [400, 401]:
                # Clear invalid tokens
                mentor.calendly_access_token = None
                mentor.calendly_refresh_token = None
                mentor.calendly_token_expires_at = None
                db.session.commit()
                return None, "Calendly connection expired. Please reconnect your account."
        return None, "Failed to refresh Calendly token due to server error."
    except Exception as e:
        current_app.logger.error(f"[Calendly Token Helper] Unexpected error during refresh for mentor {mentor_id}: {str(e)}")
        return None, "An unexpected error occurred while refreshing Calendly token."

@api.route('/finalize-booking', methods=['POST'])
@jwt_required() # Customer must be logged in to finalize a booking
def finalize_booking():
    data = request.get_json()
    current_customer_id = get_jwt_identity()
    customer = Customer.query.get(current_customer_id)

    if not customer:
        return jsonify({"msg": "Customer not found"}), 404

    # --- Expected data from frontend (BookingDetailsForm.js) --- 
    mentor_id = data.get('mentorId')
    calendly_selected_event_uri = data.get('calendlyScheduledEventUri') 
    
    event_start_time_str = data.get('eventStartTime') 
    event_end_time_str = data.get('eventEndTime') 
    
    invitee_name = data.get('inviteeName')
    invitee_email = data.get('inviteeEmail')
    invitee_notes = data.get('notes', '')
    
    stripe_payment_intent_id = data.get('paymentIntentId')
    amount_paid = data.get('amountPaid') 
    currency = data.get('currency', 'usd')

    # --- UPDATED Basic Validation (removed calendly_selected_event_uri requirement) --- 
    if not all([mentor_id, event_start_time_str, invitee_name, invitee_email, stripe_payment_intent_id]):
        current_app.logger.error(f"Missing required data: mentorId={mentor_id}, eventStartTime={event_start_time_str}, inviteeName={invitee_name}, inviteeEmail={invitee_email}, paymentIntentId={stripe_payment_intent_id}")
        return jsonify({"msg": "Missing required booking information."}), 400

    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"msg": "Selected mentor not found."}), 404

    # Convert string dates to datetime objects early for use in email and booking
    parsed_event_start_time = dt.fromisoformat(event_start_time_str.replace('Z', '+00:00')) if event_start_time_str else None
    parsed_event_end_time = dt.fromisoformat(event_end_time_str.replace('Z', '+00:00')) if event_end_time_str else None

    # --- Handle case where Calendly URI is null --- 
    if not calendly_selected_event_uri:
        current_app.logger.warning(f"No Calendly event URI provided - creating booking without Calendly integration for mentor {mentor_id}")
        
        calculated_amount_paid = Decimal(amount_paid) if amount_paid else Decimal(mentor.price or 0)
        calculated_platform_fee = calculated_amount_paid * Decimal('0.10') 
        calculated_mentor_payout = calculated_amount_paid - calculated_platform_fee

        new_booking = Booking(
            mentor_id=mentor_id,
            customer_id=current_customer_id,
            paid_at=datetime.utcnow(),
            scheduled_at=datetime.utcnow(), 
            calendly_event_uri=None,
            calendly_invitee_uri=None,
            calendly_event_start_time=parsed_event_start_time,
            calendly_event_end_time=parsed_event_end_time,
            invitee_name=invitee_name,
            invitee_email=invitee_email,
            invitee_notes=invitee_notes,
            stripe_payment_intent_id=stripe_payment_intent_id,
            amount_paid=calculated_amount_paid,
            currency=currency,
            platform_fee=calculated_platform_fee,
            mentor_payout_amount=calculated_mentor_payout,
            status=BookingStatus.PAID 
        )
        
        try:
            db.session.add(new_booking)
            db.session.commit()
            
            # Send manual confirmation email
            email_subject = "Your Mentorship Booking Confirmation (Action Required)"
            email_body_html = f"""
            <h1>Booking Received</h1>
            <p>Hi {invitee_name},</p>
            <p>We've received your booking request for a session with {mentor.first_name} {mentor.last_name}.</p>
            <p><strong>Session Time (Approximate):</strong> {parsed_event_start_time.strftime('%Y-%m-%d %H:%M %Z') if parsed_event_start_time else 'Not specified'}</p>
            <p>Since this booking couldn't be automatically added to your calendar via Calendly, we will manually confirm the details and send you a calendar invitation within 24 hours.</p>
            <p>If you have any urgent questions, please contact us.</p>
            <p>Thank you!</p>
            """
            send_booking_confirmation_email(invitee_email, email_subject, email_body_html)
            # Also notify mentor
            mentor_email_subject = f"New Manual Booking Alert: {invitee_name} for {parsed_event_start_time.strftime('%Y-%m-%d %H:%M') if parsed_event_start_time else 'N/A'}"
            mentor_email_body = f"""
            <p>Hi {mentor.first_name},</p>
            <p>A new booking needs your manual attention and calendar scheduling:</p>
            <p><strong>Client:</strong> {invitee_name} ({invitee_email})</p>
            <p><strong>Requested Time:</strong> {parsed_event_start_time.strftime('%Y-%m-%d %H:%M %Z') if parsed_event_start_time else 'Not specified'}</p>
            <p><strong>Notes:</strong> {invitee_notes if invitee_notes else 'None'}</p>
            <p>Please coordinate with the client and add this to your calendar. The Calendly link was not used for this booking.</p>
            """
            send_booking_confirmation_email(mentor.email, mentor_email_subject, mentor_email_body)


            current_app.logger.info(f"Booking {new_booking.id} created, manual confirmation email sent to {invitee_email} and notification to mentor {mentor.email}")
            
            return jsonify({
                "success": True, 
                "message": "Booking created successfully! We'll send you a calendar invitation manually within 24 hours.",
                "bookingDetails": new_booking.serialize(),
                "requires_manual_confirmation": True
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating manual booking or sending email: {str(e)}")
            return jsonify({"msg": "Failed to create booking or send notification"}), 500

    # --- Original Calendly integration code (when URI is provided) --- 
    access_token, token_error_msg = get_valid_calendly_access_token(mentor_id)
    if token_error_msg or not access_token:
        current_app.logger.error(f"Failed to get Calendly token for mentor {mentor_id} during booking: {token_error_msg}")
        return jsonify({"msg": token_error_msg or "Could not authenticate with Calendly for this mentor."}), 503

    try:
        event_uuid = calendly_selected_event_uri.split("/")[-1]
    except Exception:
        return jsonify({"msg": "Invalid Calendly event URI format."}), 400

    create_invitee_url = f"https://api.calendly.com/scheduled_events/{event_uuid}/invitees"

    invitee_payload = {
        "email": invitee_email,
        "name": invitee_name,
    }
    if invitee_notes: # Add notes if provided
        invitee_payload["questions_and_answers"] = [
            {
                "question": "Notes or special requests?", # This question text might need to match your Calendly setup if you have custom questions
                "answer": invitee_notes
            }
        ]


    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    try:
        current_app.logger.info(f"Attempting to create Calendly invitee for event {event_uuid} for {invitee_email}")
        calendly_response = requests.post(create_invitee_url, headers=headers, json=invitee_payload)
        
        # Log Calendly request and response for debugging
        current_app.logger.debug(f"Calendly request to {create_invitee_url} with payload: {invitee_payload}")
        current_app.logger.debug(f"Calendly response: {calendly_response.status_code} - {calendly_response.text}")

        calendly_response.raise_for_status()
        calendly_invitee_data = calendly_response.json().get('resource', {})
        
        confirmed_calendly_event_uri = calendly_invitee_data.get('scheduled_event', {}).get('uri')
        confirmed_calendly_invitee_uri = calendly_invitee_data.get('uri')

        calculated_amount_paid = Decimal(amount_paid) if amount_paid else Decimal(mentor.price or 0)
        calculated_platform_fee = calculated_amount_paid * Decimal('0.10') 
        calculated_mentor_payout = calculated_amount_paid - calculated_platform_fee

        new_booking = Booking(
            mentor_id=mentor_id,
            customer_id=current_customer_id,
            paid_at=datetime.utcnow(),
            scheduled_at=datetime.utcnow(), 
            calendly_event_uri=confirmed_calendly_event_uri or calendly_selected_event_uri,
            calendly_invitee_uri=confirmed_calendly_invitee_uri,
            calendly_event_start_time=parsed_event_start_time,
            calendly_event_end_time=parsed_event_end_time,
            invitee_name=invitee_name,
            invitee_email=invitee_email,
            invitee_notes=invitee_notes,
            stripe_payment_intent_id=stripe_payment_intent_id,
            amount_paid=calculated_amount_paid,
            currency=currency,
            platform_fee=calculated_platform_fee,
            mentor_payout_amount=calculated_mentor_payout,
            status=BookingStatus.CONFIRMED
        )
        db.session.add(new_booking)
        db.session.commit()

        # Send Calendly confirmation email with .ics
        email_subject = f"Your Mentorship Session with {mentor.first_name} {mentor.last_name} is Confirmed!"
        email_body_html = f"""
        <h1>Session Confirmed!</h1>
        <p>Hi {invitee_name},</p>
        <p>Your mentorship session with <strong>{mentor.first_name} {mentor.last_name}</strong> has been successfully scheduled via Calendly.</p>
        <p><strong>Date & Time:</strong> {parsed_event_start_time.strftime('%A, %B %d, %Y at %I:%M %p %Z') if parsed_event_start_time else 'N/A'}</p>
        <p><strong>Mentor:</strong> {mentor.first_name} {mentor.last_name}</p>
        <p><strong>Your Email:</strong> {invitee_email}</p>
        {f"<p><strong>Notes:</strong> {invitee_notes}</p>" if invitee_notes else ""}
        <p>You should also receive a confirmation directly from Calendly with options to add this to your calendar. We've attached an iCalendar (.ics) file to this email as well for your convenience.</p>
        <p>We look forward to your session!</p>
        """
        
        meeting_details_ics = None
        if parsed_event_start_time and parsed_event_end_time:
            meeting_details_ics = {
                'uid': f"{new_booking.id}-{stripe_payment_intent_id}",
                'dtstamp': datetime.utcnow().strftime('%Y%m%dT%H%M%SZ'),
                'dtstart': parsed_event_start_time.strftime('%Y%m%dT%H%M%SZ'),
                'dtend': parsed_event_end_time.strftime('%Y%m%dT%H%M%SZ'),
                'summary': f"Mentorship: {invitee_name} & {mentor.first_name} {mentor.last_name}",
                'description': f"Mentorship session. Notes: {invitee_notes if invitee_notes else 'None'}. Calendly Event: {confirmed_calendly_event_uri}",
                'location': mentor.calendly_event_location or 'Online / Video Call' # Assuming mentor might have a default location
            }

        send_booking_confirmation_email(invitee_email, email_subject, email_body_html, meeting_details=meeting_details_ics)
        # Notify mentor as well
        mentor_email_subject_confirmed = f"New Confirmed Booking: {invitee_name} for {parsed_event_start_time.strftime('%Y-%m-%d %H:%M') if parsed_event_start_time else 'N/A'}"
        mentor_email_body_confirmed = f"""
        <p>Hi {mentor.first_name},</p>
        <p>A new session has been successfully booked and confirmed via Calendly:</p>
        <p><strong>Client:</strong> {invitee_name} ({invitee_email})</p>
        <p><strong>Time:</strong> {parsed_event_start_time.strftime('%A, %B %d, %Y at %I:%M %p %Z') if parsed_event_start_time else 'Not specified'}</p>
        <p><strong>Notes:</strong> {invitee_notes if invitee_notes else 'None'}</p>
        <p>This event should already be on your Calendly-connected calendar.</p>
        """
        send_booking_confirmation_email(mentor.email, mentor_email_subject_confirmed, mentor_email_body_confirmed)

        current_app.logger.info(f"Booking {new_booking.id} created successfully with Calendly integration. Confirmation email sent to {invitee_email} and notification to {mentor.email}")
        return jsonify({
            "success": True, 
            "message": "Booking successfully scheduled with Calendly!", 
            "bookingDetails": new_booking.serialize()
        }), 201

    except requests.exceptions.HTTPError as e:
        current_app.logger.error(f"Calendly API error: {e}")
        error_details = "Unknown Calendly API error."
        if e.response is not None:
            error_details = e.response.json()
        return jsonify({"msg": "Failed to schedule with Calendly due to an API error.", "details": error_details}), 502
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error finalizing booking: {str(e)}")
        return jsonify({"msg": "An unexpected server error occurred while finalizing your booking."}), 500

# Make sure to import Decimal if using it for precise fee calculations
from decimal import Decimal
