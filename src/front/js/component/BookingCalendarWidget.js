import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import PropTypes from 'prop-types';
import './BookingCalendarWidget.css';

const BookingCalendarWidget = ({ mentorId, mentorName, onSelectSlot, backendUrl }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [unavailabilities, setUnavailabilities] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Mentor's timezone (from backend)
    const [mentorTimezone, setMentorTimezone] = useState('America/New_York');
    
    // Customer's timezone (auto-detected)
    const [customerTimezone, setCustomerTimezone] = useState('America/New_York');

    useEffect(() => {
        // Auto-detect customer's timezone on component mount
        try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setCustomerTimezone(detectedTimezone);
            console.log('Auto-detected customer timezone:', detectedTimezone);
        } catch (error) {
            console.warn('Failed to detect timezone, using default EST:', error);
            setCustomerTimezone('America/New_York');
        }
    }, []);

    useEffect(() => {
        fetchAvailableSlots();
        fetchUnavailabilities();
    }, [currentDate, mentorId]);

    const fetchAvailableSlots = async () => {
        setLoading(true);
        setError(null);
        try {
            const startDate = startOfMonth(currentDate);
            const endDate = endOfMonth(currentDate);

            const response = await fetch(
                `${backendUrl || process.env.BACKEND_URL}/api/mentor/${mentorId}/available-slots?` +
                `start_date=${startDate.toISOString().split('T')[0]}&` +
                `end_date=${endDate.toISOString().split('T')[0]}`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    setError('This mentor has not yet set up their availability. Please check back later or contact the mentor directly.');
                    setAvailableSlots([]);
                    return;
                }
                throw new Error(`Failed to fetch available slots: ${response.status}`);
            }

            const data = await response.json();
            console.log('Available slots response:', data);
            setAvailableSlots(data.available_slots || []);
            setMentorTimezone(data.timezone || 'America/New_York'); // Store mentor's timezone
        } catch (err) {
            setError('Failed to load available time slots. Please try again later.');
            console.error('Error fetching slots:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnavailabilities = async () => {
        try {
            const response = await fetch(
                `${backendUrl || process.env.BACKEND_URL}/api/mentor/${mentorId}/unavailabilities`
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Unavailabilities:', data);
                setUnavailabilities(data.unavailabilities || []);
            }
        } catch (err) {
            console.error('Error fetching unavailabilities:', err);
        }
    };

    const handlePreviousMonth = () => {
        setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
    };

    const handleSlotSelect = (slot) => {
        // Parse the dates to ensure they're valid
        const startTime = parseISO(slot.start_time);
        const endTime = parseISO(slot.end_time);
        
        // Calculate duration in minutes
        const durationMs = endTime - startTime;
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        
        // Create a complete slot object with all necessary data
        const completeSlot = {
            // Original slot data
            ...slot,
            // Ensure we have all required fields
            date: format(startTime, 'yyyy-MM-dd'), // YYYY-MM-DD format
            start_time: slot.start_time, // ISO datetime string from backend (UTC)
            end_time: slot.end_time, // ISO datetime string from backend (UTC)
            duration: slot.duration || durationMinutes || 60, // Duration in minutes
            mentor_timezone: mentorTimezone, // Mentor's timezone
            customer_timezone: customerTimezone, // Customer's timezone
            // Additional display data in customer's timezone
            formatted_date: format(startTime, 'EEEE, MMMM d, yyyy'),
            formatted_start_time: format(utcToZonedTime(startTime, customerTimezone), 'h:mm a'),
            formatted_end_time: format(utcToZonedTime(endTime, customerTimezone), 'h:mm a'),
        };
        
        console.log("Passing complete slot data:", completeSlot);
        onSelectSlot(completeSlot);
    };

    const getDaysInMonth = () => {
        return eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
        });
    };

    const isDateUnavailable = (date) => {
        // Check if any part of this date falls within an unavailability period
        return unavailabilities.some(unavail => {
            try {
                const unavailStart = parseISO(unavail.start_datetime);
                const unavailEnd = parseISO(unavail.end_datetime);
                
                // Validate dates
                if (!unavailStart || !unavailEnd || isNaN(unavailStart.getTime()) || isNaN(unavailEnd.getTime())) {
                    console.warn('Invalid unavailability dates:', unavail);
                    return false;
                }
                
                // Check if the date overlaps with the unavailability period
                const dateStart = new Date(date);
                dateStart.setHours(0, 0, 0, 0);
                const dateEnd = new Date(date);
                dateEnd.setHours(23, 59, 59, 999);
                
                // Check for overlap
                return (
                    (dateStart >= unavailStart && dateStart <= unavailEnd) ||
                    (dateEnd >= unavailStart && dateEnd <= unavailEnd) ||
                    (dateStart <= unavailStart && dateEnd >= unavailEnd)
                );
            } catch (error) {
                console.error('Error checking date unavailability:', error);
                return false;
            }
        });
    };

    const getAvailableSlotsForDate = (date) => {
        const daySlots = availableSlots.filter(slot => {
            const slotDate = new Date(slot.start_time);
            return isSameDay(slotDate, date);
        });

        // Filter out slots that overlap with unavailability periods
        return daySlots.filter(slot => {
            try {
                const slotStart = parseISO(slot.start_time);
                const slotEnd = parseISO(slot.end_time);

                // Check if this slot overlaps with any unavailability
                return !unavailabilities.some(unavail => {
                    const unavailStart = parseISO(unavail.start_datetime);
                    const unavailEnd = parseISO(unavail.end_datetime);

                    // Validate dates
                    if (!unavailStart || !unavailEnd || isNaN(unavailStart.getTime()) || isNaN(unavailEnd.getTime())) {
                        return false;
                    }

                    // Check for any overlap
                    return (slotStart < unavailEnd && slotEnd > unavailStart);
                });
            } catch (error) {
                console.error('Error filtering slot:', error);
                return true; // Keep the slot if there's an error
            }
        });
    };

    const getUnavailabilityForDate = (date) => {
        return unavailabilities.find(unavail => {
            try {
                const unavailStart = parseISO(unavail.start_datetime);
                const unavailEnd = parseISO(unavail.end_datetime);
                
                // Validate dates
                if (!unavailStart || !unavailEnd || isNaN(unavailStart.getTime()) || isNaN(unavailEnd.getTime())) {
                    return false;
                }
                
                const dateStart = new Date(date);
                dateStart.setHours(0, 0, 0, 0);
                const dateEnd = new Date(date);
                dateEnd.setHours(23, 59, 59, 999);
                
                return (
                    (dateStart >= unavailStart && dateStart <= unavailEnd) ||
                    (dateEnd >= unavailStart && dateEnd <= unavailEnd) ||
                    (dateStart <= unavailStart && dateEnd >= unavailEnd)
                );
            } catch (error) {
                console.error('Error getting unavailability for date:', error);
                return false;
            }
        });
    };

    // Helper function to get timezone abbreviation
    const getTimezoneAbbreviation = (timezone) => {
        try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en', {
                timeZone: timezone,
                timeZoneName: 'short'
            });
            const parts = formatter.formatToParts(now);
            const timeZonePart = parts.find(part => part.type === 'timeZoneName');
            return timeZonePart ? timeZonePart.value : timezone;
        } catch (error) {
            console.warn('Failed to get timezone abbreviation:', error);
            return timezone;
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div className="booking-calendar">
            {/* Timezone Display */}
            <div className="timezone-info mb-3">
                <small className="text-muted">
                    <strong>Times shown in your local timezone:</strong> {getTimezoneAbbreviation(customerTimezone)}
                    {customerTimezone !== mentorTimezone && (
                        <span className="text-info ms-2">
                            (Mentor is in {getTimezoneAbbreviation(mentorTimezone)})
                        </span>
                    )}
                </small>
            </div>

            {/* Month Navigation */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button
                    className="btn btn-outline-primary"
                    onClick={handlePreviousMonth}
                    disabled={loading}
                >
                    &larr; Previous Month
                </button>
                <h4 className="mb-0">{format(currentDate, 'MMMM yyyy')}</h4>
                <button
                    className="btn btn-outline-primary"
                    onClick={handleNextMonth}
                    disabled={loading}
                >
                    Next Month &rarr;
                </button>
            </div>

            {/* Show message if no slots are available */}
            {availableSlots.length === 0 ? (
                <div className="alert alert-info">
                    <h5>No Available Times</h5>
                    <p className="mb-0">
                        {mentorName} doesn't have any available slots this month. 
                        Try selecting a different month or contact the mentor directly.
                    </p>
                </div>
            ) : (
                <>
                    {/* Calendar Grid - Using existing CSS classes */}
                    <div className="calendar-grid mb-4">
                        {/* Weekday Headers - Simple Bootstrap row approach */}
                        <div className="row mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="col text-center">
                                    <small className="text-muted font-weight-bold">{day}</small>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days - Using existing CSS class */}
                        <div className="calendar-days">
                            {getDaysInMonth().map(date => {
                                const daySlots = getAvailableSlotsForDate(date);
                                const hasSlots = daySlots.length > 0;
                                const unavailable = isDateUnavailable(date);
                                const unavailability = getUnavailabilityForDate(date);
                                const isSelected = selectedDate && isSameDay(date, selectedDate);

                                return (
                                    <div
                                        key={date.toString()}
                                        className={`calendar-day ${isSelected ? 'selected' : ''} ${hasSlots ? 'has-slots' : ''} ${unavailable && !hasSlots ? 'unavailable' : ''}`}
                                        onClick={() => hasSlots && handleDateClick(date)}
                                        title={unavailable && unavailability?.reason ? `Unavailable: ${unavailability.reason}` : ''}
                                    >
                                        <span className="day-number">{format(date, 'd')}</span>
                                        {hasSlots && (
                                            <small className="slot-count">
                                                {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                                            </small>
                                        )}
                                        {unavailable && !hasSlots && (
                                            <small className="unavailable-label">Unavailable</small>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend - Using existing CSS classes */}
                    <div className="calendar-legend mb-3">
                        <small className="text-muted d-flex align-items-center gap-3">
                            <span><span className="legend-dot available"></span> Available</span>
                            <span><span className="legend-dot unavailable"></span> Unavailable</span>
                        </small>
                    </div>

                    {/* Time Slots */}
                    {selectedDate && (
                        <div className="time-slots">
                            <h5 className="mb-3">
                                Available Times for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                <small className="text-muted ms-2">
                                    (in your local time: {getTimezoneAbbreviation(customerTimezone)})
                                </small>
                            </h5>
                            <div className="row g-2">
                                {getAvailableSlotsForDate(selectedDate).map((slot, index) => {
                                    // Convert UTC times to customer's local timezone for display
                                    const startTime = utcToZonedTime(new Date(slot.start_time), customerTimezone);
                                    const endTime = utcToZonedTime(new Date(slot.end_time), customerTimezone);

                                    return (
                                        <div key={index} className="col-md-4">
                                            <button
                                                className="btn btn-outline-primary w-100"
                                                onClick={() => handleSlotSelect(slot)}
                                            >
                                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                                {customerTimezone !== mentorTimezone && (
                                                    <div className="small text-muted">
                                                        ({format(utcToZonedTime(new Date(slot.start_time), mentorTimezone), 'h:mm a')} {getTimezoneAbbreviation(mentorTimezone)})
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                                {getAvailableSlotsForDate(selectedDate).length === 0 && (
                                    <p className="text-muted">No available slots for this date.</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

BookingCalendarWidget.propTypes = {
    mentorId: PropTypes.number.isRequired,
    mentorName: PropTypes.string.isRequired,
    onSelectSlot: PropTypes.func.isRequired,
    backendUrl: PropTypes.string
};

export default BookingCalendarWidget;