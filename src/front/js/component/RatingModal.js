import React, { useState } from 'react';
import { Star } from 'lucide-react';

const RatingModal = ({ booking, onSubmit, onClose }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [customerNotes, setCustomerNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Please select a rating between 1-5 stars');
            return;
        }

        setIsSubmitting(true);
        
        try {
            await onSubmit({
                rating,
                customer_notes: customerNotes
            });
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Failed to submit rating. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = () => {
        return [...Array(5)].map((_, index) => {
            const starNumber = index + 1;
            const isActive = starNumber <= (hoveredRating || rating);
            
            return (
                <Star
                    key={starNumber}
                    size={32}
                    className={`cursor-pointer transition-colors ${
                        isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                    onClick={() => setRating(starNumber)}
                    onMouseEnter={() => setHoveredRating(starNumber)}
                    onMouseLeave={() => setHoveredRating(0)}
                />
            );
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Rate Your Session
                    </h2>
                    <p className="text-gray-600">
                        How was your session with {booking?.mentor_name}?
                    </p>
                    <div className="text-sm text-gray-500 mt-2">
                        {booking?.session_start_time && new Date(booking.session_start_time).toLocaleDateString()} at {booking?.session_start_time && new Date(booking.session_start_time).toLocaleTimeString()}
                    </div>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center mb-6">
                    <div className="flex space-x-1">
                        {renderStars()}
                    </div>
                </div>

                {/* Rating Text */}
                {rating > 0 && (
                    <div className="text-center mb-4">
                        <span className="text-lg font-medium text-gray-700">
                            {rating === 1 && "Poor"}
                            {rating === 2 && "Fair"} 
                            {rating === 3 && "Good"}
                            {rating === 4 && "Very Good"}
                            {rating === 5 && "Excellent"}
                        </span>
                    </div>
                )}

                {/* Optional Notes */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Comments (Optional)
                    </label>
                    <textarea
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Share any feedback about your session..."
                        maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                        {customerNotes.length}/500 characters
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                            rating === 0 || isSubmitting
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </div>

                {/* Required Notice */}
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <div className="text-sm text-blue-800">
                        <strong>Rating Required:</strong> Please rate this session to move it to your history and access other features.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RatingModal;