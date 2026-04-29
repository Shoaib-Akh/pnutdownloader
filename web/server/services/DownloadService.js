const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const YtdlpService = require('./YtdlpService');
const CookieService = require('./CookieService');

class DownloadService {
  constructor(io) {
    this.io = io;
    this.ytdlpService = new YtdlpService();
    this.cookieService = new CookieService();
    this.activeDownloads = new Map();
    this.downloadQueue = [];
    this.downloadsDir = path.join(__dirname, '../downloads');
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 2000; // Start with 2 seconds
    this.ensureDownloadsDir();
  }

  async ensureDownloadsDir() {
    await fs.ensureDir(this.downloadsDir);
  }

  async startDownload(options) {
    const downloadId = uuidv4();
    const {
      url,
      isAudioOnly = false,
      selectedFormat = 'mp4',
      selectedQuality = '1080p',
      saveTo = 'Downloads',
      selectBitrate = '128k',
      title = 'video',
      playlistTitle = null,
      formatId = null
    } = options;

    console.log('🎬 [DOWNLOAD] Fetching video info before download...');
    console.log('🔗 [DOWNLOAD] URL:', url);

    // Fetch video info first
    let videoInfo = null;
    try {
      videoInfo = await this.ytdlpService.fetchVideoInfo(url);
      console.log('✅ [DOWNLOAD] Video info fetched successfully');
      console.log('📹 [DOWNLOAD] Title:', videoInfo.title);
      console.log('⏱️ [DOWNLOAD] Duration:', videoInfo.duration);
      console.log('📊 [DOWNLOAD] View count:', videoInfo.view_count);
    } catch (error) {
      console.error('❌ [DOWNLOAD] Failed to fetch video info:', error.message);
    }

    // Create user-specific download directory
    const userDownloadsDir = path.join(this.downloadsDir, saveTo);
    await fs.ensureDir(userDownloadsDir);

    // Use video title from info if available, otherwise use provided title
    const videoTitle = videoInfo ? videoInfo.title : title;
    const sanitizedTitle = videoTitle.replace(/[^\w\s.-]/g, '_').substring(0, 100);
    const extension = isAudioOnly ? 'mp3' : selectedFormat.toLowerCase();
    const outputPath = path.join(userDownloadsDir, `${sanitizedTitle}.${extension}`);

    const downloadOptions = {
      url,
      outputPath,
      format: selectedFormat,
      quality: selectedQuality,
      isAudioOnly,
      bitrate: selectBitrate,
      id: downloadId,
      formatId: options.formatId
    };

    const downloadInfo = {
      id: downloadId,
      url,
      title: videoTitle,
      status: 'fetching-info',
      progress: 0,
      outputPath,
      createdAt: new Date(),
      retryCount: 0,
      videoInfo: videoInfo ? {
        title: videoInfo.title,
        duration: videoInfo.duration,
        viewCount: videoInfo.view_count,
        uploader: videoInfo.uploader,
        thumbnail: videoInfo.thumbnail,
        description: videoInfo.description ? videoInfo.description.substring(0, 200) + '...' : null,
        uploadDate: videoInfo.upload_date,
        webpageUrl: videoInfo.webpage_url
      } : null
    };
    
    this.activeDownloads.set(downloadId, downloadInfo);
    this.retryAttempts.set(downloadId, 0);
    
    this.io.emit('download-progress', downloadInfo);

    downloadInfo.status = 'starting';
    this.io.emit('download-progress', downloadInfo);

    // Start download with retry capability
    this._performDownload(downloadId, downloadOptions, 1);

    return downloadId;
  }

