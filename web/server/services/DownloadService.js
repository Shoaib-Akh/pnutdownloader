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

    // Create user-specific download directory
    const userDownloadsDir = path.join(this.downloadsDir, saveTo);
    await fs.ensureDir(userDownloadsDir);

    // Generate output filename
    const extension = isAudioOnly ? 'mp3' : selectedFormat.toLowerCase();
    const sanitizedTitle = title.replace(/[^\w\s.-]/g, '_').substring(0, 100);
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

    // Store download info
    const downloadInfo = {
      id: downloadId,
      url,
      title,
      status: 'starting',
      progress: 0,
      outputPath,
      createdAt: new Date()
    };
    
    this.activeDownloads.set(downloadId, downloadInfo);

    // Start download with progress tracking
    const ytdlpId = this.ytdlpService.download(downloadOptions, (progress) => {
      downloadInfo.status = progress.status;
      downloadInfo.progress = progress.progress;
      downloadInfo.speed = progress.speed;
      downloadInfo.eta = progress.eta;
      
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
