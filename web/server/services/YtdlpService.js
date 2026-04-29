const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const CookieService = require('./CookieService');

class YtdlpService {
  constructor(io) {
    this.io = io;
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

  async fetchVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytdlpPath, [
        '--no-update',
        '--dump-json',
        '--no-download',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--referer', 'https://www.youtube.com/',
        '--ignore-errors',
        '--no-check-certificate',
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
            formatId = null
        } = options;

        console.log('🚀 [YTDLP] Starting download with options:', options);
        console.log('🔧 [YTDLP] Using yt-dlp path:', this.ytdlpPath);

        let formatSelector;
        let useAndroidClient = false;
        
        if (formatId) {
            // Use specific format ID - use desktop client for better format compatibility
            formatSelector = formatId;
            console.log('🎯 [YTDLP] Using specific format ID:', formatId);
        } else if (isAudioOnly) {
            // Audio-only download
            formatSelector = 'bestaudio';
            useAndroidClient = true; // Use Android client for audio
        } else {
            // Video download with quality preference - use height-based selection
            const targetHeight = parseInt(quality.replace('p', ''));
            formatSelector = `bestvideo[height<=${targetHeight}]+bestaudio/best`;
            useAndroidClient = true;
        }

        const args = [
            '--no-update', // Suppress update warnings
            '--ignore-errors', // Ignore minor errors to continue download
            '--no-check-certificate', // Bypass SSL certificate issues
            '-f', formatSelector,
            '-o', outputPath,
            '--merge-output-format', 'mp4',
            '--embed-metadata', // Embed metadata using FFmpeg
            '--embed-chapters', // Embed chapters if available
            '--socket-timeout', '30', // Increase socket timeout for slower connections
            '--http-chunk-size', '10485760' // 10MB chunks for stability
        ];

        // Add cookies if available - CRITICAL for bypassing 403 errors
        if (this.cookieService.hasValidCookies()) {
            args.push('--cookies', this.cookieService.getCookiesPath());
            console.log('🍪 [YTDLP] Using cookies for download');
        } else {
            console.log('⚠️ [YTDLP] No cookies found, download may fail for high-quality formats');
            // Create sample cookies if none exist
            this.cookieService.createSampleCookies();
            args.push('--cookies', this.cookieService.getCookiesPath());
        }

        // Use web client - most compatible and stable for downloads
        // Avoid Android client due to PO Token requirements
        args.push(
            '--extractor-args', 'youtube:player_client=web',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            '--referer', 'https://www.youtube.com/',
            '--add-header', 'Accept-Language:en-US,en;q=0.9',
            '--add-header', 'Sec-Fetch-Dest:iframe',
            '--add-header', 'Sec-Fetch-Mode:navigate',
            '--add-header', 'Sec-Fetch-Site:same-origin'
        );

        // Add FFmpeg post-processing based on format
        if (isAudioOnly) {
            args.push('-x', '--audio-format', 'mp3');
            if (bitrate) {
                args.push('--audio-quality', bitrate);
            }
            // Add FFmpeg audio processing for better quality
            args.push('--postprocessor-args', 'ffmpeg:-c:a libmp3lame -q:a 2');
        } else {
            // Add FFmpeg video processing for better compatibility and quality
            args.push('--postprocessor-args', 'ffmpeg:-c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k');
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
            console.log('📝 [YTDLP] stderr:', output);
            
            // Check for 403 Forbidden errors
            if (output.includes('403') || output.includes('Forbidden')) {
                console.error('⚠️  [YTDLP] 403 Forbidden error detected!');
                console.error('🔧 [YTDLP] Suggestions:');
                console.error('  1. Update yt-dlp: pip install --upgrade yt-dlp');
                console.error('  2. Export fresh cookies from YouTube');
                console.error('  3. Try lower quality (720p instead of 1080p)');
                console.error('  4. Wait a few minutes and retry');
                progressData.warning = '403 Forbidden - Check cookies and yt-dlp version';
            }
            
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

        process.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('📝 [YTDLP] stdout:', output);
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
                
                // If format ID download failed, try fallback to quality-based download
                if (formatId && !useAndroidClient) {
                    console.log(`🔄 [YTDLP] Format ID ${formatId} failed, trying quality-based fallback`);
                    progressData.status = 'retrying';
                    progressData.error = `Format ${formatId} not available, trying best quality...`;
                    
                    if (onProgress) {
                        onProgress(progressData);
                    }
                    
                    // Retry with quality-based download using Android client
                    const fallbackOptions = {
                        ...options,
                        formatId: null // Remove format ID to trigger quality-based download
                    };
                    
                    // Retry the download
                    this.download(fallbackOptions, onProgress);
                    return;
                }
                
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
