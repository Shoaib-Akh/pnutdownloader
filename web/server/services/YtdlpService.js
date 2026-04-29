const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const CookieService = require('./CookieService');

class YtdlpService {
  constructor() {
    this.ytdlpPath = this.getYtdlpPath();
    this.downloadsDir = path.join(__dirname, '../downloads');
    this.activeProcesses = new Map();
    this.cookieService = new CookieService();
  }

  getYtdlpPath() {
    console.log('🔍 [YTDLP] Looking for yt-dlp executable...');
    
    // Check if yt-dlp exists in local environment
    const localYtdlp = path.join(__dirname, '../../bin/yt-dlp');
    console.log('🔍 [YTDLP] Checking local path:', localYtdlp);
    
    if (fs.existsSync(localYtdlp)) {
      console.log('✅ [YTDLP] Found local yt-dlp at:', localYtdlp);
      return localYtdlp;
    }
    
    // Check common system locations
    const systemPaths = ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
    for (const systemPath of systemPaths) {
      console.log('🔍 [YTDLP] Checking system path:', systemPath);
      if (fs.existsSync(systemPath)) {
        console.log('✅ [YTDLP] Found system yt-dlp at:', systemPath);
        return systemPath;
      }
    }
    
    // Fallback to system yt-dlp in PATH
    try {
      const whichResult = require('child_process').execSync('which yt-dlp', { encoding: 'utf8' }).trim();
      console.log('✅ [YTDLP] Found yt-dlp in PATH at:', whichResult);
      return 'yt-dlp';
    } catch (error) {
      console.error('❌ [YTDLP] yt-dlp not found in any location. Please install yt-dlp first.');
      console.error('❌ [YTDLP] Checked locations:', [localYtdlp, ...systemPaths, 'PATH']);
      throw new Error('yt-dlp not found. Please install yt-dlp using: pip install yt-dlp or brew install yt-dlp');
    }
  }

