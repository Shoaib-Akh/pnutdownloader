/**
 * Test script for PNUTDownloader web interface integration
 * Tests the complete flow through the web interface
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

const BASE_URL = 'http://localhost:5175';
const TEST_URL = 'https://www.youtube.com/shorts/3U6UJG1gql0';

class WebInterfaceTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 800 }
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging from the page
    this.page.on('console', msg => {
      console.log('🌐 [BROWSER]', msg.text());
    });
  }

  async navigateToApp() {
    console.log('📍 Navigating to web interface...');
    await this.page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    console.log('✅ Web interface loaded');
  }

  async testDownloadFlow() {
    console.log('🧪 Testing download flow...');
    
    // Find the URL input field
    await this.page.waitForSelector('.url-input', { timeout: 10000 });
    console.log('✅ Found URL input field');
    
    // Enter the test URL
    await this.page.type('.url-input', TEST_URL);
    console.log(`📝 Entered URL: ${TEST_URL}`);
    
    // Click the Go button or press Enter
    await this.page.click('.go-button');
    console.log('🔘 Clicked Go button');
    
    // Wait for the downloadable indicator
    await this.page.waitForSelector('.downloadable-indicator', { timeout: 10000 });
    console.log('✅ URL recognized as downloadable');
    
    // Wait for the download button to become enabled
    await this.page.waitForFunction(
      () => !document.querySelector('.download-button').disabled,
      { timeout: 10000 }
    );
    console.log('✅ Download button enabled');
    
    // Click the download button
    await this.page.click('.download-button');
    console.log('🔘 Clicked download button');
    
    // Wait for download to start (check for progress updates)
    await this.page.waitForTimeout(2000);
    
    // Check if download list opens or shows progress
    try {
      await this.page.waitForSelector('.downloads-view', { timeout: 5000 });
      console.log('✅ Download list opened');
    } catch (error) {
      console.log('ℹ️ Download list may not auto-open, checking for progress...');
    }
    
    // Wait a bit more for download to progress
    await this.page.waitForTimeout(5000);
    
    console.log('✅ Download flow test completed');
  }

  async checkDownloadStatus() {
    console.log('🔍 Checking download status via API...');
    
    try {
      const response = await axios.get('http://localhost:3001/api/download/active');
      const downloads = response.data;
      
      console.log(`📊 Active downloads: ${downloads.length}`);
      
      if (downloads.length > 0) {
        const download = downloads[0];
        console.log(`📋 Download status: ${download.status}`);
        console.log(`📈 Progress: ${download.progress}%`);
        console.log(`🎯 Title: ${download.title}`);
        
        return download;
      }
    } catch (error) {
      console.error('❌ Failed to check download status:', error.message);
    }
    
    return null;
  }

  async waitForDownloadCompletion(maxWaitTime = 120000) {
    console.log(`⏳ Waiting for download completion (max ${maxWaitTime/1000}s)...`);
    
    const startTime = Date.now();
    const checkInterval = 3000; // Check every 3 seconds
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const download = await this.checkDownloadStatus();
          
          if (download && download.status === 'completed') {
            console.log('✅ Download completed successfully!');
            resolve(download);
          } else if (download && download.status === 'error') {
            console.error('❌ Download failed:', download.error);
            reject(new Error(download.error));
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

  async testFileDownload() {
    console.log('🔍 Testing if file was downloaded...');
    
    try {
      const response = await axios.get('http://localhost:3001/api/system/read-directory', {
        data: { dirPath: '/Users/mac/Documents/pnutdownloader/web/server/downloads/Downloads' }
      });
      
      const files = response.data;
      const downloadedFile = files.find(file => file.name.includes('test_shorts_video') || file.name.includes('video'));
      
      if (downloadedFile) {
        console.log(`✅ Found downloaded file: ${downloadedFile.name} (${downloadedFile.size} bytes)`);
        return downloadedFile;
      } else {
        console.log('⚠️ No downloaded file found yet');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to check downloaded files:', error.message);
      return null;
    }
  }

  async runFullTest() {
    console.log('🧪 Starting PNUTDownloader Web Interface Test');
    console.log('==========================================');
    
    try {
      // Step 1: Initialize browser
      await this.init();
      
      // Step 2: Navigate to app
      await this.navigateToApp();
      
      // Step 3: Test download flow
      await this.testDownloadFlow();
      
      // Step 4: Wait for completion
      const finalDownload = await this.waitForDownloadCompletion();
      
      // Step 5: Check file download
      const downloadedFile = await this.testFileDownload();
      
      // Step 6: Show results
      console.log('\n📊 Test Results Summary:');
      console.log('========================');
      console.log(`✅ Final Status: ${finalDownload.status}`);
      console.log(`✅ Progress: ${finalDownload.progress}%`);
      console.log(`✅ File Downloaded: ${downloadedFile ? downloadedFile.name : 'Not found'}`);
      
      if (downloadedFile) {
        console.log(`✅ File Size: ${(downloadedFile.size / 1024 / 1024).toFixed(2)} MB`);
      }
      
      console.log('\n🎉 Web interface test completed successfully!');
      return true;
      
    } catch (error) {
      console.error('\n💥 Web interface test failed:', error.message);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('🔌 Browser closed');
      }
    }
  }
}

// Check if servers are running
async function checkServers() {
  try {
    // Check client
    await axios.get(BASE_URL);
    
    // Check server
    await axios.get('http://localhost:3001/api/system/status');
    
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if servers are running...');
  
  const serversRunning = await checkServers();
  if (!serversRunning) {
    console.error('❌ Servers are not running');
    console.error('Please start the servers with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Servers are running');
  
  const tester = new WebInterfaceTester();
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

module.exports = WebInterfaceTester;
