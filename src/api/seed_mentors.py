import json
import datetime
from .models import db, Mentor
import os
def load_json_data(filename):
    base_dir = os.path.dirname(__file__)  # Get folder seed_mentors.py is in
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r') as f:
        return json.load(f)


def seed_mentors():
    data = load_json_data('dummy_mentors.json')
    for entry in data:
        mentor = Mentor(
            email=entry['email'],
            password=entry['password'],  # Ideally, hash if you're simulating real data
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
            price=entry.get('price'),
            last_active=datetime.datetime.fromisoformat(entry['last_active']) if entry.get('last_active') else None,
            is_verified=entry.get('is_verified', False),
            verification_code=entry.get('verification_code'),
            specialties=entry.get('specialties', [])
        )
        db.session.add(mentor)
    db.session.commit()
    print("Mentor data seeded successfully.")

seed_mentors()