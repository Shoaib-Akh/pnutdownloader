const express = require('express');
const router = express.Router();
const DownloadService = require('../services/DownloadService');

// Initialize DownloadService with io from app
let downloadService;

router.use((req, res, next) => {
  if (!downloadService) {
    const io = req.app.get('io');
    downloadService = new DownloadService(io);
  }
  next();
});

// Get video info
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoInfo = await downloadService.ytdlpService.fetchVideoInfo(url);
    
    // Return relevant video information
    const sanitizedInfo = {
      title: videoInfo.title,
      duration: videoInfo.duration,
      viewCount: videoInfo.view_count,
      uploader: videoInfo.uploader,
      thumbnail: videoInfo.thumbnail,
      description: videoInfo.description ? videoInfo.description.substring(0, 500) : null,
      uploadDate: videoInfo.upload_date,
      webpageUrl: videoInfo.webpage_url,
      formats: videoInfo.formats ? videoInfo.formats.slice(0, 10) : null, // Limit formats to reduce payload
      isLive: videoInfo.is_live,
      availability: videoInfo.availability
    };

    res.json({ success: true, videoInfo: sanitizedInfo });
  } catch (error) {
    console.error('Video info fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start download
router.post('/start', async (req, res) => {
  try {
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
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const downloadId = await downloadService.startDownload({
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo,
      selectBitrate,
      title,
      playlistTitle,
      formatId
    });

    res.json({ success: true, downloadId });
  } catch (error) {
    console.error('Download start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pause download
router.post('/pause/:downloadId', (req, res) => {
  try {
    const { downloadId } = req.params;
    const success = downloadService.pauseDownload(downloadId);
    res.json({ success });
  } catch (error) {
    console.error('Download pause error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume download
router.post('/resume/:downloadId', (req, res) => {
  try {
    const { downloadId } = req.params;
    const success = downloadService.resumeDownload(downloadId);
    res.json({ success });
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel download
router.post('/cancel/:downloadId', (req, res) => {
  try {
    const { downloadId } = req.params;
    const success = downloadService.cancelDownload(downloadId);
    res.json({ success });
  } catch (error) {
    console.error('Download cancel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get download status
router.get('/status/:downloadId', (req, res) => {
  try {
    const { downloadId } = req.params;
    const status = downloadService.getDownloadStatus(downloadId);
    if (status) {
      res.json(status);
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  } catch (error) {
    console.error('Download status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all active downloads
router.get('/active', (req, res) => {
  try {
    const downloads = downloadService.getAllActiveDownloads();
    res.json(downloads);
  } catch (error) {
    console.error('Active downloads error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
