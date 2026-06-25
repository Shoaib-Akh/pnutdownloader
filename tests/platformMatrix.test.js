/* global describe, expect, it */

const cases = require('./platform-cases.json')
const {
  PLATFORMS,
  detectPlatform,
  getPlatformName,
  getPlatformUrl,
  isDownloadableVideoUrl
} = require('../src/shared/platformUtils')

const supportedPlatformIds = Object.values(PLATFORMS).filter((id) => id !== PLATFORMS.UNKNOWN)

describe('JSON platform test matrix', () => {
  it('contains exactly one case for every supported platform', () => {
    const ids = cases.platforms.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual([...supportedPlatformIds].sort())
  })

  it.each(cases.platforms)('$displayName has a complete live metadata case', (platformCase) => {
    expect(platformCase.urls.length).toBeGreaterThan(0)
    expect(platformCase.live).toEqual(
      expect.objectContaining({
        url: expect.stringMatching(/^https:\/\//),
        media: expect.stringMatching(/^(audio|video)$/),
        requireThumbnail: expect.any(Boolean),
        requiresCookies: expect.any(Boolean)
      })
    )
  })

  describe.each(cases.platforms)('$displayName URLs', (platformCase) => {
    const allUrls = [...platformCase.urls, platformCase.live.url]

    it.each(allUrls)('detects and accepts %s', (url) => {
      expect(detectPlatform(url)).toBe(platformCase.id)
      expect(isDownloadableVideoUrl(url)).toBe(true)
      expect(getPlatformName(platformCase.id)).toBe(platformCase.displayName)
      expect(getPlatformUrl(platformCase.id)).toMatch(/^https:\/\//)
    })
  })

  it.each(cases.nonDownloadable)('rejects non-downloadable URL %j', (url) => {
    expect(isDownloadableVideoUrl(url)).toBe(false)
  })

  it.each(cases.invalid)('rejects invalid or spoofed URL %j', (url) => {
    expect(detectPlatform(url)).toBe(PLATFORMS.UNKNOWN)
    expect(isDownloadableVideoUrl(url)).toBe(false)
  })

  it('keeps non-YouTube coverage explicit', () => {
    const nonYouTubeCases = cases.platforms.filter(({ id }) => !id.startsWith('youtube'))

    expect(nonYouTubeCases).toHaveLength(15)
    expect(nonYouTubeCases.every(({ live }) => live.requireThumbnail)).toBe(true)
  })
})