  async getVersion() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytdlpPath, ['--version']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error('Failed to get yt-dlp version'));
        }
      });
    });
  }

  async fetchVideoInfo(url, useCookies = true) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-download',
        url
      ];

      // Add cookies if available and enabled
      if (useCookies && this.cookieService.hasValidCookies()) {
        const cookiePath = this.cookieService.getCookiePath();
        args.push('--cookies', cookiePath);
        console.log('🍪 [YTDLP] Using cookies for video info fetch');
      }

      const process = spawn(this.ytdlpPath, args);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve(info);
          } catch (error) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error(errorOutput || 'Failed to fetch video info'));
        }
      });
    });
  }

  async fetchPlaylistEntries(url) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytdlpPath, [
        '--dump-json',
        '--flat-playlist',
        '--no-download',
        url
      ]);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n').filter(line => line.trim());
            const entries = lines.map(line => JSON.parse(line));
            resolve(entries);
          } catch (error) {
            reject(new Error('Failed to parse playlist entries'));
          }
        } else {
          reject(new Error(errorOutput || 'Failed to fetch playlist entries'));
        }
      });
    });
  }

  download(options, onProgress) {
    const {
      url,
      outputPath,
      format = 'best',
      quality = '1080p',
      isAudioOnly = false,
      bitrate = null,
      id = null,
      formatId = null,
      useCookies = true
    } = options;

    console.log('🚀 [YTDLP] Starting download with options:', options);
    console.log('🔧 [YTDLP] Using yt-dlp path:', this.ytdlpPath);

    let formatSelector;
    if (formatId) {
      // Use specific format ID
      formatSelector = formatId;
      console.log('🎯 [YTDLP] Using specific format ID:', formatId);
    } else if (isAudioOnly) {
      // Audio-only download
      formatSelector = 'bestaudio';
    } else {
      // Video download with quality preference - use simpler format selection
      const height = quality.replace('p', '');
      if (height === '1920' || height === '1080') {
        formatSelector = 'best[height<=1080]'; // Simpler format for 1080p
      } else if (height === '720') {
        formatSelector = 'best[height<=720]'; // Simpler format for 720p
      } else {
        formatSelector = 'best'; // Fallback to best available
      }
    }

    const args = [
      '-f', formatSelector,
      '-o', outputPath,
      '--merge-output-format', 'mp4',
      '--embed-metadata', // Embed metadata using FFmpeg
      '--embed-chapters' // Embed chapters if available
    ];

    // Add cookies if available and enabled
    if (useCookies && this.cookieService.hasValidCookies()) {
      const cookiePath = this.cookieService.getCookiePath();
      args.push('--cookies', cookiePath);
      console.log('🍪 [YTDLP] Using cookies for download');
    } else if (useCookies) {
      console.log('⚠️ [YTDLP] Cookies requested but not available or invalid, proceeding without cookies');
    }

    // Add FFmpeg post-processing based on format
    if (isAudioOnly) {
      args.push('-x', '--audio-format', 'mp3');
      if (bitrate) {
        args.push('--audio-quality', bitrate);
      }
      // Add FFmpeg audio processing for better quality
      args.push('--postprocessor-args', '-c:a libmp3lame -q:a 2');
    } else {
      // Add FFmpeg video processing for better compatibility and quality
      args.push('--postprocessor-args', '-c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k');
    }

    args.push(url);

    console.log('📋 [YTDLP] Command args:', args);
    console.log('🎯 [YTDLP] Spawning yt-dlp process...');

    const process = spawn(this.ytdlpPath, args);
    const downloadId = id || Date.now().toString();
    
    console.log('🆔 [YTDLP] Download ID:', downloadId);
    this.activeProcesses.set(downloadId, process);

    let progressData = {
      id: downloadId,
      status: 'downloading',
      progress: 0,
      speed: 0,
      eta: null,
      totalBytes: null,
      downloadedBytes: null
    };

    process.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Parse progress from yt-dlp output
      const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
      const speedMatch = output.match(/(\d+(?:\.\d+)?[KMGT]?iB\/s)/);
      const etaMatch = output.match(/(\d+:\d+)/);
      
      if (progressMatch) {
        progressData.progress = parseFloat(progressMatch[1]);
      }
      if (speedMatch) {
        progressData.speed = speedMatch[1];
      }
      if (etaMatch) {
        progressData.eta = etaMatch[1];
      }
      
      if (onProgress) {
        onProgress(progressData);
      }
    });

    process.on('close', (code) => {
      console.log(`🏁 [YTDLP] Process closed with code: ${code}`);
      this.activeProcesses.delete(downloadId);
      
      if (code === 0) {
        console.log('✅ [YTDLP] Download completed successfully');
        progressData.status = 'completed';
        progressData.progress = 100;
      } else {
        console.log(`❌ [YTDLP] Download failed with code ${code}`);
        progressData.status = 'error';
        progressData.error = `Download failed with code ${code}`;
      }
      
      if (onProgress) {
        onProgress(progressData);
      }
    });

    process.on('error', (error) => {
      console.error('💥 [YTDLP] Process error:', error);
      this.activeProcesses.delete(downloadId);
      progressData.status = 'error';
      progressData.error = error.message;
      
      if (onProgress) {
        onProgress(progressData);
      }
    });

    return downloadId;
  }

  pauseDownload(downloadId) {
    const process = this.activeProcesses.get(downloadId);
    if (process) {
      try {
        // Try to pause the process (SIGSTOP on Unix, SIGBREAK on Windows)
        if (process.platform === 'win32') {
          process.kill('SIGBREAK');
        } else {
          process.kill('SIGSTOP');
        }
        return true;
      } catch (error) {
        console.error('Failed to pause download:', error);
        return false;
      }
    }
    return false;
  }

  resumeDownload(downloadId) {
    const process = this.activeProcesses.get(downloadId);
    if (process) {
      try {
        // Resume the process (SIGCONT)
        process.kill('SIGCONT');
        return true;
      } catch (error) {
        console.error('Failed to resume download:', error);
        return false;
      }
    }
    return false;
  }
}

module.exports = YtdlpService;
