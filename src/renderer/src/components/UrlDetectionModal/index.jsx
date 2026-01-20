import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaDownload, FaTimes } from 'react-icons/fa';
import '../common.css';
import './UrlDetectionModal.css';

function UrlDetectionModal({ isOpen, onClose, onDownload, url, isLoading = false }) {
  // Debug log
  React.useEffect(() => {
    console.log('UrlDetectionModal - isOpen:', isOpen, 'url:', url);
  }, [isOpen, url]);

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    }
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      className="url-detection-modal"
      backdrop="static"
      keyboard={false}
      aria-labelledby="url-detection-modal-title"
      role="dialog"
      size="lg"
      animation={true}
    >
      <Modal.Header className="url-detection-modal-header">
        <Modal.Title id="url-detection-modal-title" className="url-detection-modal-title">
          <FaDownload className="modal-icon" />
          New Video Detected!
        </Modal.Title>
        <button
          type="button"
          className="url-detection-close-button"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
      </Modal.Header>
      <Modal.Body className="url-detection-modal-body">
        <div className="url-detection-content">
          <div className="url-detection-message">
            <h4>Video URL Detected</h4>
            <p>We found a new video URL that you can download!</p>
          </div>
          <div className="url-display">
            <label>URL:</label>
            <div className="url-text">{url}</div>
          </div>
          <div className="url-detection-prompt">
            <p>Are you interested in downloading this video?</p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="url-detection-modal-footer">
        <Button
          variant="secondary"
          onClick={onClose}
          className="url-detection-cancel-button"
          disabled={isLoading}
        >
          Not Now
        </Button>
        <Button
          onClick={handleDownloadClick}
          className="url-detection-download-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Processing...
            </>
          ) : (
            <>
              <FaDownload className="me-2" />
              Download Video
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UrlDetectionModal;
