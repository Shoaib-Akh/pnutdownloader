/**
 * Download Service
 * Handles all download-related operations including queue management
 * Extracted from main/index.js for better maintainability
 */

const { spawn } = require('child_process')
const { existsSync, mkdirSync, createWriteStream } = require('fs')
const path = require('path')
const treeKill = require('tree-kill')
const fs = require('fs/promises')

class DownloadService {
  constructor(config) {
    this.ytdlpPath = config.ytdlpPath
    this.cookiesPath = config.cookiesPath
    this.mainWindow = config.mainWindow
    this.activeDownloads = new Map()
    this.downloadQueue = []
  }

  /**
   * Download a video with progress callback
   * @param {Object} options - Download options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<string>} Output path
   */
  async download(options, onProgress) {
    const {
      url,
      outputPath,
      format = 'best',
      quality = '1080p',
      isAudioOnly = false,
      cookiesPath = null,
      bitrate = null,
      id = null
    } = options

    const args = [
      '-f', isAudioOnly ? 'bestaudio' : 'bestvideo+bestaudio/best',
      '-o', outputPath,
      '--merge-output-format', 'mp4'
    ]

    // Add audio-only options
    if (isAudioOnly) {
      args.push('-x', '--audio-format', 'mp3')
      if (bitrate) {
        args.push('--audio-quality', bitrate)
      }
    }

    // Add cookies if available
    const cookieFile = cookiesPath || this.cookiesPath
    if (cookieFile && existsSync(cookieFile)) {
      args.push('--cookies', cookieFile)
    }

    args.push(url)

    return new Promise((resolve, reject) => {
      let stderr = ''
      
      const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {}
      const proc = spawn(this.ytdlpPath, args, {
        ...spawnOptions,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      // Track this download
      if (id) {
        this.activeDownloads.set(id, proc)
      }

      proc.stderr.on('data', (data) => {
        const text = data.toString()
        stderr += text
        
        if (onProgress) {
          onProgress({ 
            message: text, 
            downloadId: id,
            url,
            outputPath
          })
        }
      })

      proc.on('error', (err) => {
        this.activeDownloads.delete(id)
        reject(err)
      })

      proc.on('close', (code) => {
        this.activeDownloads.delete(id)
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Pause a download by killing the process
   * @param {string} downloadId - Download ID to pause
   */
  pauseDownload(downloadId) {
    const proc = this.activeDownloads.get(downloadId)
    if (proc) {
      try {
        treeKill(proc.pid, 'SIGTERM', (err) => {
          if (err) {
            console.error(`Failed to pause download ${downloadId}:`, err)
          } else {
            console.log(`Download ${downloadId} paused`)
          }
        })
      } catch (error) {
        console.error(`Error pausing download ${downloadId}:`, error)
      }
    }
  }

  /**
   * Cancel all active downloads
   */
  cancelAllDownloads() {
    for (const [id, proc] of this.activeDownloads) {
      try {
        treeKill(proc.pid, 'SIGTERM', (err) => {
          if (err) console.error(`Failed to cancel download ${id}:`, err)
        })
      } catch (error) {
        console.error(`Error canceling download ${id}:`, error)
      }
    }
    this.activeDownloads.clear()
  }

  /**
   * Check if a download is active
   * @param {string} downloadId - Download ID to check
   * @returns {boolean}
   */
  isDownloadActive(downloadId) {
    return this.activeDownloads.has(downloadId)
  }

  /**
   * Get active download count
   * @returns {number}
   */
  getActiveCount() {
    return this.activeDownloads.size
  }
}

module.exports = DownloadService
