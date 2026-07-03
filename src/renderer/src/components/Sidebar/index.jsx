import { useEffect, useState } from 'react';
import { FaFolderOpen, FaMusic, FaVideo, FaList, FaHome, FaCoffee, FaInfoCircle, FaCommentDots, FaSun, FaMoon, FaTools, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaSyncAlt } from 'react-icons/fa';
import { Button, Modal } from 'react-bootstrap';
import './Sidebar.css';
import Logo from '../../assets/Images/logo.svg';
import LogoDark from '../../assets/Images/logoDark.svg';
import { trackDonationButton } from '../../utils/donationService';

const sanitizeRepairError = (message) =>
  String(message || 'Repair could not be completed.')
    .replace(/yt-dlp/gi, 'download engine')
    .replace(/ffmpeg/gi, 'media processor');

function Sidebar({
  selectedItem,
  setSelectedItem,
  setDownload,
  setShowWebView,
  setDownloadListOpen,
  setAboutUs,
  setFeedbackModalOpen,
  theme,
  onThemeToggle
}) {
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairStatus, setRepairStatus] = useState({ phase: 'confirm', message: '' });

  // Set Home as auto-selected on load
  useEffect(() => {
    if (!selectedItem) {
      setSelectedItem('Home');
    }
  }, [selectedItem, setSelectedItem]);

  const myFilesItems = [
    { icon: FaHome, label: 'Home', displayLabel: 'Home' },
    { icon: FaFolderOpen, label: 'All Files', displayLabel: 'Resent download' },
    { icon: FaVideo, label: 'Video', displayLabel: 'Videos' },
    { icon: FaMusic, label: 'Audio', displayLabel: 'Music' },
    { icon: FaList, label: 'Playlist', displayLabel: 'Playlists' },
  ];

  const systemItems = [
    { icon: FaInfoCircle, label: 'About us', displayLabel: 'About PNUT' },
  ];

  const handleClick = () => {
    const donationUrl = 'https://ko-fi.com/pnutdownloader';
    window.api.trackEvent('Buy me a coffee')
    trackDonationButton({
      button: 'coffee',
      label: 'Buy me a coffee',
      targetUrl: donationUrl,
    });
    window.api.openExternal(donationUrl);
  };

  const openFeedback = () => {
    setSelectedItem('Feedback');
    setDownload(false);
    setShowWebView(false);
    setDownloadListOpen(false);
    setAboutUs(false);
    window.api?.trackEvent?.('Feedback Clicked');
    setFeedbackModalOpen(true);
  };

  const openRepairModal = () => {
    setRepairStatus({ phase: 'confirm', message: '' });
    setRepairModalOpen(true);
    window.api?.trackEvent?.('Repair Downloads Opened');
  };

  const closeRepairModal = () => {
    if (repairStatus.phase !== 'repairing') {
      setRepairModalOpen(false);
    }
  };

  const handleRepairDownloads = async () => {
    setRepairStatus({
      phase: 'repairing',
      message: 'Updating the download engine. Keep PNUT Downloader open…',
    });
    window.api?.trackEvent?.('Repair Downloads Confirmed');

    try {
      if (!window.api?.updateYtdlp || !window.api?.updateFfmpeg) {
        throw new Error('Repair is not available in this version of PNUT Downloader.');
      }

      const downloadEngineResult = await window.api.updateYtdlp();
      if (!downloadEngineResult?.success) {
        throw new Error(downloadEngineResult?.error || downloadEngineResult?.message);
      }

      setRepairStatus({
        phase: 'repairing',
        message: 'Updating the media processor. Keep PNUT Downloader open…',
      });

      const mediaProcessorResult = await window.api.updateFfmpeg();
      if (!mediaProcessorResult?.success) {
        throw new Error(mediaProcessorResult?.error || mediaProcessorResult?.message);
      }

      const dependencyCheck = await window.api.checkDependencies?.();
      if (dependencyCheck && !dependencyCheck.ready) {
        throw new Error(dependencyCheck.error || 'The repaired download tools could not be verified.');
      }

      setRepairStatus({
        phase: 'success',
        message: 'Repair completed. You can try your download again now.',
      });
      window.api?.trackEvent?.('Repair Downloads Completed');
    } catch (error) {
      setRepairStatus({
        phase: 'error',
        message: sanitizeRepairError(error?.message),
      });
      window.api?.trackEvent?.('Repair Downloads Failed');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand-logo" aria-label="PNUT Downloader">
        <img
          src={theme === 'dark' ? LogoDark : Logo}
          alt="PNUT Downloader"
          className="sidebar-brand-logo__image"
        />
      </div>

      {/* MY FILES Section */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">MY FILES</div>
        <div className="sidebar__menu">
          {myFilesItems.map((item, index) => (
            <div
              key={index}
              className={`sidebar__menu-item ${selectedItem === item.label ? 'sidebar__menu-item--selected' : ''
                }`}
              title={item.displayLabel || item.label}
              onClick={() => {
                setSelectedItem(item.label);
                setDownload(false);
                setShowWebView(false);
                setDownloadListOpen(item.label === 'Home' ? false : true);
                setAboutUs(false);
                if (item.label === 'Browser') {
                  setShowWebView(true);
                }
              }}
            >
              <div className="sidebar__icon-container">
                <item.icon className="sidebar__icon" />
              </div>
              <span className="sidebar__label">{item.displayLabel || item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SYSTEM Section */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">SYSTEM</div>
        <div className="sidebar__menu">
          {/* Theme Toggle */}
          <div
            className={`theme-toggle ${theme === 'dark' ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
            onClick={onThemeToggle}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onThemeToggle();
              }
            }}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            tabIndex={0}
          >
            <div className="theme-toggle__icon-container">
              <FaMoon className={`sidebar__icon theme-toggle__mode-icon ${theme !== 'dark' ? 'theme-toggle__mode-icon--active' : ''}`} />
              <FaSun className={`sidebar__icon theme-toggle__mode-icon ${theme === 'dark' ? 'theme-toggle__mode-icon--active' : ''}`} />
            </div>
            <span className="theme-toggle__label" aria-hidden="true">
              <span className={`theme-toggle__label-text ${theme !== 'dark' ? 'theme-toggle__label-text--active' : ''}`}>Dark Mode</span>
              <span className={`theme-toggle__label-text ${theme === 'dark' ? 'theme-toggle__label-text--active' : ''}`}>Light Mode</span>
            </span>
            <div className={`theme-toggle__switch ${theme === 'dark' ? 'theme-toggle__switch--active' : ''}`}>
              <div className="theme-toggle__switch-thumb"></div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar__menu-item sidebar__repair-button"
            onClick={openRepairModal}
            title="Use this if downloads fail or have processing errors"
          >
            <div className="sidebar__icon-container sidebar__icon-container--repair">
              <FaTools className="sidebar__icon" />
            </div>
            <div className="sidebar__text-container">
              <span className="sidebar__label">Repair Downloads</span>
            </div>
          </button>

          {systemItems.map((item, index) => (
            <div
              key={index}
              className={`sidebar__menu-item ${selectedItem === item.label ? 'sidebar__menu-item--selected' : ''
                }`}
              title={item.displayLabel || item.label}
              onClick={() => {
                setSelectedItem(item.label);
                setDownload(false);
                setShowWebView(false);
                setDownloadListOpen(false);
                setAboutUs(item.label === 'About us');
              }}
            >
              <div className="sidebar__icon-container">
                <item.icon className="sidebar__icon" />
              </div>
              <div className="sidebar__text-container">
                <span className="sidebar__label">{item.displayLabel || item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buy Me a Coffee Button */}
      <div className="sidebar__footer mb-2">

        {/* <div className="sidebar__coffee-logo" aria-hidden="true">
          <FaCoffee />
        </div> */}
        <button
          type="button"
          className="sidebar__buy-nuts-button"
          onClick={handleClick}
          aria-label="Support PNUT by buying me a coffee on Ko-fi"
          title="Support PNUT by buying me a coffee on Ko-fi"
        >
          <span className="sidebar__coffee-icon" aria-hidden="true">
            <FaCoffee />
          </span>
          <span className="sidebar__coffee-copy">
            <span className="sidebar__coffee-title">
              Support PNUT
              <span className="sidebar__coffee-pill">Ko-fi</span>
            </span>
            <span className="sidebar__coffee-subtitle">Buy me a coffee</span>
          </span>
        </button>
        <button
          type="button"
          className={`sidebar__feedback-footer-button ${selectedItem === 'Feedback' ? 'sidebar__feedback-footer-button--selected' : ''
            }`}
          onClick={openFeedback}
          aria-label="Send feedback"
          title="Send feedback"
        >
          <span className="sidebar__feedback-footer-icon" aria-hidden="true">
            <FaCommentDots />
          </span>
          <span className="sidebar__feedback-footer-copy">
            <span className="sidebar__feedback-footer-title">Feedback</span>
            <span className="sidebar__feedback-footer-subtitle">Help us improve</span>
          </span>
        </button>
      </div>

      <Modal
        show={repairModalOpen}
        onHide={closeRepairModal}
        centered
        className="pnut-modal repair-downloads-modal"
        backdrop={repairStatus.phase === 'repairing' ? 'static' : true}
        keyboard={repairStatus.phase !== 'repairing'}
        aria-labelledby="repair-downloads-title"
      >
        <Modal.Header className="repair-downloads-modal__header">
          <Modal.Title id="repair-downloads-title" className="repair-downloads-modal__title">
            {repairStatus.phase === 'confirm' && <FaExclamationTriangle />}
            {repairStatus.phase === 'repairing' && <FaSyncAlt className="repair-downloads-modal__spinner" />}
            {repairStatus.phase === 'success' && <FaCheckCircle />}
            {repairStatus.phase === 'error' && <FaTimesCircle />}
            {repairStatus.phase === 'confirm' ? 'Repair download tools?' : 'Repair Downloads'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="repair-downloads-modal__body">
          {repairStatus.phase === 'confirm' ? (
            <>
              <p className="repair-downloads-modal__lead">
                Use this repair only when a download fails, audio is missing, or video processing stops.
              </p>
              <div className="repair-downloads-modal__notice">
                PNUT will update its download engine and media processor. Make sure you are connected to the internet and keep the app open until it finishes.
              </div>
              <p className="repair-downloads-modal__question">Are you sure you want to continue?</p>
            </>
          ) : (
            <div className={`repair-downloads-modal__status repair-downloads-modal__status--${repairStatus.phase}`}>
              <p>{repairStatus.message}</p>
              {repairStatus.phase === 'error' && (
                <small>Check your internet connection and make sure no download is currently running.</small>
              )}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="repair-downloads-modal__footer">
          {repairStatus.phase === 'confirm' && (
            <>
              <Button type="button" className="repair-downloads-modal__cancel" onClick={closeRepairModal}>
                Cancel
              </Button>
              <Button type="button" className="repair-downloads-modal__confirm" onClick={handleRepairDownloads}>
                <FaTools />
                Yes, repair downloads
              </Button>
            </>
          )}
          {repairStatus.phase === 'repairing' && (
            <Button type="button" className="repair-downloads-modal__confirm" disabled>
              <FaSyncAlt className="repair-downloads-modal__spinner" />
              Repairing…
            </Button>
          )}
          {repairStatus.phase === 'success' && (
            <Button type="button" className="repair-downloads-modal__confirm" onClick={closeRepairModal}>
              Done
            </Button>
          )}
          {repairStatus.phase === 'error' && (
            <>
              <Button type="button" className="repair-downloads-modal__cancel" onClick={closeRepairModal}>
                Close
              </Button>
              <Button type="button" className="repair-downloads-modal__confirm" onClick={handleRepairDownloads}>
                Try again
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Sidebar;
