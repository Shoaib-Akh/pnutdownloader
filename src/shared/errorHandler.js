/**
 * Error Handler Utility
 * Centralized error handling for the application
 */

// Error codes for the application
export const ERROR_CODES = {
  // Download errors (1000-1099)
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  DOWNLOAD_CANCELLED: 'DOWNLOAD_CANCELLED',
  DOWNLOAD_TIMEOUT: 'DOWNLOAD_TIMEOUT',
  INVALID_URL: 'INVALID_URL',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  
  // yt-dlp errors (1100-1199)
  YTDLP_NOT_FOUND: 'YTDLP_NOT_FOUND',
  YTDLP_VERSION_FAILED: 'YTDLP_VERSION_FAILED',
  YTDLP_EXTRACTION_FAILED: 'YTDLP_EXTRACTION_FAILED',
  
  // FFmpeg errors (1200-1299)
  FFMPEG_NOT_FOUND: 'FFMPEG_NOT_FOUND',
  FFMPEG_CONVERSION_FAILED: 'FFMPEG_CONVERSION_FAILED',
  
  // File system errors (1300-1399)
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DISK_FULL: 'DISK_FULL',
  INVALID_PATH: 'INVALID_PATH',
  
  // Network errors (1400-1499)
  NETWORK_ERROR: 'NETWORK_ERROR',
  COOKIE_FETCH_FAILED: 'COOKIE_FETCH_FAILED',
  PROXY_FAILED: 'PROXY_FAILED',
  
  // Platform/Auth errors (1500-1599)
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  AGE_RESTRICTED: 'AGE_RESTRICTED',
  REGION_BLOCKED: 'REGION_BLOCKED',
  
  // App errors (1600-1699)
  APP_INIT_FAILED: 'APP_INIT_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.DOWNLOAD_FAILED]: 'Failed to download the video. Please try again.',
  [ERROR_CODES.DOWNLOAD_CANCELLED]: 'Download was cancelled.',
  [ERROR_CODES.DOWNLOAD_TIMEOUT]: 'Download timed out. Please check your internet connection.',
  [ERROR_CODES.INVALID_URL]: 'The URL provided is invalid or not supported.',
  [ERROR_CODES.UNSUPPORTED_PLATFORM]: 'This platform is not supported for downloading.',
  
  [ERROR_CODES.YTDLP_NOT_FOUND]: 'Download tool not found. Please reinstall the application.',
  [ERROR_CODES.YTDLP_VERSION_FAILED]: 'Could not verify download tool version.',
  [ERROR_CODES.YTDLP_EXTRACTION_FAILED]: 'Failed to extract video information.',
  
  [ERROR_CODES.FFMPEG_NOT_FOUND]: 'Media converter not found. Please reinstall the application.',
  [ERROR_CODES.FFMPEG_CONVERSION_FAILED]: 'Failed to convert the media file.',
  
  [ERROR_CODES.FILE_NOT_FOUND]: 'The file could not be found.',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied. Please check file permissions.',
  [ERROR_CODES.DISK_FULL]: 'Not enough disk space. Please free up some space.',
  [ERROR_CODES.INVALID_PATH]: 'The specified path is invalid.',
  
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your internet connection.',
  [ERROR_CODES.COOKIE_FETCH_FAILED]: 'Failed to fetch authentication cookies.',
  [ERROR_CODES.PROXY_FAILED]: 'Failed to proxy the image request.',
  
  [ERROR_CODES.LOGIN_REQUIRED]: 'Please log in to access this content.',
  [ERROR_CODES.AGE_RESTRICTED]: 'This content is age-restricted.',
  [ERROR_CODES.REGION_BLOCKED]: 'This content is not available in your region.',
  
  [ERROR_CODES.APP_INIT_FAILED]: 'Failed to initialize the application.',
  [ERROR_CODES.UPDATE_FAILED]: 'Failed to update the application.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred.'
}

/**
 * Get user-friendly error message
 * @param {string} code - Error code
 * @param {string} fallback - Custom fallback message
 * @returns {string}
 */
export const getErrorMessage = (code, fallback = null) => {
  return ERROR_MESSAGES[code] || fallback || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
}

/**
 * Create an error with code and metadata
 * @param {string} code - Error code
 * @param {string} message - Technical message
 * @param {Object} metadata - Additional metadata
 * @returns {Error}
 */
export const createError = (code, message, metadata = {}) => {
  const error = new Error(message)
  error.code = code
  error.metadata = metadata
  error.timestamp = new Date().toISOString()
  return error
}

/**
 * Parse error and extract code
 * @param {Error|string} error - Error object or message
 * @returns {Object} Parsed error with code and message
 */
export const parseError = (error) => {
  if (!error) {
    return { code: ERROR_CODES.UNKNOWN_ERROR, message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR] }
  }

  const message = typeof error === 'string' ? error : error.message || String(error)
  
  // Try to extract error code from message
  let code = ERROR_CODES.UNKNOWN_ERROR
  
  if (message.includes('Sign in to confirm') || message.includes('login')) {
    code = ERROR_CODES.LOGIN_REQUIRED
  } else if (message.includes('age') && message.includes('restricted')) {
    code = ERROR_CODES.AGE_RESTRICTED
  } else if (message.includes('not available in your country') || message.includes('geo')) {
    code = ERROR_CODES.REGION_BLOCKED
  } else if (message.includes('yt-dlp not found') || message.includes('yt-dlp.exe not found')) {
    code = ERROR_CODES.YTDLP_NOT_FOUND
  } else if (message.includes('ffmpeg not found')) {
    code = ERROR_CODES.FFMPEG_NOT_FOUND
  } else if (message.includes('timeout')) {
    code = ERROR_CODES.DOWNLOAD_TIMEOUT
  } else if (message.includes('network') || message.includes('ECONNREFUSED')) {
    code = ERROR_CODES.NETWORK_ERROR
  }
  
  return {
    code,
    message,
    userMessage: getErrorMessage(code, message)
  }
}

/**
 * Log error with context
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 */
export const logError = (context, error) => {
  const parsed = parseError(error)
  console.error(`[${context}] Error:`, {
    code: parsed.code,
    message: parsed.message,
    stack: error?.stack
  })
  
  return parsed
}
