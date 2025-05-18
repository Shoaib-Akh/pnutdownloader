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
      aria-labelledby="login-modal-title"
      role="dialog"
      size="md"
      animation={true}
    >
      <Modal.Header className="custom-modal-header">
        <Modal.Title id="login-modal-title" className="custom-modal-title">
          Login Required
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
          YouTube has restricted downloads. Please log in to YouTube to resume downloading your content.
        </p>
       
      </Modal.Body>
      <Modal.Footer className="custom-modal-footer">
        <Button
          variant="outline-secondary"
          onClick={onClose}
          className="custom-cancel-button"
          aria-label="Cancel login"
        >
          Cancel
        </Button>
        <Button
          onClick={handleLogin}
          className="custom-login-button"
          aria-label="Log in to YouTube"
          variant="primary"
        >
          Log in to YouTube
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default LoginModal;