import React from 'react';
import {
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaTiktok,
  FaPinterest,
  FaSnapchat,
  FaReddit,
  FaWhatsapp,
  FaVimeo,
  FaPlayCircle, // Import play button icon
} from 'react-icons/fa';

const MediaThumbnail = ({ thumbnail, title, url, onClick, format, bitrate, downloadType, id }) => {
  const socialIcons = {
    instagram: <FaInstagram className="iconstyle" style={{ color: '#E1306C' }} />,
    facebook: <FaFacebook className="iconstyle" style={{ color: '#1877F2' }} />,
    twitter: <FaTwitter className="iconstyle" style={{ color: '#1DA1F2' }} />,
    linkedin: <FaLinkedin className="iconstyle" style={{ color: '#0077B5' }} />,
    tiktok: <FaTiktok className="iconstyle" style={{ color: '#000000' }} />,
    pinterest: <FaPinterest className="iconstyle" style={{ color: '#BD081C' }} />,
    snapchat: <FaSnapchat className="iconstyle" style={{ color: '#FFFC00' }} />,
    reddit: <FaReddit className="iconstyle" style={{ color: '#FF4500' }} />,
    whatsapp: <FaWhatsapp className="iconstyle" style={{ color: '#25D366' }} />,
    vimeo: <FaVimeo className="iconstyle" style={{ color: '#1AB7EA' }} />,
  };

  const platform = Object.keys(socialIcons).find((key) => url?.includes(key));
  const icon = platform ? socialIcons[platform] : null;

  return (
    <div
      className="d-flex align-items-center text-nowrap overflow-hidden"
      key={id}
    >
      <span className="me-2 flex-shrink-0 position-relative">
        {icon || (
          <div className="thumbnail-wrapper" 
          onClick={onClick}
          style={{ display: 'inline-block' }}>
            <img
              onClick={onClick}
              crossOrigin="anonymous"
              title="Play video"
              src={thumbnail}
              alt="Thumbnail"
              onError={(e) => (e.target.style.display = 'none')}
              className="img-fluid rounded"
              style={{
                height: '40px',
                objectFit: 'cover',
                cursor: 'pointer',
                maxWidth: '200px',
                aspectRatio: '16 / 9',
              }}
            />
            <div className="play-overlay">
              <FaPlayCircle className="play-icon" style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </div>
        )}
      </span>
      <span
        className="text-truncate d-block"
        style={{ maxWidth: 'calc(100% - 100px)' }}
      >
        ({downloadType === 'audio' ? bitrate : format}) {`${title.slice(0, 20)}${title.length > 20 ? '...' : ''}`}
      </span>
    </div>
  );
};

export default MediaThumbnail;