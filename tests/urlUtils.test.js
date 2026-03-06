/**
 * Unit Tests for URL Utilities
 */

const { extractVideoId } = require('../src/shared/urlUtils')

describe('URL Utils', () => {
  describe('extractVideoId', () => {
    it('should extract video ID from standard YouTube watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from YouTube Shorts', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/abc123')).toBe('abc123')
    })

    it('should extract video ID from youtu.be short URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID with additional parameters', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=60')).toBe('dQw4w9WgXcQ')
    })

    it('should return null for invalid URLs', () => {
      expect(extractVideoId('https://example.com')).toBeNull()
      expect(extractVideoId('')).toBeNull()
      expect(extractVideoId(null)).toBeNull()
      expect(extractVideoId(undefined)).toBeNull()
    })
  })
})
