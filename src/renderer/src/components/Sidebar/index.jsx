import React, { useEffect } from 'react'; 
import { FaFolderOpen, FaMusic, FaVideo, FaList, FaBars, FaHome, FaHandHoldingHeart, FaInfoCircle, FaGlobe, FaCommentDots, FaStar } from 'react-icons/fa';
import { IoMdDownload } from 'react-icons/io';
import { GiSquirrel } from 'react-icons/gi';
import squirrel from '../../assets/Images/squirrel.png';
import './Sidebar.css';
import Logo from '../../assets/Images/logo.png';

function Sidebar({
  isOpen,
  setIsOpen,
  selectedItem,
  setSelectedItem,
  download,
  setDownload,
  setShowWebView,
  setDownloadListOpen,
  setAboutUs
}) {
  // Set Home as auto-selected on load
  useEffect(() => {
    if (!selectedItem) {
      setSelectedItem('Home');
    }
  }, [selectedItem, setSelectedItem]);

  const myFilesItems = [
    { icon: FaHome, label: 'Home' },
    { icon: FaFolderOpen, label: 'All Files' },
    { icon: FaMusic, label: 'Audio' },
    { icon: FaVideo, label: 'Video' },
    { icon: FaList, label: 'Playlist' },
    { icon: FaGlobe, label: 'Browser' },
  ];

  const systemItems = [
    { 
      icon: FaCommentDots, 
      label: 'Feedback',
      badge: 'NEW',
      color: '#10b981',
      isHighlighted: true,
      description: 'Help us improve'
    },
    { icon: FaInfoCircle, label: 'About us' },
  ];

 

  const handleClick = () => {
         window.api.trackEvent('Support us')
    window.api.openExternal('https://ko-fi.com/pnutdownloader');
  };

  return (
    <div className="sidebar">
       <div className="navbar-logo-container">
        <img 
          src={Logo} 
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
              className={`sidebar__menu-item ${
                selectedItem === item.label ? 'sidebar__menu-item--selected' : ''
              }`}
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
              <span className="sidebar__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SYSTEM Section */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">SYSTEM</div>
        <div className="sidebar__menu">
          {systemItems.map((item, index) => (
            <div
              key={index}
              className={`sidebar__menu-item ${
                selectedItem === item.label ? 'sidebar__menu-item--selected' : ''
              } ${
                item.isHighlighted ? 'sidebar__menu-item--highlighted' : ''
              }`}
              onClick={() => {
                setSelectedItem(item.label);
                setDownload(false);
                setShowWebView(false);
                setDownloadListOpen(false);
                if (item.label === 'Feedback') {
                  setAboutUs(false);
                  window.api.trackEvent('Feedback Clicked');
                  window.api.openExternal('https://your-feedback-url.com');
                } else {
                  setAboutUs(true);
                }
              }}
            >
              <div className={`sidebar__icon-container ${
                item.isHighlighted ? 'sidebar__icon-container--green' : ''
              }`}>
                <item.icon className="sidebar__icon" />
                {item.badge && (
                  <span className="sidebar__badge">{item.badge}</span>
                )}
              </div>
              <div className="sidebar__text-container">
                <span className="sidebar__label">{item.label}</span>
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
            Support us
          </button>
        </>
      </div>
    </div>
  );
}

export default Sidebar;