  /**
   * Perform download with automatic retry on 403 errors
   * @private
   */
  async _performDownload(downloadId, downloadOptions, attempt = 1) {
    const downloadInfo = this.activeDownloads.get(downloadId);
    if (!downloadInfo) return;

    downloadInfo.status = 'downloading';
    downloadInfo.retryCount = attempt - 1;
    this.io.emit('download-progress', downloadInfo);

    const ytdlpId = this.ytdlpService.download(downloadOptions, (progress) => {
      downloadInfo.status = progress.status;
      downloadInfo.progress = progress.progress;
      downloadInfo.speed = progress.speed;
      downloadInfo.eta = progress.eta;
      downloadInfo.error = progress.error || null;
      
      // Broadcast progress
      this.io.emit('download-progress', downloadInfo);

      // Handle 403/416 errors with retry
      if (progress.error && (progress.error.includes('403') || progress.error.includes('416'))) {
        console.warn(`⚠️  [DOWNLOAD] Error on attempt ${attempt}:`, progress.error);
        
        if (attempt < this.maxRetries) {
          console.log(`🔄 [DOWNLOAD] Retrying with different client strategy (attempt ${attempt + 1}/${this.maxRetries})`);
          
          // Clear partial downloads before retry
          this.cookieService.clearPartialDownload(downloadOptions.outputPath);
          
          // Calculate exponential backoff delay
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          
          setTimeout(() => {
            this._performDownloadWithClientStrategy(downloadId, downloadOptions, attempt + 1);
          }, delay);
        } else {
          downloadInfo.status = 'failed';
          downloadInfo.error = `Failed after ${this.maxRetries} retry attempts. YouTube is blocking this download.`;
          this.io.emit('download-progress', downloadInfo);
        }
      }
    });
  }

  /**
   * Perform download with different client strategy
   * @private
   */
  async _performDownloadWithClientStrategy(downloadId, downloadOptions, attempt) {
    const downloadInfo = this.activeDownloads.get(downloadId);
    if (!downloadInfo) return;

    console.log(`🔧 [DOWNLOAD] Attempting download with client strategy ${attempt}`);

    // Get extractor args for this attempt
    const extractorArgs = this.cookieService.getExtractorArgs(attempt);
    
    // Create modified options with new extractor args
    const modifiedOptions = {
      ...downloadOptions,
      extractorArgs
    };

    // Perform download with retry handler
    const ytdlpId = this.ytdlpService.download(modifiedOptions, (progress) => {
      downloadInfo.status = progress.status;
      downloadInfo.progress = progress.progress;
      downloadInfo.speed = progress.speed;
      downloadInfo.eta = progress.eta;
      downloadInfo.error = progress.error || null;
      downloadInfo.retryCount = attempt - 1;
      
      this.io.emit('download-progress', downloadInfo);

      // Handle errors with additional retry
      if (progress.error && (progress.error.includes('403') || progress.error.includes('416'))) {
        console.warn(`⚠️  [DOWNLOAD] Client strategy ${attempt} failed:`, progress.error);
        
        if (attempt < this.maxRetries) {
          console.log(`🔄 [DOWNLOAD] Trying next strategy (attempt ${attempt + 1}/${this.maxRetries})`);
          
          this.cookieService.clearPartialDownload(downloadOptions.outputPath);
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          
          setTimeout(() => {
            this._performDownloadWithClientStrategy(downloadId, downloadOptions, attempt + 1);
          }, delay);
        } else {
          downloadInfo.status = 'failed';
          downloadInfo.error = `Blocked by YouTube after ${this.maxRetries} strategies. Try updating yt-dlp or checking your cookies.`;
          this.io.emit('download-progress', downloadInfo);
        }
      }
    });
  }

  pauseDownload(downloadId) {
    const downloadInfo = this.activeDownloads.get(downloadId);
    if (downloadInfo) {
      const success = this.ytdlpService.pauseDownload(downloadId);
      if (success) {
        downloadInfo.status = 'paused';
        this.io.emit('download-progress', downloadInfo);
      }
      return success;
    }
    return false;
  }

  resumeDownload(downloadId) {
    const downloadInfo = this.activeDownloads.get(downloadId);
    if (downloadInfo) {
      const success = this.ytdlpService.resumeDownload(downloadId);
      if (success) {
        downloadInfo.status = 'downloading';
        this.io.emit('download-progress', downloadInfo);
      }
      return success;
    }
    return false;
  }

  cancelDownload(downloadId) {
    const downloadInfo = this.activeDownloads.get(downloadId);
    if (downloadInfo) {
      const success = this.ytdlpService.cancelDownload(downloadId);
      if (success) {
        downloadInfo.status = 'cancelled';
        this.io.emit('download-progress', downloadInfo);
        this.activeDownloads.delete(downloadId);
        this.retryAttempts.delete(downloadId);
      }
      return success;
    }
    return false;
  }

  getDownloadStatus(downloadId) {
    return this.activeDownloads.get(downloadId) || null;
  }

  getAllActiveDownloads() {
    return Array.from(this.activeDownloads.values());
  }
}

module.exports = DownloadService;
