/**
 * Test script for PNUTDownloader 1080p video download with FFmpeg merging
 * Tests downloading a YouTube video in 1080p resolution with proper yt-dlp/ffmpeg integration
 */

const axios = require('axios');
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const TEST_URL = 'https://www.youtube.com/watch?v=XTzzvT9BR34';
const DOWNLOADS_DIR = path.join(__dirname, 'server', 'downloads', 'Downloads');

class Test1080pDownloader {
  constructor() {
    this.downloadId = null;
    this.socket = null;
    this.receivedProgress = [];
    this.testFilePath = null;
  }

  async connectSocket() {
    console.log('🔌 Connecting to WebSocket...');
    this.socket = io(BASE_URL);
    
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('✅ Connected to WebSocket');
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection failed:', error.message);
        reject(error);
      });
      
      // Listen for download progress
      this.socket.on('downloadProgress', (data) => {
        console.log('📊 Progress update:', data);
        this.receivedProgress.push(data);
      });
    });
  }

  async startDownload() {
    console.log('🚀 Starting 1080p MP4 download test...');
    console.log(`📹 Test URL: ${TEST_URL}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/download/start`, {
        url: TEST_URL,
        isAudioOnly: false,
        selectedFormat: 'mp4',
        selectedQuality: '1080p',
        saveTo: 'Downloads',
        selectBitrate: '128k',
        title: 'test_1080p_video'
      });
      
      if (response.data.success) {
        this.downloadId = response.data.downloadId;
        console.log(`✅ Download started with ID: ${this.downloadId}`);
        return this.downloadId;
      } else {
        throw new Error('Download start failed');
      }
    } catch (error) {
      console.error('❌ Failed to start download:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkDownloadStatus() {
    if (!this.downloadId) {
      throw new Error('No download ID available');
    }
    
    try {
      const response = await axios.get(`${BASE_URL}/api/download/status/${this.downloadId}`);
      console.log('📋 Download status:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to check download status:', error.response?.data || error.message);
      throw error;
    }
  }

  async waitForCompletion(maxWaitTime = 300000) { // 5 minutes for 1080p
    console.log(`⏳ Waiting for download completion (max ${maxWaitTime/1000}s)...`);
    
    const startTime = Date.now();
    const checkInterval = 3000; // Check every 3 seconds
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await this.checkDownloadStatus();
          
          if (status.status === 'completed') {
            console.log('✅ Download completed successfully!');
            resolve(status);
          } else if (status.status === 'error') {
            console.error('❌ Download failed:', status.error);
            reject(new Error(status.error));
          } else if (Date.now() - startTime > maxWaitTime) {
            console.error('⏰ Download timeout');
            reject(new Error('Download timeout'));
          } else {
            setTimeout(checkStatus, checkInterval);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  }

  async findDownloadedFile() {
    // Wait a moment for file system to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      console.error(`❌ Downloads directory not found: ${DOWNLOADS_DIR}`);
      return null;
    }
    
    const files = fs.readdirSync(DOWNLOADS_DIR);
    console.log(`📁 Files in downloads directory: ${files.join(', ')}`);
    
    // Look for files that might be our test download
    // yt-dlp sanitizes filenames, so we look for recent files
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    
    if (mp4Files.length === 0) {
      console.log('❌ No MP4 files found in downloads directory');
      return null;
    }
    
    // Sort by modification time (newest first)
    const filesWithTime = mp4Files.map(file => ({
      file,
      time: fs.statSync(path.join(DOWNLOADS_DIR, file)).mtime.getTime()
    }));
    
    filesWithTime.sort((a, b) => b.time - a.time);
    
    const newestFile = filesWithTime[0].file;
    const filePath = path.join(DOWNLOADS_DIR, newestFile);
    
    console.log(`🎯 Found newest MP4 file: ${newestFile}`);
    
    // Verify file is not empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error(`❌ Downloaded file is empty: ${newestFile}`);
      return null;
    }
    
    console.log(`✅ File size: ${(stats.size / (1024*1024)).toFixed(2)} MB`);
    this.testFilePath = filePath;
    return filePath;
  }

  async cleanup() {
    if (this.testFilePath && fs.existsSync(this.testFilePath)) {
      try {
        fs.unlinkSync(this.testFilePath);
        console.log(`🧹 Cleaned up test file: ${path.basename(this.testFilePath)}`);
      } catch (error) {
        console.warn(`⚠️  Failed to clean up test file: ${error.message}`);
      }
    }
  }

  async runFullTest() {
    console.log('🧪 Starting PNUTDownloader 1080p Download Test');
    console.log('=================================================');
    
    try {
      // Step 1: Connect to WebSocket
      await this.connectSocket();
      
      // Step 2: Start download
      await this.startDownload();
      
      // Step 3: Wait for completion
      const finalStatus = await this.waitForCompletion();
      
      // Step 4: Find and verify downloaded file
      const filePath = await this.findDownloadedFile();
      if (!filePath) {
        throw new Error('Failed to locate downloaded file');
      }
      
      // Step 5: Show results
      console.log('\n📊 Test Results Summary:');
      console.log('========================');
      console.log(`✅ Download ID: ${this.downloadId}`);
      console.log(`✅ Final Status: ${finalStatus.status}`);
      console.log(`✅ Progress Updates Received: ${this.receivedProgress.length}`);
      
      if (this.receivedProgress.length > 0) {
        const lastProgress = this.receivedProgress[this.receivedProgress.length - 1];
        console.log(`✅ Final Progress: ${lastProgress.progress}%`);
        if (lastProgress.speed) {
          console.log(`✅ Final Speed: ${lastProgress.speed}`);
        }
        if (lastProgress.eta) {
          console.log(`✅ ETA: ${lastProgress.eta}`);
        }
      }
      
      console.log(`✅ Downloaded File: ${path.basename(this.testFilePath)}`);
      console.log(`✅ File Size: ${(fs.statSync(this.testFilePath).size / (1024*1024)).toFixed(2)} MB`);
      
      console.log('\n🎉 1080p download test completed successfully!');
      return true;
      
    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
      return false;
    } finally {
      if (this.socket) {
        this.socket.disconnect();
        console.log('🔌 WebSocket disconnected');
      }
      // Note: We're not cleaning up the file automatically to allow inspection
      // Uncomment the next line if you want automatic cleanup
      // await this.cleanup();
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/system/status`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running on', BASE_URL);
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running');
  
  const tester = new Test1080pDownloader();
  const success = await tester.runFullTest();
  
  process.exit(success ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  main();
}

module.exports = Test1080pDownloader;