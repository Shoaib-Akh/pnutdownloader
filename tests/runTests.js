/**
 * Platform Detection Test Runner
 * Manual test runner for platform detection functions
 * Run with: node tests/runTests.js
 */

// Import platform utilities
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

// Test results tracking
let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${description}`)
    passed++
  } catch (error) {
    console.log(`❌ FAIL: ${description}`)
    console.log(`   Error: ${error.message}`)
    failed++
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toBeTrue: () => {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`)
      }
    },
    toBeFalse: () => {
      if (actual !== false) {
        throw new Error(`Expected false, got ${actual}`)
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`)
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`)
      }
    }
  }
}

console.log('\n========== PLATFORM DETECTION TESTS ==========\n')

// ==================== YouTube Tests ====================
console.log('--- YouTube Platform Detection ---')

test('detect YouTube standard URLs', () => {
  expect(detectPlatform('https://www.youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE)
  expect(detectPlatform('https://youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE)
})

test('detect YouTube Shorts', () => {
  expect(detectPlatform('https://www.youtube.com/shorts/abc123')).toBe(PLATFORMS.YOUTUBE)
})

test('detect youtu.be short URLs', () => {
  expect(detectPlatform('https://youtu.be/abc123')).toBe(PLATFORMS.YOUTUBE)
})

test('detect YouTube playlist URLs', () => {
  expect(detectPlatform('https://www.youtube.com/playlist?list=PL123456')).toBe(PLATFORMS.YOUTUBE)
})

// ==================== YouTube Music Tests ====================
console.log('\n--- YouTube Music ---')

test('detect YouTube Music URLs', () => {
  expect(detectPlatform('https://music.youtube.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE_MUSIC)
})

test('isYouTubePlatform returns true for YouTube Music', () => {
  expect(isYouTubePlatform(PLATFORMS.YOUTUBE_MUSIC)).toBeTrue()
})

// ==================== YouTube Kids Tests ====================
console.log('\n--- YouTube Kids ---')

test('detect YouTube Kids URLs', () => {
  expect(detectPlatform('https://www.youtubekids.com/watch?v=abc123')).toBe(PLATFORMS.YOUTUBE_KIDS)
})

// ==================== Facebook Tests ====================
console.log('\n--- Facebook ---')

test('detect Facebook watch URLs', () => {
  expect(detectPlatform('https://www.facebook.com/watch/video123')).toBe(PLATFORMS.FACEBOOK)
  expect(detectPlatform('https://fb.com/watch/video123')).toBe(PLATFORMS.FACEBOOK)
  expect(detectPlatform('https://fb.watch/abc123')).toBe(PLATFORMS.FACEBOOK)
})

// ==================== Instagram Tests ====================
console.log('\n--- Instagram ---')

test('detect Instagram post URLs', () => {
  expect(detectPlatform('https://www.instagram.com/p/abc123/')).toBe(PLATFORMS.INSTAGRAM)
})

test('detect Instagram reel URLs', () => {
  expect(detectPlatform('https://www.instagram.com/reels/abc123')).toBe(PLATFORMS.INSTAGRAM)
})

test('detect Instagram story URLs', () => {
  expect(detectPlatform('https://www.instagram.com/stories/username/123456789')).toBe(PLATFORMS.INSTAGRAM)
})

test('detect instagr.am short URLs', () => {
  expect(detectPlatform('https://instagr.am/p/abc123/')).toBe(PLATFORMS.INSTAGRAM)
})

// ==================== Snapchat Tests ====================
console.log('\n--- Snapchat ---')

test('detect Snapchat public media URLs', () => {
  expect(detectPlatform('https://www.snapchat.com/spotlight/abc123xyz')).toBe(PLATFORMS.SNAPCHAT)
  expect(detectPlatform('https://www.snapchat.com/@snapchat/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYenNyd3VhbWF2AZzn2zDlAZzn2zDQAAAAAQ')).toBe(PLATFORMS.SNAPCHAT)
  expect(detectPlatform('https://www.snapchat.com/@publisher/story/abc123')).toBe(PLATFORMS.SNAPCHAT)
  expect(detectPlatform('https://story.snapchat.com/p/abc123')).toBe(PLATFORMS.SNAPCHAT)
})

// ==================== TikTok Tests ====================
console.log('\n--- TikTok ---')

test('detect TikTok video URLs', () => {
  expect(detectPlatform('https://www.tiktok.com/@username/video/1234567890')).toBe(PLATFORMS.TIKTOK)
})

test('detect vm.tiktok.com short URLs', () => {
  expect(detectPlatform('https://vm.tiktok.com/ZMhabc123/')).toBe(PLATFORMS.TIKTOK)
})

// ==================== Twitter/X Tests ====================
console.log('\n--- Twitter/X ---')

test('detect Twitter status URLs', () => {
  expect(detectPlatform('https://twitter.com/username/status/1234567890')).toBe(PLATFORMS.TWITTER)
})

test('detect X.com URLs', () => {
  expect(detectPlatform('https://x.com/username/status/1234567890')).toBe(PLATFORMS.TWITTER)
})

test('detect t.co short URLs', () => {
  expect(detectPlatform('https://t.co/abc123xyz')).toBe(PLATFORMS.TWITTER)
})

// ==================== Twitch Tests ====================
console.log('\n--- Twitch ---')

test('detect Twitch video URLs', () => {
  expect(detectPlatform('https://www.twitch.tv/videos/1234567890')).toBe(PLATFORMS.TWITCH)
})

test('detect Twitch clip URLs', () => {
  expect(detectPlatform('https://www.twitch.tv/username/clip/abc123')).toBe(PLATFORMS.TWITCH)
})

// ==================== Dailymotion Tests ====================
console.log('\n--- Dailymotion ---')

test('detect Dailymotion video URLs', () => {
  expect(detectPlatform('https://www.dailymotion.com/video/x123456')).toBe(PLATFORMS.DAILYMOTION)
})

test('detect dai.ly short URLs', () => {
  expect(detectPlatform('https://dai.ly/x123456')).toBe(PLATFORMS.DAILYMOTION)
})

// ==================== Bilibili Tests ====================
console.log('\n--- Bilibili ---')

test('detect Bilibili video URLs', () => {
  expect(detectPlatform('https://www.bilibili.com/video/BV1234567890')).toBe(PLATFORMS.BILIBILI)
})

test('detect Bilibili short URLs', () => {
  expect(detectPlatform('https://b23.tv/abc123')).toBe(PLATFORMS.BILIBILI)
})

// ==================== Reddit Tests ====================
console.log('\n--- Reddit ---')

test('detect Reddit post URLs', () => {
  expect(detectPlatform('https://www.reddit.com/r/funny/comments/abc123/')).toBe(PLATFORMS.REDDIT)
})

// ==================== Pinterest Tests ====================
console.log('\n--- Pinterest ---')

test('detect Pinterest URLs', () => {
  expect(detectPlatform('https://www.pinterest.com/pin/1234567890/')).toBe(PLATFORMS.PINTEREST)
})

test('detect pin.it short URLs', () => {
  expect(detectPlatform('https://pin.it/abc123xyz')).toBe(PLATFORMS.PINTEREST)
})

// ==================== LinkedIn Tests ====================
console.log('\n--- LinkedIn ---')

test('detect LinkedIn video URLs', () => {
  expect(detectPlatform('https://www.linkedin.com/posts/username_1234567890')).toBe(PLATFORMS.LINKEDIN)
})

// ==================== SoundCloud Tests ====================
console.log('\n--- SoundCloud ---')

test('detect SoundCloud URLs', () => {
  expect(detectPlatform('https://soundcloud.com/username/track-name')).toBe(PLATFORMS.SOUNDCLOUD)
})

// ==================== Vimeo Tests ====================
console.log('\n--- Vimeo ---')

test('detect Vimeo URLs', () => {
  expect(detectPlatform('https://vimeo.com/123456789')).toBe(PLATFORMS.VIMEO)
})

// ==================== Rumble Tests ====================
console.log('\n--- Rumble ---')

test('detect Rumble video URLs', () => {
  expect(detectPlatform('https://rumble.com/vabc123/video-title.html')).toBe(PLATFORMS.RUMBLE)
})

// ==================== BitChute Tests ====================
console.log('\n--- BitChute ---')

test('detect BitChute video URLs', () => {
  expect(detectPlatform('https://www.bitchute.com/video/abc123456789/')).toBe(PLATFORMS.BITCHUTE)
})

// ==================== Invalid/Unknown Tests ====================
console.log('\n--- Invalid/Unknown ---')

test('return UNKNOWN for invalid URLs', () => {
  expect(detectPlatform('https://example.com')).toBe(PLATFORMS.UNKNOWN)
  expect(detectPlatform('https://google.com')).toBe(PLATFORMS.UNKNOWN)
})

test('return UNKNOWN for empty/null/undefined', () => {
  expect(detectPlatform('')).toBe(PLATFORMS.UNKNOWN)
  expect(detectPlatform(null)).toBe(PLATFORMS.UNKNOWN)
  expect(detectPlatform(undefined)).toBe(PLATFORMS.UNKNOWN)
})

// ==================== isYouTubePlatform Tests ====================
console.log('\n--- isYouTubePlatform ---')

test('return true for YouTube variants', () => {
  expect(isYouTubePlatform(PLATFORMS.YOUTUBE)).toBeTrue()
  expect(isYouTubePlatform(PLATFORMS.YOUTUBE_MUSIC)).toBeTrue()
  expect(isYouTubePlatform(PLATFORMS.YOUTUBE_KIDS)).toBeTrue()
})

test('return false for non-YouTube platforms', () => {
  expect(isYouTubePlatform(PLATFORMS.FACEBOOK)).toBeFalse()
  expect(isYouTubePlatform(PLATFORMS.INSTAGRAM)).toBeFalse()
  expect(isYouTubePlatform(PLATFORMS.TIKTOK)).toBeFalse()
})

// ==================== getPlatformName Tests ====================
console.log('\n--- getPlatformName ---')

test('return correct platform names', () => {
  expect(getPlatformName(PLATFORMS.YOUTUBE)).toBe('YouTube')
  expect(getPlatformName(PLATFORMS.YOUTUBE_MUSIC)).toBe('YouTube Music')
  expect(getPlatformName(PLATFORMS.YOUTUBE_KIDS)).toBe('YouTube Kids')
  expect(getPlatformName(PLATFORMS.FACEBOOK)).toBe('Facebook')
  expect(getPlatformName(PLATFORMS.INSTAGRAM)).toBe('Instagram')
  expect(getPlatformName(PLATFORMS.TIKTOK)).toBe('TikTok')
  expect(getPlatformName(PLATFORMS.TWITTER)).toBe('Twitter')
  expect(getPlatformName(PLATFORMS.TWITCH)).toBe('Twitch')
  expect(getPlatformName(PLATFORMS.DAILYMOTION)).toBe('Dailymotion')
  expect(getPlatformName(PLATFORMS.BILIBILI)).toBe('Bilibili')
  expect(getPlatformName(PLATFORMS.REDDIT)).toBe('Reddit')
  expect(getPlatformName(PLATFORMS.PINTEREST)).toBe('Pinterest')
  expect(getPlatformName(PLATFORMS.LINKEDIN)).toBe('LinkedIn')
  expect(getPlatformName(PLATFORMS.SOUNDCLOUD)).toBe('SoundCloud')
  expect(getPlatformName(PLATFORMS.VIMEO)).toBe('Vimeo')
  expect(getPlatformName(PLATFORMS.RUMBLE)).toBe('Rumble')
  expect(getPlatformName(PLATFORMS.BITCHUTE)).toBe('BitChute')
  expect(getPlatformName(PLATFORMS.UNKNOWN)).toBe('Unknown')
})

test('return Unknown for invalid platform', () => {
  expect(getPlatformName('invalid')).toBe('Unknown')
})

// ==================== getPlatformUrl Tests ====================
console.log('\n--- getPlatformUrl ---')

test('return correct platform URLs', () => {
  expect(getPlatformUrl(PLATFORMS.YOUTUBE)).toBe('https://www.youtube.com')
  expect(getPlatformUrl(PLATFORMS.YOUTUBE_MUSIC)).toBe('https://music.youtube.com')
  expect(getPlatformUrl(PLATFORMS.YOUTUBE_KIDS)).toBe('https://www.youtubekids.com')
  expect(getPlatformUrl(PLATFORMS.FACEBOOK)).toBe('https://www.facebook.com')
  expect(getPlatformUrl(PLATFORMS.INSTAGRAM)).toBe('https://www.instagram.com')
  expect(getPlatformUrl(PLATFORMS.TIKTOK)).toBe('https://www.tiktok.com')
  expect(getPlatformUrl(PLATFORMS.TWITTER)).toBe('https://twitter.com')
})

test('return null for unknown platform', () => {
  expect(getPlatformUrl(PLATFORMS.UNKNOWN)).toBeNull()
})

// ==================== extractVideoId Tests ====================
console.log('\n--- extractVideoId ---')

test('extract video ID from standard watch URL', () => {
  expect(extractVideoId('https://www.youtube.com/watch?v=abc123def456')).toBe('abc123def456')
  expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extract video ID from shorts URL', () => {
  expect(extractVideoId('https://www.youtube.com/shorts/abc123')).toBe('abc123')
})

test('extract video ID from youtu.be URL', () => {
  expect(extractVideoId('https://youtu.be/abc123')).toBe('abc123')
  expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ')
})

test('extract video ID from embed URL', () => {
  expect(extractVideoId('https://www.youtube.com/embed/abc123')).toBe('abc123')
})

test('extract video ID from music.youtube.com', () => {
  expect(extractVideoId('https://music.youtube.com/watch?v=abc123')).toBe('abc123')
})

test('return null for invalid URLs', () => {
  expect(extractVideoId('https://example.com')).toBeNull()
  expect(extractVideoId('')).toBeNull()
  expect(extractVideoId(null)).toBeNull()
})

// ==================== extractPlaylistId Tests ====================
console.log('\n--- extractPlaylistId ---')

test('extract playlist ID from playlist URL', () => {
  expect(extractPlaylistId('https://www.youtube.com/playlist?list=PL123456789')).toBe('PL123456789')
})

test('extract playlist ID from watch URL with playlist', () => {
  expect(extractPlaylistId('https://www.youtube.com/watch?v=abc123&list=PL123456')).toBe('PL123456')
})

test('return null for URLs without playlist', () => {
  expect(extractPlaylistId('https://www.youtube.com/watch?v=abc123')).toBeNull()
})

// ==================== isDownloadableVideoUrl Tests ====================
console.log('\n--- isDownloadableVideoUrl ---')

test('return true for YouTube URLs', () => {
  expect(isDownloadableVideoUrl('https://www.youtube.com/watch?v=abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.youtube.com/shorts/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://youtu.be/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://music.youtube.com/watch?v=abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.youtube.com/playlist?list=PL123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.youtubekids.com/watch?v=abc123')).toBeTrue()
})

test('return true for Facebook URLs', () => {
  expect(isDownloadableVideoUrl('https://www.facebook.com/watch/video123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://fb.com/watch/video123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://fb.watch/abc123')).toBeTrue()
})

test('return true for Instagram URLs', () => {
  expect(isDownloadableVideoUrl('https://www.instagram.com/p/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.instagram.com/reels/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.instagram.com/stories/user/123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://instagr.am/p/abc123')).toBeTrue()
})

test('return true for Snapchat public media URLs', () => {
  expect(isDownloadableVideoUrl('https://www.snapchat.com/spotlight/abc123xyz')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.snapchat.com/@snapchat/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYenNyd3VhbWF2AZzn2zDlAZzn2zDQAAAAAQ')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.snapchat.com/@publisher/story/abc123?share_id=123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.snapchat.com/stories/publisher/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://story.snapchat.com/p/abc123')).toBeTrue()
})

test('return true for TikTok URLs', () => {
  expect(isDownloadableVideoUrl('https://www.tiktok.com/@user/video/123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://vm.tiktok.com/ZMabc123')).toBeTrue()
})

test('return true for Twitter/X URLs', () => {
  expect(isDownloadableVideoUrl('https://twitter.com/user/status/1234567890')).toBeTrue()
  expect(isDownloadableVideoUrl('https://x.com/user/status/1234567890')).toBeTrue()
})

test('return true for Twitch URLs', () => {
  expect(isDownloadableVideoUrl('https://www.twitch.tv/videos/1234567')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.twitch.tv/user/clip/abc123')).toBeTrue()
})

test('return true for Dailymotion URLs', () => {
  expect(isDownloadableVideoUrl('https://www.dailymotion.com/video/x123456')).toBeTrue()
  expect(isDownloadableVideoUrl('https://dai.ly/xabc123')).toBeTrue()
})

test('return true for other supported platforms', () => {
  expect(isDownloadableVideoUrl('https://vimeo.com/123456789')).toBeTrue()
  expect(isDownloadableVideoUrl('https://soundcloud.com/user/track')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.bilibili.com/video/BV1234567890')).toBeTrue()
  expect(isDownloadableVideoUrl('https://rumble.com/vabc123/video.html')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.bitchute.com/video/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.reddit.com/r/videos/comments/abc123')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.pinterest.com/pin/123456')).toBeTrue()
  expect(isDownloadableVideoUrl('https://www.linkedin.com/posts/user_123456')).toBeTrue()
})

test('return false for non-video URLs', () => {
  expect(isDownloadableVideoUrl('https://example.com')).toBeFalse()
  expect(isDownloadableVideoUrl('https://google.com')).toBeFalse()
  expect(isDownloadableVideoUrl('')).toBeFalse()
})

test('handle null/undefined/empty', () => {
  expect(isDownloadableVideoUrl(null)).toBeFalse()
  expect(isDownloadableVideoUrl(undefined)).toBeFalse()
  expect(isDownloadableVideoUrl('')).toBeFalse()
})

// ==================== Summary ====================
console.log('\n========== TEST SUMMARY ==========')
console.log(`Total: ${passed + failed}`)
console.log(`Passed: ${passed} ✅`)
console.log(`Failed: ${failed} ❌`)
console.log('===================================\n')

process.exit(failed > 0 ? 1 : 0)
