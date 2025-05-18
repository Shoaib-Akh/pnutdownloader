import React, { useState } from 'react';
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
  FaPlayCircle,
  FaVideo, 
  FaMusic,
  FaRedo 
} from 'react-icons/fa';

const MediaThumbnail = ({ thumbnail, title, url, onClick, format, bitrate, downloadType, id, status, onRetry }) => {
  const [imageError, setImageError] = useState(false);

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
  const fallbackIcon = downloadType === 'audio' ? (
    <FaMusic className="iconstyle" style={{ fontSize: '24px', color: '#666' }} />
  ) : (
    <FaVideo className="iconstyle" style={{ fontSize: '24px', color: '#666' }} />
  );

  const retryIcon = (
    <FaRedo
      className="retry-icon"
      style={{
        fontSize: '24px',
        color: '#FF0000',
        cursor: 'pointer',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
      }}
      onClick={() => onRetry(id)} 
      title="Retry download"
    />
  );

  return (
    <div
      className="d-flex align-items-center text-nowrap overflow-hidden"
      key={id}
    >
      <span className="me-2 flex-shrink-0 position-relative">
        {icon || (
          <div
            className="thumbnail-wrapper"
            onClick={onClick}
            style={{ display: 'inline-block', cursor: 'pointer', position: 'relative' }}
          >
            {thumbnail && !imageError ? (
              <>
                <img
                  crossOrigin="anonymous"
                  title="Play video"
                  src={thumbnail}
                  alt={title}
                  onError={() => setImageError(true)}
                  className="img-fluid rounded"
                  style={{
                    height: '40px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    maxWidth: '200px',
                    aspectRatio: '16 / 9',
                  }}
                />
                <div className={status === 'Failed' ? "" : "play-overlay"} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  {status === 'Failed' ? retryIcon : (
                    <FaPlayCircle
                      className="play-icon"
                      style={{
                        fontSize: '24px',
                        color: 'white',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxWidth: '200px',
                  height: '40px',
                  background: '#f0f0f0',
                }}
              >
                {status === 'Failed' ? retryIcon : (
                  <FaPlayCircle
                    className="play-icon"
                    style={{
                      fontSize: '24px',
                      color: 'white',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </div>
            )}
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