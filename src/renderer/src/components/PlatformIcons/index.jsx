


import React from "react";
import { 
  FaYoutube, 
  FaVimeo, 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaTiktok,
  FaVideo,
} from "react-icons/fa";
import "../common.css";
import youtubekids from '../../assets/Images/youtubekids.png';
import youtubeMusic from '../../assets/Images/youtubeMusic.png';

const PlatformIcons = ({ handlePlatformClick }) => {
  const platforms = [
    { Component: FaYoutube, url: "https://www.youtube.com", color: "red" ,  alt: "YouTube" },
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
    { Component: FaFacebook, url: "https://www.facebook.com/watch", color: "#1877F2", alt: "Facebook" },
    { Component: FaInstagram, url: "https://www.instagram.com/reels", color: "#E4405F", alt: "Instagram" },
    { Component: FaTiktok, url: "https://www.tiktok.com", color: "black", alt: "TikTok" },
    { Component: FaTwitter, url: "https://twitter.com", color: "#1DA1F2", alt: "Twitter" },
    { Component: FaVimeo, url: "https://www.vimeo.com", color: "#1AB7EA", alt: "Vimeo" },
    { Component: FaVideo, url: "https://www.dailymotion.com", color: "#0066DC", alt: "Dailymotion" },
  ];

  return (
    <div className="icon-container">
     
      {platforms.map(({ Component, Image, url, color, alt }, index) => (
         <div 
         key={index}
         style={{border:"1px solid red",padding:30,borderRadius:10}}
         onClick={() => handlePlatformClick(url)}
         >
        
      {  Image ? (
         <>
          <img
            key={index}
            src={Image}
            alt={alt}
           
            style={{ cursor: "pointer", width: "50px", height: "50px" }}
            className="platform-icon"
          />
       <h3 
          className="platform-icon"
       style={{marginTop:10}}>
       {  alt}
             </h3>
      
         </>
        ) : (
          <div className="px-3" >
          <Component
            key={index}
            className="platform-icon"
            onClick={() => handlePlatformClick(url)}
            style={{ cursor: "pointer", color, fontSize: "60px",}}
          />
           <h3   className="platform-icon" style={{color:"black",marginTop:5}}>
       {  alt}
             </h3>
          </div>

        )}
      </div>

      ))}

    </div>
  );
};

export default PlatformIcons;