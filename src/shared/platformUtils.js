/**
 * Unified Platform Detection and Utilities
 * Single source of truth for platform detection logic
 * Used across Main Process, Preload, and Renderer
 */

// Platform constants
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

export const SNAPCHAT_MEDIA_PATTERNS = [
  /(?:^|\/\/)(?:www\.)?snapchat\.com\/spotlight\/[^/?#]+/i,
  /(?:^|\/\/)(?:www\.)?snapchat\.com\/@[^/?#]+\/(?:spotlight|story|stories)\/[^/?#]+/i,
  /(?:^|\/\/)(?:www\.)?snapchat\.com\/stories\/[^/?#]+\/[^/?#]+/i,
  /(?:^|\/\/)story\.snapchat\.com\/(?:p|spotlight|story)\/[^/?#]+/i
]

export const isSnapchatMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  return SNAPCHAT_MEDIA_PATTERNS.some((pattern) => pattern.test(url))
}

/**
 * Detect platform from URL
 * @param {string} url - The URL to detect platform from
 * @returns {string} Platform identifier
 */
export const detectPlatform = (url) => {
  if (!url || typeof url !== 'string') return PLATFORMS.UNKNOWN

  const urlLower = url.toLowerCase()

  // YouTube variants - check this first
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    if (urlLower.includes('music.youtube.com')) return PLATFORMS.YOUTUBE_MUSIC
    if (urlLower.includes('youtubekids.com')) return PLATFORMS.YOUTUBE_KIDS
    return PLATFORMS.YOUTUBE
  }

  // YouTube Kids standalone (if not caught above)
  if (urlLower.includes('youtubekids.com')) {
    return PLATFORMS.YOUTUBE_KIDS
  }

  // Reddit (check before Twitter as URLs may contain similar patterns)
  if (urlLower.includes('reddit.com')) {
    return PLATFORMS.REDDIT
  }

  // Pinterest (check before general patterns)
  if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) {
    return PLATFORMS.PINTEREST
  }

  // LinkedIn
  if (urlLower.includes('linkedin.com')) {
    return PLATFORMS.LINKEDIN
  }

  // Facebook - more flexible to catch various video URLs
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

  // Twitter/X (check after more specific platforms)
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
 * @returns {string|null} Base URL
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

/**
 * Check if URL is a downloadable video URL
 * @param {string} url - The URL to check
 * @returns {boolean} True if downloadable
 */
export const isDownloadableVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  
  const urlLower = url.toLowerCase()
  
  // YouTube patterns
  if (urlLower.includes('youtube.com/watch') || 
      urlLower.includes('youtube.com/shorts/') ||
      urlLower.includes('youtube.com/embed/') ||
      urlLower.includes('youtu.be/') ||
      urlLower.includes('music.youtube.com') ||
      urlLower.includes('youtube.com/playlist') ||
      urlLower.includes('youtubekids.com')) {
    return true
  }
  
  // Facebook patterns - fb.watch is standalone video hosting
  if (urlLower.includes('facebook.com/') || urlLower.includes('fb.com/')) {
    if (urlLower.includes('/videos/') || urlLower.includes('/watch') || urlLower.includes('/reel/')) return true
  }
  
  // fb.watch is always video
  if (urlLower.includes('fb.watch')) {
    return true
  }
  
  // Instagram patterns
  if (urlLower.includes('instagram.com/p/') ||
      urlLower.includes('instagram.com/reels/') ||
      urlLower.includes('instagram.com/stories/') ||
      urlLower.includes('instagr.am/')) {
    return true
  }

  // Snapchat public media patterns
  if (isSnapchatMediaUrl(url)) {
    return true
  }
  
  // TikTok patterns
  if ((urlLower.includes('tiktok.com/@') && urlLower.includes('/video/')) ||
      urlLower.includes('vm.tiktok.com/')) {
    return true
  }
  
  // Twitter/X patterns
  if ((urlLower.includes('twitter.com/') || urlLower.includes('x.com/') || urlLower.includes('t.co/')) && 
      urlLower.includes('/status/')) {
    return true
  }
  
  // Twitch patterns
  if (urlLower.includes('twitch.tv/videos/') ||
      (urlLower.includes('twitch.tv/') && urlLower.includes('/clip/'))) {
    return true
  }
  
  // Dailymotion patterns
  if (urlLower.includes('dailymotion.com/video/') ||
      urlLower.includes('dai.ly/')) {
    return true
  }
  
  // Other supported platforms
  if (urlLower.includes('vimeo.com/') ||
      urlLower.includes('soundcloud.com/') ||
      urlLower.includes('bilibili.com/') ||
      urlLower.includes('rumble.com/v') ||
      urlLower.includes('bitchute.com/video/') ||
      urlLower.includes('reddit.com/') ||
      urlLower.includes('pinterest.com/') ||
      urlLower.includes('linkedin.com/')) {
    return true
  }

  return false
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export const extractVideoId = (url) => {
  if (!url) return null
  
  // Handle various YouTube URL formats
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([^&\s?]+)/,
    // Short URL: youtu.be/VIDEO_ID
    /youtu\.be\/([^&\s?]+)/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^&\s?]+)/,
    // Music URL: music.youtube.com/watch?v=VIDEO_ID
    /music\.youtube\.com\/watch\?.*v=([^&\s]+)/,
    // Playlist URL: youtube.com/playlist?list=PLAYLIST_ID
    /youtube\.com\/playlist\?.*list=([^&\s]+)/,
    // YouTube Kids
    /youtubekids\.com\/watch\?v=([^&\s]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Extract playlist ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Playlist ID or null
 */
export const extractPlaylistId = (url) => {
  if (!url) return null
  
  const patterns = [
    // Standard playlist: youtube.com/playlist?list=PLAYLIST_ID
    /(?:youtube\.com|music\.youtube\.com|youtu\.be|youtube\.googleapis\.com|youtubekids\.com)\/(?:playlist|watch)?.*?[?&]list=([^&#]+)/i,
    // Watch with playlist: youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
    /[?&]list=([^&#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}
