import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";

const RatingDisplay = ({ mentorId, showInSidebar = false }) => {
    const { actions } = useContext(Context);
    const [ratingData, setRatingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                setLoading(true);
                const result = await actions.getMentorRatings(mentorId);

                if (result.success) {
                    setRatingData({
                        averageRating: result.averageRating,
                        totalReviews: result.totalReviews,
                        ratingDistribution: result.ratingDistribution
                    });
                } else {
                    // If not enough reviews, still show it's not an error
                    if (result.message && result.message.includes("Not enough reviews")) {
                        setRatingData(null);
                    } else {
                        setError(result.message || 'Failed to load ratings');
                    }
                }
            } catch (error) {
                console.error('Error fetching ratings:', error);
                setError('Error loading ratings');
            } finally {
                setLoading(false);
            }
        };

        if (mentorId) {
            fetchRatings();
        }
    }, [mentorId, actions]);

    const renderStars = (rating, size = 'normal') => {
        const starSize = size === 'large' ? 'fs-4' : size === 'small' ? 'small' : '';

        return (
            <span className={`rating-stars ${starSize}`}>
                {[...Array(5)].map((_, index) => (
                    <span
                        key={index}
                        className={index < Math.floor(rating) ? 'text-warning' : 'text-muted'}
                        style={{ fontSize: size === 'large' ? '1.5rem' : size === 'small' ? '0.9rem' : '1rem' }}
                    >
                        ★
                    </span>
                ))}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                Loading ratings...
            </div>
        );
    }

    if (error) {
        return null; // Don't show errors to customers
    }

    if (!ratingData) {
        return null; // Don't show anything if not enough reviews
    }

    // Sidebar version (compact)
    if (showInSidebar) {
        return (
            <div className="rating-display-sidebar mb-3">
                <div className="d-flex align-items-center">
                    {renderStars(ratingData?.averageRating || 0)}
                    <span className="ms-2 text-muted">
                        {ratingData.averageRating.toFixed(1)} ({ratingData.totalReviews} reviews)
                    </span>
                </div>
            </div>
        );
    }

    // Main detailed version
    return (
        <div className="rating-display-detailed">
            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">
                        <i className="fas fa-star text-warning me-2"></i>
                        Student Reviews
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-4 text-center">
                            <div className="rating-summary">
                                <h2 className="display-4 text-warning mb-0">
                                    {ratingData?.averageRating?.toFixed(1) || '0.0'}
                                </h2>
                                <div className="mb-2">
                                    {renderStars(ratingData.averageRating, 'large')}
                                </div>
                                <small className="text-muted">
                                    Based on {ratingData.totalReviews} review{ratingData.totalReviews !== 1 ? 's' : ''}
                                </small>
                            </div>
                        </div>
                        <div className="col-md-8">
                            <div className="rating-breakdown">
                                {[5, 4, 3, 2, 1].map(rating => {
                                    const count = ratingData?.ratingDistribution?.[rating.toString()] || 0;
                                    const percentage = ratingData.totalReviews > 0
                                        ? (count / ratingData.totalReviews) * 100
                                        : 0;

                                    return (
                                        <div key={rating} className="d-flex align-items-center mb-2">
                                            <span className="me-2" style={{ minWidth: '60px' }}>
                                                {rating} star{rating !== 1 ? 's' : ''}
                                            </span>
                                            <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                                <div
                                                    className="progress-bar bg-warning"
                                                    role="progressbar"
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-muted" style={{ minWidth: '30px' }}>
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RatingDisplay;