import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../common.css'; // Custom CSS for the modal

function LoginModal({ isOpen, onClose, handleLogin }) {
  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      className="custom-login-modal"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header className="custom-modal-header">
        <Modal.Title className="custom-modal-title">Login Required</Modal.Title>
        <button type="button" className="custom-close-button" onClick={onClose}>
          &times;
        </button>
      </Modal.Header>
      <Modal.Body className="custom-modal-body">
        <p>Please log in to YouTube to continue downloading your content.</p>
      </Modal.Body>
      <Modal.Footer className="custom-modal-footer">
        <Button
          variant="outline-secondary"
          onClick={onClose}
          className="custom-cancel-button"
        >
          Cancel
        </Button>
        <Button
          onClick={handleLogin}
          className="custom-login-button"
        >
          Log in to YouTube
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default LoginModal;