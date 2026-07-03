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
  FaSnapchat
} from 'react-icons/fa'
import { SiDailymotion, SiBilibili, SiSoundcloud } from 'react-icons/si'

const SUPPORTED_PLATFORMS = [
  {
    Component: FaYoutube,
    url: 'https://www.youtube.com',
    color: '#FF0000',
    alt: 'YouTube',
    domain: 'www.youtube.com'
  },
  {
    Component: FaTiktok,
    url: 'https://www.tiktok.com',
    color: '#000000',
    alt: 'TikTok',
    domain: 'www.tiktok.com'
  },
  {
    Component: FaInstagram,
    url: 'https://www.instagram.com/reels',
    color: '#E4405F',
    alt: 'Instagram',
    domain: 'www.instagram.com'
  },
  {
    Component: FaSnapchat,
    url: 'https://www.snapchat.com/spotlight',
    color: '#FFFC00',
    alt: 'Snapchat',
    domain: 'snapchat.com'
  },
  {
    Component: FaTwitter,
    url: 'https://twitter.com',
    color: '#1DA1F2',
    alt: 'Twitter',
    domain: 'www.twitter.com'
  },
  {
    Component: FaFacebook,
    url: 'https://www.facebook.com/watch',
    color: '#1877F2',
    alt: 'Facebook',
    domain: 'www.facebook.com'
  },
  {
    Component: FaTwitch,
    url: 'https://www.twitch.tv',
    color: '#9146FF',
    alt: 'Twitch',
    domain: 'www.twitch.tv'
  },
  {
    Component: SiDailymotion,
    url: 'https://www.dailymotion.com',
    color: '#0066DC',
    alt: 'Dailymotion',
    domain: 'dailymotion.com'
  },
  {
    Component: SiSoundcloud,
    url: 'https://soundcloud.com',
    color: '#FF5500',
    alt: 'SoundCloud',
    domain: 'soundcloud.com'
  },
  {
    Component: SiBilibili,
    url: 'https://www.bilibili.com',
    color: '#FB7299',
    alt: 'Bilibili',
    domain: 'bilibili.com'
  },
  {
    Component: FaReddit,
    url: 'https://www.reddit.com',
    color: '#FF4500',
    alt: 'Reddit',
    domain: 'www.reddit.com'
  },
  {
    Component: FaPinterest,
    url: 'https://www.pinterest.com',
    color: '#BD081C',
    alt: 'Pinterest',
    domain: 'www.pinterest.com'
  },
  {
    Component: FaLinkedin,
    url: 'https://www.linkedin.com',
    color: '#0077B5',
    alt: 'LinkedIn',
    domain: 'www.linkedin.com'
  }
]

const copyByVariant = {
  hub: {
    eyebrow: 'Download Hub',
    title: 'Paste a link or start from a platform',
    subtitle: 'Choose a site, find your media, then download with the settings above.',
    hint: 'Video, music, and playlists'
  },
  explore: {
    eyebrow: 'Explore',
    title: 'Supported platforms',
    subtitle: 'Open any supported site from here. YouTube only opens when you choose it.',
    hint: 'Choose a platform'
  }
}

const PlatformIcons = ({ handlePlatformClick, variant = 'hub' }) => {
  const copy = copyByVariant[variant] || copyByVariant.hub

  return (
    <section className={`download-hub download-hub--${variant}`}>
      <div className="download-hub__header">
        <div>
          <p className="pnut-eyebrow">{copy.eyebrow}</p>
          <h1 className="download-hub__title">{copy.title}</h1>
          <p className="download-hub__subtitle">{copy.subtitle}</p>
        </div>
        <div className="download-hub__hint">{copy.hint}</div>
      </div>

      <div className="platform-grid">
        {SUPPORTED_PLATFORMS.map(({ Component, url, color, alt, domain }, index) => (
          <div
            key={index}
            onClick={() => handlePlatformClick(url)}
            className="platform-card d-flex"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handlePlatformClick(url)
              }
            }}
            style={{
              '--platform-color': color
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
  )
}

export default PlatformIcons
