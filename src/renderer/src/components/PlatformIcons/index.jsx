import React from "react";
import { 
  FaYoutube, 
  FaVimeo, 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaTiktok,
  FaMusic,          // For YouTube Music
  FaChild           // For YouTube Kids
} from "react-icons/fa";
import "../common.css";

const PlatformIcons = ({ handlePlatformClick }) => {
  const platforms = [
    { Component: FaYoutube, url: "https://www.youtube.com", color: "red" },
    { Component: FaMusic, url: "https://music.youtube.com", color: "#FF0000" },    // YouTube Music
    { Component: FaChild, url: "https://www.youtubekids.com", color: "#FF0000" }, // YouTube Kids
    { Component: FaVimeo, url: "https://www.vimeo.com", color: "blue" },
    { Component: FaFacebook, url: "https://www.facebook.com/watch", color: "#1877F2" },
    { Component: FaTwitter, url: "https://twitter.com", color: "#1DA1F2" },
    { Component: FaInstagram, url: "https://www.instagram.com/reels", color: "#E4405F" },
    { Component: FaTiktok, url: "https://www.tiktok.com", color: "black" },
  ];

  return (
    <div className="icon-container">
      {platforms.map(({ Component, url, color }, index) => (
        <Component
          key={index}
          className="platform-icon"
          onClick={() => handlePlatformClick(url)}
          style={{ cursor: "pointer", color, fontSize: "30px" }}
        />
      ))}
    </div>
  );
};

export default PlatformIcons;