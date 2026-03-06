/**
 * FFmpeg Service
 * Handles FFmpeg process spawning and media conversion
 * Extracted from main/index.js for better maintainability
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'

class FfmpegService {
  constructor(pathResolver) {
    this.pathResolver = pathResolver
    this.ffmpegPath = null
  }

  /**
   * Initialize FFmpeg path
   */
  initialize() {
    this.ffmpegPath = this.pathResolver.getFfmpegPath()
    console.log('FfmpegService initialized with path:', this.ffmpegPath)
  }

  /**
   * Check if FFmpeg is available
   * @returns {boolean} True if available
   */
  isAvailable() {
    return existsSync(this.ffmpegPath)
  }

  /**
   * Get FFmpeg version
   * @returns {Promise<string>} Version string
   */
  async getVersion() {
    if (!this.isAvailable()) {
      throw new Error(`FFmpeg not found at ${this.ffmpegPath}`)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('FFmpeg version check timed out')
        reject(new Error('FFmpeg version check timed out'))
      }, 10000)

      const proc = spawn(this.ffmpegPath, ['-version'], { 
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      let versionOutput = ''
      let errorOutput = ''

      proc.stdout.on('data', (data) => {
        versionOutput += data.toString()
      })

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      proc.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      proc.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0) {
          const firstLine = versionOutput.split('\n')[0]
          resolve(firstLine.trim())
        } else {
          reject(new Error(`FFmpeg not available: ${errorOutput}`))
        }
      })
    })
  }

  /**
   * Spawn FFmpeg process with options
   * @param {Array} args - Command arguments
   * @param {Object} options - Spawn options
   * @returns {Object} Child process
   */
  spawn(args, options = {}) {
    const spawnOptions = process.platform === 'win32' 
      ? { windowsHide: true, ...options } 
      : { ...options }

    return spawn(this.ffmpegPath, args, {
      ...spawnOptions,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  }

  /**
   * Convert media file
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} options - Conversion options
   * @returns {Promise<string>} Output path
   */
  async convert(inputPath, outputPath, options = {}) {
    const {
      audioOnly = false,
      bitrate = '192k',
      codec = null,
      onProgress = null
    } = options

    const args = ['-i', inputPath]

    // Add codec options
    if (codec) {
      args.push('-c:v', codec)
    }

    // Add audio options
    if (audioOnly) {
      args.push('-vn', '-acodec', 'libmp3lame', '-ab', bitrate)
    } else {
      args.push('-c:a', 'copy')
    }

    // Add overwrite flag
    args.push('-y')

    // Add output path
    args.push(outputPath)

    return new Promise((resolve, reject) => {
      let stderr = ''

      const proc = this.spawn(args)

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
          reject(new Error(stderr || `FFmpeg exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Extract audio from video
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output audio path
   * @param {Object} options - Extraction options
   * @returns {Promise<string>} Output path
   */
  async extractAudio(inputPath, outputPath, options = {}) {
    const { format = 'mp3', bitrate = '192k' } = options
    
    const formatArgs = {
      mp3: ['-vn', '-acodec', 'libmp3lame', '-ab', bitrate],
      flac: ['-vn', '-acodec', 'flac'],
      wav: ['-vn', '-acodec', 'pcm_s16le'],
      aac: ['-vn', '-acodec', 'aac', '-ab', bitrate]
    }

    const args = ['-i', inputPath, ...(formatArgs[format] || formatArgs.mp3), '-y', outputPath]

    return new Promise((resolve, reject) => {
      let stderr = ''

      const proc = this.spawn(args)

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('error', reject)

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(stderr || `FFmpeg exited with code ${code}`))
        }
      })
    })
  }
}

module.exports = FfmpegService
