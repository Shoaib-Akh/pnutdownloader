/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import {
  FaBug,
  FaCheckCircle,
  FaDesktop,
  FaEnvelopeOpenText,
  FaLightbulb,
  FaPaperPlane,
  FaRegStar,
  FaSmile,
  FaSpinner,
  FaStar,
  FaTimes
} from 'react-icons/fa'
import {
  flushQueuedFeedback,
  getFeedbackDeviceContext,
  getQueuedFeedbackCount,
  saveUserFeedback
} from '../../utils/feedbackService'
import './FeedbackModal.css'

const FEEDBACK_CATEGORIES = [
  { id: 'review', label: 'Review', icon: FaSmile },
  { id: 'issue', label: 'Issue', icon: FaBug },
  { id: 'idea', label: 'Idea', icon: FaLightbulb }
]

const getRatingLabel = (rating) => {
  if (rating >= 5) return 'Excellent'
  if (rating === 4) return 'Good'
  if (rating === 3) return 'Okay'
  if (rating === 2) return 'Needs work'
  if (rating === 1) return 'Poor'
  return 'Tap to rate'
}

const FeedbackModal = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('review')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [hoverRating, setHoverRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState(null)
  const [queuedCount, setQueuedCount] = useState(0)
  const [deviceContext, setDeviceContext] = useState(() => getFeedbackDeviceContext())

  useEffect(() => {
    if (!isOpen) return undefined

    let isCancelled = false
    setDeviceContext(getFeedbackDeviceContext())
    setQueuedCount(getQueuedFeedbackCount())

    flushQueuedFeedback()
      .then((result) => {
        if (isCancelled) return
        setQueuedCount(result.remaining)
        if (result.sent > 0) {
          setStatus({
            type: 'success',
            text: `Synced ${result.sent} saved ${result.sent === 1 ? 'review' : 'reviews'}.`
          })
        }
      })
      .catch(() => {
        if (!isCancelled) setQueuedCount(getQueuedFeedbackCount())
      })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      isCancelled = true
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const resetForm = () => {
    setRating(0)
    setCategory('review')
    setMessage('')
    setName('')
    setEmail('')
    setHoverRating(0)
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (rating === 0) {
      setStatus({ type: 'error', text: 'Choose a star rating first.' })
      return
    }

    setIsSubmitting(true)
    setStatus(null)

    try {
      const result = await saveUserFeedback({
        rating,
        category,
        message,
        name,
        email
      })

      setQueuedCount(getQueuedFeedbackCount())
      window.api?.trackEvent?.('feedback_submitted', { rating, category, queued: result.queued })

      if (result.queued) {
        setStatus({
          type: 'queued',
          text: 'Saved on this device. It will send to Supabase when the connection is ready.'
        })
      } else {
        setStatus({ type: 'success', text: 'Thanks. Your review was sent.' })
      }

      window.setTimeout(
        () => {
          resetForm()
          setStatus(null)
          setIsSubmitting(false)
          onClose()
        },
        result.queued ? 2600 : 1600
      )
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setStatus({
        type: 'error',
        text: error.message || 'Could not submit feedback. Try again.'
      })
      setIsSubmitting(false)
    }
  }

  const visibleRating = hoverRating || rating
  const shortDeviceId = deviceContext.deviceId
    ? `${deviceContext.deviceId.slice(0, 8)}...${deviceContext.deviceId.slice(-4)}`
    : 'Unknown'

  return (
    <div className="feedback-modal-overlay" onMouseDown={handleOverlayClick}>
      <form className="feedback-modal" onSubmit={handleSubmit}>
        <button
          type="button"
          className="feedback-modal__close"
          onClick={handleClose}
          aria-label="Close feedback"
          disabled={isSubmitting}
        >
          <FaTimes />
        </button>

        <div className="feedback-modal__header">
          <span className="feedback-modal__icon" aria-hidden="true">
            <FaEnvelopeOpenText />
          </span>
          <div>
            <h2 className="feedback-modal-title">Review PNUT</h2>
            <p className="feedback-modal__subtitle">
              Share what worked, what broke, or what should come next.
            </p>
          </div>
        </div>

        <div className="feedback-modal__section">
          <div className="feedback-modal__section-heading">
            <span>Experience</span>
            <strong>{getRatingLabel(visibleRating)}</strong>
          </div>
          <div className="feedback-modal__stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((ratingValue) => {
              const isActive = ratingValue <= visibleRating
              const StarIcon = isActive ? FaStar : FaRegStar

              return (
                <button
                  key={ratingValue}
                  type="button"
                  className={`feedback-modal__star ${isActive ? 'is-active' : ''}`}
                  onClick={() => setRating(ratingValue)}
                  onMouseEnter={() => setHoverRating(ratingValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${ratingValue} star${ratingValue > 1 ? 's' : ''} - ${getRatingLabel(ratingValue)}`}
                  aria-checked={rating === ratingValue}
                  role="radio"
                >
                  <StarIcon aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="feedback-modal__categories" aria-label="Feedback type">
          {FEEDBACK_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`feedback-modal__category ${category === item.id ? 'is-selected' : ''}`}
              onClick={() => setCategory(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* <div className="feedback-modal__device" aria-label="Detected review device">
          <div className="feedback-modal__device-heading">
            <FaDesktop />
            <span>Detected device</span>
          </div>
          <div className="feedback-modal__device-grid">
            <div>
              <span>Platform</span>
              <strong>{deviceContext.deviceLabel}</strong>
            </div>
            <div>
              <span>Review from</span>
              <strong>{deviceContext.reviewSurface}</strong>
            </div>
            <div>
              <span>Device ID</span>
              <strong>{shortDeviceId}</strong>
            </div>
          </div>
        </div> */}

        <label className="feedback-modal__field">
          <span>Message</span>
          <textarea
            className="feedback-modal__textarea"
            placeholder="Write your review, issue, or idea..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows="5"
            maxLength={1200}
          />
        </label>

        <div className="feedback-modal__contact-grid">
          <label className="feedback-modal__field">
            <span>Name</span>
            <input
              type="text"
              className="feedback-modal__input"
              placeholder="Optional"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
            />
          </label>

          <label className="feedback-modal__field">
            <span>Email</span>
            <input
              type="email"
              className="feedback-modal__input"
              placeholder="Optional"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={120}
            />
          </label>
        </div>

        {(status || queuedCount > 0) && (
          <div className={`feedback-modal__status ${status?.type || 'queued'}`} role="status">
            {status?.type === 'success' ? <FaCheckCircle /> : null}
            <span>
              {status?.text ||
                `${queuedCount} saved ${queuedCount === 1 ? 'review is' : 'reviews are'} waiting to sync.`}
            </span>
          </div>
        )}

        <button type="submit" className="feedback-modal__submit" disabled={isSubmitting}>
          {isSubmitting ? <FaSpinner className="feedback-modal__spinner" /> : <FaPaperPlane />}
          <span>{isSubmitting ? 'Sending' : 'Send Review'}</span>
        </button>
      </form>
    </div>
  )
}

export default FeedbackModal
