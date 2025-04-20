import React from 'react';
import { FaFolderOpen, FaMusic, FaVideo, FaList, FaBars ,FaHome, FaHandHoldingHeart} from 'react-icons/fa';
import { IoMdDownload } from 'react-icons/io';
import { GiSquirrel } from 'react-icons/gi';
import squirrel from '../../assets/Images/squirrel.png';
import './Sidebar.css';

function Sidebar({
  isOpen,
  setIsOpen,
  selectedItem,
  setSelectedItem,
  download,
  setDownload,
  setShowWebView,
  setDownloadListOpen,
}) {
  const menuItems = [
    { icon: FaHome, label: 'Home' },

    { icon: IoMdDownload, label: 'All File' },

    { icon: FaMusic, label: 'Audio' },
    { icon: FaVideo, label: 'Video' },
    { icon: FaList, label: 'Playlist' },
  ];

  const handleClick = () => {
    window.api.openExternal('https://ko-fi.com/pnutdownloader');
  };

  return (
    <div className="sidebar">
      
      {/* Menu Button for Collapsed Mode */}
      {!isOpen && (
        <button className="sidebar__toggle-button" onClick={() => setIsOpen(true)}>
          <FaBars />
        </button>
      )}

      {/* Sidebar Menu */}
      <div className="sidebar__menu">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={`sidebar__menu-item bg-white ${
              selectedItem === item.label ? 'sidebar__menu-item--selected' : ''
            }`}
            onClick={() => {
              setSelectedItem(item.label);
              setDownload(false);
              setShowWebView(false);
              setDownloadListOpen(item.label === 'Home' ? false : true);
            }}
          >
            <div
              className="sidebar__icon-container"
            >
              <item.icon className="sidebar__icon" />
            </div>
            {isOpen && <span className="sidebar__label">{item.label}</span>}
          </div>
        ))}
      </div>

      {/* Buy Me Nuts Button */}
      <div className="sidebar__footer  mb-2 ">
        {isOpen && (
          <>
            <img src={squirrel} alt="PNUT Logo" className="sidebar__logo " />
            <button
              className="sidebar__buy-nuts-button"
              onClick={handleClick}
            >
            <FaHandHoldingHeart style={{marginRight:10}} /> 
              Support us!
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Sidebar;