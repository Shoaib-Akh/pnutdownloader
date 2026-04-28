/**
 * Test script for PNUTDownloader web functionality
 * Tests downloading a YouTube Shorts video
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';
const TEST_URL = 'https://www.youtube.com/shorts/3U6UJG1gql0';

class DownloadTester {
  constructor() {
    this.downloadId = null;
    this.socket = null;
    this.receivedProgress = [];
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
    console.log('🚀 Starting download test...');
    console.log(`📹 Test URL: ${TEST_URL}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/download/start`, {
        url: TEST_URL,
        isAudioOnly: false,
        selectedFormat: 'mp4',
        selectedQuality: '1080p',
        saveTo: 'Downloads',
        selectBitrate: '128k',
        title: 'test_shorts_video'
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

  async waitForCompletion(maxWaitTime = 120000) {
    console.log(`⏳ Waiting for download completion (max ${maxWaitTime/1000}s)...`);
    
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
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

  async testVideoInfo() {
    console.log('🔍 Testing video info fetch...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/video/info`, {
        url: TEST_URL
      });
      
      if (response.data && response.data.title) {
        console.log('✅ Video info fetched successfully:');
        console.log(`   Title: ${response.data.title}`);
        console.log(`   Duration: ${response.data.duration} seconds`);
        console.log(`   Uploader: ${response.data.uploader}`);
        return response.data;
      } else {
        throw new Error('Video info fetch failed - invalid response format');
      }
    } catch (error) {
      console.error('❌ Failed to fetch video info:', error.response?.data || error.message);
      throw error;
    }
  }

  async runFullTest() {
    console.log('🧪 Starting PNUTDownloader Web Test');
    console.log('=====================================');
    
    try {
      // Step 1: Connect to WebSocket
      await this.connectSocket();
      
      // Step 2: Test video info fetch
      await this.testVideoInfo();
      
      // Step 3: Start download
      await this.startDownload();
      
      // Step 4: Wait for completion
      const finalStatus = await this.waitForCompletion();
      
      // Step 5: Show results
      console.log('\n📊 Test Results Summary:');
      console.log('========================');
      console.log(`✅ Download ID: ${this.downloadId}`);
      console.log(`✅ Final Status: ${finalStatus.status}`);
      console.log(`✅ Progress Updates Received: ${this.receivedProgress.length}`);
      
      if (this.receivedProgress.length > 0) {
        const lastProgress = this.receivedProgress[this.receivedProgress.length - 1];
        console.log(`✅ Final Progress: ${lastProgress.progress}%`);
      }
      
      console.log('\n🎉 Test completed successfully!');
      return true;
      
    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
      return false;
    } finally {
      if (this.socket) {
        this.socket.disconnect();
        console.log('🔌 WebSocket disconnected');
      }
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
  
  const tester = new DownloadTester();
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

module.exports = DownloadTester;
