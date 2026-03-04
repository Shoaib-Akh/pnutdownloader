import React, { useMemo } from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../common.css';

const QUOTES = [
  "\"The best things in life are free — but a coffee keeps the developer happy. ☕\"",
  "\"Great software is built one donation at a time. 🚀\"",
  "\"Every download you make, every byte you take — I'll be coding for you. 🎵\"",
  "\"You didn't just download a file, you downloaded someone's weekend. 😄\"",
  "\"Free to use, but pizza isn't free. Help a dev out! 🍕\"",
  "\"Behind every great app is a developer surviving on caffeine. ☕\"",
  "\"Your support today powers tomorrow's features. 💡\"",
  "\"Small donations, big dreams. 🌟\"",
  "\"Even superheroes need a sidekick. Be mine — donate! 🦸\"",
  "\"You clicked download. Now click donate. You're on a roll! 🎯\""
];

function DonationModal({ isOpen, onClose, onDonate }) {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [isOpen]);

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
      <Modal.Header className="custom-modal-header">
        <Modal.Title id="donation-modal-title" className="custom-modal-title">
          Support PNUTDownloader
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
      <Modal.Body className="custom-modal-body">
        <p className="modal-message">
          Your download is complete! If this app helps you, you can buy me a coffee or make a
          small donation to support future development.
        </p>
        <p className="modal-quote">
          {quote}
        </p>
      </Modal.Body>
      <Modal.Footer className="custom-modal-footer">
        <Button
          onClick={onClose}
          className="custom-cancel-button"
          aria-label="Maybe Later"
          variant="secondary"
        >
          Maybe Later
        </Button>
        <Button
          onClick={onDonate}
          className="custom-login-button"
          aria-label="Donate"
          variant="primary"
        >
          ☕ Donate
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DonationModal;
