/**
 * Unit Tests for PlatformService
 * Tests all supported platforms detection and URL validation
 */

const {
  detectPlatform,
  isYouTubePlatform,
  isDownloadableVideoUrl,
  getPlatformName,
  extractVideoId,
  extractPlaylistId,
  getPlatformUrl,
  PLATFORMS
} = require('../src/shared/platformUtils')

describe('PlatformService', () => {
  // ==================== YouTube Tests ====================
  describe('YouTube Platform Detection', () => {
    it('should detect YouTube standard URLs', () => {
      expect(detectPlatform('https://www.youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE)
      expect(detectPlatform('https://youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE)
      expect(detectPlatform('http://www.youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE)
    })

    it('should detect YouTube Shorts', () => {
      expect(detectPlatform('https://www.youtube.com/shorts/abc123')).toBe(PLATFORMS.YOUTUBE)
      expect(detectPlatform('https://youtube.com/shorts/xyz789')).toBe(PLATFORMS.YOUTUBE)
    })

    it('should detect YouTube embed URLs', () => {
      expect(detectPlatform('https://www.youtube.com/embed/abc123')).toBe(PLATFORMS.YOUTUBE)
    })

    it('should detect youtu.be short URLs', () => {
      expect(detectPlatform('https://youtu.be/abc123')).toBe(PLATFORMS.YOUTUBE)
      expect(detectPlatform('http://youtu.be/abc123')).toBe(PLATFORMS.YOUTUBE)
      expect(detectPlatform('https://youtu.be/abc123?feature=share')).toBe(PLATFORMS.YOUTUBE)
    })

    it('should detect YouTube playlist URLs', () => {
      expect(detectPlatform('https://www.youtube.com/playlist?list=PL123456')).toBe(PLATFORMS.YOUTUBE)
      expect(detectPlatform('https://youtube.com/playlist?list=PLABC')).toBe(PLATFORMS.YOUTUBE)
    })

    it('should detect YouTube live URLs', () => {
      expect(detectPlatform('https://www.youtube.com/watch?v=abc123&live=1')).toBe(PLATFORMS.YOUTUBE)
    })
  })

  // ==================== YouTube Music Tests ====================
  describe('YouTube Music Platform Detection', () => {
    it('should detect YouTube Music URLs', () => {
      expect(detectPlatform('https://music.youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE_MUSIC)
      expect(detectPlatform('https://music.youtube.com/playlist?list=PL123')).toBe(PLATFORMS.YOUTUBE_MUSIC)
    })

    it('isYouTubePlatform should return true for YouTube Music', () => {
      expect(isYouTubePlatform(PLATFORMS.YOUTUBE_MUSIC)).toBe(true)
    })
  })

  // ==================== YouTube Kids Tests ====================
  describe('YouTube Kids Platform Detection', () => {
    it('should detect YouTube Kids URLs', () => {
      expect(detectPlatform('https://www.youtubekids.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE_KIDS)
      expect(detectPlatform('https://youtubekids.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE_KIDS)
    })

    it('isYouTubePlatform should return true for YouTube Kids', () => {
      expect(isYouTubePlatform(PLATFORMS.YOUTUBE_KIDS)).toBe(true)
    })
  })

  // ==================== Facebook Tests ====================
  describe('Facebook Platform Detection', () => {
    it('should detect Facebook watch URLs', () => {
      expect(detectPlatform('https://www.facebook.com/watch/video123')).toBe(PLATFORMS.FACEBOOK)
      expect(detectPlatform('https://facebook.com/watch/123456789')).toBe(PLATFORMS.FACEBOOK)
    })

    it('should detect Facebook video URLs', () => {
      expect(detectPlatform('https://www.facebook.com/username/videos/123456789')).toBe(PLATFORMS.FACEBOOK)
    })

    it('should detect fb.com URLs', () => {
      expect(detectPlatform('https://fb.com/watch/video123')).toBe(PLATFORMS.FACEBOOK)
    })

    it('should detect fb.watch URLs', () => {
      expect(detectPlatform('https://fb.watch/abc123')).toBe(PLATFORMS.FACEBOOK)
    })

    it('should detect Facebook reel/shorts', () => {
      expect(detectPlatform('https://www.facebook.com/reel/123456')).toBe(PLATFORMS.FACEBOOK)
    })
  })

  // ==================== Instagram Tests ====================
  describe('Instagram Platform Detection', () => {
    it('should detect Instagram post URLs', () => {
      expect(detectPlatform('https://www.instagram.com/p/abc123/')).toBe(PLATFORMS.INSTAGRAM)
      expect(detectPlatform('https://instagram.com/p/xyz789/')).toBe(PLATFORMS.INSTAGRAM)
    })

    it('should detect Instagram reel URLs', () => {
      expect(detectPlatform('https://www.instagram.com/reels/abc123')).toBe(PLATFORMS.INSTAGRAM)
      expect(detectPlatform('https://instagram.com/reels/xyz789')).toBe(PLATFORMS.INSTAGRAM)
    })

    it('should detect Instagram story URLs', () => {
      expect(detectPlatform('https://www.instagram.com/stories/username/123456789')).toBe(PLATFORMS.INSTAGRAM)
    })

    it('should detect instagr.am short URLs', () => {
      expect(detectPlatform('https://instagr.am/p/abc123/')).toBe(PLATFORMS.INSTAGRAM)
    })

    it('should detect IGTV URLs', () => {
      expect(detectPlatform('https://www.instagram.com/tv/abc123/')).toBe(PLATFORMS.INSTAGRAM)
    })
  })

  // ==================== Snapchat Tests ====================
  describe('Snapchat Platform Detection', () => {
    it('should detect Snapchat Spotlight URLs', () => {
      expect(detectPlatform('https://www.snapchat.com/spotlight/abc123xyz')).toBe(PLATFORMS.SNAPCHAT)
      expect(detectPlatform('https://snapchat.com/spotlight/Snap123')).toBe(PLATFORMS.SNAPCHAT)
    })

    it('should detect Snapchat story URLs', () => {
      expect(detectPlatform('https://www.snapchat.com/stories/publisher/abc123')).toBe(PLATFORMS.SNAPCHAT)
      expect(detectPlatform('https://story.snapchat.com/p/abc123')).toBe(PLATFORMS.SNAPCHAT)
    })
  })

  // ==================== TikTok Tests ====================
  describe('TikTok Platform Detection', () => {
    it('should detect TikTok video URLs', () => {
      expect(detectPlatform('https://www.tiktok.com/@username/video/1234567890')).toBe(PLATFORMS.TIKTOK)
      expect(detectPlatform('https://tiktok.com/@user/video/123456')).toBe(PLATFORMS.TIKTOK)
    })

    it('should detect vm.tiktok.com short URLs', () => {
      expect(detectPlatform('https://vm.tiktok.com/ZMhabc123/')).toBe(PLATFORMS.TIKTOK)
      expect(detectPlatform('http://vm.tiktok.com/ZMxyz789/')).toBe(PLATFORMS.TIKTOK)
    })

    it('should detect TikTok embed URLs', () => {
      expect(detectPlatform('https://www.tiktok.com/embed/v1/1234567890')).toBe(PLATFORMS.TIKTOK)
    })
  })

  // ==================== Twitter/X Tests ====================
  describe('Twitter/X Platform Detection', () => {
    it('should detect Twitter status URLs', () => {
      expect(detectPlatform('https://twitter.com/username/status/1234567890')).toBe(PLATFORMS.TWITTER)
      expect(detectPlatform('https://twitter.com/user/status/1234567890123456789')).toBe(PLATFORMS.TWITTER)
    })

    it('should detect X.com URLs', () => {
      expect(detectPlatform('https://x.com/username/status/1234567890')).toBe(PLATFORMS.TWITTER)
      expect(detectPlatform('https://x.com/user/status/1234567890123456789')).toBe(PLATFORMS.TWITTER)
    })

    it('should detect t.co short URLs', () => {
      expect(detectPlatform('https://t.co/abc123xyz')).toBe(PLATFORMS.TWITTER)
    })

    it('should detect Twitter video URLs', () => {
      expect(detectPlatform('https://twitter.com/i/status/1234567890')).toBe(PLATFORMS.TWITTER)
    })
  })

  // ==================== Twitch Tests ====================
  describe('Twitch Platform Detection', () => {
    it('should detect Twitch video URLs', () => {
      expect(detectPlatform('https://www.twitch.tv/videos/1234567890')).toBe(PLATFORMS.TWITCH)
      expect(detectPlatform('https://twitch.tv/videos/123456')).toBe(PLATFORMS.TWITCH)
    })

    it('should detect Twitch clip URLs', () => {
      expect(detectPlatform('https://www.twitch.tv/username/clip/abc123')).toBe(PLATFORMS.TWITCH)
      expect(detectPlatform('https://twitch.tv/clip/xyz789')).toBe(PLATFORMS.TWITCH)
    })
  })

  // ==================== Dailymotion Tests ====================
  describe('Dailymotion Platform Detection', () => {
    it('should detect Dailymotion video URLs', () => {
      expect(detectPlatform('https://www.dailymotion.com/video/x123456')).toBe(PLATFORMS.DAILYMOTION)
      expect(detectPlatform('https://dailymotion.com/video/x789abc')).toBe(PLATFORMS.DAILYMOTION)
    })

    it('should detect dai.ly short URLs', () => {
      expect(detectPlatform('https://dai.ly/x123456')).toBe(PLATFORMS.DAILYMOTION)
      expect(detectPlatform('http://dai.ly/xabc123')).toBe(PLATFORMS.DAILYMOTION)
    })
  })

  // ==================== Bilibili Tests ====================
  describe('Bilibili Platform Detection', () => {
    it('should detect Bilibili video URLs', () => {
      expect(detectPlatform('https://www.bilibili.com/video/BV1234567890')).toBe(PLATFORMS.BILIBILI)
      expect(detectPlatform('https://bilibili.com/video/av12345678')).toBe(PLATFORMS.BILIBILI)
    })

    it('should detect Bilibili short URLs', () => {
      expect(detectPlatform('https://b23.tv/abc123')).toBe(PLATFORMS.BILIBILI)
    })
  })

  // ==================== Reddit Tests ====================
  describe('Reddit Platform Detection', () => {
    it('should detect Reddit post URLs', () => {
      expect(detectPlatform('https://www.reddit.com/r/funny/comments/abc123/some_post_title/')).toBe(PLATFORMS.REDDIT)
      expect(detectPlatform('https://reddit.com/r/programming/comments/xyz789/')).toBe(PLATFORMS.REDDIT)
    })

    it('should detect Reddit video URLs', () => {
      expect(detectPlatform('https://www.reddit.com/r/videos/comments/abc123/')).toBe(PLATFORMS.REDDIT)
    })
  })

  // ==================== Pinterest Tests ====================
  describe('Pinterest Platform Detection', () => {
    it('should detect Pinterest URLs', () => {
      expect(detectPlatform('https://www.pinterest.com/pin/1234567890/')).toBe(PLATFORMS.PINTEREST)
      expect(detectPlatform('https://pinterest.com/pin/abc123/')).toBe(PLATFORMS.PINTEREST)
    })

    it('should detect pin.it short URLs', () => {
      expect(detectPlatform('https://pin.it/abc123xyz')).toBe(PLATFORMS.PINTEREST)
    })
  })

  // ==================== LinkedIn Tests ====================
  describe('LinkedIn Platform Detection', () => {
    it('should detect LinkedIn video URLs', () => {
      expect(detectPlatform('https://www.linkedin.com/posts/username_1234567890')).toBe(PLATFORMS.LINKEDIN)
      expect(detectPlatform('https://linkedin.com/feed/update/urn:li:activity:1234567890')).toBe(PLATFORMS.LINKEDIN)
    })
  })

  // ==================== SoundCloud Tests ====================
  describe('SoundCloud Platform Detection', () => {
    it('should detect SoundCloud URLs', () => {
      expect(detectPlatform('https://soundcloud.com/username/track-name')).toBe(PLATFORMS.SOUNDCLOUD)
      expect(detectPlatform('https://www.soundcloud.com/artist/title')).toBe(PLATFORMS.SOUNDCLOUD)
    })
  })

  // ==================== Spotify Tests ====================
  describe('Spotify Platform Detection', () => {
    it('should detect Spotify media URLs', () => {
      expect(detectPlatform('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe(PLATFORMS.SPOTIFY)
      expect(detectPlatform('https://open.spotify.com/episode/5V9n8WGY1jR9b1zA3abcde')).toBe(PLATFORMS.SPOTIFY)
      expect(detectPlatform('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(PLATFORMS.SPOTIFY)
    })

    it('should detect Spotify short links', () => {
      expect(detectPlatform('https://spotify.link/abc123xyz')).toBe(PLATFORMS.SPOTIFY)
    })
  })

  // ==================== Vimeo Tests ====================
  describe('Vimeo Platform Detection', () => {
    it('should detect Vimeo URLs', () => {
      expect(detectPlatform('https://vimeo.com/123456789')).toBe(PLATFORMS.VIMEO)
      expect(detectPlatform('https://www.vimeo.com/abc123456')).toBe(PLATFORMS.VIMEO)
    })

    it('should detect Vimeo channel URLs', () => {
      expect(detectPlatform('https://vimeo.com/channels/123456')).toBe(PLATFORMS.VIMEO)
    })
  })

  // ==================== Rumble Tests ====================
  describe('Rumble Platform Detection', () => {
    it('should detect Rumble video URLs', () => {
      expect(detectPlatform('https://rumble.com/vabc123/video-title.html')).toBe(PLATFORMS.RUMBLE)
      expect(detectPlatform('https://www.rumble.com/vxyz789-title.html')).toBe(PLATFORMS.RUMBLE)
    })
  })

  // ==================== BitChute Tests ====================
  describe('BitChute Platform Detection', () => {
    it('should detect BitChute video URLs', () => {
      expect(detectPlatform('https://www.bitchute.com/video/abc123456789/')).toBe(PLATFORMS.BITCHUTE)
      expect(detectPlatform('https://bitchute.com/video/xyz789/')).toBe(PLATFORMS.BITCHUTE)
    })
  })

  // ==================== Invalid/Unknown Tests ====================
  describe('Invalid URL Detection', () => {
    it('should return UNKNOWN for invalid URLs', () => {
      expect(detectPlatform('https://example.com')).toBe(PLATFORMS.UNKNOWN)
      expect(detectPlatform('https://google.com')).toBe(PLATFORMS.UNKNOWN)
      expect(detectPlatform('https://amazon.com')).toBe(PLATFORMS.UNKNOWN)
    })

    it('should return UNKNOWN for empty/null/undefined', () => {
      expect(detectPlatform('')).toBe(PLATFORMS.UNKNOWN)
      expect(detectPlatform(null)).toBe(PLATFORMS.UNKNOWN)
      expect(detectPlatform(undefined)).toBe(PLATFORMS.UNKNOWN)
    })

    it('should handle non-string input', () => {
      expect(detectPlatform(123)).toBe(PLATFORMS.UNKNOWN)
      expect(detectPlatform({})).toBe(PLATFORMS.UNKNOWN)
      expect(detectPlatform([])).toBe(PLATFORMS.UNKNOWN)
    })
  })

  // ==================== isYouTubePlatform Tests ====================
  describe('isYouTubePlatform', () => {
    it('should return true for YouTube variants', () => {
      expect(isYouTubePlatform(PLATFORMS.YOUTUBE)).toBe(true)
      expect(isYouTubePlatform(PLATFORMS.YOUTUBE_MUSIC)).toBe(true)
      expect(isYouTubePlatform(PLATFORMS.YOUTUBE_KIDS)).toBe(true)
    })

    it('should return false for non-YouTube platforms', () => {
      expect(isYouTubePlatform(PLATFORMS.FACEBOOK)).toBe(false)
      expect(isYouTubePlatform(PLATFORMS.INSTAGRAM)).toBe(false)
      expect(isYouTubePlatform(PLATFORMS.TIKTOK)).toBe(false)
      expect(isYouTubePlatform(PLATFORMS.TWITTER)).toBe(false)
      expect(isYouTubePlatform(PLATFORMS.UNKNOWN)).toBe(false)
    })
  })

  // ==================== getPlatformName Tests ====================
  describe('getPlatformName', () => {
    it('should return correct platform names', () => {
      expect(getPlatformName(PLATFORMS.YOUTUBE)).toBe('YouTube')
      expect(getPlatformName(PLATFORMS.YOUTUBE_MUSIC)).toBe('YouTube Music')
      expect(getPlatformName(PLATFORMS.YOUTUBE_KIDS)).toBe('YouTube Kids')
      expect(getPlatformName(PLATFORMS.FACEBOOK)).toBe('Facebook')
      expect(getPlatformName(PLATFORMS.INSTAGRAM)).toBe('Instagram')
      expect(getPlatformName(PLATFORMS.SNAPCHAT)).toBe('Snapchat')
      expect(getPlatformName(PLATFORMS.TIKTOK)).toBe('TikTok')
      expect(getPlatformName(PLATFORMS.TWITTER)).toBe('Twitter')
      expect(getPlatformName(PLATFORMS.TWITCH)).toBe('Twitch')
      expect(getPlatformName(PLATFORMS.DAILYMOTION)).toBe('Dailymotion')
      expect(getPlatformName(PLATFORMS.BILIBILI)).toBe('Bilibili')
      expect(getPlatformName(PLATFORMS.REDDIT)).toBe('Reddit')
      expect(getPlatformName(PLATFORMS.PINTEREST)).toBe('Pinterest')
      expect(getPlatformName(PLATFORMS.LINKEDIN)).toBe('LinkedIn')
      expect(getPlatformName(PLATFORMS.SOUNDCLOUD)).toBe('SoundCloud')
      expect(getPlatformName(PLATFORMS.SPOTIFY)).toBe('Spotify')
      expect(getPlatformName(PLATFORMS.VIMEO)).toBe('Vimeo')
      expect(getPlatformName(PLATFORMS.RUMBLE)).toBe('Rumble')
      expect(getPlatformName(PLATFORMS.BITCHUTE)).toBe('BitChute')
      expect(getPlatformName(PLATFORMS.UNKNOWN)).toBe('Unknown')
    })

    it('should return Unknown for invalid platform', () => {
      expect(getPlatformName('invalid')).toBe('Unknown')
      expect(getPlatformName('')).toBe('Unknown')
    })
  })

  // ==================== getPlatformUrl Tests ====================
  describe('getPlatformUrl', () => {
    it('should return correct platform URLs', () => {
      expect(getPlatformUrl(PLATFORMS.YOUTUBE)).toBe('https://www.youtube.com')
      expect(getPlatformUrl(PLATFORMS.YOUTUBE_MUSIC)).toBe('https://music.youtube.com')
      expect(getPlatformUrl(PLATFORMS.YOUTUBE_KIDS)).toBe('https://www.youtubekids.com')
      expect(getPlatformUrl(PLATFORMS.FACEBOOK)).toBe('https://www.facebook.com')
      expect(getPlatformUrl(PLATFORMS.INSTAGRAM)).toBe('https://www.instagram.com')
      expect(getPlatformUrl(PLATFORMS.SNAPCHAT)).toBe('https://www.snapchat.com/spotlight')
      expect(getPlatformUrl(PLATFORMS.TIKTOK)).toBe('https://www.tiktok.com')
      expect(getPlatformUrl(PLATFORMS.TWITTER)).toBe('https://twitter.com')
      expect(getPlatformUrl(PLATFORMS.SPOTIFY)).toBe('https://open.spotify.com')
    })

    it('should return null for unknown platform', () => {
      expect(getPlatformUrl(PLATFORMS.UNKNOWN)).toBeNull()
      expect(getPlatformUrl('invalid')).toBeNull()
    })
  })

  // ==================== extractVideoId Tests ====================
  describe('extractVideoId', () => {
    it('should extract video ID from standard watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=abc123def456')).toBe('abc123def456')
      expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from shorts URL', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/abc123')).toBe('abc123')
    })

    it('should extract video ID from youtu.be URL', () => {
      expect(extractVideoId('https://youtu.be/abc123')).toBe('abc123')
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/abc123')).toBe('abc123')
    })

    it('should extract video ID from music.youtube.com', () => {
      expect(extractVideoId('https://music.youtube.com/watch?v=abc123')).toBe('abc123')
      expect(extractVideoId('https://music.youtube.com/watch?v=abc123&list=PL123')).toBe('abc123')
    })

    it('should return null for invalid URLs', () => {
      expect(extractVideoId('https://example.com')).toBeNull()
      expect(extractVideoId('')).toBeNull()
      expect(extractVideoId(null)).toBeNull()
      expect(extractVideoId(undefined)).toBeNull()
    })
  })

  // ==================== extractPlaylistId Tests ====================
  describe('extractPlaylistId', () => {
    it('should extract playlist ID from playlist URL', () => {
      expect(extractPlaylistId('https://www.youtube.com/playlist?list=PL123456789')).toBe('PL123456789')
      expect(extractPlaylistId('https://youtube.com/playlist?list=PLABC')).toBe('PLABC')
    })

    it('should extract playlist ID from watch URL with playlist', () => {
      expect(extractPlaylistId('https://www.youtube.com/watch?v=abc123&list=PL123456')).toBe('PL123456')
      expect(extractPlaylistId('https://music.youtube.com/watch?v=abc123&list=PLABC')).toBe('PLABC')
    })

    it('should return null for URLs without playlist', () => {
      expect(extractPlaylistId('https://www.youtube.com/watch?v=abc123')).toBeNull()
      expect(extractPlaylistId('https://example.com')).toBeNull()
    })
  })

  // ==================== isDownloadableVideoUrl Tests ====================
  describe('isDownloadableVideoUrl', () => {
    it('should return true for YouTube URLs', () => {
      expect(isDownloadableVideoUrl('https://www.youtube.com/watch?v=abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.youtube.com/shorts/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://youtu.be/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://music.youtube.com/watch?v=abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.youtube.com/playlist?list=PL123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.youtubekids.com/watch?v=abc123')).toBe(true)
    })

    it('should return true for Facebook URLs', () => {
      expect(isDownloadableVideoUrl('https://www.facebook.com/watch/video123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.facebook.com/username/videos/123')).toBe(true)
      expect(isDownloadableVideoUrl('https://fb.com/watch/video123')).toBe(true)
      expect(isDownloadableVideoUrl('https://fb.watch/abc123')).toBe(true)
    })

    it('should return true for Instagram URLs', () => {
      expect(isDownloadableVideoUrl('https://www.instagram.com/p/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.instagram.com/reels/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.instagram.com/stories/user/123')).toBe(true)
      expect(isDownloadableVideoUrl('https://instagr.am/p/abc123')).toBe(true)
    })

    it('should return true for Snapchat public media URLs', () => {
      expect(isDownloadableVideoUrl('https://www.snapchat.com/spotlight/abc123xyz')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.snapchat.com/stories/publisher/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://story.snapchat.com/p/abc123')).toBe(true)
    })

    it('should return true for TikTok URLs', () => {
      expect(isDownloadableVideoUrl('https://www.tiktok.com/@user/video/123')).toBe(true)
      expect(isDownloadableVideoUrl('https://vm.tiktok.com/ZMabc123')).toBe(true)
    })

    it('should return true for Twitter/X URLs', () => {
      expect(isDownloadableVideoUrl('https://twitter.com/user/status/1234567890')).toBe(true)
      expect(isDownloadableVideoUrl('https://x.com/user/status/1234567890')).toBe(true)
    })

    it('should return true for Twitch URLs', () => {
      expect(isDownloadableVideoUrl('https://www.twitch.tv/videos/1234567')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.twitch.tv/user/clip/abc123')).toBe(true)
    })

    it('should return true for Dailymotion URLs', () => {
      expect(isDownloadableVideoUrl('https://www.dailymotion.com/video/x123456')).toBe(true)
      expect(isDownloadableVideoUrl('https://dai.ly/xabc123')).toBe(true)
    })

    it('should return true for other supported platforms', () => {
      expect(isDownloadableVideoUrl('https://vimeo.com/123456789')).toBe(true)
      expect(isDownloadableVideoUrl('https://soundcloud.com/user/track')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.bilibili.com/video/BV1234567890')).toBe(true)
      expect(isDownloadableVideoUrl('https://rumble.com/vabc123/video.html')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.bitchute.com/video/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.reddit.com/r/videos/comments/abc123')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.pinterest.com/pin/123456')).toBe(true)
      expect(isDownloadableVideoUrl('https://www.linkedin.com/posts/user_123456')).toBe(true)
    })

    it('should return true for Spotify media URLs', () => {
      expect(isDownloadableVideoUrl('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe(true)
      expect(isDownloadableVideoUrl('https://open.spotify.com/episode/5V9n8WGY1jR9b1zA3abcde')).toBe(true)
      expect(isDownloadableVideoUrl('https://open.spotify.com/show/1abc234def567ghi890jkl')).toBe(true)
      expect(isDownloadableVideoUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(true)
      expect(isDownloadableVideoUrl('https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX')).toBe(true)
      expect(isDownloadableVideoUrl('https://spotify.link/abc123xyz')).toBe(true)
    })

    it('should return false for non-video URLs', () => {
      expect(isDownloadableVideoUrl('https://example.com')).toBe(false)
      expect(isDownloadableVideoUrl('https://google.com')).toBe(false)
      expect(isDownloadableVideoUrl('https://www.snapchat.com/add/someuser')).toBe(false)
      expect(isDownloadableVideoUrl('https://open.spotify.com')).toBe(false)
      expect(isDownloadableVideoUrl('')).toBe(false)
    })

    it('should handle null/undefined/empty', () => {
      expect(isDownloadableVideoUrl(null)).toBe(false)
      expect(isDownloadableVideoUrl(undefined)).toBe(false)
      expect(isDownloadableVideoUrl('')).toBe(false)
    })
  })
})
