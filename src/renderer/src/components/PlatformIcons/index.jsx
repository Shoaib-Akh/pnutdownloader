


import React from "react";
import { 
  FaYoutube, 
  FaVimeo, 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaTiktok,
} from "react-icons/fa";
import "../common.css";
import youtubekids from '../../assets/Images/youtubekids.png';
import youtubeMusic from '../../assets/Images/youtubeMusic.png';

const PlatformIcons = ({ handlePlatformClick }) => {
  const platforms = [
    { Component: FaYoutube, url: "https://www.youtube.com", color: "red" },
    { 
      Image: youtubeMusic, 
      url: "https://music.youtube.com", 
      color: "#FF0000",
      alt: "YouTube Music" 
    }, // YouTube Music with image
    { 
      Image: youtubekids, 
      url: "https://www.youtubekids.com", 
      color: "#FF0000",
      alt: "YouTube Kids" 
    }, // YouTube Kids with image
    // { Component: FaVimeo, url: "https://www.vimeo.com", color: "blue" },
    // { Component: FaFacebook, url: "https://www.facebook.com/watch", color: "#1877F2" },
    // { Component: FaTwitter, url: "https://twitter.com", color: "#1DA1F2" },
    // { Component: FaInstagram, url: "https://www.instagram.com/reels", color: "#E4405F" },
    // { Component: FaTiktok, url: "https://www.tiktok.com", color: "black" },
  ];

  return (
    <div className="icon-container">
      {platforms.map(({ Component, Image, url, color, alt }, index) => (
        Image ? (
          <img
            key={index}
            src={Image}
            alt={alt}
            onClick={() => handlePlatformClick(url)}
            style={{ cursor: "pointer", width: "30px", height: "30px" }}
            className="platform-icon"
          />
        ) : (
          <Component
            key={index}
            className="platform-icon"
            onClick={() => handlePlatformClick(url)}
            style={{ cursor: "pointer", color, fontSize: "30px" }}
          />
        )
      ))}
    </div>
  );
};

export default PlatformIcons;