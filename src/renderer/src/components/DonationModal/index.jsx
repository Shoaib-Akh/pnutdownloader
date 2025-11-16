import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../common.css';

function DonationModal({ isOpen, onClose, onDonate }) {
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
      </Modal.Body>
      <Modal.Footer className="custom-modal-footer">
        <Button
          onClick={onDonate}
          className="custom-login-button"
          aria-label="Donate"
          variant="primary"
        >
          Donate
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DonationModal;
