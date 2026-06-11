
import React from "react";
import { 
  FaYoutube, 
  FaTwitch, 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaTiktok,
  FaReddit,
  FaPinterest,
  FaLinkedin,
  FaSnapchat,
  FaSpotify,
} from "react-icons/fa";
import { SiDailymotion, SiBilibili, SiSoundcloud } from "react-icons/si";

const PlatformIcons = ({ handlePlatformClick }) => {
  const platforms = [
    { Component: FaYoutube, url: "https://www.youtube.com", color: "#FF0000", bgColor: "#FFE5E5", alt: "YouTube", domain: "www.youtube.com" },
    { Component: FaTiktok, url: "https://www.tiktok.com", color: "#000000", bgColor: "#F0F0F0", alt: "TikTok", domain: "www.tiktok.com" },
    { Component: FaInstagram, url: "https://www.instagram.com/reels", color: "#E4405F", bgColor: "#FFE5ED", alt: "Instagram", domain: "www.instagram.com" },
    { Component: FaSnapchat, url: "https://www.snapchat.com/spotlight", color: "#FFFC00", bgColor: "#FFFDE0", alt: "Snapchat", domain: "snapchat.com" },
    { Component: FaTwitter, url: "https://twitter.com", color: "#1DA1F2", bgColor: "#E5F3FF", alt: "Twitter", domain: "www.twitter.com" },
    { Component: FaFacebook, url: "https://www.facebook.com/watch", color: "#1877F2", bgColor: "#E5EFFF", alt: "Facebook", domain: "www.facebook.com" },
    { Component: FaTwitch, url: "https://www.twitch.tv", color: "#9146FF", bgColor: "#F5EFFF", alt: "Twitch", domain: "www.twitch.tv" },
    { Component: SiDailymotion, url: "https://www.dailymotion.com", color: "#0066DC", bgColor: "#E5EDFF", alt: "Dailymotion", domain: "dailymotion.com" },
    { Component: SiSoundcloud, url: "https://soundcloud.com", color: "#FF5500", bgColor: "#FFE8E0", alt: "SoundCloud", domain: "soundcloud.com" },
    { Component: FaSpotify, url: "https://open.spotify.com", color: "#1DB954", bgColor: "#E7F8EE", alt: "Spotify", domain: "open.spotify.com" },
    { Component: SiBilibili, url: "https://www.bilibili.com", color: "#FB7299", bgColor: "#FFE5F0", alt: "Bilibili", domain: "bilibili.com" },
    { Component: FaReddit, url: "https://www.reddit.com", color: "#FF4500", bgColor: "#FFE8E0", alt: "Reddit", domain: "www.reddit.com" },
    { Component: FaPinterest, url: "https://www.pinterest.com", color: "#BD081C", bgColor: "#FFE5EA", alt: "Pinterest", domain: "www.pinterest.com" },
    { Component: FaLinkedin, url: "https://www.linkedin.com", color: "#0077B5", bgColor: "#E5F0F5", alt: "LinkedIn", domain: "www.linkedin.com" },
  ];

  // Get text color based on theme
  

  // Get secondary text color based on theme
  const getSecondaryTextColor = () => {
    return document.documentElement.classList.contains('dark-theme') ? '#ccc' : '#666';
  };

  return (
    <section className="download-hub">
      <div className="download-hub__header">
        <div>
          <p className="pnut-eyebrow">Download Hub</p>
          <h1 className="download-hub__title">Paste a link or start from a platform</h1>
          <p className="download-hub__subtitle">
            Choose a site, find your media, then download with the settings above.
          </p>
        </div>
        <div className="download-hub__hint">
          Video, music, and playlists
        </div>
      </div>

      <div className="platform-grid">
        {platforms.map(({ Component, url, color, bgColor, alt, domain }, index) => (
          <div
            key={index}
            onClick={() => handlePlatformClick(url)}
            className="platform-card"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handlePlatformClick(url);
              }
            }}
            style={{
              '--platform-color': color,
              '--platform-bg': bgColor || '#f8f9fa',
            }}
          >
            <div className="platform-card__icon">
              <Component />
            </div>
            <div className="platform-card__text">
              <h3>{alt}</h3>
              <p>{domain}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlatformIcons;
export const getTextColor = () => {
    return document.documentElement.classList.contains('dark-theme') ? '#fff' : '#333';
  };
