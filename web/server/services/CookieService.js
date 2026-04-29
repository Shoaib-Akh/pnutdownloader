const fs = require('fs');
const path = require('path');

class CookieService {
  constructor() {
    this.cookiesDir = path.join(__dirname, '../../cookies');
    this.cookiesPath = path.join(this.cookiesDir, 'cookies.txt');
    this.poTokenPath = path.join(this.cookiesDir, 'po_token.txt');
  }

  /**
   * Check if cookies file exists and is valid
   * @returns {boolean}
   */
  hasValidCookies() {
    try {
      if (!fs.existsSync(this.cookiesPath)) {
        return false;
      }
      
      const content = fs.readFileSync(this.cookiesPath, 'utf-8');
      // Check for Netscape format and YouTube-specific cookies
      if (!content.includes('# Netscape')) {
        return false;
      }
      // Check for at least one YouTube cookie
      const youtubeCookies = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'SIDCC'];
      const hasValidCookie = youtubeCookies.some(cookie => {
        const regex = new RegExp(`\t${cookie}\t`, 'm');
        return regex.test(content);
      });
      return hasValidCookie && content.split('\n').length > 5;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cookies file path for yt-dlp
   * @returns {string}
   */
  getCookiesPath() {
    return this.cookiesPath;
  }

  /**
   * Get PO Token if available
   * @returns {string|null}
   */
  getPOToken() {
    try {
      if (fs.existsSync(this.poTokenPath)) {
        const token = fs.readFileSync(this.poTokenPath, 'utf-8').trim();
        return token || null;
      }
    } catch (error) {
      console.warn('⚠️  Could not read PO token:', error.message);
    }
    return null;
  }

  /**
   * Get extractor args for yt-dlp with fallback clients
   * @param {number} attempt - Current attempt number
   * @returns {string}
   */
  getExtractorArgs(attempt = 1) {
    const poToken = this.getPOToken();
    
    // Fallback strategy for different clients
    let client = 'android';
    let args = '';
    
    switch(attempt) {
      case 1:
        // Try android with PO token if available
        client = 'android';
        args = poToken 
          ? `youtube:player_client=android,po_token=android.gvs+${poToken}`
          : 'youtube:player_client=android';
        break;
      case 2:
        // Fallback to web client
        client = 'web';
        args = 'youtube:player_client=web';
        break;
      case 3:
        // Fallback to ios client
        client = 'ios';
        args = 'youtube:player_client=ios';
        break;
      default:
        args = 'youtube:player_client=web';
    }
    
    return args;
  }

  /**
   * Clear partial downloads that may cause 416 errors
   * @param {string} outputPath - Path to output file
   * @returns {boolean}
   */
  clearPartialDownload(outputPath) {
    try {
      const directory = path.dirname(outputPath);
      const filename = path.basename(outputPath);
      
      // Remove main file if it exists
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
        console.log('🗑️  Cleared partial download:', filename);
      }
      
      // Remove .tmp and .f* partial files
      const files = fs.readdirSync(directory);
      files.forEach(file => {
        if (file.includes(filename) && (file.endsWith('.tmp') || file.match(/\.f\d+$/))) {
          try {
            fs.unlinkSync(path.join(directory, file));
            console.log('🗑️  Cleared temporary file:', file);
          } catch (e) {
            // Continue if file can't be deleted
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing partial downloads:', error.message);
      return false;
    }
  }

  /**
   * Create a sample cookies file for testing
   * @returns {boolean}
   */
  createSampleCookies() {
    try {
      // Ensure cookies directory exists
      if (!fs.existsSync(this.cookiesDir)) {
        fs.mkdirSync(this.cookiesDir, { recursive: true });
      }

      // Create a basic cookies file
      const sampleContent = `# Netscape HTTP Cookie File
# This is a sample file - replace with actual cookies from browser
# To get cookies: 
# 1. Open YouTube in browser
# 2. Open DevTools (F12)
# 3. Go to Application > Cookies > youtube.com
# 4. Export cookies and paste here

.youtube.com	TRUE	/	FALSE	0	SAPISID	[your-sapisid-here]
.youtube.com	TRUE	/	FALSE	0	HSID	[your-hsid-here]
.youtube.com	TRUE	/	FALSE	0	APISID	[your-apisid-here]
.youtube.com	TRUE	/	FALSE	0	SIDCC	[your-sidcc-here]
`;

      fs.writeFileSync(this.cookiesPath, sampleContent);
      console.log('🍪 Sample cookies file created at:', this.cookiesPath);
      console.log('⚠️  Please edit this file with actual browser cookies for better download success');
      return true;
    } catch (error) {
      console.error('❌ Error creating sample cookies:', error);
      return false;
    }
  }
}

module.exports = CookieService;
