import React, { useState, useEffect, useContext } from 'react';
import { Context } from '../store/appContext';

const MentorAvailabilitySettings = () => {
    const { store, actions } = useContext(Context);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [unavailabilities, setUnavailabilities] = useState([]);

    const [settings, setSettings] = useState({
        session_duration: 60,
        buffer_time: 15,
        advance_booking_days: 30,
        minimum_notice_hours: 24,
        timezone: 'America/Los_Angeles'
    });

    const [availabilities, setAvailabilities] = useState([]);
    const [newSlot, setNewSlot] = useState({
        day_of_week: 0,
        start_time: '09:00',
        end_time: '17:00'
    });

    const [newUnavailability, setNewUnavailability] = useState({
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        reason: ''
    });

    const daysOfWeek = [
        { value: 0, label: 'Monday' },
        { value: 1, label: 'Tuesday' },
        { value: 2, label: 'Wednesday' },
        { value: 3, label: 'Thursday' },
        { value: 4, label: 'Friday' },
        { value: 5, label: 'Saturday' },
        { value: 6, label: 'Sunday' }
    ];

    const timezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Phoenix',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney'
    ];

    useEffect(() => {
        loadAvailability();
        loadUnavailability();
    }, []);

    const loadAvailability = async () => {
        setLoading(true);
        const result = await actions.getMentorAvailability();
        if (result.success) {
            setAvailabilities(result.availabilities || []);
            setSettings(result.settings || settings);
        } else {
            setMessage({ type: 'danger', text: 'Failed to load availability settings' });
        }
        setLoading(false);
    };

    const loadUnavailability = async () => {
        const result = await actions.getMentorUnavailability();
        if (result.success) {
            setUnavailabilities(result.unavailabilities || []);
        }
    };

    const addAvailabilitySlot = () => {
        // Check for overlapping slots
        const daySlots = availabilities.filter(a => a.day_of_week === newSlot.day_of_week);
        const hasOverlap = daySlots.some(slot => {
            const newStart = newSlot.start_time;
            const newEnd = newSlot.end_time;
            const existingStart = slot.start_time;
            const existingEnd = slot.end_time;

            return (newStart < existingEnd && newEnd > existingStart);
        });

        if (hasOverlap) {
            setMessage({ type: 'warning', text: 'This time slot overlaps with an existing slot' });
            return;
        }

        setAvailabilities([...availabilities, { ...newSlot, id: Date.now() }]);
        setMessage({ type: 'success', text: 'Availability slot added' });
    };

    const removeAvailabilitySlot = (index) => {
        setAvailabilities(availabilities.filter((_, i) => i !== index));
    };

    const addUnavailabilityPeriod = async () => {
        if (!newUnavailability.start_date || !newUnavailability.start_time ||
            !newUnavailability.end_date || !newUnavailability.end_time) {
            setMessage({ type: 'warning', text: 'Please fill in all date and time fields' });
            return;
        }

        const start_datetime = `${newUnavailability.start_date}T${newUnavailability.start_time}:00`;
        const end_datetime = `${newUnavailability.end_date}T${newUnavailability.end_time}:00`;

        const result = await actions.addMentorUnavailability({
            start_datetime,
            end_datetime,
            reason: newUnavailability.reason
        });

        if (result.success) {
            setMessage({ type: 'success', text: 'Unavailability period added' });
            loadUnavailability();
            setNewUnavailability({
                start_date: '',
                start_time: '',
                end_date: '',
                end_time: '',
                reason: ''
            });
        } else {
            setMessage({ type: 'danger', text: 'Failed to add unavailability' });
        }
    };

    const removeUnavailability = async (id) => {
        const result = await actions.removeMentorUnavailability(id);
        if (result.success) {
            setMessage({ type: 'success', text: 'Unavailability removed' });
            loadUnavailability();
        } else {
            setMessage({ type: 'danger', text: 'Failed to remove unavailability' });
        }
    };

    const saveAvailability = async () => {
        setLoading(true);
        const result = await actions.setMentorAvailability({
            availabilities: availabilities.map(({ id, ...slot }) => slot),
            ...settings
        });

        if (result.success) {
            setMessage({ type: 'success', text: 'Availability settings saved successfully!' });
            await loadAvailability();
        } else {
            setMessage({ type: 'danger', text: 'Failed to save availability settings' });
        }
        setLoading(false);
    };

    const formatTime = (time) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="container py-5">
            <h2 className="mb-4">Calendar Availability Settings</h2>

            {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
            )}

            <div className="row">
                <div className="col-lg-8">
                    <div className="card mb-4">
                        <div className="card-header">
                            <h4>Weekly Availability</h4>
                        </div>
                        <div className="card-body">
                            <div className="mb-4">
                                <h5>Add Availability Slot</h5>
                                <div className="row align-items-end">
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">Day</label>
                                            <select
                                                className="form-select"
                                                value={newSlot.day_of_week}
                                                onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                                            >
                                                {daysOfWeek.map(day => (
                                                    <option key={day.value} value={day.value}>{day.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">Start Time</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={newSlot.start_time}
                                                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">End Time</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={newSlot.end_time}
                                                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <button
                                            className="btn btn-primary w-100 mb-3"
                                            onClick={addAvailabilitySlot}
                                        >
                                            ➕ Add Slot
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h5>Current Availability</h5>
                                {availabilities.length === 0 ? (
                                    <div className="alert alert-info">
                                        No availability set. Add your available time slots above.
                                    </div>
                                ) : (
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Day</th>
                                                <th>Start Time</th>
                                                <th>End Time</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {availabilities
                                                .sort((a, b) => a.day_of_week - b.day_of_week)
                                                .map((slot, index) => (
                                                    <tr key={index}>
                                                        <td>{daysOfWeek.find(d => d.value === slot.day_of_week)?.label}</td>
                                                        <td>{formatTime(slot.start_time)}</td>
                                                        <td>{formatTime(slot.end_time)}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => removeAvailabilitySlot(index)}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-header">
                            <h4>Time Off / Unavailability</h4>
                        </div>
                        <div className="card-body">
                            <div className="mb-4">
                                <h5>Add Time Off</h5>
                                <div className="row">
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">Start Date</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={newUnavailability.start_date}
                                                onChange={(e) => setNewUnavailability({ ...newUnavailability, start_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">Start Time</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={newUnavailability.start_time}
                                                onChange={(e) => setNewUnavailability({ ...newUnavailability, start_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">End Date</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={newUnavailability.end_date}
                                                onChange={(e) => setNewUnavailability({ ...newUnavailability, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="mb-3">
                                            <label className="form-label">End Time</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={newUnavailability.end_time}
                                                onChange={(e) => setNewUnavailability({ ...newUnavailability, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="mb-3">
                                            <label className="form-label">Reason (optional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g., Vacation, Conference, etc."
                                                value={newUnavailability.reason}
                                                onChange={(e) => setNewUnavailability({ ...newUnavailability, reason: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <button
                                            className="btn btn-warning"
                                            onClick={addUnavailabilityPeriod}
                                        >
                                            ➕ Add Time Off
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {unavailabilities.length > 0 && (
                                <div>
                                    <h5>Scheduled Time Off</h5>
                                    <div className="list-group">
                                        {unavailabilities.map((unavail) => (
                                            <div key={unavail.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>{formatDateTime(unavail.start_datetime)}</strong> to <strong>{formatDateTime(unavail.end_datetime)}</strong>
                                                    {unavail.reason && <div className="text-muted small">{unavail.reason}</div>}
                                                </div>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => removeUnavailability(unavail.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card mb-4">
                        <div className="card-header">
                            <h4>Calendar Settings</h4>
                        </div>
                        <div className="card-body">
                            <form>
                                <div className="mb-3">
                                    <label className="form-label">
                                        ⏰ Session Duration (minutes)
                                    </label>
                                    <select
                                        className="form-select"
                                        value={settings.session_duration}
                                        onChange={(e) => setSettings({ ...settings, session_duration: parseInt(e.target.value) })}
                                    >
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Buffer Time Between Sessions (minutes)</label>
                                    <select
                                        className="form-select"
                                        value={settings.buffer_time}
                                        onChange={(e) => setSettings({ ...settings, buffer_time: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>No buffer</option>
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>1 hour</option>
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Advance Booking (days)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={1}
                                        max={365}
                                        value={settings.advance_booking_days}
                                        onChange={(e) => setSettings({ ...settings, advance_booking_days: parseInt(e.target.value) })}
                                    />
                                    <div className="form-text">
                                        How far in advance can customers book?
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Minimum Notice (hours)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={1}
                                        max={168}
                                        value={settings.minimum_notice_hours}
                                        onChange={(e) => setSettings({ ...settings, minimum_notice_hours: parseInt(e.target.value) })}
                                    />
                                    <div className="form-text">
                                        Minimum hours before a session can be booked
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Timezone</label>
                                    <select
                                        className="form-select"
                                        value={settings.timezone}
                                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="d-grid gap-2">
                        <button
                            className="btn btn-success btn-lg"
                            onClick={saveAvailability}
                            disabled={loading || availabilities.length === 0}
                        >
                            💾 {loading ? 'Saving...' : 'Save All Settings'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card mt-4">
                <div className="card-header">
                    <h4>Preview</h4>
                </div>
                <div className="card-body">
                    <p>Your customers will be able to book:</p>
                    <ul>
                        <li><span className="badge bg-info">{settings.session_duration} minute</span> sessions</li>
                        <li>Up to <span className="badge bg-info">{settings.advance_booking_days} days</span> in advance</li>
                        <li>With at least <span className="badge bg-info">{settings.minimum_notice_hours} hours</span> notice</li>
                        <li>In <span className="badge bg-info">{settings.timezone}</span> timezone</li>
                        {settings.buffer_time > 0 && (
                            <li>With <span className="badge bg-info">{settings.buffer_time} minute</span> breaks between sessions</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MentorAvailabilitySettings; 