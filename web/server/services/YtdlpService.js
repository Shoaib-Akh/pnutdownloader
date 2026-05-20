const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class YtdlpService {
  constructor() {
    this.ytdlpPath = this.getYtdlpPath();
    this.downloadsDir = path.join(__dirname, '../downloads');
    this.activeProcesses = new Map();
    this.retryAttempts = new Map();
    this.cookieCandidates = [
      path.join(__dirname, '../cookies/youtube.com.txt'),
      path.join(__dirname, '../cookies/cookies.txt'),
      path.join(__dirname, '../cookies.txt')
    ];
    this.defaultProxy = this.getDefaultProxyFromEnv();
  }

  getDefaultProxyFromEnv() {
    const envProxy = process.env.YTDLP_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
    if (!envProxy) {
      return null;
    }

    const normalizedProxy = this.normalizeProxy(envProxy);
    if (!normalizedProxy) {
      console.warn('⚠️ [YTDLP] Invalid proxy in environment, ignoring it. Expected http(s):// or socks:// format');
      return null;
    }

    console.log('🌐 [YTDLP] Default proxy configured from environment');
    return normalizedProxy;
  }

  normalizeProxy(proxy) {
    if (typeof proxy !== 'string') {
      return null;
    }

    const trimmed = proxy.trim();
    if (!trimmed) {
      return null;
    }

    const validPattern = /^(https?|socks5h?|socks4a?):\/\/\S+$/i;
    return validPattern.test(trimmed) ? trimmed : null;
  }

  resolveProxy(proxy) {
    const hasRequestProxy = typeof proxy === 'string' && proxy.trim().length > 0;
    if (!hasRequestProxy) {
      return this.defaultProxy;
    }

    const normalizedProxy = this.normalizeProxy(proxy);
    if (!normalizedProxy) {
      throw new Error(
        'Invalid proxy URL. Use formats like http://host:port, https://host:port, socks5://host:port'
      );
    }

    return normalizedProxy;
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

  getCookieFilePath() {
    return this.cookieCandidates.find((cookiePath) => fs.existsSync(cookiePath)) || null;
  }

  appendCookieArgs(args, useCookies = true) {
    if (!useCookies) {
      console.log('🍪 [YTDLP] Cookies disabled for this request');
      return;
    }

    const cookieFilePath = this.getCookieFilePath();
    if (!cookieFilePath) {
      console.log('ℹ️ [YTDLP] No cookie file found, continuing without cookies');
      return;
    }

    args.unshift('--cookies', cookieFilePath);
    console.log('🍪 [YTDLP] Using cookies from:', cookieFilePath);
  }

  appendProxyArgs(args, proxy = null) {
    const resolvedProxy = this.resolveProxy(proxy);
    if (!resolvedProxy) {
      return;
    }

    args.unshift('--proxy', resolvedProxy);
    console.log('🌐 [YTDLP] Proxy enabled for request');
  }

  async fetchVideoInfo(url, useCookies = true, proxy = null) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-download',
        '--socket-timeout', '30',
        '--extractor-args', 'youtube:player_client=default',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        url
      ];

      this.appendCookieArgs(args, useCookies);
      this.appendProxyArgs(args, proxy);

      const process = spawn(this.ytdlpPath, args);
      const timeoutId = setTimeout(() => {
        if (process && !process.killed) {
          process.kill();
          reject(new Error('Video info fetch timeout'));
        }
      }, 60000);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve(info);
          } catch (error) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          console.error('🔴 [YTDLP] Fetch error details:', errorOutput);
          reject(new Error(errorOutput || 'Failed to fetch video info'));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error('💥 [YTDLP] Process error:', error.message);
        reject(error);
      });
    });
  }

  async fetchPlaylistEntries(url, useCookies = true, proxy = null) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--flat-playlist',
        '--no-download',
        url
      ];

      this.appendCookieArgs(args, useCookies);
      this.appendProxyArgs(args, proxy);

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
      useCookies = true,
      proxy = null
    } = options;

    console.log('🚀 [YTDLP] Starting download with options:', options);
    console.log('🔧 [YTDLP] Using yt-dlp path:', this.ytdlpPath);

    const downloadId = id || Date.now().toString();
    const retryCount = this.retryAttempts.get(downloadId) || 0;

    this.executeDownload(downloadId, {
      url,
      outputPath,
      format,
      quality,
      isAudioOnly,
      bitrate,
      formatId,
      retryCount,
      useCookies,
      proxy
    }, onProgress);

    return downloadId;
  }

  executeDownload(downloadId, options, onProgress) {
    const {
      url,
      outputPath,
      quality,
      isAudioOnly,
      bitrate,
      formatId,
      retryCount,
      useCookies,
      proxy
    } = options;

    let formatSelector;
    if (formatId) {
      formatSelector = formatId;
      console.log('🎯 [YTDLP] Using specific format ID:', formatId);
    } else if (isAudioOnly) {
      formatSelector = 'bestaudio';
    } else {
      // Use fallback quality on retry
      const qualityValue = quality.replace('p', '');
      const fallbackQuality = retryCount > 0 ? Math.max(360, parseInt(qualityValue) - 360) : qualityValue;
      formatSelector = `bestvideo[height<=${fallbackQuality}]+bestaudio/best`;
      
      if (retryCount > 0) {
        console.log(`⚠️ [YTDLP] Retry attempt ${retryCount} - Using fallback quality: ${fallbackQuality}p`);
      }
    }

    // Build arguments with enhanced YouTube bypass
    const args = [
      '-f', formatSelector,
      '-o', outputPath,
      '--socket-timeout', '30',
      '--extractor-args', 'youtube:player_client=default',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--continue',
      '--no-warnings',
      '--progress',
      '--quiet'
    ];

    this.appendCookieArgs(args, useCookies);
    this.appendProxyArgs(args, proxy);

    // Add metadata embedding
    args.push('--embed-metadata', '--embed-chapters');

    // Add FFmpeg post-processing
    if (isAudioOnly) {
      args.push('-x', '--audio-format', 'mp3');
      if (bitrate) {
        args.push('--audio-quality', bitrate);
      }
      args.push('--postprocessor-args', '-c:a libmp3lame -q:a 2');
    } else {
      args.push('--postprocessor-args', '-c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k');
    }

    args.push(url);

    console.log('📋 [YTDLP] Command args:', args);
    console.log('🎯 [YTDLP] Spawning yt-dlp process...');
    console.log('🆔 [YTDLP] Download ID:', downloadId);

    const process = spawn(this.ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

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

    let errorOutput = '';

    process.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      
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
        this.retryAttempts.delete(downloadId);
      } else {
        console.error(`❌ [YTDLP] Download failed with code ${code}`);
        console.error('📝 [YTDLP] Error output:', errorOutput);
        
        // Retry logic with different strategies
        if ((errorOutput.includes('403') || errorOutput.includes('HTTP Error')) && options.retryCount < 3) {
          console.log(`🔄 [YTDLP] Retrying download (attempt ${options.retryCount + 1}/3)...`);
          this.retryAttempts.set(downloadId, options.retryCount + 1);
          
          // Wait longer between retries
          setTimeout(() => {
            this.executeDownload(downloadId, {
              ...options,
              retryCount: options.retryCount + 1
            }, onProgress);
          }, 3000 + (options.retryCount * 2000));
        } else {
          progressData.status = 'error';
          progressData.error = errorOutput.substring(0, 500) || `Download failed with code ${code}`;
          this.retryAttempts.delete(downloadId);
        }
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
      this.retryAttempts.delete(downloadId);
      
      if (onProgress) {
        onProgress(progressData);
      }
    });

    // Global timeout after 15 minutes
    setTimeout(() => {
      if (this.activeProcesses.has(downloadId) && !process.killed) {
        console.log('⏱️ [YTDLP] Download timeout - killing process');
        process.kill('SIGTERM');
      }
    }, 15 * 60 * 1000);

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

  cancelDownload(downloadId) {
    const process = this.activeProcesses.get(downloadId);
    if (process) {
      try {
        process.kill();
        this.activeProcesses.delete(downloadId);
        return true;
      } catch (error) {
        console.error('Failed to cancel download:', error);
        return false;
      }
    }
    return false;
  }
}

module.exports = YtdlpService;
