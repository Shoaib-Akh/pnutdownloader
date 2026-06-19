import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../common.css'; 

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
          YouTube sign in needed
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
          YouTube needs you to sign in before this download can continue.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--pnut-muted)', marginTop: '10px' }}>
          Open YouTube, sign in with your Google account, then retry the download.
        </p>
      </Modal.Body>
      <Modal.Footer className="custom-modal-footer">
       
        <Button
          onClick={handleLogin}
          className="custom-login-button"
          aria-label="Log in to YouTube"
          variant="primary"
        >
          Open YouTube sign in
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default LoginModal;
