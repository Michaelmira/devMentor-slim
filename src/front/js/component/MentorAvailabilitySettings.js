import React, { useState, useEffect, useContext } from 'react';
import { Context } from '../store/appContext';

const MentorAvailabilitySettings = () => {
    const { store, actions } = useContext(Context);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [unavailabilities, setUnavailabilities] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    }, []);

    // Warn user before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // UPDATED: Enhanced loadAvailability to also load unavailability
    const loadAvailability = async () => {
        setLoading(true);
        const result = await actions.getMentorAvailability();
        if (result.success) {
            setAvailabilities(result.availabilities || []);
            setSettings(result.settings || settings);
            // NEW: Also load unavailability data from the same endpoint
            setUnavailabilities(result.unavailabilities || []);
            setHasUnsavedChanges(false); // Reset unsaved changes flag
        } else {
            setMessage({ type: 'danger', text: 'Failed to load availability settings' });
        }
        setLoading(false);
    };

    // DEPRECATED: Keep loadUnavailability for backward compatibility, but it's no longer needed
    const loadUnavailability = async () => {
        console.warn("loadUnavailability is deprecated - data now loaded via loadAvailability");
        // This function is now redundant but kept for compatibility
        // The unavailability data is loaded in loadAvailability
    };

    // ENHANCED: Track changes for settings
    const handleSettingChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleAvailabilityChange = (newAvailabilities) => {
        setAvailabilities(newAvailabilities);
        setHasUnsavedChanges(true);
    };

    const handleUnavailabilityChange = (newUnavailabilities) => {
        setUnavailabilities(newUnavailabilities);
        setHasUnsavedChanges(true);
    };

    // UPDATED: Use the new change handlers
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

        const newAvailabilities = [...availabilities, { ...newSlot, id: Date.now() }];
        handleAvailabilityChange(newAvailabilities);
        setMessage({ type: 'success', text: 'Availability slot added (not saved yet)' });
    };

    const removeAvailabilitySlot = (index) => {
        const newAvailabilities = availabilities.filter((_, i) => i !== index);
        handleAvailabilityChange(newAvailabilities);
        setMessage({ type: 'info', text: 'Availability slot removed (not saved yet)' });
    };

    const addUnavailabilityPeriod = () => {
        if (!newUnavailability.start_date || !newUnavailability.start_time ||
            !newUnavailability.end_date || !newUnavailability.end_time) {
            setMessage({ type: 'warning', text: 'Please fill in all date and time fields' });
            return;
        }

        // Validate dates
        const startDate = new Date(`${newUnavailability.start_date}T${newUnavailability.start_time}`);
        const endDate = new Date(`${newUnavailability.end_date}T${newUnavailability.end_time}`);
        
        if (startDate >= endDate) {
            setMessage({ type: 'warning', text: 'End date/time must be after start date/time' });
            return;
        }

        const start_datetime = `${newUnavailability.start_date}T${newUnavailability.start_time}:00`;
        const end_datetime = `${newUnavailability.end_date}T${newUnavailability.end_time}:00`;

        // Create new unavailability object
        const newUnavail = {
            id: `temp_${Date.now()}`, // Temporary ID for frontend
            start_datetime,
            end_datetime,
            reason: newUnavailability.reason || '',
            isNew: true // Flag to track if this is a new item
        };

        const newUnavailabilities = [...unavailabilities, newUnavail];
        handleUnavailabilityChange(newUnavailabilities);
        setMessage({ type: 'success', text: 'Unavailability period added (not saved yet)' });

        // Reset form
        setNewUnavailability({
            start_date: '',
            start_time: '',
            end_date: '',
            end_time: '',
            reason: ''
        });
    };

    const removeUnavailability = (id) => {
        const newUnavailabilities = unavailabilities.filter(u => u.id !== id);
        handleUnavailabilityChange(newUnavailabilities);
        setMessage({ type: 'info', text: 'Unavailability period removed (not saved yet)' });
    };

    // ENHANCED: Save both availability and unavailability together with proper error handling
    const saveAvailability = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' }); // Clear any previous messages
        
        try {
            // Prepare comprehensive payload with both availability and unavailability
            const payload = {
                // Availability data (existing)
                availabilities: availabilities.map(({ id, ...slot }) => slot),
                
                // Calendar settings (existing)
                session_duration: settings.session_duration,
                buffer_time: settings.buffer_time,
                advance_booking_days: settings.advance_booking_days,
                minimum_notice_hours: settings.minimum_notice_hours,
                timezone: settings.timezone,
                
                // NEW: Unavailability data
                unavailabilities: unavailabilities.map(({ id, isNew, ...unavail }) => ({
                    start_datetime: unavail.start_datetime,
                    end_datetime: unavail.end_datetime,
                    reason: unavail.reason || ''
                }))
            };

            console.log("Sending combined payload:", payload);

            const result = await actions.setMentorAvailability(payload);

            if (result.success) {
                setMessage({ 
                    type: 'success', 
                    text: 'All availability settings saved successfully!' 
                });
                setHasUnsavedChanges(false);
                
                // Reload data to get proper IDs from backend and ensure consistency
                await loadAvailability();
                
                // Optional: Scroll to top to show success message
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
            } else {
                setMessage({ 
                    type: 'danger', 
                    text: result.message || 'Failed to save availability settings' 
                });
            }
        } catch (error) {
            console.error("Error in saveAvailability:", error);
            setMessage({ 
                type: 'danger', 
                text: 'An unexpected error occurred while saving. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    // NEW: Function to reset all changes (optional - for cancel functionality)
    const resetChanges = async () => {
        setHasUnsavedChanges(false);
        setMessage({ type: 'info', text: 'Changes discarded. Reloading original data...' });
        await loadAvailability();
    };

    const formatTime = (time) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatDateTime = (datetimeStr) => {
        const date = new Date(datetimeStr);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
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

    return (
        <div className="mentor-availability-settings">
            {/* Unsaved Changes Alert */}
            {hasUnsavedChanges && (
                <div className="alert alert-warning d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>
                        <strong>You have unsaved changes!</strong> Don't forget to click "Save All Settings" to apply your changes.
                    </div>
                    <button 
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        onClick={resetChanges}
                        disabled={loading}
                    >
                        Discard Changes
                    </button>
                </div>
            )}

            {/* Message Display */}
            {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
            )}

            {/* Calendar Settings */}
            <div className="card mb-4">
                <div className="card-header">
                    <h4>Calendar Settings</h4>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Session Duration (minutes)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={settings.session_duration}
                                    onChange={(e) => handleSettingChange('session_duration', parseInt(e.target.value))}
                                    min="15"
                                    max="240"
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Buffer Time (minutes)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={settings.buffer_time}
                                    onChange={(e) => handleSettingChange('buffer_time', parseInt(e.target.value))}
                                    min="0"
                                    max="60"
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Advance Booking (days)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={settings.advance_booking_days}
                                    onChange={(e) => handleSettingChange('advance_booking_days', parseInt(e.target.value))}
                                    min="1"
                                    max="90"
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Minimum Notice (hours)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={settings.minimum_notice_hours}
                                    onChange={(e) => handleSettingChange('minimum_notice_hours', parseInt(e.target.value))}
                                    min="1"
                                    max="168"
                                />
                            </div>
                        </div>
                        <div className="col-md-12">
                            <div className="mb-3">
                                <label className="form-label">Timezone</label>
                                <select
                                    className="form-select"
                                    value={settings.timezone}
                                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                                >
                                    {timezones.map(tz => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Availability */}
            <div className="card mb-4">
                <div className="card-header">
                    <h4>Weekly Availability</h4>
                </div>
                <div className="card-body">
                    <div className="mb-4">
                        <h5>Add Available Time Slot</h5>
                        <div className="row">
                            <div className="col-md-4">
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
                            <div className="col-md-2">
                                <div className="mb-3">
                                    <label className="form-label">&nbsp;</label>
                                    <button
                                        className="btn btn-primary d-block"
                                        onClick={addAvailabilitySlot}
                                    >
                                        ➕ Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5>Current Weekly Schedule</h5>
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

            {/* Time Off / Unavailability */}
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
                            <div className="col-md-8">
                                <div className="mb-3">
                                    <label className="form-label">Reason (optional)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g., Vacation, Conference, Personal time"
                                        value={newUnavailability.reason}
                                        onChange={(e) => setNewUnavailability({ ...newUnavailability, reason: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="mb-3">
                                    <label className="form-label">&nbsp;</label>
                                    <button
                                        className="btn btn-warning d-block"
                                        onClick={addUnavailabilityPeriod}
                                    >
                                        ➕ Add Time Off
                                    </button>
                                </div>
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
                                            {unavail.isNew && <span className="badge bg-warning text-dark ms-2">Not saved yet</span>}
                                        </div>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => removeUnavailability(unavail.id)}
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="card">
                <div className="card-body">
                    <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                        {hasUnsavedChanges && (
                            <button
                                className="btn btn-outline-secondary me-md-2"
                                onClick={resetChanges}
                                disabled={loading}
                            >
                                Discard Changes
                            </button>
                        )}
                        <button
                            className={`btn ${hasUnsavedChanges ? 'btn-success' : 'btn-primary'} btn-lg`}
                            onClick={saveAvailability}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : hasUnsavedChanges ? (
                                'Save All Settings ⚠️'
                            ) : (
                                'Save All Settings'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview */}
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
                    {unavailabilities.length > 0 && (
                        <div>
                            <p className="mt-3">Time off periods: <span className="badge bg-warning text-dark">{unavailabilities.length}</span></p>
                        </div>
                    )}
                    {availabilities.length > 0 && (
                        <div>
                            <p className="mt-3">Weekly availability slots: <span className="badge bg-success">{availabilities.length}</span></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorAvailabilitySettings;