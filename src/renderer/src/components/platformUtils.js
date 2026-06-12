/**
 * Platform detection and utility functions for multi-platform support
 */

export const PLATFORMS = {
  YOUTUBE: 'youtube',
  YOUTUBE_MUSIC: 'youtube_music',
  YOUTUBE_KIDS: 'youtube_kids',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  SNAPCHAT: 'snapchat',
  TIKTOK: 'tiktok',
  TWITTER: 'twitter',
  TWITCH: 'twitch',
  DAILYMOTION: 'dailymotion',
  BILIBILI: 'bilibili',
  REDDIT: 'reddit',
  PINTEREST: 'pinterest',
  LINKEDIN: 'linkedin',
  SOUNDCLOUD: 'soundcloud',
  VIMEO: 'vimeo',
  RUMBLE: 'rumble',
  BITCHUTE: 'bitchute',
  UNKNOWN: 'unknown'
}

/**
 * Detect platform from URL
 * @param {string} url - The URL to detect platform from
 * @returns {string} Platform identifier
 */
export const detectPlatform = (url) => {
  if (!url || typeof url !== 'string') return PLATFORMS.UNKNOWN

  const urlLower = url.toLowerCase()

  // YouTube variants
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    if (urlLower.includes('music.youtube.com')) return PLATFORMS.YOUTUBE_MUSIC
    if (urlLower.includes('youtubekids.com')) return PLATFORMS.YOUTUBE_KIDS
    return PLATFORMS.YOUTUBE
  }

  // Facebook
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('fb.watch')) {
    return PLATFORMS.FACEBOOK
  }

  // Instagram
  if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) {
    return PLATFORMS.INSTAGRAM
  }

  // Snapchat
  if (urlLower.includes('snapchat.com')) {
    return PLATFORMS.SNAPCHAT
  }

  // TikTok
  if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) {
    return PLATFORMS.TIKTOK
  }

  // Twitter/X
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('t.co')) {
    return PLATFORMS.TWITTER
  }

  // Twitch
  if (urlLower.includes('twitch.tv') || urlLower.includes('twitch.com')) {
    return PLATFORMS.TWITCH
  }

  // Dailymotion
  if (urlLower.includes('dailymotion.com') || urlLower.includes('dai.ly')) {
    return PLATFORMS.DAILYMOTION
  }

  // Bilibili
  if (urlLower.includes('bilibili.com') || urlLower.includes('b23.tv')) {
    return PLATFORMS.BILIBILI
  }

  // Reddit
  if (urlLower.includes('reddit.com')) {
    return PLATFORMS.REDDIT
  }

  // Pinterest
  if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) {
    return PLATFORMS.PINTEREST
  }

  // LinkedIn
  if (urlLower.includes('linkedin.com')) {
    return PLATFORMS.LINKEDIN
  }

  // SoundCloud
  if (urlLower.includes('soundcloud.com')) {
    return PLATFORMS.SOUNDCLOUD
  }

  // Vimeo
  if (urlLower.includes('vimeo.com')) {
    return PLATFORMS.VIMEO
  }

  // Rumble
  if (urlLower.includes('rumble.com')) {
    return PLATFORMS.RUMBLE
  }

  // BitChute
  if (urlLower.includes('bitchute.com')) {
    return PLATFORMS.BITCHUTE
  }

  return PLATFORMS.UNKNOWN
}

/**
 * Check if URL is a valid platform URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if valid platform URL
 */
export const isValidPlatformUrl = (url) => {
  const platform = detectPlatform(url)
  return platform !== PLATFORMS.UNKNOWN
}

/**
 * Check if platform is YouTube (any variant)
 * @param {string} platform - Platform identifier
 * @returns {boolean} True if YouTube variant
 */
export const isYouTubePlatform = (platform) => {
  return platform === PLATFORMS.YOUTUBE || 
         platform === PLATFORMS.YOUTUBE_MUSIC || 
         platform === PLATFORMS.YOUTUBE_KIDS
}

/**
 * Get platform display name
 * @param {string} platform - Platform identifier
 * @returns {string} Display name
 */
export const getPlatformName = (platform) => {
  const names = {
    [PLATFORMS.YOUTUBE]: 'YouTube',
    [PLATFORMS.YOUTUBE_MUSIC]: 'YouTube Music',
    [PLATFORMS.YOUTUBE_KIDS]: 'YouTube Kids',
    [PLATFORMS.FACEBOOK]: 'Facebook',
    [PLATFORMS.INSTAGRAM]: 'Instagram',
    [PLATFORMS.SNAPCHAT]: 'Snapchat',
    [PLATFORMS.TIKTOK]: 'TikTok',
    [PLATFORMS.TWITTER]: 'Twitter',
    [PLATFORMS.TWITCH]: 'Twitch',
    [PLATFORMS.DAILYMOTION]: 'Dailymotion',
    [PLATFORMS.BILIBILI]: 'Bilibili',
    [PLATFORMS.REDDIT]: 'Reddit',
    [PLATFORMS.PINTEREST]: 'Pinterest',
    [PLATFORMS.LINKEDIN]: 'LinkedIn',
    [PLATFORMS.SOUNDCLOUD]: 'SoundCloud',
    [PLATFORMS.VIMEO]: 'Vimeo',
    [PLATFORMS.RUMBLE]: 'Rumble',
    [PLATFORMS.BITCHUTE]: 'BitChute',
    [PLATFORMS.UNKNOWN]: 'Unknown'
  }
  return names[platform] || 'Unknown'
}

/**
 * Get platform base URL for navigation
 * @param {string} platform - Platform identifier
 * @returns {string} Base URL
 */
export const getPlatformUrl = (platform) => {
  const urls = {
    [PLATFORMS.YOUTUBE]: 'https://www.youtube.com',
    [PLATFORMS.YOUTUBE_MUSIC]: 'https://music.youtube.com',
    [PLATFORMS.YOUTUBE_KIDS]: 'https://www.youtubekids.com',
    [PLATFORMS.FACEBOOK]: 'https://www.facebook.com',
    [PLATFORMS.INSTAGRAM]: 'https://www.instagram.com',
    [PLATFORMS.SNAPCHAT]: 'https://www.snapchat.com/spotlight',
    [PLATFORMS.TIKTOK]: 'https://www.tiktok.com',
    [PLATFORMS.TWITTER]: 'https://twitter.com',
    [PLATFORMS.TWITCH]: 'https://www.twitch.tv',
    [PLATFORMS.DAILYMOTION]: 'https://www.dailymotion.com',
    [PLATFORMS.BILIBILI]: 'https://www.bilibili.com',
    [PLATFORMS.REDDIT]: 'https://www.reddit.com',
    [PLATFORMS.PINTEREST]: 'https://www.pinterest.com',
    [PLATFORMS.LINKEDIN]: 'https://www.linkedin.com',
    [PLATFORMS.SOUNDCLOUD]: 'https://soundcloud.com',
    [PLATFORMS.VIMEO]: 'https://vimeo.com',
    [PLATFORMS.RUMBLE]: 'https://rumble.com',
    [PLATFORMS.BITCHUTE]: 'https://www.bitchute.com'
  }
  return urls[platform] || null
}
