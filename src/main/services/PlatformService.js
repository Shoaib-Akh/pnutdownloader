/**
 * Platform Service
 * Handles platform detection and URL validation
 * Extracted from main/index.js for better maintainability
 */

const { detectPlatform, isDownloadableVideoUrl, getPlatformName } = require('../../shared/platformUtils')

/**
 * Check if URL is a downloadable video URL
 * @param {string} url - URL to check
 * @returns {boolean} True if downloadable
 */
const isDownloadable = (url) => {
  return isDownloadableVideoUrl(url)
}

/**
 * Get platform name from URL
 * @param {string} url - URL to check
 * @returns {string} Platform display name
 */
const getPlatform = (url) => {
  return getPlatformName(detectPlatform(url))
}

/**
 * Validate if URL is supported for downloading
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL' }
  }

  const isValid = isDownloadable(url)
  
  return {
    valid: isValid,
    platform: isValid ? getPlatform(url) : null,
    error: isValid ? null : 'URL is not from a supported platform'
  }
}

module.exports = {
  isDownloadable,
  getPlatform,
  validateUrl,
  detectPlatform,
  isDownloadableVideoUrl,
  getPlatformName
}
