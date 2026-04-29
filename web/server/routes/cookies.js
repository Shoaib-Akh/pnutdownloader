const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const CookieService = require('../services/CookieService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only .txt files
    if (path.extname(file.originalname).toLowerCase() === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'), false);
    }
  }
});

// Initialize CookieService
const cookieService = new CookieService();

// Upload cookies file
router.post('/upload', upload.single('cookies'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const { domain = 'youtube.com' } = req.body;
    const filename = `${domain}.txt`;
    
    const result = await cookieService.saveCookies(
      req.file.buffer.toString('utf8'), 
      filename
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [COOKIES] Upload error:', error);
    res.status(500).json({
      success: false,
      message: `Upload failed: ${error.message}`
    });
  }
});

// Upload cookies as text content
router.post('/upload-text', async (req, res) => {
  try {
    const { content, domain = 'youtube.com' } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cookie content is required' 
      });
    }

    const filename = `${domain}.txt`;
    const result = await cookieService.saveCookies(content, filename);

    res.json(result);
  } catch (error) {
    console.error('❌ [COOKIES] Text upload error:', error);
    res.status(500).json({
      success: false,
      message: `Upload failed: ${error.message}`
    });
  }
});

// Get cookie status for a domain
router.get('/status/:domain?', async (req, res) => {
  try {
    const domain = req.params.domain || 'youtube.com';
    const info = await cookieService.getCookieInfo(domain);
    
    res.json({
      success: true,
      domain,
      ...info
    });
  } catch (error) {
    console.error('❌ [COOKIES] Status check error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to check cookie status: ${error.message}`
    });
  }
});

// Get all available domains with valid cookies
router.get('/domains', async (req, res) => {
  try {
    const domains = await cookieService.getAvailableDomains();
    
    res.json({
      success: true,
      domains,
      count: domains.length
    });
  } catch (error) {
    console.error('❌ [COOKIES] Domains fetch error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch domains: ${error.message}`
    });
  }
});

// Delete cookies for a domain
router.delete('/:domain?', async (req, res) => {
  try {
    const domain = req.params.domain || 'youtube.com';
    const deleted = await cookieService.deleteCookies(domain);
    
    res.json({
      success: true,
      domain,
      deleted,
      message: deleted ? 
        `Cookies deleted for ${domain}` : 
        `No cookies found for ${domain}`
    });
  } catch (error) {
    console.error('❌ [COOKIES] Delete error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to delete cookies: ${error.message}`
    });
  }
});

// Clear all cookies
router.delete('/', async (req, res) => {
  try {
    const cleared = await cookieService.clearAllCookies();
    
    res.json({
      success: true,
      cleared,
      message: cleared ? 'All cookies cleared' : 'No cookies to clear'
    });
  } catch (error) {
    console.error('❌ [COOKIES] Clear all error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to clear cookies: ${error.message}`
    });
  }
});

// Validate cookie content without saving
router.post('/validate', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cookie content is required' 
      });
    }

    const isValid = cookieService.validateCookieContent(content);
    
    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 
        'Cookie content is valid' : 
        'Invalid cookie format'
    });
  } catch (error) {
    console.error('❌ [COOKIES] Validation error:', error);
    res.status(500).json({
      success: false,
      message: `Validation failed: ${error.message}`
    });
  }
});

module.exports = router;
