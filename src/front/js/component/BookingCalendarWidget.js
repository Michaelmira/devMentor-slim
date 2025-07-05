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
    const [timezone, setTimezone] = useState('America/Los_Angeles');

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
            setTimezone(data.timezone || 'America/Los_Angeles');
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
            start_time: slot.start_time, // ISO datetime string from backend
            end_time: slot.end_time, // ISO datetime string from backend
            duration: slot.duration || durationMinutes || 60, // Duration in minutes
            timezone: timezone,
            // Additional useful data
            formatted_date: format(startTime, 'EEEE, MMMM d, yyyy'),
            formatted_start_time: format(utcToZonedTime(startTime, timezone), 'h:mm a'),
            formatted_end_time: format(utcToZonedTime(endTime, timezone), 'h:mm a'),
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
            {!loading && availableSlots.length === 0 && !error && (
                <div className="alert alert-info" role="alert">
                    <h5 className="alert-heading">No Available Time Slots</h5>
                    <p>This mentor hasn't set up any available time slots for {format(currentDate, 'MMMM yyyy')}.</p>
                    <hr />
                    <p className="mb-0">Try checking other months or contact the mentor directly.</p>
                </div>
            )}

            {/* Calendar Grid */}
            {availableSlots.length > 0 && (
                <>
                    <div className="calendar-grid mb-4">
                        {/* Weekday Headers */}
                        <div className="row mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="col text-center">
                                    <small className="text-muted">{day}</small>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="calendar-days">
                            {getDaysInMonth().map((date, index) => {
                                const daySlots = getAvailableSlotsForDate(date);
                                const isSelected = selectedDate && isSameDay(date, selectedDate);
                                const hasSlots = daySlots.length > 0;
                                const unavailable = isDateUnavailable(date);
                                const unavailability = getUnavailabilityForDate(date);

                                return (
                                    <div
                                        key={date.toISOString()}
                                        className={`calendar-day ${isSelected ? 'selected' : ''} ${hasSlots ? 'has-slots' : ''} ${unavailable ? 'unavailable' : ''}`}
                                        onClick={() => hasSlots && handleDateClick(date)}
                                        style={{ cursor: hasSlots ? 'pointer' : 'default' }}
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

                    {/* Legend */}
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
                            </h5>
                            <div className="row g-2">
                                {getAvailableSlotsForDate(selectedDate).map((slot, index) => {
                                    const startTime = utcToZonedTime(new Date(slot.start_time), timezone);
                                    const endTime = utcToZonedTime(new Date(slot.end_time), timezone);

                                    return (
                                        <div key={index} className="col-md-4">
                                            <button
                                                className="btn btn-outline-primary w-100"
                                                onClick={() => handleSlotSelect(slot)}
                                            >
                                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
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