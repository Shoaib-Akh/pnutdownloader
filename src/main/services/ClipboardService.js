/**
 * Clipboard Service
 * Monitors clipboard for video URLs and notifies the renderer
 * Extracted from main/index.js for better maintainability
 */

const { clipboard } = require('electron')
const { isDownloadableVideoUrl } = require('../../shared/platformUtils')

class ClipboardService {
  constructor(config) {
    this.mainWindow = config.mainWindow
    this.checkInterval = config.clipboardCheckInterval || 2000 // Default 2 seconds
    this.monitorInterval = null
    this.lastClipboardText = ''
    this.onUrlDetected = config.onUrlDetected || null
  }

  /**
   * Start monitoring the clipboard for video URLs
   */
  start() {
    if (this.monitorInterval) {
      console.log('Clipboard monitoring already running')
      return
    }

    // Initialize with current clipboard content
    this.lastClipboardText = clipboard.readText()

    this.monitorInterval = setInterval(() => {
      this.checkClipboard()
    }, this.checkInterval)

    console.log('Clipboard monitoring started')
  }

  /**
   * Stop monitoring the clipboard
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
      this.lastClipboardText = ''
      console.log('Clipboard monitoring stopped')
    }
  }

  /**
   * Check clipboard for new video URLs
   */
  checkClipboard() {
    try {
      const currentText = clipboard.readText()

      // Skip if no change
      if (currentText === this.lastClipboardText || !currentText) {
        return
      }

      this.lastClipboardText = currentText

      // Check if it's a downloadable video URL
      if (isDownloadableVideoUrl(currentText)) {
        console.log('Video URL detected in clipboard:', currentText.substring(0, 50) + '...')
        
        if (this.onUrlDetected) {
          this.onUrlDetected(currentText)
        }

        // Send to renderer
        this.notifyRenderer(currentText)
      }
    } catch (error) {
      console.error('Error checking clipboard:', error)
    }
  }

  /**
   * Notify the renderer process about detected URL
   * @param {string} url - Detected URL
   */
  notifyRenderer(url) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('video-url-detected', url)
    }
  }

  /**
   * Set callback for URL detection
   * @param {Function} callback - Callback function
   */
  setUrlDetectedCallback(callback) {
    this.onUrlDetected = callback
  }

  /**
   * Get current clipboard text
   * @returns {string}
   */
  getCurrentText() {
    return clipboard.readText()
  }

  /**
   * Write text to clipboard
   * @param {string} text - Text to write
   */
  writeText(text) {
    clipboard.writeText(text)
  }

  /**
   * Check if monitoring is active
   * @returns {boolean}
   */
  isMonitoring() {
    return this.monitorInterval !== null
  }
}

module.exports = ClipboardService
