/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { Modal, Button } from 'react-bootstrap'
import { FaCommentDots, FaHeart, FaMagic, FaQuoteLeft } from 'react-icons/fa'
import { trackDonationButton } from '../../utils/donationService'
import '../common.css'

const QUOTES = [
  'Good tools stay reliable when good users support the work behind them.',
  'Your support helps PNUT ship faster fixes and cleaner downloads.',
  'A small thank-you can become the next platform, polish pass, or bug fix.',
  'If PNUT saved your time, sending a little support helps keep it improving.',
  'Free to use does not mean free to build. Your support keeps the roadmap moving.',
  'Every contribution helps turn daily maintenance into better product work.',
  'Your feedback shapes the app. Your support helps keep it shipping.'
]

const IMPACT_POINTS = ['Faster fixes', 'New platforms', 'Cleaner downloads']

const FEEDBACK_URL =
  'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform?edit_requested=true'

function DonationModal({ isOpen, onClose, onDonate, donationUrl }) {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])
  const donationTargetUrl = donationUrl || 'https://ko-fi.com/pnutdownloader'

  const handleMaybeLater = () => {
    trackDonationButton({
      button: 'maybe_later',
      label: 'Maybe later',
      targetUrl: null
    })
    onClose()
  }

  const handleFeedback = () => {
    trackDonationButton({
      button: 'feedback',
      label: 'Feedback',
      targetUrl: FEEDBACK_URL
    })

    if (window.api) {
      window.api.trackEvent('donation_modal_feedback_clicked')
      window.api.openExternal(FEEDBACK_URL)
      return
    }

    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer')
  }

  const handleSupport = () => {
    trackDonationButton({
      button: 'support',
      label: 'Support',
      targetUrl: donationTargetUrl
    })
    onDonate?.()
  }

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      className="pnut-modal custom-login-modal donation-modal"
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
        <button type="button" className="custom-close-button" onClick={onClose} aria-label="Close">
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
          onClick={handleMaybeLater}
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
          onClick={handleSupport}
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
