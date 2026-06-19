import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import {
  FaDownload,
  FaTimes,
  FaYoutube,
  FaTwitch,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaTiktok,
  FaReddit,
  FaPinterest,
  FaLinkedin,
  FaSnapchat,
  FaGlobe
} from 'react-icons/fa';
import { SiDailymotion, SiBilibili, SiSoundcloud } from 'react-icons/si';
import '../common.css';
import './UrlDetectionModal.css';
import { detectPlatform, PLATFORMS, getPlatformName } from '../platformUtils';

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

  const detectedPlatform = detectPlatform(url);
  const platformName = getPlatformName(detectedPlatform);

  const getPlatformIcon = (platform) => {
    const iconStyle = { fontSize: '48px', marginBottom: '10px' };

    switch (platform) {
      case PLATFORMS.YOUTUBE:
      case PLATFORMS.YOUTUBE_MUSIC:
      case PLATFORMS.YOUTUBE_KIDS:
        return <FaYoutube style={{ ...iconStyle, color: '#FF0000' }} />;
      case PLATFORMS.FACEBOOK:
        return <FaFacebook style={{ ...iconStyle, color: '#1877F2' }} />;
      case PLATFORMS.INSTAGRAM:
        return <FaInstagram style={{ ...iconStyle, color: '#E4405F' }} />;
      case PLATFORMS.SNAPCHAT:
        return <FaSnapchat style={{ ...iconStyle, color: '#FFFC00' }} />;
      case PLATFORMS.TIKTOK:
        return <FaTiktok style={{ ...iconStyle, color: '#000000' }} />;
      case PLATFORMS.TWITTER:
        return <FaTwitter style={{ ...iconStyle, color: '#1DA1F2' }} />;
      case PLATFORMS.TWITCH:
        return <FaTwitch style={{ ...iconStyle, color: '#9146FF' }} />;
      case PLATFORMS.DAILYMOTION:
        return <SiDailymotion style={{ ...iconStyle, color: '#0066DC' }} />;
      case PLATFORMS.BILIBILI:
        return <SiBilibili style={{ ...iconStyle, color: '#FB7299' }} />;
      case PLATFORMS.REDDIT:
        return <FaReddit style={{ ...iconStyle, color: '#FF4500' }} />;
      case PLATFORMS.PINTEREST:
        return <FaPinterest style={{ ...iconStyle, color: '#BD081C' }} />;
      case PLATFORMS.LINKEDIN:
        return <FaLinkedin style={{ ...iconStyle, color: '#0077B5' }} />;
      case PLATFORMS.SOUNDCLOUD:
        return <SiSoundcloud style={{ ...iconStyle, color: '#FF5500' }} />;
      default:
        return <FaGlobe style={{ ...iconStyle, color: 'var(--pnut-muted)' }} />;
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
          Link detected
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
            <div className="platform-icon-container" style={{ textAlign: 'center' }}>
              {getPlatformIcon(detectedPlatform)}
            </div>
            <h4>{platformName !== 'Unknown' ? `${platformName} Link Detected` : 'Video URL Detected'}</h4>
            <p>We found a supported {platformName !== 'Unknown' ? platformName : 'video'} link.</p>
          </div>
          <div className="url-display">
            <label>Link</label>
            <div className="url-text">{url}</div>
          </div>
          <div className="url-detection-prompt">
            <p>Want to download it with your current settings?</p>
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
          Not now
        </Button>
        <Button
          onClick={handleDownloadClick}
          className="url-detection-download-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Adding...
            </>
          ) : (
            <>
              <FaDownload className="me-2" />
              Download
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UrlDetectionModal;
