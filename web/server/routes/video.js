const express = require('express');
const router = express.Router();
const YtdlpService = require('../services/YtdlpService');

// Initialize YtdlpService
let ytdlpService;

router.use((req, res, next) => {
  if (!ytdlpService) {
    ytdlpService = new YtdlpService();
  }
  next();
});

// Fetch video info
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const info = await ytdlpService.fetchVideoInfo(url);
    res.json(info);
  } catch (error) {
    console.error('Video info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch playlist entries
router.post('/playlist', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const entries = await ytdlpService.fetchPlaylistEntries(url);
    res.json(entries);
  } catch (error) {
    console.error('Playlist entries error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get YouTube-specific info (maintains compatibility with existing frontend)
router.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const info = await ytdlpService.fetchVideoInfo(url);
    
    // Transform to match expected format from frontend
    const transformedInfo = {
      id: info.id,
      title: info.title,
      description: info.description,
      duration: info.duration,
      uploader: info.uploader,
      uploader_id: info.uploader_id,
      thumbnail: info.thumbnail,
      view_count: info.view_count,
      like_count: info.like_count,
      formats: info.formats,
      webpage_url: info.webpage_url
    };

    res.json(transformedInfo);
  } catch (error) {
    console.error('YouTube info error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
