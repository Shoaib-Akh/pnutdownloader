/**
 * Path Service
 * Handles cross-platform path resolution
 * Extracted from main/index.js for better maintainability
 */

import { app } from 'electron'
import { join } from 'path'

/**
 * Get platform-specific executable name
 * @param {string} baseName - Base name of executable
 * @returns {string} Platform-specific name
 */
const getPlatformExecutableName = (baseName) => {
  if (process.platform === 'win32') {
    return `${baseName}.exe`
  }
  return baseName
}

/**
 * Get yt-dlp executable name
 * @returns {string} yt-dlp executable name
 */
const getYtdlpExecutableName = () => {
  if (process.platform === 'win32') {
    return 'yt-dlp.exe'
  } else if (process.platform === 'darwin') {
    return 'yt-dlp_macos'
  }
  return 'yt-dlp'
}

/**
 * Get FFmpeg executable name
 * @returns {string} FFmpeg executable name
 */
const getFfmpegExecutableName = () => {
  return getPlatformExecutableName('ffmpeg')
}

/**
 * Get yt-dlp path
 * @returns {string} Full path to yt-dlp
 */
const getYtdlpPath = () => {
  if (app.isPackaged) {
    return join(process.resourcesPath, getYtdlpExecutableName())
  }
  
  return join(__dirname, '../../public', getYtdlpExecutableName())
}

/**
 * Get FFmpeg path
 * @returns {string} Full path to FFmpeg
 */
const getFfmpegPath = () => {
  return app.isPackaged
    ? join(process.resourcesPath, getFfmpegExecutableName())
    : join(__dirname, '../../public', getFfmpegExecutableName())
}

/**
 * Get cookies path
 * @returns {string} Full path to cookies file
 */
const getCookiesPath = () => {
  return app.isPackaged
    ? join(process.resourcesPath, 'cookies.txt')
    : join(__dirname, '../../public/cookies.txt')
}

/**
 * Get icon path based on OS
 * @returns {string} Full path to icon
 */
const getIconPath = () => {
  switch (process.platform) {
    case 'win32':
      return join(__dirname, '../../public/icon.ico')
    case 'linux':
      // Will be handled differently
      return join(process.resourcesPath, 'icon.png')
    default:
      return join(process.resourcesPath, 'icon.png')
  }
}

/**
 * Get default download directory
 * @returns {string} Default download directory
 */
const getDefaultDownloadDir = () => {
  return app.getPath('downloads')
}

module.exports = {
  getPlatformExecutableName,
  getYtdlpExecutableName,
  getFfmpegExecutableName,
  getYtdlpPath,
  getFfmpegPath,
  getCookiesPath,
  getIconPath,
  getDefaultDownloadDir
}
