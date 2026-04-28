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
} from "react-icons/fa";
import { SiDailymotion, SiBilibili, SiSoundcloud } from "react-icons/si";

const PlatformIcons = ({ url }) => {
  const platforms = [
    { Component: FaYoutube, color: "#FF0000", bgColor: "#FFE5E5", alt: "YouTube", domains: ["youtube.com", "youtu.be"] },
    { Component: FaTiktok, color: "#000000", bgColor: "#F0F0F0", alt: "TikTok", domains: ["tiktok.com"] },
    { Component: FaInstagram, color: "#E4405F", bgColor: "#FFE5ED", alt: "Instagram", domains: ["instagram.com"] },
    { Component: FaTwitter, color: "#1DA1F2", bgColor: "#E5F3FF", alt: "Twitter", domains: ["twitter.com", "x.com"] },
    { Component: FaFacebook, color: "#1877F2", bgColor: "#E5EFFF", alt: "Facebook", domains: ["facebook.com", "fb.watch"] },
    { Component: FaTwitch, color: "#9146FF", bgColor: "#F5EFFF", alt: "Twitch", domains: ["twitch.tv"] },
    { Component: SiDailymotion, color: "#0066DC", bgColor: "#E5EDFF", alt: "Dailymotion", domains: ["dailymotion.com"] },
    { Component: SiSoundcloud, color: "#FF5500", bgColor: "#FFE8E0", alt: "SoundCloud", domains: ["soundcloud.com"] },
    { Component: SiBilibili, color: "#FB7299", bgColor: "#FFE5F0", alt: "Bilibili", domains: ["bilibili.com"] },
    { Component: FaReddit, color: "#FF4500", bgColor: "#FFE8E0", alt: "Reddit", domains: ["reddit.com"] },
    { Component: FaPinterest, color: "#BD081C", bgColor: "#FFE5EA", alt: "Pinterest", domains: ["pinterest.com"] },
    { Component: FaLinkedin, color: "#0077B5", bgColor: "#E5F0F5", alt: "LinkedIn", domains: ["linkedin.com"] },
  ];

  // Find matching platform for the given URL
  const getPlatformForUrl = (url) => {
    if (!url) return null;
    
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return platforms.find(platform => 
        platform.domains.some(domain => hostname.includes(domain))
      );
    } catch (error) {
      return null;
    }
  };

  const matchingPlatform = getPlatformForUrl(url);

  if (matchingPlatform) {
    const { Component, color, bgColor, alt } = matchingPlatform;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '6px',
        backgroundColor: bgColor,
        fontSize: '14px'
      }}>
        <Component style={{ color, fontSize: '16px' }} />
        <span style={{ color: '#333', fontWeight: '500' }}>{alt}</span>
      </div>
    );
  }

  return null;
};

// Export the full platform grid for the home page
export const PlatformGrid = ({ onPlatformClick }) => {
  const platforms = [
    { Component: FaYoutube, url: "https://www.youtube.com", color: "#FF0000", bgColor: "#FFE5E5", alt: "YouTube", domain: "www.youtube.com" },
    { Component: FaTiktok, url: "https://www.tiktok.com", color: "#000000", bgColor: "#F0F0F0", alt: "TikTok", domain: "www.tiktok.com" },
    { Component: FaInstagram, url: "https://www.instagram.com/reels", color: "#E4405F", bgColor: "#FFE5ED", alt: "Instagram", domain: "www.instagram.com" },
    { Component: FaTwitter, url: "https://twitter.com", color: "#1DA1F2", bgColor: "#E5F3FF", alt: "Twitter", domain: "www.twitter.com" },
    { Component: FaFacebook, url: "https://www.facebook.com/watch", color: "#1877F2", bgColor: "#E5EFFF", alt: "Facebook", domain: "www.facebook.com" },
    { Component: FaTwitch, url: "https://www.twitch.tv", color: "#9146FF", bgColor: "#F5EFFF", alt: "Twitch", domain: "www.twitch.tv" },
    { Component: SiDailymotion, url: "https://www.dailymotion.com", color: "#0066DC", bgColor: "#E5EDFF", alt: "Dailymotion", domain: "dailymotion.com" },
    { Component: SiSoundcloud, url: "https://soundcloud.com", color: "#FF5500", bgColor: "#FFE8E0", alt: "SoundCloud", domain: "soundcloud.com" },
    { Component: SiBilibili, url: "https://www.bilibili.com", color: "#FB7299", bgColor: "#FFE5F0", alt: "Bilibili", domain: "bilibili.com" },
    { Component: FaReddit, url: "https://www.reddit.com", color: "#FF4500", bgColor: "#FFE8E0", alt: "Reddit", domain: "www.reddit.com" },
    { Component: FaPinterest, url: "https://www.pinterest.com", color: "#BD081C", bgColor: "#FFE5EA", alt: "Pinterest", domain: "www.pinterest.com" },
    { Component: FaLinkedin, url: "https://www.linkedin.com", color: "#0077B5", bgColor: "#E5F0F5", alt: "LinkedIn", domain: "www.linkedin.com" },
  ];

  return (
    <div style={{ width: '100%', marginTop: '40px' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: "#ff6b6b",
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        Popular Sites
      </h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        width: '100%',
        padding: '0 20px'
      }}>
        {platforms.map(({ Component, url, color, bgColor, alt, domain }, index) => (
          <div
            key={index}
            onClick={() => onPlatformClick && onPlatformClick(url)}
            style={{
              background: bgColor || '#f8f9fa',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              minHeight: '140px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Component
              style={{
                fontSize: '48px',
                color: color,
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#333',
                margin: '0 0 4px 0'
              }}>
                {alt}
              </h3>
              <p style={{
                fontSize: '12px',
                color: '#666',
                margin: 0
              }}>
                {domain}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformIcons;
