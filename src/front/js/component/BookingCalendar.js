import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'en-US': require('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export const BookingCalendar = ({ mentorId, onSlotSelect }) => {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);

    useEffect(() => {
        fetchAvailableSlots();
    }, [mentorId]);

    const fetchAvailableSlots = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + `/api/mentor/${mentorId}/available-slots`);
            const data = await response.json();

            if (response.ok) {
                const slots = data.slots.map(slot => ({
                    ...slot,
                    start: new Date(slot.start),
                    end: new Date(slot.end)
                }));
                setAvailableSlots(slots);
            } else {
                setError(data.msg || 'Failed to load available slots');
            }
        } catch (err) {
            setError('Error loading available slots');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSlot = (slot) => {
        setSelectedSlot(slot);
        if (onSlotSelect) {
            onSlotSelect(slot);
        }
    };

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="container">
            <div className="card">
                <div className="card-body">
                    <Calendar
                        localizer={localizer}
                        events={availableSlots}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 500 }}
                        selectable
                        onSelectSlot={handleSelectSlot}
                        views={['month', 'week', 'day']}
                        defaultView="week"
                        min={new Date(new Date().setHours(8, 0, 0))}
                        max={new Date(new Date().setHours(20, 0, 0))}
                        formats={{
                            timeGutterFormat: 'HH:mm',
                            eventTimeRangeFormat: ({ start, end }) => {
                                return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
                            }
                        }}
                    />
                </div>
            </div>

            {selectedSlot && (
                <div className="mt-4">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">Selected Time Slot</h5>
                            <p className="card-text">
                                Start: {format(selectedSlot.start, 'PPpp')}<br />
                                End: {format(selectedSlot.end, 'PPpp')}
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => onSlotSelect(selectedSlot)}
                            >
                                Confirm Selection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 