const express = require('express');
const router = express.Router();
const YtdlpService = require('../services/YtdlpService');
const fs = require('fs-extra');
const path = require('path');

// Initialize YtdlpService
let ytdlpService;

router.use((req, res, next) => {
  if (!ytdlpService) {
    ytdlpService = new YtdlpService();
  }
  next();
});

// Get app version
router.get('/version', (req, res) => {
  try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = require(packagePath);
    res.json({ version: packageJson.version });
  } catch (error) {
    console.error('Version error:', error);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

// Get yt-dlp version
router.get('/ytdlp-version', async (req, res) => {
  try {
    const version = await ytdlpService.getVersion();
    res.json({ version });
  } catch (error) {
    console.error('yt-dlp version error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get FFmpeg version (placeholder - would need FFmpeg installed)
router.get('/ffmpeg-version', (req, res) => {
  try {
    // For now, return a placeholder
    res.json({ version: 'ffmpeg-version-placeholder' });
  } catch (error) {
    console.error('FFmpeg version error:', error);
    res.status(500).json({ error: 'Failed to get FFmpeg version' });
  }
});

// Check if file exists
router.post('/file-exists', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const exists = await fs.pathExists(filePath);
    res.json({ exists });
  } catch (error) {
    console.error('File exists check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create directory
router.post('/create-directory', async (req, res) => {
  try {
    const { dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    await fs.ensureDir(dirPath);
    res.json({ success: true });
  } catch (error) {
    console.error('Create directory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read directory contents
router.post('/read-directory', async (req, res) => {
  try {
    const { dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const files = await fs.readdir(dirPath);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      })
    );
    
    res.json(fileStats);
  } catch (error) {
    console.error('Read directory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.post('/delete-file', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    await fs.remove(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get platform info
router.get('/platform', (req, res) => {
  try {
    const platform = {
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };
    res.json(platform);
  } catch (error) {
    console.error('Platform info error:', error);
    res.status(500).json({ error: 'Failed to get platform info' });
  }
});

// Server status check
router.get('/status', (req, res) => {
  try {
    res.json({ 
      status: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
});

module.exports = router;
