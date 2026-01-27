
import React, { useState } from 'react';
import { FaStar, FaTimes } from 'react-icons/fa';
import { saveFeedback } from '../../utils/firestoreService';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [rating, setRating] = useState(0);
    const [suggestion, setSuggestion] = useState('');
    const [name, setName] = useState('');
    const [hover, setHover] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setMessage('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await saveFeedback({
                rating,
                suggestion,
                name,
                timestamp: new Date().toISOString()
            });
            setMessage('Thank you for your feedback!');
            setTimeout(() => {
                setRating(0);
                setSuggestion('');
                setName('');
                setMessage('');
                setIsSubmitting(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setMessage('Failed to submit feedback. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="feedback-modal-overlay">
            <div className="feedback-modal-content">
                <button className="feedback-modal-close" onClick={onClose}>
                    <FaTimes />
                </button>

                <h2 className="feedback-modal-title">We value your feedback!</h2>
                <p className="feedback-modal-subtitle">
                    Please rate your experience and let us know how we can improve.
                </p>

                <input
                    type="text"
                    className="feedback-name-input"
                    placeholder="Your name (Optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <div className="feedback-rating-container">
                    {[...Array(5)].map((star, index) => {
                        const ratingValue = index + 1;
                        return (
                            <label key={index}>
                                <input
                                    type="radio"
                                    name="rating"
                                    value={ratingValue}
                                    onClick={() => setRating(ratingValue)}
                                    style={{ display: 'none' }}
                                />
                                <FaStar
                                    className="feedback-star"
                                    color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                                    size={30}
                                    onMouseEnter={() => setHover(ratingValue)}
                                    onMouseLeave={() => setHover(null)}
                                />
                            </label>
                        );
                    })}
                </div>

                <textarea
                    className="feedback-textarea"
                    placeholder="Any suggestions or issues? (Optional)"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    rows="4"
                />

                {message && <div className={`feedback-message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

                <button
                    className="feedback-submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </div>
        </div>
    );
};

export default FeedbackModal;
