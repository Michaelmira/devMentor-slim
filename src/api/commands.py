# Add this to your src/api/commands.py file

import json
import datetime
import os
from decimal import Decimal
from werkzeug.security import generate_password_hash
from api.models import db, Mentor, MentorImage, CalendarSettings, MentorAvailability, MentorUnavailability

def load_json_data(filename):
    """Load JSON data from the specified filename"""
    base_dir = os.path.dirname(__file__)  # api directory
    filepath = os.path.join(base_dir, filename)
    
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"JSON file not found: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def seed_mentors_data():
    """Seed the database with mentor data from dummy_mentors.json"""
    try:
        print("🌱 Starting mentor seeding process...")
        
        # Load the JSON data
        raw_data = load_json_data('dummy_mentors.json')
        
        # Handle different JSON structures
        if isinstance(raw_data, dict) and 'mentors' in raw_data:
            # New structure: {"mentors": [...]}
            data = raw_data['mentors']
            print(f"📊 Loaded {len(data)} mentors from JSON file (nested structure)")
        elif isinstance(raw_data, list):
            # Old structure: [...]
            data = raw_data
            print(f"📊 Loaded {len(data)} mentors from JSON file (flat structure)")
        else:
            raise ValueError("Invalid JSON structure. Expected either a list of mentors or an object with 'mentors' key.")
        
        print(f"📊 Processing {len(data)} mentors...")
        
        # Track statistics
        created_count = 0
        skipped_count = 0
        
        for entry in data:
            try:
                # Check if mentor already exists
                existing_mentor = Mentor.query.filter_by(email=entry['email']).first()
                if existing_mentor:
                    print(f"⚠️  Skipping {entry['email']} - already exists")
                    skipped_count += 1
                    continue
                
                # Parse the last_active datetime if it exists
                last_active = None
                if entry.get('last_active'):
                    try:
                        last_active = datetime.datetime.fromisoformat(entry['last_active'])
                    except ValueError:
                        print(f"⚠️  Invalid date format for {entry['email']}: {entry['last_active']}")
                        last_active = None
                
                # Convert price to Decimal if it exists
                price = None
                if entry.get('price'):
                    try:
                        price = Decimal(str(entry['price']))
                    except (ValueError, TypeError):
                        print(f"⚠️  Invalid price for {entry['email']}: {entry['price']}")
                        price = None
                
                # Hash the password properly
                hashed_password = generate_password_hash(entry['password'])
                
                # Validate verification_code length (max 6 characters)
                verification_code = entry.get('verification_code')
                if verification_code and len(str(verification_code)) > 6:
                    print(f"⚠️  Verification code too long for {entry['email']}, truncating to 6 chars")
                    verification_code = str(verification_code)[:6]
                
                # Create the mentor object
                mentor = Mentor(
                    email=entry['email'],
                    password=hashed_password,
                    first_name=entry['first_name'],
                    last_name=entry['last_name'],
                    nick_name=entry.get('nick_name'),
                    phone=entry['phone'],
                    city=entry['city'],
                    what_state=entry['what_state'],
                    country=entry['country'],
                    about_me=entry.get('about_me'),
                    years_exp=entry.get('years_exp'),
                    skills=entry.get('skills', []),
                    price=price,
                    last_active=last_active,
                    is_verified=entry.get('is_verified', False),
                    verification_code=verification_code,
                    specialties=entry.get('specialties', []),
                    is_active=True
                )
                
                db.session.add(mentor)
                db.session.flush()  # Flush to get the mentor ID
                
                # Add calendar settings if specified in JSON
                calendar_settings_data = entry.get('calendar_settings')
                if calendar_settings_data:
                    try:
                        calendar_settings = CalendarSettings(
                            mentor_id=mentor.id,
                            session_duration=calendar_settings_data.get('session_duration', 60),
                            buffer_time=calendar_settings_data.get('buffer_time', 15),
                            advance_booking_days=calendar_settings_data.get('advance_booking_days', 30),
                            minimum_notice_hours=calendar_settings_data.get('minimum_notice_hours', 24),
                            timezone=calendar_settings_data.get('timezone', 'America/Los_Angeles')
                        )
                        db.session.add(calendar_settings)
                        print(f"📅 Added calendar settings for {entry['first_name']} {entry['last_name']}")
                    except Exception as calendar_error:
                        print(f"⚠️  Failed to add calendar settings for {entry['email']}: {str(calendar_error)}")
                
                # Add availabilities if specified in JSON
                availabilities_data = entry.get('availabilities', [])
                for avail_data in availabilities_data:
                    try:
                        availability = MentorAvailability(
                            mentor_id=mentor.id,
                            day_of_week=avail_data['day_of_week'],
                            start_time=datetime.datetime.strptime(avail_data['start_time'], '%H:%M').time(),
                            end_time=datetime.datetime.strptime(avail_data['end_time'], '%H:%M').time(),
                            timezone=avail_data.get('timezone', 'America/Los_Angeles'),
                            is_active=True
                        )
                        db.session.add(availability)
                    except Exception as avail_error:
                        print(f"⚠️  Failed to add availability slot for {entry['email']}: {str(avail_error)}")
                        continue
                
                if availabilities_data:
                    print(f"⏰ Added {len(availabilities_data)} availability slots for {entry['first_name']} {entry['last_name']}")
                
                # Add unavailabilities if specified in JSON
                unavailabilities_data = entry.get('unavailabilities', [])
                for unavail_data in unavailabilities_data:
                    try:
                        start_datetime = datetime.datetime.fromisoformat(unavail_data['start_datetime'].replace('Z', '+00:00'))
                        end_datetime = datetime.datetime.fromisoformat(unavail_data['end_datetime'].replace('Z', '+00:00'))
                        
                        unavailability = MentorUnavailability(
                            mentor_id=mentor.id,
                            start_datetime=start_datetime.replace(tzinfo=None),  # Store as naive UTC
                            end_datetime=end_datetime.replace(tzinfo=None),      # Store as naive UTC
                            reason=unavail_data.get('reason', '')
                        )
                        db.session.add(unavailability)
                    except Exception as unavail_error:
                        print(f"⚠️  Failed to add unavailability for {entry['email']}: {str(unavail_error)}")
                        continue
                
                if unavailabilities_data:
                    print(f"🚫 Added {len(unavailabilities_data)} unavailability periods for {entry['first_name']} {entry['last_name']}")
                
                # Add profile photo if specified in JSON
                photo_data = entry.get('profile_photo')
                if photo_data:
                    try:
                        mentor_image = MentorImage(
                            public_id=photo_data.get('public_id', f"mentor_photos/mentor_{mentor.id}"),
                            image_url=photo_data['image_url'],
                            mentor_id=mentor.id,
                            position_x=photo_data.get('position_x', 0.5),
                            position_y=photo_data.get('position_y', 0.5),
                            scale=photo_data.get('scale', 1.0)
                        )
                        db.session.add(mentor_image)
                        print(f"📸 Added profile photo for {entry['first_name']} {entry['last_name']}")
                    except Exception as photo_error:
                        print(f"⚠️  Failed to add profile photo for {entry['email']}: {str(photo_error)}")
                else:
                    print(f"⚠️  No profile photo specified for {entry['first_name']} {entry['last_name']}")
                
                created_count += 1
                print(f"✅ Created mentor: {entry['first_name']} {entry['last_name']} ({entry['email']})")
                
            except Exception as e:
                print(f"❌ Error creating mentor {entry.get('email', 'unknown')}: {str(e)}")
                db.session.rollback()  # Rollback this individual mentor's transaction
                continue
        
        # Commit all changes
        if created_count > 0:
            db.session.commit()
            print(f"\n🎉 Successfully seeded {created_count} mentors with complete profiles and schedules!")
        else:
            print(f"\n📊 No new mentors created.")
            
        if skipped_count > 0:
            print(f"📊 Skipped {skipped_count} existing mentors.")
            
        print("✅ Mentor seeding process completed.")
        return True
        
    except Exception as e:
        print(f"❌ Error during seeding: {str(e)}")
        db.session.rollback()
        return False

def setup_commands(app):
    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Insert test data including mentors"""
        print("Inserting test data...")
        success = seed_mentors_data()
        if success:
            print("Test data inserted successfully.")
        else:
            print("Failed to insert test data.")
    
    @app.cli.command("seed-mentors")
    def seed_mentors_command():
        """Seed mentors from dummy_mentors.json"""
        success = seed_mentors_data()
        if not success:
            print("Seeding failed.")