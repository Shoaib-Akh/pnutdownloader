/**
 * Cookie Service for Web Server
 * Handles cookie file management for yt-dlp downloads
 * Adapted from desktop version for web environment
 */

const fs = require('fs-extra');
const path = require('path');

class CookieService {
  constructor() {
    this.cookiesDir = path.join(__dirname, '../cookies');
    this.youtubeCookiesPath = path.join(this.cookiesDir, 'youtube.com.txt');
    this.ensureCookiesDir();
  }

  async ensureCookiesDir() {
    await fs.ensureDir(this.cookiesDir);
  }

  /**
   * Save uploaded cookie content to file
   * @param {string} cookieContent - Raw cookie file content
   * @param {string} filename - Optional custom filename
   * @returns {Promise<{success: boolean, path: string, message: string}>}
   */
  async saveCookies(cookieContent, filename = 'youtube.com.txt') {
    try {
      // Validate cookie content format
      if (!this.validateCookieContent(cookieContent)) {
        return {
          success: false,
          path: null,
          message: 'Invalid cookie format. Expected Netscape cookie format.'
        };
      }

      const cookiePath = path.join(this.cookiesDir, filename);
      await fs.writeFile(cookiePath, cookieContent.trim(), 'utf8');
      
      console.log(`✅ [COOKIES] Saved cookies to ${cookiePath}`);
      return {
        success: true,
        path: cookiePath,
        message: `Cookies saved successfully to ${filename}`
      };
    } catch (error) {
      console.error('❌ [COOKIES] Error saving cookies:', error);
      return {
        success: false,
        path: null,
        message: `Failed to save cookies: ${error.message}`
      };
    }
  }

  /**
   * Validate cookie content format
   * @param {string} content - Cookie file content
   * @returns {boolean}
   */
  validateCookieContent(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const lines = content.trim().split('\n');
    
    // Check for Netscape header
    const hasHeader = lines.some(line => 
      line.trim().startsWith('# Netscape') || 
      line.trim().startsWith('# This is a generated file')
    );

    if (!hasHeader) {
      return false;
    }

    // Validate cookie data lines (skip comments)
    const dataLines = lines.filter(line => 
      !line.trim().startsWith('#') && line.trim().length > 0
    );

    return dataLines.some(line => {
      const parts = line.split('\t');
      return parts.length === 7; // Domain, includeSubdomains, path, secure, expires, name, value
    });
  }

  /**
   * Check if cookies file exists and is valid
   * @param {string} domain - Domain to check cookies for
   * @returns {boolean}
   */
  hasValidCookies(domain = 'youtube.com') {
    const cookiePath = this.getCookiePath(domain);
    
    if (!fs.existsSync(cookiePath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(cookiePath, 'utf8');
      const isValidFormat = this.validateCookieContent(content);
      
      if (!isValidFormat) {
        return false;
      }

      // Check if cookies are expired (basic check)
      const lines = content.trim().split('\n');
      const dataLines = lines.filter(line => 
        !line.trim().startsWith('#') && line.trim().length > 0
      );
      
      // Check if any cookies have recent expiration times
      const now = Math.floor(Date.now() / 1000);
      const hasValidExpiration = dataLines.some(line => {
        const parts = line.split('\t');
        if (parts.length === 7) {
          const expires = parseInt(parts[4]);
          return expires === 0 || expires > now;
        }
        return false;
      });

      if (!hasValidExpiration) {
        console.log('⚠️ [COOKIES] Cookies appear to be expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ [COOKIES] Error reading cookies for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Get cookie file path for domain
   * @param {string} domain - Domain name
   * @returns {string}
   */
  getCookiePath(domain = 'youtube.com') {
    const filename = `${domain}.txt`;
    return path.join(this.cookiesDir, filename);
  }

  /**
   * Get cookie file info
   * @param {string} domain - Domain name
   * @returns {Promise<{exists: boolean, valid: boolean, size: number, lastModified: Date|null}>}
   */
  async getCookieInfo(domain = 'youtube.com') {
    const cookiePath = this.getCookiePath(domain);
    
    try {
      const exists = await fs.pathExists(cookiePath);
      
      if (!exists) {
        return {
          exists: false,
          valid: false,
          size: 0,
          lastModified: null
        };
      }

      const stats = await fs.stat(cookiePath);
      const content = await fs.readFile(cookiePath, 'utf8');
      const valid = this.validateCookieContent(content);

      return {
        exists: true,
        valid,
        size: stats.size,
        lastModified: stats.mtime
      };
    } catch (error) {
      console.error(`❌ [COOKIES] Error getting cookie info for ${domain}:`, error);
      return {
        exists: false,
        valid: false,
        size: 0,
        lastModified: null
      };
    }
  }

  /**
   * Delete cookies for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<boolean>}
   */
  async deleteCookies(domain = 'youtube.com') {
    try {
      const cookiePath = this.getCookiePath(domain);
      
      if (await fs.pathExists(cookiePath)) {
        await fs.remove(cookiePath);
        console.log(`🗑️ [COOKIES] Deleted cookies for ${domain}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ [COOKIES] Error deleting cookies for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Get all available cookie domains
   * @returns {Promise<string[]>}
   */
  async getAvailableDomains() {
    try {
      const files = await fs.readdir(this.cookiesDir);
      const domains = files
        .filter(file => file.endsWith('.txt'))
        .map(file => file.replace('.txt', ''))
        .filter(domain => this.hasValidCookies(domain));
      
      return domains;
    } catch (error) {
      console.error('❌ [COOKIES] Error getting available domains:', error);
      return [];
    }
  }

  /**
   * Clear all cookies
   * @returns {Promise<boolean>}
   */
  async clearAllCookies() {
    try {
      if (await fs.pathExists(this.cookiesDir)) {
        await fs.emptyDir(this.cookiesDir);
        console.log('🗑️ [COOKIES] Cleared all cookies');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [COOKIES] Error clearing cookies:', error);
      return false;
    }
  }
}

module.exports = CookieService;
