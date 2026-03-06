/**
 * Ytdlp Service
 * Handles yt-dlp process spawning and operations
 * Extracted from main/index.js for better maintainability
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import fs from 'fs/promises'

class YtdlpService {
  constructor(pathResolver) {
    this.pathResolver = pathResolver
    this.ytdlpPath = null
  }

  /**
   * Initialize yt-dlp path
   */
  initialize() {
    this.ytdlpPath = this.pathResolver.getYtdlpPath()
    console.log('YtdlpService initialized with path:', this.ytdlpPath)
  }

  /**
   * Check if yt-dlp is available
   * @returns {boolean} True if available
   */
  isAvailable() {
    return existsSync(this.ytdlpPath)
  }

  /**
   * Get yt-dlp version
   * @returns {Promise<string>} Version string
   */
  async getVersion() {
    if (!this.isAvailable()) {
      throw new Error(`yt-dlp not found at ${this.ytdlpPath}`)
    }

    const stats = await fs.stat(this.ytdlpPath)
    if (stats.size === 0) {
      throw new Error(`yt-dlp is empty at ${this.ytdlpPath}`)
    }

    return new Promise((resolve, reject) => {
      const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {}
      const { proc, kill: killProc } = this.spawn(['--version'], spawnOptions)

      const timeout = setTimeout(() => {
        console.error('yt-dlp version check timed out')
        killProc()
        reject(new Error('yt-dlp version check timed out'))
      }, 100000)
      
      let version = ''
      let errorOutput = ''

      proc.stdout.on('data', (data) => {
        version += data.toString()
      })

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      proc.on('error', (err) => {
        clearTimeout(timeout)
        killProc()
        reject(err)
      })

      proc.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0) {
          resolve(version.trim())
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${errorOutput}`))
        }
      })
    })
  }

  /**
   * Spawn yt-dlp process with options
   * @param {Array} args - Command arguments
   * @param {Object} options - Spawn options
   * @returns {Object} Process and kill function
   */
  spawn(args, options = {}) {
    const spawnOptions = process.platform === 'win32' 
      ? { windowsHide: true, ...options } 
      : { ...options }

    const proc = spawn(this.ytdlpPath, args, {
      ...spawnOptions,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    // Return process along with kill function for proper cleanup
    return {
      proc,
      kill: () => {
        try {
          proc.kill()
        } catch (e) {
          // Process may have already exited
        }
      }
    }
  }

  /**
   * Extract video info from URL
   * @param {string} url - Video URL
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Video info
   */
  async extractInfo(url, options = {}) {
    const args = [
      '--dump-json',
      '--no-download',
      '--no-playlist'
    ]

    if (options.cookiesPath) {
      args.push('--cookies', options.cookiesPath)
    }

    args.push(url)

    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      const { proc } = this.spawn(args)

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('error', reject)

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout))
          } catch (e) {
            reject(new Error('Failed to parse video info'))
          }
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Download video with progress callback
   * @param {Object} downloadOptions - Download options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<string>} Output path
   */
  async download(downloadOptions, onProgress) {
    const {
      url,
      outputPath,
      format = 'best',
      quality = '1080p',
      isAudioOnly = false,
      cookiesPath = null,
      bitrate = null
    } = downloadOptions

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
    if (cookiesPath && existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath)
    }

    args.push(url)

    return new Promise((resolve, reject) => {
      let stderr = ''

      const { proc } = this.spawn(args)

      proc.stderr.on('data', (data) => {
        const text = data.toString()
        stderr += text
        
        if (onProgress) {
          onProgress({ message: text })
        }
      })

      proc.on('error', reject)

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`))
        }
      })
    })
  }
}

module.exports = YtdlpService
