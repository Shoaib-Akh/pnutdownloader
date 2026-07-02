/* global describe, expect, it */

const {
  classifyYtdlpDownloadFailure,
  hasCookieLinesForDomain,
  isYouTubeAuthOrRateLimitError
} = require('../src/shared/ytDlpErrorUtils')

describe('yt-dlp error utilities', () => {
  it('detects YouTube bot and rate-limit failures', () => {
    const stderr = [
      'WARNING: [youtube] Unable to download webpage: HTTP Error 429: Too Many Requests',
      'ERROR: [youtube] Sign in to confirm you are not a bot. Use --cookies-from-browser or --cookies'
    ].join('\n')

    expect(isYouTubeAuthOrRateLimitError(stderr)).toBe(true)
  })

  it('classifies YouTube auth failures before cookies as login-required', () => {
    const result = classifyYtdlpDownloadFailure({
      code: 1,
      stderr: 'ERROR: [youtube] Sign in to confirm you are not a bot. Use --cookies',
      cookiesPassed: false
    })

    expect(result).toEqual(
      expect.objectContaining({
        errorMessage: 'Download failed - Authentication required',
        isAuthError: true,
        loginUrl: 'https://www.youtube.com/'
      })
    )
    expect(result.errorDetails).toMatch(/no valid YouTube cookies were passed/)
  })

  it('classifies generic exit code 1 as a general error when stderr has no auth clue', () => {
    const result = classifyYtdlpDownloadFailure({
      code: 1,
      stderr: 'ERROR: something unexpected happened'
    })

    expect(result).toEqual(
      expect.objectContaining({
        errorMessage: 'Download failed - General error',
        isAuthError: false
      })
    )
  })

  it('finds non-expired YouTube cookies in Netscape cookie files', () => {
    const now = 2000
    const content = [
      '# Netscape HTTP Cookie File',
      '.youtube.com\tTRUE\t/\tTRUE\t3000\tLOGIN_INFO\tabc',
      '.example.com\tTRUE\t/\tTRUE\t3000\tSID\tdef'
    ].join('\n')

    expect(hasCookieLinesForDomain(content, 'youtube.com', now)).toBe(true)
    expect(hasCookieLinesForDomain(content, 'instagram.com', now)).toBe(false)
  })

  it('ignores expired cookies', () => {
    const content = '.youtube.com\tTRUE\t/\tTRUE\t1000\tLOGIN_INFO\tabc'

    expect(hasCookieLinesForDomain(content, 'youtube.com', 2000)).toBe(false)
  })
})
