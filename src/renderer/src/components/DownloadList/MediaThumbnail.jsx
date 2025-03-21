import React from 'react';
import { 
  FaInstagram, 
  FaFacebook, 
  FaTwitter, 
  FaYoutube, 
  FaLinkedin, 
  FaTiktok, 
  FaPinterest, 
  FaSnapchat, 
  FaReddit, 
  FaWhatsapp, 
  FaVimeo // Add Vimeo icon
} from 'react-icons/fa';

const MediaThumbnail = ({ thumbnail, title, url }) => {
  const socialIcons = {
    instagram: <FaInstagram className='iconstyle' style={{ color: '#E1306C' }} />,
    facebook: <FaFacebook className='iconstyle' style={{ color: '#1877F2' }} />,
    twitter: <FaTwitter className='iconstyle' style={{ color: '#1DA1F2' }} />,
    // youtube: <FaYoutube className='iconstyle' style={{ color: '#FF0000' }} />,
    linkedin: <FaLinkedin className='iconstyle' style={{ color: '#0077B5' }} />,
    tiktok: <FaTiktok className='iconstyle' style={{ color: '#000000' }} />,
    pinterest: <FaPinterest className='iconstyle' style={{ color: '#BD081C' }} />,
    snapchat: <FaSnapchat className='iconstyle' style={{ color: '#FFFC00' }} />,
    reddit: <FaReddit className='iconstyle' style={{ color: '#FF4500' }} />,
    whatsapp: <FaWhatsapp className='iconstyle' style={{ color: '#25D366' }} />,
    vimeo: <FaVimeo className='iconstyle' style={{ color: '#1AB7EA' }} />, // Vimeo icon with its brand color
  };

  const platform = Object.keys(socialIcons).find(key => url?.includes(key));
  const icon = platform ? socialIcons[platform] : null;

  return (
    <>
      {icon || (
        <img
          crossOrigin="anonymous"
          src={thumbnail}
          style={{ width: 50, height: 50, borderRadius: 10, marginRight: 10 }}
          alt="Thumbnail"
          onError={(e) => (e.target.style.display = "none")}
        />
      )}
      {`${title.slice(0, 20)}${title.length > 20 ? "..." : ""}`}
    </>
  );
};

export default MediaThumbnail;