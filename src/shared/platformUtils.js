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

const parseHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return null

  try {
    const parsedUrl = new URL(value.trim())
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl : null
  } catch {
    return null
  }
}

const hostnameMatches = (hostname, ...domains) =>
  domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

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
  const parsedUrl = parseHttpUrl(url)
  if (!parsedUrl) return PLATFORMS.UNKNOWN

  const hostname = parsedUrl.hostname.toLowerCase()

  // YouTube variants - check this first
  if (hostnameMatches(hostname, 'youtube.com', 'youtu.be')) {
    if (hostnameMatches(hostname, 'music.youtube.com')) return PLATFORMS.YOUTUBE_MUSIC
    return PLATFORMS.YOUTUBE
  }

  // YouTube Kids standalone (if not caught above)
  if (hostnameMatches(hostname, 'youtubekids.com')) {
    return PLATFORMS.YOUTUBE_KIDS
  }

  // Reddit (check before Twitter as URLs may contain similar patterns)
  if (hostnameMatches(hostname, 'reddit.com')) {
    return PLATFORMS.REDDIT
  }

  // Pinterest (check before general patterns)
  if (hostnameMatches(hostname, 'pinterest.com', 'pin.it')) {
    return PLATFORMS.PINTEREST
  }

  // LinkedIn
  if (hostnameMatches(hostname, 'linkedin.com')) {
    return PLATFORMS.LINKEDIN
  }

  // Facebook - more flexible to catch various video URLs
  if (hostnameMatches(hostname, 'facebook.com', 'fb.com', 'fb.watch')) {
    return PLATFORMS.FACEBOOK
  }

  // Instagram
  if (hostnameMatches(hostname, 'instagram.com', 'instagr.am')) {
    return PLATFORMS.INSTAGRAM
  }

  // Snapchat
  if (hostnameMatches(hostname, 'snapchat.com')) {
    return PLATFORMS.SNAPCHAT
  }

  // TikTok
  if (hostnameMatches(hostname, 'tiktok.com')) {
    return PLATFORMS.TIKTOK
  }

  // Twitter/X (check after more specific platforms)
  if (hostnameMatches(hostname, 'twitter.com', 'x.com', 't.co')) {
    return PLATFORMS.TWITTER
  }

  // Twitch
  if (hostnameMatches(hostname, 'twitch.tv', 'twitch.com')) {
    return PLATFORMS.TWITCH
  }

  // Dailymotion
  if (hostnameMatches(hostname, 'dailymotion.com', 'dai.ly')) {
    return PLATFORMS.DAILYMOTION
  }

  // Bilibili
  if (hostnameMatches(hostname, 'bilibili.com', 'b23.tv')) {
    return PLATFORMS.BILIBILI
  }

  // SoundCloud
  if (hostnameMatches(hostname, 'soundcloud.com')) {
    return PLATFORMS.SOUNDCLOUD
  }

  // Vimeo
  if (hostnameMatches(hostname, 'vimeo.com')) {
    return PLATFORMS.VIMEO
  }

  // Rumble
  if (hostnameMatches(hostname, 'rumble.com')) {
    return PLATFORMS.RUMBLE
  }

  // BitChute
  if (hostnameMatches(hostname, 'bitchute.com')) {
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
  return (
    platform === PLATFORMS.YOUTUBE ||
    platform === PLATFORMS.YOUTUBE_MUSIC ||
    platform === PLATFORMS.YOUTUBE_KIDS
  )
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
  const platform = detectPlatform(url)
  if (platform === PLATFORMS.UNKNOWN) return false

  const urlLower = url.toLowerCase()

  // YouTube patterns
  if (
    isYouTubePlatform(platform) &&
    (urlLower.includes('youtube.com/watch') ||
      urlLower.includes('youtube.com/shorts/') ||
      urlLower.includes('youtube.com/embed/') ||
      urlLower.includes('youtu.be/') ||
      urlLower.includes('music.youtube.com') ||
      urlLower.includes('youtube.com/playlist') ||
      urlLower.includes('youtubekids.com'))
  ) {
    return true
  }

  // Facebook patterns - fb.watch is standalone video hosting
  if (platform === PLATFORMS.FACEBOOK) {
    if (
      urlLower.includes('/videos/') ||
      urlLower.includes('/watch') ||
      urlLower.includes('/reel/') ||
      urlLower.includes('/video.php')
    )
      return true
  }

  // fb.watch is always video
  if (platform === PLATFORMS.FACEBOOK && urlLower.includes('fb.watch')) {
    return true
  }

  // Instagram patterns
  if (
    platform === PLATFORMS.INSTAGRAM &&
    (urlLower.includes('instagram.com/p/') ||
      urlLower.includes('instagram.com/reel/') ||
      urlLower.includes('instagram.com/reels/') ||
      urlLower.includes('instagram.com/stories/') ||
      urlLower.includes('instagram.com/tv/') ||
      urlLower.includes('instagr.am/'))
  ) {
    return true
  }

  // Snapchat public media patterns
  if (platform === PLATFORMS.SNAPCHAT && isSnapchatMediaUrl(url)) {
    return true
  }

  // TikTok patterns
  if (
    platform === PLATFORMS.TIKTOK &&
    ((urlLower.includes('tiktok.com/@') && urlLower.includes('/video/')) ||
      urlLower.includes('vm.tiktok.com/') ||
      urlLower.includes('vt.tiktok.com/') ||
      urlLower.includes('tiktok.com/t/') ||
      urlLower.includes('tiktok.com/embed/'))
  ) {
    return true
  }

  // Twitter/X patterns
  if (
    platform === PLATFORMS.TWITTER &&
    (urlLower.includes('/status/') || urlLower.includes('t.co/'))
  ) {
    return true
  }

  // Twitch patterns
  if (
    platform === PLATFORMS.TWITCH &&
    (urlLower.includes('twitch.tv/videos/') ||
      (urlLower.includes('twitch.tv/') && urlLower.includes('/clip/')) ||
      urlLower.includes('clips.twitch.tv/'))
  ) {
    return true
  }

  // Dailymotion patterns
  if (
    platform === PLATFORMS.DAILYMOTION &&
    (urlLower.includes('dailymotion.com/video/') ||
      urlLower.includes('dailymotion.com/embed/video/') ||
      urlLower.includes('dai.ly/'))
  ) {
    return true
  }

  // Other supported platforms
  const otherPlatformPatterns = {
    [PLATFORMS.VIMEO]: ['vimeo.com/'],
    [PLATFORMS.SOUNDCLOUD]: ['soundcloud.com/'],
    [PLATFORMS.BILIBILI]: ['bilibili.com/', 'b23.tv/'],
    [PLATFORMS.RUMBLE]: ['rumble.com/v', 'rumble.com/embed/'],
    [PLATFORMS.BITCHUTE]: ['bitchute.com/video/', 'bitchute.com/embed/'],
    [PLATFORMS.REDDIT]: ['reddit.com/'],
    [PLATFORMS.PINTEREST]: ['pinterest.com/', 'pin.it/'],
    [PLATFORMS.LINKEDIN]: ['linkedin.com/']
  }
  if (otherPlatformPatterns[platform]?.some((pattern) => urlLower.includes(pattern))) return true

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
