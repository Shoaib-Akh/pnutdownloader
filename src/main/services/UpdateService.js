/**
 * Update Service
 * Handles auto-updates using electron-updater
 * Extracted from main/index.js for better maintainability
 */

const { autoUpdater } = require('electron-updater')

class UpdateService {
  constructor(config) {
    this.mainWindow = config.mainWindow
    this.isDev = config.isDev
    this.logger = config.logger || console
  }

  /**
   * Initialize the update service
   */
  initialize() {
    // Configure auto-updater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Set up event handlers
    autoUpdater.on('checking-for-update', () => {
      this.logger.log('Checking for updates...')
      this.sendToRenderer('update-checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.logger.log('Update available:', info.version)
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })
    })

    autoUpdater.on('update-not-available', (info) => {
      this.logger.log('No updates available')
      this.sendToRenderer('update-not-available', {
        version: info.version
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.sendToRenderer('update-download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.logger.log('Update downloaded:', info.version)
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      })
    })

    autoUpdater.on('error', (error) => {
      this.logger.error('Update error:', error)
      this.sendToRenderer('update-error', {
        message: error.message
      })
    })
  }

  /**
   * Send message to renderer process
   * @param {string} channel - Event channel
   * @param {Object} data - Data to send
   */
  sendToRenderer(channel, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  /**
   * Check for updates
   * @returns {Promise<void>}
   */
  async checkForUpdates() {
    if (this.isDev) {
      this.logger.log('Skipping update check in development mode')
      return
    }

    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.logger.error('Failed to check for updates:', error)
      throw error
    }
  }

  /**
   * Download the available update
   * @returns {Promise<void>}
   */
  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.logger.error('Failed to download update:', error)
      throw error
    }
  }

  /**
   * Install the downloaded update and restart
   */
  installUpdate() {
    autoUpdater.quitAndInstall(false, true)
  }

  /**
   * Get current app version
   * @returns {string}
   */
  getCurrentVersion() {
    return autoUpdater.currentVersion.version
  }
}

module.exports = UpdateService
