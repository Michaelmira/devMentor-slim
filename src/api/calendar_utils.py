# src/api/calendar_utils.py
"""
Google Calendar integration utilities for DevMentor platform
"""

import urllib.parse
from datetime import datetime
import pytz


def generate_google_calendar_url(event_title, start_time, end_time, description="", location=""):
    """
    Generate a Google Calendar "Add to Calendar" URL
    
    Args:
        event_title (str): Title of the calendar event
        start_time (str|datetime): Start time of the event (ISO format string or datetime object)
        end_time (str|datetime): End time of the event (ISO format string or datetime object)
        description (str, optional): Event description. Defaults to "".
        location (str, optional): Event location/meeting URL. Defaults to "".
    
    Returns:
        str: Google Calendar URL for adding the event
    """
    # Handle both string and datetime inputs
    if isinstance(start_time, str):
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    else:
        start_dt = start_time
    
    if isinstance(end_time, str):
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    else:
        end_dt = end_time
    
    # Ensure timezone awareness - assume UTC if no timezone info
    if start_dt.tzinfo is None:
        start_dt = pytz.utc.localize(start_dt)
    if end_dt.tzinfo is None:
        end_dt = pytz.utc.localize(end_dt)
    
    # Convert to UTC for Google Calendar consistency
    start_dt_utc = start_dt.astimezone(pytz.utc)
    end_dt_utc = end_dt.astimezone(pytz.utc)
    
    # Format for Google Calendar (YYYYMMDDTHHMMSSZ format)
    start_formatted = start_dt_utc.strftime('%Y%m%dT%H%M%SZ')
    end_formatted = end_dt_utc.strftime('%Y%m%dT%H%M%SZ')
    
    # Build the URL parameters
    params = {
        'action': 'TEMPLATE',
        'text': event_title,
        'dates': f"{start_formatted}/{end_formatted}",
        'details': description,
        'location': location
    }
    
    # Generate the final URL
    base_url = "https://calendar.google.com/calendar/render"
    query_string = urllib.parse.urlencode(params)
    return f"{base_url}?{query_string}"


def generate_outlook_calendar_url(event_title, start_time, end_time, description="", location=""):
    """
    Generate an Outlook Calendar "Add to Calendar" URL
    
    Args:
        event_title (str): Title of the calendar event
        start_time (str|datetime): Start time of the event
        end_time (str|datetime): End time of the event
        description (str, optional): Event description. Defaults to "".
        location (str, optional): Event location/meeting URL. Defaults to "".
    
    Returns:
        str: Outlook Calendar URL for adding the event
    """
    # Handle both string and datetime inputs
    if isinstance(start_time, str):
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    else:
        start_dt = start_time
    
    if isinstance(end_time, str):
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    else:
        end_dt = end_time
    
    # Ensure timezone awareness
    if start_dt.tzinfo is None:
        start_dt = pytz.utc.localize(start_dt)
    if end_dt.tzinfo is None:
        end_dt = pytz.utc.localize(end_dt)
    
    # Convert to UTC
    start_dt_utc = start_dt.astimezone(pytz.utc)
    end_dt_utc = end_dt.astimezone(pytz.utc)
    
    # Format for Outlook (ISO format)
    start_formatted = start_dt_utc.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    end_formatted = end_dt_utc.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    
    # Build the URL parameters
    params = {
        'subject': event_title,
        'startdt': start_formatted,
        'enddt': end_formatted,
        'body': description,
        'location': location
    }
    
    # Generate the final URL
    base_url = "https://outlook.live.com/calendar/0/deeplink/compose"
    query_string = urllib.parse.urlencode(params)
    return f"{base_url}?{query_string}"


def generate_icalendar_content(event_title, start_time, end_time, description="", location=""):
    """
    Generate iCalendar (.ics) file content for the event
    
    Args:
        event_title (str): Title of the calendar event
        start_time (str|datetime): Start time of the event
        end_time (str|datetime): End time of the event
        description (str, optional): Event description. Defaults to "".
        location (str, optional): Event location/meeting URL. Defaults to "".
    
    Returns:
        str: iCalendar file content
    """
    # Handle both string and datetime inputs
    if isinstance(start_time, str):
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    else:
        start_dt = start_time
    
    if isinstance(end_time, str):
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    else:
        end_dt = end_time
    
    # Ensure timezone awareness
    if start_dt.tzinfo is None:
        start_dt = pytz.utc.localize(start_dt)
    if end_dt.tzinfo is None:
        end_dt = pytz.utc.localize(end_dt)
    
    # Convert to UTC
    start_dt_utc = start_dt.astimezone(pytz.utc)
    end_dt_utc = end_dt.astimezone(pytz.utc)
    
    # Format for iCalendar
    start_formatted = start_dt_utc.strftime('%Y%m%dT%H%M%SZ')
    end_formatted = end_dt_utc.strftime('%Y%m%dT%H%M%SZ')
    created_formatted = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    
    # Generate unique UID
    import uuid
    uid = str(uuid.uuid4())
    
    # Clean description for iCalendar format
    description_clean = description.replace('\n', '\\n').replace(',', '\\,').replace(';', '\\;')
    
    ical_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DevMentor//DevMentor Platform//EN
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{created_formatted}
DTSTART:{start_formatted}
DTEND:{end_formatted}
SUMMARY:{event_title}
DESCRIPTION:{description_clean}
LOCATION:{location}
END:VEVENT
END:VCALENDAR"""
    
    return ical_content


def get_calendar_urls(event_title, start_time, end_time, description="", location=""):
    """
    Generate calendar URLs for multiple calendar providers
    
    Args:
        event_title (str): Title of the calendar event
        start_time (str|datetime): Start time of the event
        end_time (str|datetime): End time of the event
        description (str, optional): Event description. Defaults to "".
        location (str, optional): Event location/meeting URL. Defaults to "".
    
    Returns:
        dict: Dictionary containing URLs for different calendar providers
    """
    return {
        'google': generate_google_calendar_url(event_title, start_time, end_time, description, location),
        'outlook': generate_outlook_calendar_url(event_title, start_time, end_time, description, location),
        'ical_content': generate_icalendar_content(event_title, start_time, end_time, description, location)
    }