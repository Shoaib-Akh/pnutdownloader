import React, { useEffect } from 'react';
import { FaFolderOpen, FaMusic, FaVideo, FaList, FaBars, FaHome, FaHandHoldingHeart, FaInfoCircle, FaGlobe, FaCommentDots, FaStar, FaSun, FaMoon } from 'react-icons/fa';
import { IoMdDownload } from 'react-icons/io';
import { GiSquirrel } from 'react-icons/gi';
import squirrel from '../../assets/Images/squirrel.svg';
import './Sidebar.css';
import Logo from '../../assets/Images/logo.svg';
import LogoDark from '../../assets/Images/logoDark.svg';
import { trackDonationButton } from '../../utils/donationService';

function Sidebar({
  isOpen,
  setIsOpen,
  selectedItem,
  setSelectedItem,
  download,
  setDownload,
  setShowWebView,
  setDownloadListOpen,
  setAboutUs,
  setFeedbackModalOpen,
  theme,
  onThemeToggle
}) {
  // Set Home as auto-selected on load
  useEffect(() => {
    if (!selectedItem) {
      setSelectedItem('Home');
    }
  }, [selectedItem, setSelectedItem]);

  const myFilesItems = [
    { icon: FaHome, label: 'Home', displayLabel: 'Download Hub' },
    { icon: FaFolderOpen, label: 'All Files', displayLabel: 'Library' },
    { icon: FaVideo, label: 'Video', displayLabel: 'Videos' },
    { icon: FaMusic, label: 'Audio', displayLabel: 'Music' },
    { icon: FaList, label: 'Playlist', displayLabel: 'Playlists' },
    { icon: FaGlobe, label: 'Browser', displayLabel: 'Explore' },
  ];

  const systemItems = [
    {
      icon: FaCommentDots,
      label: 'Feedback',
      badge: 'NEW',
      color: '#4285F4',
      isHighlighted: true,
      description: 'Help us improve',
      displayLabel: 'Feedback',
    },
    { icon: FaInfoCircle, label: 'About us', displayLabel: 'About PNUT' },
  ];

  // Theme toggle item
  const themeToggleItem = {
    icon: theme === 'dark' ? FaSun : FaMoon,
    label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
    isThemeToggle: true,
  };



  const handleClick = () => {
    const donationUrl = 'https://ko-fi.com/pnutdownloader';
    window.api.trackEvent('Support us')
    trackDonationButton({
      button: 'support',
      label: 'Support PNUT',
      targetUrl: donationUrl,
    });
    window.api.openExternal(donationUrl);
  };

  return (
    <div className="sidebar">
      <div className="navbar-logo-container">
        <img
          src={theme === 'dark' ? LogoDark : Logo}
          alt="PNUT Logo"
          className="navbar-logo"
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
            className="theme-toggle"
            onClick={onThemeToggle}
          >
            <div className="theme-toggle__icon-container">
              <themeToggleItem.icon className="sidebar__icon" />
            </div>
            <span className="theme-toggle__label">{themeToggleItem.label}</span>
            <div className={`theme-toggle__switch ${theme === 'dark' ? 'theme-toggle__switch--active' : ''}`}>
              <div className="theme-toggle__switch-thumb"></div>
            </div>
          </div>

          {systemItems.map((item, index) => (
            <div
              key={index}
              className={`sidebar__menu-item ${selectedItem === item.label ? 'sidebar__menu-item--selected' : ''
                } ${item.isHighlighted ? 'sidebar__menu-item--highlighted' : ''
                }`}
              title={item.displayLabel || item.label}
              onClick={() => {
                setSelectedItem(item.label);
                setDownload(false);
                setShowWebView(false);
                setDownloadListOpen(false);
                if (item.label === 'Feedback') {
                  setAboutUs(false);
                  window.api?.trackEvent?.('Feedback Clicked');
                  setFeedbackModalOpen(true);
                } else if (item.label === 'About us') {
                  setAboutUs(true);
                } else {
                  setAboutUs(false);
                }
              }}
            >
              <div className={`sidebar__icon-container ${item.isHighlighted ? 'sidebar__icon-container--feedback' : ''
                }`}>
                <item.icon className="sidebar__icon" />
                {item.badge && (
                  <span className="sidebar__badge">{item.badge}</span>
                )}
              </div>
              <div className="sidebar__text-container">
                <span className="sidebar__label">{item.displayLabel || item.label}</span>
                {item.description && (
                  <span className="sidebar__description">{item.description}</span>
                )}
              </div>
              {item.isHighlighted && (
                <FaStar className="sidebar__star-icon" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Buy Me Nuts Button */}
      <div className="sidebar__footer mb-2">
        <>
          <img src={squirrel} alt="PNUT Logo" className="sidebar__logo" />
          <button className="sidebar__buy-nuts-button" onClick={handleClick}>
            <FaHandHoldingHeart style={{ marginRight: 10 }} />
            Support PNUT
          </button>
        </>
      </div>
    </div>
  );
}

export default Sidebar;
