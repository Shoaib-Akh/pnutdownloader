const normalize = (value) => String(value || '').toLowerCase()

const normalizeCookieDomain = (value) => normalize(value).trim().replace(/^\./, '')

const isExpiredCookie = (expiration, nowSeconds) => {
  const expiresAt = Number(expiration)
  return Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt < nowSeconds
}

export const isYouTubeAuthOrRateLimitError = (text = '') => {
  const value = normalize(text)

  return (
    value.includes('sign in to confirm') ||
    value.includes('not a bot') ||
    value.includes('http error 429') ||
    value.includes('too many requests') ||
    value.includes('cookies-from-browser') ||
    value.includes('use --cookies') ||
    value.includes('login_required') ||
    (value.includes('[youtube]') && value.includes('authentication')) ||
    (value.includes('[youtube]') && value.includes('login'))
  )
}

export const hasCookieLinesForDomain = (
  content = '',
  domain = '',
  nowSeconds = Math.floor(Date.now() / 1000)
) => {
  const targetDomain = normalizeCookieDomain(domain)
  const lines = String(content || '').split(/\r?\n/)

  return lines.some((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return false

    const parts = trimmed.split('\t')
    if (parts.length < 7 || isExpiredCookie(parts[4], nowSeconds)) return false
    if (!targetDomain) return true

    const cookieDomain = normalizeCookieDomain(parts[0])
    return (
      cookieDomain === targetDomain ||
      cookieDomain.endsWith(`.${targetDomain}`) ||
      targetDomain.endsWith(`.${cookieDomain}`)
    )
  })
}

export const classifyYtdlpDownloadFailure = ({
  code,
  stderr = '',
  stdout = '',
  timedOut = false,
  cookiesPassed = false
} = {}) => {
  if (timedOut) {
    return {
      errorMessage: 'Download stalled with no output from yt-dlp',
      errorDetails: 'yt-dlp produced no stdout/stderr for 120 seconds.',
      isAuthError: false
    }
  }

  const combined = `${stderr}\n${stdout}`
  const value = normalize(combined)

  if (isYouTubeAuthOrRateLimitError(combined)) {
    return {
      errorMessage: 'Download failed - Authentication required',
      errorDetails: cookiesPassed
        ? 'YouTube still requested sign-in or bot verification after saved browser cookies were passed. Open YouTube in Explore, confirm the account is signed in, then retry. If this laptop or network is rate-limited, wait or try another network.'
        : 'YouTube requested sign-in or bot verification, but no valid YouTube cookies were passed to yt-dlp. Open YouTube in Explore, sign in, then retry.',
      isAuthError: true,
      loginUrl: 'https://www.youtube.com/'
    }
  }

  if (
    /no video formats|requested format is not available|format is not available|no formats/.test(
      value
    )
  ) {
    return {
      errorMessage: 'Download failed - No video formats found',
      errorDetails: 'The video may not be available in the requested format or quality.',
      isAuthError: false
    }
  }

  if (/network|connection|timeout|timed out|econnreset|enotfound|http error 5\d\d/.test(value)) {
    return {
      errorMessage: 'Download failed - Network error',
      errorDetails: 'Check your internet connection and try again.',
      isAuthError: false
    }
  }

  if (/private|members-only|membership/.test(value)) {
    return {
      errorMessage: 'Download failed - Authentication required',
      errorDetails: 'This video is private or requires membership to access.',
      isAuthError: true
    }
  }

  switch (code) {
    case 2:
      return {
        errorMessage: 'Download failed - No video formats found',
        errorDetails: 'The video may not be available in the requested format or quality.',
        isAuthError: false
      }
    case 3:
      return {
        errorMessage: 'Download failed - Network error',
        errorDetails: 'Check your internet connection and try again.',
        isAuthError: false
      }
    case 4:
      return {
        errorMessage: 'Download failed - Authentication required',
        errorDetails: 'This video may require login or cookies to access.',
        isAuthError: true
      }
    case 1:
      return {
        errorMessage: 'Download failed - General error',
        errorDetails: 'This could be due to network issues, invalid URL, or video not available.',
        isAuthError: false
      }
    default:
      return {
        errorMessage: `Download failed with code ${code}`,
        errorDetails: `Exit code ${code} indicates an error occurred during download.`,
        isAuthError: false
      }
  }
}
