import { useMemo } from 'react'
import { Modal, Button } from 'react-bootstrap'
import { FaCommentDots, FaHeart, FaMagic, FaQuoteLeft } from 'react-icons/fa'
import '../common.css'

const QUOTES = [
  'The best things in life are free — but a coffee keeps the developer happy. ☕',
  'Great software is built one donation at a time. 🚀',
  "Every download you make, every byte you take — I'll be coding for you. 🎵",
  "You didn't just download a file, you downloaded someone's weekend. 😄",
  "Free to use, but pizza isn't free. Help a dev out! 🍕",
  'Behind every great app is a developer surviving on caffeine. ☕',
  "Your support today powers tomorrow's features. 💡",
  'Small donations, big dreams. 🌟',
  'Even superheroes need a sidekick. Be mine — donate! 🦸',
  "You clicked download. Now click donate. You're on a roll! 🎯",
  'A tiny thank-you can turn into the next big feature. ✨',
  'If PNUT saved your time, send a little fuel back to the engine. ⚡',
  'Good tools stay alive when good users speak up and support them. 💛',
  'Your feedback shapes the app. Your support keeps it shipping. 🛠️',
  'One click downloaded the file. One kind gesture helps build the next release. 🌱',
  'No pressure, just appreciation. Every bit helps PNUT grow. 🥜',
  'The app is free, but better updates need real-world fuel. ☕'
]

const IMPACT_POINTS = ['Faster fixes', 'New platforms', 'Cleaner downloads']

const FEEDBACK_URL =
  'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform?edit_requested=true'

function DonationModal({ isOpen, onClose, onDonate }) {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [isOpen])

  const handleFeedback = () => {
    if (window.api) {
      window.api.trackEvent('donation_modal_feedback_clicked')
      window.api.openExternal(FEEDBACK_URL)
      return
    }

    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      className="custom-login-modal"
      backdrop="static"
      keyboard={false}
      aria-labelledby="donation-modal-title"
      role="dialog"
      size="md"
      animation={true}
    >
      <Modal.Header className="custom-modal-header donation-modal__header">
        <Modal.Title id="donation-modal-title" className="custom-modal-title">
          <span className="donation-modal__title-icon">
            <FaHeart />
          </span>
          Support PNUT
        </Modal.Title>
        <button
          type="button"
          className="custom-close-button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </Modal.Header>
      <Modal.Body className="custom-modal-body donation-modal__body">
        <div className="donation-modal__badge">
          <FaMagic />
          Keep PNUT improving
        </div>
        <p className="modal-message">
          Your download is done. If PNUT helps you, you can support future updates.
        </p>
        <div className="modal-quote donation-modal__quote">
          <FaQuoteLeft className="donation-modal__quote-icon" />
          <span>{quote}</span>
        </div>
        <div className="donation-modal__impact" aria-label="Support impact">
          {IMPACT_POINTS.map((point) => (
            <span key={point}>{point}</span>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer className="custom-modal-footer donation-modal__footer">
        <Button
          onClick={onClose}
          className="custom-cancel-button donation-later-button"
          aria-label="Maybe later, I still appreciate PNUT"
          variant="secondary"
        >
          <FaHeart />
          <span>
            Maybe later
            <small>I still appreciate PNUT</small>
          </span>
        </Button>
        <Button
          onClick={handleFeedback}
          className="donation-feedback-button"
          aria-label="Send Feedback"
          variant="secondary"
        >
          <FaCommentDots />
          Feedback
        </Button>
        <Button
          onClick={onDonate}
          className="custom-login-button donation-support-button"
          aria-label="Donate"
          variant="primary"
        >
          Support
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default DonationModal
