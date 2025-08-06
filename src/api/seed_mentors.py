#!/usr/bin/env python3
"""
Seed script for populating the database with mentor data
Run this script to populate your database with dummy mentors for testing
"""
import json
import datetime
import os
import sys
from decimal import Decimal
from werkzeug.security import generate_password_hash

# Add the parent directory to the path so we can import from api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import the models and db
from api.models import db, Mentor, MentorImage

def load_json_data(filename):
    """Load JSON data from the specified filename"""
    base_dir = os.path.dirname(__file__)  # Get folder seed_mentors.py is in
    filepath = os.path.join(base_dir, filename)
    
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"JSON file not found: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def seed_mentors():
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
                    password=hashed_password,  # Use properly hashed password
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
                    is_active=True  # Set as active by default
                )
                
                db.session.add(mentor)
                db.session.flush()  # Flush to get the mentor ID
                
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
            print(f"\n🎉 Successfully seeded {created_count} mentors from JSON data!")
        else:
            print(f"\n📊 No new mentors created.")
            
        if skipped_count > 0:
            print(f"📊 Skipped {skipped_count} existing mentors.")
            
        print("✅ Mentor seeding process completed.")
        
    except FileNotFoundError as e:
        print(f"❌ File not found: {str(e)}")
        print("📍 Make sure dummy_mentors.json is in the same directory as this script")
        return False
    except Exception as e:
        print(f"❌ Error during seeding: {str(e)}")
        db.session.rollback()
        return False
    
    return True

def main():
    """Main function to run the seeding process"""
    # Import Flask app to get the app context
    try:
        from app import app
        
        # Run within app context
        with app.app_context():
            success = seed_mentors()
            if success:
                sys.exit(0)
            else:
                sys.exit(1)
                
    except ImportError:
        print("❌ Could not import Flask app. Make sure you're running this from the correct directory.")
        print("📍 Try running: python src/api/seed_mentors.py")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error setting up app context: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()