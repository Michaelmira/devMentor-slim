import React, { useEffect, useContext } from "react"
import { Context } from "../store/appContext"
import { MapPin, Star } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export const MentorList = () => {
    const { store, actions } = useContext(Context)
    const navigate = useNavigate()

    useEffect(() => {
        actions.getMentors();
    }, [])

    const handleNavigateToInstantSession = (mentorId) => {
        navigate(`/create-instant-session/${mentorId}`);
    };

    // Render star rating component using embedded data
    const renderStarRating = (mentor) => {
        const ratingData = mentor.rating_data;

        // Show unranked if no rating data or insufficient reviews
        if (!ratingData || !ratingData.has_rating) {
            return (
                <div className="d-flex align-items-center justify-content-center mb-2">
                    <div className="d-flex me-1">
                        {[...Array(5)].map((_, index) => (
                            <Star
                                key={index}
                                size={16}
                                className="text-muted"
                                fill="none"
                            />
                        ))}
                    </div>
                    <small className="text-muted ms-1">Unranked</small>
                </div>
            );
        }

        const { average_rating, total_reviews } = ratingData;
        
        // Additional safety checks
        if (typeof average_rating !== 'number' || isNaN(average_rating)) {
            return (
                <div className="d-flex align-items-center justify-content-center mb-2">
                    <div className="d-flex me-1">
                        {[...Array(5)].map((_, index) => (
                            <Star
                                key={index}
                                size={16}
                                className="text-muted"
                                fill="none"
                            />
                        ))}
                    </div>
                    <small className="text-muted ms-1">Unranked</small>
                </div>
            );
        }

        const filledStars = Math.floor(average_rating);
        const hasHalfStar = average_rating % 1 >= 0.5;

        return (
            <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="d-flex me-1">
                    {[...Array(5)].map((_, index) => {
                        if (index < filledStars) {
                            return (
                                <Star
                                    key={index}
                                    size={16}
                                    className="text-warning"
                                    fill="currentColor"
                                />
                            );
                        } else if (index === filledStars && hasHalfStar) {
                            return (
                                <div key={index} className="position-relative">
                                    <Star
                                        size={16}
                                        className="text-muted"
                                        fill="none"
                                    />
                                    <Star
                                        size={16}
                                        className="text-warning position-absolute"
                                        style={{
                                            top: 0,
                                            left: 0,
                                            clipPath: 'inset(0 50% 0 0)'
                                        }}
                                        fill="currentColor"
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <Star
                                    key={index}
                                    size={16}
                                    className="text-muted"
                                    fill="none"
                                />
                            );
                        }
                    })}
                </div>
                <small className="text-muted ms-1">
                    {average_rating.toFixed(1)} ({total_reviews || 0} review{(total_reviews || 0) !== 1 ? 's' : ''})
                </small>
            </div>
        );
    };

    return (
        <>
            <div className="container card border-secondary shadow border-2 px-0 mt-5">
                <div id="header" className="card-header bg-light-subtle mb-5">
                    <h1 className="text-center mt-5">Available Mentors</h1>
                </div>
                <div className="sessions-dashboard">
                    <div className="container-fluid">
                        <div className="row">
                            {store.mentors.map((mentor) => (
                                <div key={mentor.id} className="col-12 col-sm-6 col-md-4 col-lg-2.4 col-xl mb-4">
                                    <div className="card h-100">
                                        {/* Card Image - Make this clickable to mentor details */}
                                        <Link to={`/mentor-details/${mentor.id}`} className="text-decoration-none">
                                            <div className="card-img-top d-flex justify-content-center align-items-center" style={{ height: '200px', background: '#f8f9fa' }}>
                                                {mentor.profile_photo ? (
                                                    <div style={{ width: '150px', height: '150px' }}>
                                                        <img
                                                            src={mentor.profile_photo.image_url}
                                                            alt={`${mentor.first_name} ${mentor.last_name}`}
                                                            className="w-100 h-100 rounded-circle"
                                                            style={{ objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#e9ecef' }}></div>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="card-body">
                                            {/* Header Section - Make this clickable to mentor details */}
                                            <Link to={`/mentor-details/${mentor.id}`} className="text-decoration-none text-dark">
                                                <div className="row align-items-center justify-content-center mb-3">
                                                    <div className="col-auto">
                                                        <h3 className="mb-0 fs-5">
                                                            {mentor.first_name || mentor.last_name ?
                                                                `${mentor.first_name || ''} ${mentor.last_name || ''}`.trim() :
                                                                mentor.nick_name || 'Anonymous Mentor'
                                                            }
                                                        </h3>
                                                        {mentor.nick_name && (mentor.first_name || mentor.last_name) && (
                                                            <small className="text-muted">@{mentor.nick_name}</small>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Star Rating - Now using embedded data */}
                                            {renderStarRating(mentor)}

                                            {/* Location */}
                                            {(mentor.city || mentor.country) && (
                                                <div className="text-center mb-3">
                                                    <small className="text-muted d-flex align-items-center justify-content-center">
                                                        <MapPin size={12} className="me-1" />
                                                        {[mentor.city, mentor.country].filter(Boolean).join(', ')}
                                                    </small>
                                                </div>
                                            )}

                                            {/* Years of Experience */}
                                            {mentor.years_exp && (
                                                <div className="text-center mb-3">
                                                    <small className="text-muted">
                                                        {mentor.years_exp} years experience
                                                    </small>
                                                </div>
                                            )}

                                            {/* Price */}
                                            {mentor.price && (
                                                <div className="text-center mb-3">
                                                    <span className="badge bg-success">${mentor.price}/hour</span>
                                                </div>
                                            )}

                                            {/* Skills */}
                                            {mentor.skills && mentor.skills.length > 0 && (
                                                <div className="mb-3">
                                                    <label className="fw-bold mb-2 small">Skills</label>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {mentor.skills.map((skill, index) => (
                                                            <span
                                                                key={index}
                                                                className="badge bg-primary small"
                                                            >
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* About Me Preview */}
                                            {mentor.about_me && (
                                                <div className="mb-3">
                                                    <label className="fw-bold mb-1 small">About</label>
                                                    <p className="small text-muted mb-0" style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {mentor.about_me}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-footer bg-transparent">
                                            <div className="d-grid gap-2">
                                                <Link 
                                                    to={`/mentor-details/${mentor.id}`}
                                                    className="btn btn-primary btn-sm text-decoration-none"
                                                >
                                                    Book Session
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};