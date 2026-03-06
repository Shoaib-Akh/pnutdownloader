/**
 * Main Services Index
 * Exports all services for easy importing
 */

const PathService = require('./PathService')
const PlatformService = require('./PlatformService')
const YtdlpService = require('./YtdlpService')
const FfmpegService = require('./FfmpegService')
const DownloadService = require('./DownloadService')
const CookieService = require('./CookieService')
const UpdateService = require('./UpdateService')
const ClipboardService = require('./ClipboardService')

// Create service instances
const pathService = new PathService()
const platformService = new PlatformService()
const ytdlpService = new YtdlpService(pathService)
const ffmpegService = new FfmpegService(pathService)

// Factory function to create services with dependencies
const createServices = (config) => {
  const downloadService = new DownloadService({
    ytdlpPath: config.ytdlpPath,
    cookiesPath: config.cookiesPath,
    mainWindow: config.mainWindow
  })
  
  const cookieService = new CookieService({
    mainWindow: config.mainWindow,
    cookiesPath: config.cookiesPath
  })
  
  const updateService = new UpdateService({
    mainWindow: config.mainWindow,
    isDev: config.isDev,
    logger: config.logger
  })
  
  const clipboardService = new ClipboardService({
    mainWindow: config.mainWindow,
    clipboardCheckInterval: config.clipboardCheckInterval,
    onUrlDetected: config.onUrlDetected
  })

  return {
    downloadService,
    cookieService,
    updateService,
    clipboardService
  }
}

module.exports = {
  // Service classes
  PathService,
  PlatformService,
  YtdlpService,
  FfmpegService,
  DownloadService,
  CookieService,
  UpdateService,
  ClipboardService,
  
  // Pre-configured instances
  pathService,
  platformService,
  ytdlpService,
  ffmpegService,
  
  // Factory
  createServices
}
