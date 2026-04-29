const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const YtdlpService = require('./YtdlpService');

class DownloadService {
  constructor(io) {
    this.io = io;
    this.ytdlpService = new YtdlpService();
    this.activeDownloads = new Map();
    this.downloadQueue = [];
    this.downloadsDir = path.join(__dirname, '../downloads');
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
      playlistTitle = null
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
      // Continue with download even if info fetch fails
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
      id: downloadId
    };

    // Store download info with video metadata
    const downloadInfo = {
      id: downloadId,
      url,
      title: videoTitle,
      status: 'fetching-info',
      progress: 0,
      outputPath,
      createdAt: new Date(),
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
    
    // Broadcast initial info
    this.io.emit('download-progress', downloadInfo);

    // Update status to starting download
    downloadInfo.status = 'starting';
    this.io.emit('download-progress', downloadInfo);

    // Start download with progress tracking
    const ytdlpId = this.ytdlpService.download(downloadOptions, (progress) => {
      downloadInfo.status = progress.status;
      downloadInfo.progress = progress.progress;
      downloadInfo.speed = progress.speed;
      downloadInfo.eta = progress.eta;
      downloadInfo.error = progress.error || null;
      
      // Broadcast progress to all connected clients
      this.io.emit('download-progress', downloadInfo);
    });

    return downloadId;
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
