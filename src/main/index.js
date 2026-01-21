import { app, shell, BrowserWindow, ipcMain, session, dialog, globalShortcut, Notification, clipboard } from 'electron'
import { join } from 'path'
const tar = require('tar'); // You'll need to install this: npm install tar
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import { autoUpdater } from 'electron-updater';
import { extractVideoId } from '../renderer/src/components/commonFunction';

import { initialize, trackEvent } from "@aptabase/electron/main";
try {
  console.log('Initializing Aptabase...')
  initialize('A-US-9628986453')
  console.log('Aptabase initialized successfully')
  // Track event in main process
  trackEvent('app_started')
} catch (error) {
  console.error('Aptabase initialization failed:', error)
}

const https = require('https');

// Platform detection utilities
const getPlatformExecutableName = (baseName) => {
  if (process.platform === 'win32') {
    return `${baseName}.exe`;
  }
  return baseName;
};

const getYtdlpExecutableName = () => {
  if (process.platform === 'win32') {
    return 'yt-dlp.exe';
  } else if (process.platform === 'darwin') {
    return 'yt-dlp_macos';
  }
  return 'yt-dlp';
};

const getFfmpegExecutableName = () => {
  return getPlatformExecutableName('ffmpeg');
};

const ffmpegPath = app.isPackaged
  ? join(process.resourcesPath, getFfmpegExecutableName())
  : join(__dirname, '../../public', getFfmpegExecutableName())
const cookiesPath = app.isPackaged
  ? join(process.resourcesPath, 'cookies.txt')
  : join(__dirname, '../../public/cookies.txt')
let mainWindow
let clipboardMonitorInterval = null
let lastClipboardText = ''
const { dirname } = require('path');
// Get yt-dlp path - prefer system installation on macOS/Linux if available
const getYtdlpPath = () => {
  if (app.isPackaged) {
    return join(process.resourcesPath, getYtdlpExecutableName());
  }
  
  // In development, check for system yt-dlp first (macOS/Linux)
  if (process.platform !== 'win32') {
    try {
      const { execSync } = require('child_process');
      const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (systemYtdlp && existsSync(systemYtdlp)) {
        return systemYtdlp;
      }
    } catch (err) {
      // System yt-dlp not found, use bundled version
    }
  }
  
  return join(__dirname, '../../public', getYtdlpExecutableName());
};

// Initialize with default path, will be updated in app.whenReady()
let ytdlpPath = app.isPackaged
  ? join(process.resourcesPath, getYtdlpExecutableName())
  : join(__dirname, '../../public', getYtdlpExecutableName());
// Set icon path based on OS
let iconPath = ''
switch (process.platform) {
  case 'win32':
    iconPath = join(__dirname, '../../public/icon.ico')
    break
  case 'linux':
    iconPath = icon
    break
  default:
    iconPath = join(process.resourcesPath, 'icon.png')
}

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Function to detect if URL is downloadable video URL
const isDownloadableVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  const urlLower = url.toLowerCase();
  
  // YouTube patterns
  if (urlLower.includes('youtube.com/watch') || 
      urlLower.includes('youtube.com/shorts/') ||
      urlLower.includes('youtube.com/embed/') ||
      urlLower.includes('youtu.be/') ||
      urlLower.includes('music.youtube.com') ||
      urlLower.includes('youtube.com/playlist') ||
      urlLower.includes('youtubekids.com')) {
    return true;
  }
  
  // Facebook patterns
  if (urlLower.includes('facebook.com/watch') || 
      urlLower.includes('facebook.com/') && urlLower.includes('/videos/') ||
      urlLower.includes('fb.com/watch') ||
      urlLower.includes('fb.watch')) {
    return true;
  }
  
  // Instagram patterns
  if (urlLower.includes('instagram.com/p/') ||
      urlLower.includes('instagram.com/reels/') ||
      urlLower.includes('instagram.com/stories/') ||
      urlLower.includes('instagr.am/')) {
    return true;
  }
  
  // TikTok patterns
  if (urlLower.includes('tiktok.com/@') && urlLower.includes('/video/') ||
      urlLower.includes('vm.tiktok.com/')) {
    return true;
  }
  
  // Twitter/X patterns
  if ((urlLower.includes('twitter.com/') || urlLower.includes('x.com/')) && 
      urlLower.includes('/status/') ||
      urlLower.includes('t.co/')) {
    return true;
  }
  
  // Twitch patterns
  if (urlLower.includes('twitch.tv/videos/') ||
      urlLower.includes('twitch.com/') && urlLower.includes('/clip/')) {
    return true;
  }
  
  // Dailymotion patterns
  if (urlLower.includes('dailymotion.com/video/') ||
      urlLower.includes('dai.ly/')) {
    return true;
  }
  
  // Other supported platforms
  if (urlLower.includes('vimeo.com/') ||
      urlLower.includes('soundcloud.com/') ||
      urlLower.includes('bilibili.com/') ||
      urlLower.includes('rumble.com/v') ||
      urlLower.includes('bitchute.com/video/') ||
      urlLower.includes('reddit.com/') ||
      urlLower.includes('pinterest.com/') ||
      urlLower.includes('linkedin.com/')) {
    return true;
  }
  
  return false;
};

// Function to get platform name from URL
const getPlatformName = (url) => {
  if (!url) return 'Video';
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('youtubekids.com')) {
    if (urlLower.includes('music.youtube.com')) return 'YouTube Music';
    if (urlLower.includes('youtubekids.com')) return 'YouTube Kids';
    return 'YouTube';
  }
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('fb.watch')) return 'Facebook';
  if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) return 'Instagram';
  if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'TikTok';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('t.co')) return 'Twitter/X';
  if (urlLower.includes('twitch.tv') || urlLower.includes('twitch.com')) return 'Twitch';
  if (urlLower.includes('dailymotion.com') || urlLower.includes('dai.ly')) return 'Dailymotion';
  if (urlLower.includes('vimeo.com')) return 'Vimeo';
  if (urlLower.includes('soundcloud.com')) return 'SoundCloud';
  if (urlLower.includes('bilibili.com')) return 'Bilibili';
  if (urlLower.includes('rumble.com')) return 'Rumble';
  if (urlLower.includes('bitchute.com')) return 'BitChute';
  
  return 'Video';
};

// IPC handler to show notification when downloadable video URL is detected
ipcMain.handle('show-video-url-notification', async (event, url) => {
  try {
    if (!url || !isDownloadableVideoUrl(url)) {
      return { success: false, message: 'Not a downloadable video URL' };
    }
    
    // Check if notifications are supported
    if (!Notification.isSupported()) {
      console.warn('Notifications are not supported on this system');
      return { success: false, message: 'Notifications not supported' };
    }
    
    const platformName = getPlatformName(url);
    
    const notification = new Notification({
      title: 'Downloadable Video Detected',
      body: `A ${platformName} video URL has been copied. Ready to download!`,
      icon: iconPath,
      urgency: 'normal',
      silent: false
    });
    
    notification.show();
    
    // Track notification event
    try {
      if (typeof trackEvent === 'function') {
        trackEvent('video_url_notification_shown', { platform: platformName });
      }
    } catch (trackError) {
      console.warn('Failed to track notification event:', trackError);
    }
    
    return { success: true, platform: platformName };
  } catch (error) {
    console.error('Failed to show notification:', error);
    return { success: false, message: error.message };
  }
});



// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = dirname(destPath);
    if (!existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      mkdirSync(dir, { recursive: true });
    }

    const file = createWriteStream(destPath, { flags: 'wx' });
    console.log(`Starting download of ${url} to ${destPath}`);

    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath).catch(() => {});
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      let downloadedBytes = 0;
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        console.log(`Downloaded ${downloadedBytes} bytes`);
      });

      file.on('finish', () => {
        file.close();
        console.log(`Download completed, file size: ${downloadedBytes} bytes`);
        resolve(destPath);
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlink(destPath).catch(() => {});
      reject(new Error(`Download failed: ${err.message}`));
    });

    file.on('error', (err) => {
      file.close();
      fs.unlink(destPath).catch(() => {});
      reject(new Error(`File write failed: ${err.message}`));
    });

    request.end();
  });
}

async function checkYtdlpVersion() {
  if (!existsSync(ytdlpPath)) {
    throw new Error(`yt-dlp not found at ${ytdlpPath}`);
  }

  const stats = await fs.stat(ytdlpPath);
  if (stats.size === 0) {
    throw new Error(`yt-dlp is empty at ${ytdlpPath}`);
  }

  return new Promise((resolve, reject) => {
    console.log(`Attempting to spawn yt-dlp at: ${ytdlpPath}`);
    const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
    const proc = spawn(ytdlpPath, ['--version'], spawnOptions);
    
    let version = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      version += data.toString();
      console.log(`yt-dlp stdout: ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`yt-dlp stderr: ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
      console.error(`Spawn error: ${err.message}`);
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`yt-dlp process closed successfully with version: ${version.trim()}`);
        resolve(version.trim());
      } else {
        console.error(`yt-dlp process failed with code ${code}, error: ${errorOutput}`);
        reject(new Error(`yt-dlp --version failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

async function updateYtdlp() {
  // Check for system yt-dlp first (macOS/Linux) - don't override if already set
  if (process.platform !== 'win32') {
    try {
      const { execSync } = require('child_process');
      const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (systemYtdlp && existsSync(systemYtdlp)) {
        // Only update if we're not already using system yt-dlp
        if (ytdlpPath !== systemYtdlp) {
          ytdlpPath = systemYtdlp;
          console.log('Using system yt-dlp at:', systemYtdlp);
        }
        return;
      }
    } catch (err) {
      console.log('System yt-dlp not found, will download standalone binary...');
    }
  }
  
  // Determine download URL and target path
  let ytdlpUrl;
  const bundledPath = app.isPackaged
    ? join(process.resourcesPath, getYtdlpExecutableName())
    : join(__dirname, '../../public', getYtdlpExecutableName());
  
  if (process.platform === 'win32') {
    ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (process.platform === 'darwin') {
    // Download the standalone macOS binary
    ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  } else {
    // Linux
    ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  }
  
  // Only update path to bundled version if we're not using system yt-dlp
  if (!ytdlpPath || ytdlpPath === bundledPath || !existsSync(ytdlpPath)) {
    ytdlpPath = bundledPath;
  }
  
  try {
    // Remove old binary if it exists (in case it's corrupted)
    if (existsSync(ytdlpPath)) {
      await fs.unlink(ytdlpPath).catch(() => {});
    }
    await downloadFile(ytdlpUrl, ytdlpPath);
    console.log('yt-dlp downloaded successfully');
    const stats = await fs.stat(ytdlpPath);
    console.log(`File size after download: ${stats.size} bytes`);
    // Set executable permissions on Unix-like systems
    if (process.platform !== 'win32') {
      await fs.chmod(ytdlpPath, 0o755).catch(err => console.warn(`chmod failed: ${err.message}`));
    }
    
    // Verify the downloaded binary works (skip on Windows as it might show a console window)
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`"${ytdlpPath}" --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 });
        console.log('Downloaded yt-dlp binary verified successfully');
      } catch (verifyErr) {
        console.warn('Downloaded yt-dlp binary verification failed:', verifyErr.message);
        // If verification fails, try system yt-dlp as fallback
        try {
          const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (systemYtdlp && existsSync(systemYtdlp)) {
            ytdlpPath = systemYtdlp;
            console.log('Switching to system yt-dlp as fallback');
          }
        } catch (fallbackErr) {
          console.warn('System yt-dlp fallback also failed:', fallbackErr.message);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to update yt-dlp: ${error.message}`);
    throw error;
  }
}

async function downloadAndExtractFFmpeg() {
  let ffmpegUrl;
  let tempTarPath;
  let ffmpegFileName;
  
  if (process.platform === 'win32') {
    ffmpegUrl = 'https://cdn.pnutdownloader.com/ffmpeg.exe.tar.gz';
    tempTarPath = join(app.getPath('temp'), 'ffmpeg.exe.tar.gz');
    ffmpegFileName = 'ffmpeg.exe';
  } else if (process.platform === 'darwin') {
    // For macOS, download from a source that provides macOS binaries
    // Using a direct download approach for macOS FFmpeg
    ffmpegUrl = 'https://evermeet.cx/ffmpeg/ffmpeg-6.1.zip';
    tempTarPath = join(app.getPath('temp'), 'ffmpeg.zip');
    ffmpegFileName = 'ffmpeg';
  } else {
    // Linux - download static build
    ffmpegUrl = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
    tempTarPath = join(app.getPath('temp'), 'ffmpeg.tar.xz');
    ffmpegFileName = 'ffmpeg';
  }
  
  const extractPath = dirname(ffmpegPath);

  try {
    if (existsSync(ffmpegPath)) {
      const stats = await fs.stat(ffmpegPath);
      if (stats.size > 0) {
        console.log('FFmpeg already exists, skipping download');
        return;
      }
    }

    if (!existsSync(extractPath)) {
      mkdirSync(extractPath, { recursive: true });
    }

    if (process.platform === 'win32') {
      console.log('Downloading FFmpeg...');
      await downloadFile(ffmpegUrl, tempTarPath);
      console.log('Extracting FFmpeg...');
      await tar.x({
        file: tempTarPath,
        cwd: extractPath,
        filter: (path) => path.endsWith('ffmpeg.exe')
      });
    } else if (process.platform === 'darwin') {
      // For macOS, try to use system ffmpeg first, then download if needed
      const { execSync } = require('child_process');
      let ffmpegFound = false;
      
      try {
        const systemFfmpeg = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
        if (systemFfmpeg && existsSync(systemFfmpeg)) {
          // Copy system ffmpeg to our resources
          await fs.copyFile(systemFfmpeg, ffmpegPath);
          console.log('Using system FFmpeg');
          ffmpegFound = true;
        }
      } catch (err) {
        console.log('System FFmpeg not found, will download...');
      }
      
      if (!ffmpegFound) {
        // System ffmpeg not found, download static binary
        console.log('Downloading FFmpeg for macOS...');
        const macFfmpegUrl = 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip';
        await downloadFile(macFfmpegUrl, tempTarPath);
        // Extract using unzip command
        const extractDir = join(app.getPath('temp'), 'ffmpeg_extract');
        mkdirSync(extractDir, { recursive: true });
        execSync(`unzip -q -o "${tempTarPath}" -d "${extractDir}"`);
        // Find ffmpeg binary in extracted files
        const findFfmpeg = async (dir) => {
          const files = await fs.readdir(dir, { withFileTypes: true });
          for (const file of files) {
            const fullPath = join(dir, file.name);
            if (file.isDirectory()) {
              const found = await findFfmpeg(fullPath);
              if (found) return found;
            } else if (file.name === 'ffmpeg') {
              return fullPath;
            }
          }
          return null;
        };
        const extractedFfmpeg = await findFfmpeg(extractDir);
        if (extractedFfmpeg) {
          await fs.copyFile(extractedFfmpeg, ffmpegPath);
          // Clean up
          await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
        } else {
          throw new Error('FFmpeg binary not found in extracted archive');
        }
      }
    } else {
      // Linux - download and extract tar.xz
      console.log('Downloading FFmpeg for Linux...');
      await downloadFile(ffmpegUrl, tempTarPath);
      const { execSync } = require('child_process');
      execSync(`tar -xf ${tempTarPath} -C ${extractPath} --strip-components=1 --wildcards "*/ffmpeg"`);
      // Find and move ffmpeg to the correct location
      const extractedFiles = await fs.readdir(extractPath);
      const ffmpegFile = extractedFiles.find(f => f === 'ffmpeg');
      if (ffmpegFile) {
        await fs.rename(join(extractPath, ffmpegFile), ffmpegPath);
      }
    }

    await fs.unlink(tempTarPath).catch(() => {});
    
    // Set executable permissions on Unix-like systems
    if (process.platform !== 'win32') {
      await fs.chmod(ffmpegPath, 0o755).catch(err => 
        console.warn(`Failed to set FFmpeg permissions: ${err.message}`)
      );
    }

    const stats = await fs.stat(ffmpegPath);
    console.log(`FFmpeg downloaded and extracted successfully. Size: ${stats.size} bytes`);
  } catch (error) {
    console.error(`Failed to download/extract FFmpeg: ${error.message}`);
    throw error;
  }
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Main window already exists, focusing it.');
    mainWindow.focus();
    return;
  }
  globalShortcut.register('Ctrl+Shift+3', () => {
      mainWindow.webContents.openDevTools();
  });

  console.log('Creating new main window...');
  mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 650,
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
     },
  });

  // Handle window close event to show confirmation dialog
  mainWindow.on('close', async (event) => {
    event.preventDefault(); // Prevent immediate close
    console.log('Main window close requested, showing confirmation dialog...');
    try {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Confirm Exit',
        message: 'Are you sure you want to exit PNUT Downloader?',
        buttons: ['Yes', 'No'],
        defaultId: 1, // Default to "No"
        cancelId: 1,  // Cancel on "No"
        noLink: true,
      });

      if (result.response === 0) { // User clicked "Yes"
        console.log('User confirmed exit, closing main window...');
        mainWindow.destroy(); // Destroy window to trigger 'closed' event
      } else {
        console.log('User canceled exit, keeping window open.');
        // Window remains open
      }
    } catch (error) {
      console.error('Error showing exit confirmation dialog:', error);
      mainWindow.destroy(); // Fallback to closing on error
    }
  });

  mainWindow.on('closed', () => {
    console.log('Main window closed.');
    // Stop clipboard monitoring
    if (clipboardMonitorInterval) {
      clearInterval(clipboardMonitorInterval);
      clipboardMonitorInterval = null;
    }
    lastClipboardText = '';
    mainWindow = null; // Clear reference
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Main window ready, showing...');
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Configure session to handle CORS issues
  const windowSession = mainWindow.webContents.session;
  windowSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'Access-Control-Allow-Headers': ['*'],
      },
    });
  });

  // Add proper headers for image requests to prevent 403 errors
  windowSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = details.url;
    const headers = { ...details.requestHeaders };
    
    // Set User-Agent for all requests
    headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Set proper Referer for specific domains
    if (url.includes('hdslb.com')) {
      headers['Referer'] = 'https://www.bilibili.com/';
    } else if (url.includes('sndcdn.com')) {
      headers['Referer'] = 'https://soundcloud.com/';
    } else if (url.includes('tiktokcdn.com')) {
      headers['Referer'] = 'https://www.tiktok.com/';
    }
    
    callback({ requestHeaders: headers });
  });

  // Automatically collect cookies when Dailymotion or other supported platforms are visited
  const platformDomains = [
    'dailymotion.com',
    'dai.ly',
    'youtube.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com'
  ];

  // Listen for navigation to automatically collect cookies
  mainWindow.webContents.on('did-navigate', async (event, url) => {
    if (url) {
      const urlLower = url.toLowerCase();
      const isSupportedPlatform = platformDomains.some(domain => urlLower.includes(domain));
      
      if (isSupportedPlatform) {
        console.log(`Detected navigation to supported platform: ${url}`);
        // Wait a bit for cookies to be set, then update
        setTimeout(async () => {
          try {
            await updateCookiesFile();
            console.log('Cookies automatically updated after navigation');
          } catch (error) {
            console.warn('Failed to auto-update cookies:', error.message);
          }
        }, 2000); // Wait 2 seconds for cookies to be set by the browser
      }
    }
  });

  // Also listen for navigation in frames (for embedded content)
  mainWindow.webContents.on('did-frame-navigate', async (event, url) => {
    if (url) {
      const urlLower = url.toLowerCase();
      const isSupportedPlatform = platformDomains.some(domain => urlLower.includes(domain));
      
      if (isSupportedPlatform) {
        console.log(`Detected frame navigation to supported platform: ${url}`);
        setTimeout(async () => {
          try {
            await updateCookiesFile();
            console.log('Cookies automatically updated after frame navigation');
          } catch (error) {
            console.warn('Failed to auto-update cookies:', error.message);
          }
        }, 2000);
      }
    }
  });

  // Listen for cookie changes to immediately update when cookies are set
  // Use defaultSession to catch cookies from all browser windows
  session.defaultSession.cookies.on('changed', async (event, cookie, cause, removed) => {
    if (!removed && cookie.domain) {
      const cookieDomain = cookie.domain.toLowerCase();
      const isSupportedPlatform = platformDomains.some(domain => {
        const normalizedDomain = domain.startsWith('.') ? domain.substring(1) : domain;
        return cookieDomain.includes(normalizedDomain);
      });
      
      if (isSupportedPlatform) {
        console.log(`Cookie changed for ${cookie.domain}, updating cookies file...`);
        // Debounce: wait a bit to avoid too frequent updates
        setTimeout(async () => {
          try {
            await updateCookiesFile();
            console.log('Cookies automatically updated due to cookie change');
          } catch (error) {
            console.warn('Failed to auto-update cookies:', error.message);
          }
        }, 1000);
      }
    }
  });

  // Start clipboard monitoring to detect downloadable video URLs
  const startClipboardMonitoring = () => {
    // Stop any existing monitoring
    if (clipboardMonitorInterval) {
      clearInterval(clipboardMonitorInterval);
    }

    // Check clipboard every 2 seconds
    clipboardMonitorInterval = setInterval(() => {
      try {
        const clipboardText = clipboard.readText();
        
        // Only process if clipboard content changed and is a valid URL
        if (clipboardText && clipboardText !== lastClipboardText) {
          if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
            if (isDownloadableVideoUrl(clipboardText)) {
              lastClipboardText = clipboardText;
              
              // Show notification
              if (Notification.isSupported()) {
                const platformName = getPlatformName(clipboardText);
                const notification = new Notification({
                  title: 'Downloadable Video Detected',
                  body: `A ${platformName} video URL has been copied. Ready to download!`,
                  icon: iconPath,
                  urgency: 'normal',
                  silent: false
                });
                
                notification.show();
                
                // Track notification event
                try {
                  if (typeof trackEvent === 'function') {
                    trackEvent('clipboard_video_detected', { platform: platformName });
                  }
                } catch (trackError) {
                  console.warn('Failed to track clipboard notification event:', trackError);
                }
              }
              
              // Send IPC event to renderer to open modal
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('video-url-detected', clipboardText);
              }
            }
          }
        }
      } catch (error) {
        // Silently ignore clipboard read errors (might be due to permissions or empty clipboard)
        // console.warn('Failed to read clipboard:', error);
      }
    }, 2000); // Check every 2 seconds
  };

  // Start clipboard monitoring when window is ready
  startClipboardMonitoring();
}

app.whenReady().then(async () => {
  // Initialize yt-dlp path - check for system installation first
  const initializeYtdlp = async () => {
    // First, try to find and use system yt-dlp
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require('child_process');
        const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (systemYtdlp && existsSync(systemYtdlp)) {
          ytdlpPath = systemYtdlp;
          console.log('Using system yt-dlp at:', systemYtdlp);
          return true;
        }
      } catch (err) {
        // System yt-dlp not found, continue to check bundled version
      }
    }
    
    // Check if bundled version exists
    const bundledPath = app.isPackaged
      ? join(process.resourcesPath, getYtdlpExecutableName())
      : join(__dirname, '../../public', getYtdlpExecutableName());
    
    if (existsSync(bundledPath)) {
      ytdlpPath = bundledPath;
      // Verify it works
      try {
        await checkYtdlpVersion();
        console.log('Using bundled yt-dlp at:', bundledPath);
        return true;
      } catch (err) {
        console.warn('Bundled yt-dlp failed verification:', err.message);
        // If it's a PyInstaller error or binary doesn't work, we'll download a new one
        if (err.message.includes('Python shared library') || err.message.includes('Failed to spawn')) {
          console.log('Bundled yt-dlp is corrupted, will download fresh copy...');
        }
      }
    }
    
    return false;
  };
  
  const ytdlpInitialized = await initializeYtdlp();
  console.log('yt-dlp initialized:', ytdlpInitialized, 'path:', ytdlpPath);
  
  downloadAndExtractFFmpeg();
  
  if (!ytdlpInitialized) {
    console.log('yt-dlp not found or not working, downloading...');
    await updateYtdlp().catch(downloadErr => {
      console.error('Failed to download yt-dlp:', downloadErr);
    });
    console.log('yt-dlp path after update:', ytdlpPath);
  } else {
    // Verify the version
    checkYtdlpVersion().then(version => {
      console.log('yt-dlp version:', version);
    }).catch(err => {
      console.error('Failed to check yt-dlp version:', err);
    });
  }

  checkDependencies().then(deps => {
    isInitialized = deps.ready;
    if (isInitialized) {
      console.log('All dependencies initialized successfully');
    } else {
      console.error('Failed to initialize all dependencies');
    }
  });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  electronApp.setAppUserModelId('com.electron');
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Shoaib-Akh",
    repo: "pnutdownloader",
    token: import.meta.env.GH_TOKEN,
  });

  autoUpdater.checkForUpdates();

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('open-webview', (event, url) => {
    console.log('Received YouTube Video URL:', url);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('webview-url-update', url);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed, quitting app...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function updateCookiesFile() {
  try {
    // Get cookies from multiple platforms
    const domains = [
      '.youtube.com',
      '.facebook.com',
      '.instagram.com',
      '.twitter.com',
      '.x.com',
      '.dailymotion.com',
      'dailymotion.com'
    ];

    const allCookies = [];
    
    for (const domain of domains) {
      try {
        const cookies = await session.defaultSession.cookies.get({ domain });
        if (cookies && cookies.length > 0) {
          allCookies.push(...cookies);
        }
      } catch (err) {
        console.warn(`Failed to get cookies for ${domain}:`, err.message);
      }
    }

    if (!allCookies.length) {
      console.warn('No cookies found for any platform.');
      return;
    }

    const lines = [
      '# Netscape HTTP Cookie File',
      '# This file is generated by Electron for use by yt-dlp.',
      '# This file was last updated on ' + new Date().toString(),
      '# Supports: YouTube, Facebook, Instagram, Twitter/X, Dailymotion',
      ''
    ];

    allCookies.forEach((cookie) => {
      let domain = cookie.domain;
      if (!domain.startsWith('.')) {
        domain = '.' + domain;
      }
      const includeSubdomains = 'TRUE';
      const isSecure = cookie.secure ? 'TRUE' : 'FALSE';
      const expiry = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0;

      const line = [
        domain,
        includeSubdomains,
        cookie.path,
        isSecure,
        expiry,
        cookie.name,
        cookie.value
      ].join('\t');

      lines.push(line);
    });

    const fileContent = lines.join('\n');
    writeFileSync(cookiesPath, fileContent, 'utf8');
    console.log(`Cookies updated successfully at: ${cookiesPath} (${allCookies.length} cookies from ${domains.length} platforms)`);
  } catch (error) {
    console.error('Error updating cookies:', error);
  }
}

ipcMain.handle('getYoutubeCookies', async () => {
  // Note: This handler name is kept for backward compatibility
  // but now updates cookies for all platforms (YouTube, Facebook, Instagram, Twitter, Dailymotion)
  await updateCookiesFile();
  return cookiesPath;
});

ipcMain.handle('fetch-video-info', async (event, url) => {
  console.log("url",url);
  
  // Update cookies before fetching video info (important for Dailymotion and other platforms)
  try {
    await updateCookiesFile();
  } catch (cookieError) {
    console.warn('Failed to update cookies before fetching video info:', cookieError.message);
    // Continue anyway - old cookies might still work
  }
  
  const getYtdlpPath = () => {
    if (app.isPackaged) {
      return join(process.resourcesPath, getYtdlpExecutableName());
    }
    
    // In development, check for system yt-dlp first (macOS/Linux)
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require('child_process');
        const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (systemYtdlp && existsSync(systemYtdlp)) {
          return systemYtdlp;
        }
      } catch (err) {
        // System yt-dlp not found, use bundled version
      }
    }
    
    return join(__dirname, '../../public', getYtdlpExecutableName());
  };

  const currentYtdlpPath = getYtdlpPath();
  console.log('Using yt-dlp path for video info:', currentYtdlpPath);
  
  return new Promise((resolve, reject) => {
    const args = [
      '-J', 
      '--no-playlist', 
      '--cookies', cookiesPath,
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--extractor-retries', '3', 
      url
    ];
    const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
    const proc = spawn(currentYtdlpPath, args, spawnOptions);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        // Check if this is a Twitch authentication error
        const isTwitchError = stderr.includes('[twitch]') && (
          stderr.includes('logged-in') || 
          stderr.includes('cookies') ||
          stderr.includes('OAuth token')
        );
        
        // Check if this is a Dailymotion error
        const isDailymotionError = stderr.includes('[dailymotion]') && (
          stderr.includes('403') || 
          stderr.includes('Forbidden') ||
          stderr.includes('No video formats found')
        );
        
        if (isTwitchError) {
          console.warn('Twitch video requires authentication - returning basic info');
          // Try to extract Twitch video ID for fallback thumbnail
          const twitchMatch = url.match(/twitch\.tv\/(?:videos|\w+)\/?(\d+)?/);
          let fallbackThumbnail = '';
          if (twitchMatch) {
            const videoId = twitchMatch[1] || twitchMatch[2];
            fallbackThumbnail = `https://static-cdn.jtvnw.net/video-twitch-thumbnails/${videoId}.jpg`;
          }
          
          // For Twitch videos that require auth, return basic info with fallback thumbnail
          resolve({ 
            title: 'Twitch Video (Authentication Required)', 
            thumbnail: fallbackThumbnail, 
            filename: 'twitch_video', 
            duration: 0,
            thumbnails: fallbackThumbnail ? [{ url: fallbackThumbnail }] : [],
            requiresAuth: true
          });
          return;
        }
        
        if (isDailymotionError) {
          console.warn('Dailymotion video info fetch failed, but download may still work');
          // Try to extract Dailymotion video ID for fallback thumbnail
          const dmMatch = url.match(/dailymotion\.com\/video\/([^\/\?]+)|dai\.ly\/([^\/\?]+)/);
          let fallbackThumbnail = '';
          if (dmMatch) {
            const videoId = dmMatch[1] || dmMatch[2];
            fallbackThumbnail = `https://s1.dmcdn.net/v/${videoId}_x1080`;
          }
          
          // For Dailymotion videos, return basic info - download may still work
          resolve({ 
            title: 'Dailymotion Video', 
            thumbnail: fallbackThumbnail, 
            filename: 'dailymotion_video', 
            duration: 0,
            thumbnails: fallbackThumbnail ? [{ url: fallbackThumbnail }] : []
          });
          return;
        }
        
        reject(new Error(`yt-dlp exited with code ${code}. Error:\n${stderr}`));
        return;
      }

      try {
        const json = JSON.parse(stdout);
        const title = json.title || 'Unknown Video';
        let thumbnail = '';
        if (Array.isArray(json.thumbnails) && json.thumbnails.length > 0) {
          thumbnail = json.thumbnails[json.thumbnails.length - 1].url;
        } else if (json.thumbnail) {
          thumbnail = json.thumbnail;
        }
        // Return duration in seconds (number) - frontend will convert to ISO format
        const duration = json.duration || 0;
        const filename = title && json.ext ? `${title}.${json.ext}` : title;
        resolve({ title, thumbnail, filename, duration, thumbnails: json.thumbnails });
      } catch (err) {
        reject(new Error(`Failed to parse JSON from yt-dlp: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
});

let downloadProcess = null;
const activeDownloads = {};

const startDownload = async (event, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (downloadProcess) {
        event.sender.send('download-progress', { status: 'A download is already in progress!' });
        return reject(new Error('A download is already in progress.'));
      }

      const { id: downloadId, url, isAudioOnly, selectedFormat, selectedQuality, saveTo, selectBitrate, title: titleFromOptions } = options;
console.log("options",options);

      if (!url || typeof url !== 'string') {
        return reject(new Error('Invalid URL.'));
      }

      if (activeDownloads[downloadId]) {
        return reject(new Error('Download already in progress.'));
      }

      // Update cookies before starting download (important for Dailymotion and other platforms)
      try {
        await updateCookiesFile();
      } catch (cookieError) {
        console.warn('Failed to update cookies before download:', cookieError.message);
        // Continue anyway - old cookies might still work
      }
      
      let baseDir;
      if (saveTo === 'Desktop') {
        baseDir = join(app.getPath('desktop'), 'PNUT Downloader');
      } else if (saveTo === 'Downloads') {
        baseDir = join(app.getPath('downloads'), 'PNUT Downloader');
      } else {
        // Assume saveTo is a custom folder path
        baseDir = join(saveTo, 'PNUT Downloader');
      }

      try {
        if (!existsSync(baseDir)) {
          mkdirSync(baseDir, { recursive: true });
        }
      } catch (dirError) {
        return reject(new Error(`Failed to create directory: ${dirError.message}`));
      }

      const isPlaylist = (url.includes("playlist") || url.includes("&list=") || url.includes("?list=")) && !url.includes('watch');

      const finalQualityVideo = selectedQuality.replace(/[pP]$/, '');
      const format = selectedFormat ? selectedFormat.toLowerCase() : 'mp4';
      const audioFormat = selectedFormat ? selectedFormat.toLowerCase() : 'mp3';
      let formatSpecifier;
      if (isAudioOnly) {
        const bitrateOption = selectBitrate ? `--audio-quality ${selectBitrate}` : '--audio-quality best';
        formatSpecifier = `--extract-audio --audio-format ${audioFormat} ${bitrateOption}`;
      } else {
        formatSpecifier = `-f bestvideo[height<=${finalQualityVideo}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${finalQualityVideo}]+bestaudio/best[ext=mp4]/best --merge-output-format ${format}`;
      }

      const customSanitize = (str) => {
        if (!str) return 'Unknown';
        return str
          .replace(/[<>:"/\\|?*]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[^a-zA-Z0-9._-]/g, ' ')
          .replace(/^[.-]+|[.-]+$/g, ' ')
          .substring(0, 200);
      };

      const sanitize = customSanitize;

      const getTitle = () => {
        return new Promise((titleResolve, titleReject) => {
          const titleArgs = [
            isPlaylist ? '--get-filename' : '--get-title',
            '-o', isPlaylist ? '%(playlist_title)s' : '%(title)s',
            isPlaylist ? '--yes-playlist' : '--no-playlist',
            url,
          ];
          
          const getYtdlpPath = () => {
            if (app.isPackaged) {
              return join(process.resourcesPath, getYtdlpExecutableName());
            }
            
            // In development, check for system yt-dlp first (macOS/Linux)
            if (process.platform !== 'win32') {
              try {
                const { execSync } = require('child_process');
                const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
                if (systemYtdlp && existsSync(systemYtdlp)) {
                  return systemYtdlp;
                }
              } catch (err) {
                // System yt-dlp not found, use bundled version
              }
            }
            
            return join(__dirname, '../../public', getYtdlpExecutableName());
          };

          const currentYtdlpPath = getYtdlpPath();
          const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
          const titleProcess = spawn(currentYtdlpPath, titleArgs, spawnOptions);
          let titleData = '';

          titleProcess.stdout.on('data', (data) => {
            titleData += data.toString().trim();
          });

          titleProcess.stderr.on('data', (data) => {
            titleReject(new Error(`Failed to fetch title: ${data.toString().trim()}`));
          });

          titleProcess.on('close', (code) => {
            if (code === 0 && titleData) {
              const titles = titleData.split('\n').filter(Boolean);
              titleResolve(titles[0] || 'Unknown');
            } else {
              titleReject(new Error('Failed to fetch title'));
            }
          });
        });
      };

      // Get full video info from yt-dlp for non-YouTube videos
      const getVideoInfoFromYtDlp = async () => {
        // Update cookies before fetching info (important for Reddit, Facebook, etc.)
        try {
          await updateCookiesFile();
        } catch (cookieError) {
          console.warn(`[${downloadId}] Failed to update cookies before fetching video info:`, cookieError.message);
          // Continue anyway - old cookies might still work
        }

        return new Promise((resolve, reject) => {
          const getYtdlpPath = () => {
            if (app.isPackaged) {
              return join(process.resourcesPath, getYtdlpExecutableName());
            }
            
            if (process.platform !== 'win32') {
              try {
                const { execSync } = require('child_process');
                const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
                if (systemYtdlp && existsSync(systemYtdlp)) {
                  return systemYtdlp;
                }
              } catch (err) {
                // System yt-dlp not found, use bundled version
              }
            }
            
            return join(__dirname, '../../public', getYtdlpExecutableName());
          };

          const currentYtdlpPath = getYtdlpPath();
          const args = [
            '-J',
            '--no-playlist',
            '--cookies', cookiesPath,
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--extractor-retries', '3',
            url
          ];

          console.log(`[${downloadId}] Running yt-dlp info extraction with args:`, args.join(' '));

          const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
          const proc = spawn(currentYtdlpPath, args, spawnOptions);

          let stdout = '';
          let stderr = '';

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          proc.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          proc.on('close', (code) => {
            if (code !== 0) {
              console.error(`[${downloadId}] yt-dlp info extraction failed with code ${code}`);
              console.error(`[${downloadId}] stderr:`, stderr);
              reject(new Error(`yt-dlp exited with code ${code}. Error: ${stderr}`));
              return;
            }

            try {
              if (!stdout || stdout.trim().length === 0) {
                reject(new Error('yt-dlp returned empty output'));
                return;
              }

              const json = JSON.parse(stdout);
              console.log(`[${downloadId}] Successfully parsed yt-dlp JSON, title:`, json.title || 'N/A');
              resolve(json);
            } catch (err) {
              console.error(`[${downloadId}] Failed to parse JSON from yt-dlp:`, err.message);
              console.error(`[${downloadId}] stdout:`, stdout.substring(0, 500));
              reject(new Error(`Failed to parse JSON from yt-dlp: ${err.message}`));
            }
          });

          proc.on('error', (err) => {
            console.error(`[${downloadId}] Failed to spawn yt-dlp:`, err.message);
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
          });
        });
      };

      const fetchAndSanitizeTitle = async () => {
        try {
          const platform = detectPlatform(url);
          const isYouTube = isYouTubePlatform(platform);
          
          console.log(`[${downloadId}] Platform detected: ${platform}, isYouTube: ${isYouTube}, isPlaylist: ${isPlaylist}`);
          
          // For non-YouTube videos, ALWAYS try full yt-dlp info extraction first
          // This works for all platforms (Facebook, Instagram, Reddit, TikTok, etc.)
          if (!isYouTube && !isPlaylist) {
            try {
              console.log(`[${downloadId}] Attempting yt-dlp info extraction for non-YouTube video: ${url}`);
              const videoInfo = await getVideoInfoFromYtDlp();
              
              console.log(`[${downloadId}] yt-dlp extraction completed. Title:`, videoInfo?.title || 'N/A');
              console.log(`[${downloadId}] Full videoInfo keys:`, Object.keys(videoInfo || {}));
              
              // Try multiple possible title fields
              const rawTitle = videoInfo?.title || 
                               videoInfo?.fulltitle || 
                               videoInfo?.display_id || 
                               videoInfo?.id || 
                               '';
              
              if (videoInfo && rawTitle && rawTitle.trim() !== '') {
                const trimmedTitle = rawTitle.trim();
                const sanitizedTitle = sanitize(trimmedTitle);
                
                if (sanitizedTitle && sanitizedTitle !== 'Unknown' && sanitizedTitle.trim() !== '') {
                  console.log(`[${downloadId}] Successfully extracted title: ${trimmedTitle} -> ${sanitizedTitle}`);
                  
                  // Send full video metadata to renderer
                  let thumbnail = '';
                  if (Array.isArray(videoInfo.thumbnails) && videoInfo.thumbnails.length > 0) {
                    thumbnail = videoInfo.thumbnails[videoInfo.thumbnails.length - 1].url;
                  } else if (videoInfo.thumbnail) {
                    thumbnail = videoInfo.thumbnail;
                  }
                  
                  // Format duration from seconds to ISO format
                  let duration = 'PT0S';
                  if (videoInfo.duration) {
                    const hours = Math.floor(videoInfo.duration / 3600);
                    const minutes = Math.floor((videoInfo.duration % 3600) / 60);
                    const seconds = Math.floor(videoInfo.duration % 60);
                    duration = 'PT';
                    if (hours > 0) duration += `${hours}H`;
                    if (minutes > 0) duration += `${minutes}M`;
                    if (seconds > 0) duration += `${seconds}S`;
                    if (duration === 'PT') duration = 'PT0S';
                  }
                  
                  // Send metadata update to renderer
                  event.sender.send('download-progress', {
                    downloadId,
                    title: trimmedTitle,
                    sanitizedTitle: sanitizedTitle,
                    thumbnail: thumbnail,
                    duration: duration,
                    message: `Video info extracted: ${trimmedTitle}`
                  });
                  
                  return sanitizedTitle;
                } else {
                  console.warn(`[${downloadId}] Title was extracted but sanitization resulted in empty/Unknown:`, trimmedTitle);
                }
              } else {
                console.warn(`[${downloadId}] yt-dlp returned info but no valid title found.`);
                console.warn(`[${downloadId}] Available fields:`, Object.keys(videoInfo || {}));
                console.warn(`[${downloadId}] VideoInfo sample:`, JSON.stringify(videoInfo, null, 2).substring(0, 1000));
              }
            } catch (error) {
              console.error(`[${downloadId}] Error fetching video info from yt-dlp:`, error.message);
              console.error(`[${downloadId}] Error stack:`, error.stack);
              
              // Send error to renderer for debugging
              event.sender.send('download-progress', {
                downloadId,
                message: `Failed to extract video info: ${error.message}`,
                error: `yt-dlp info extraction failed: ${error.message}`
              });
              
              // Continue to fallback
            }
          }
          
          // For YouTube or if yt-dlp info extraction failed, use simple title extraction
          console.log(`[${downloadId}] Using simple title extraction (YouTube or fallback)`);
          try {
            const rawTitle = await getTitle();
            const sanitizedTitle = sanitize(rawTitle);
            console.log(`[${downloadId}] Simple title extraction result: "${rawTitle}" -> "${sanitizedTitle}"`);
            return sanitizedTitle || 'Unknown';
          } catch (titleError) {
            console.error(`[${downloadId}] Simple title extraction also failed:`, titleError.message);
            return 'Unknown';
          }
        } catch (error) {
          console.error(`[${downloadId}] Error in fetchAndSanitizeTitle:`, error.message);
          console.error(`[${downloadId}] Error stack:`, error.stack);
          return 'Unknown';
        }
      };

      // Import platform detection utilities
      const detectPlatform = (url) => {
        if (!url || typeof url !== 'string') return 'unknown'
        const urlLower = url.toLowerCase()
        
        // YouTube variants
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
          if (urlLower.includes('music.youtube.com')) return 'youtube_music'
          if (urlLower.includes('youtubekids.com')) return 'youtube_kids'
          return 'youtube'
        }
        
        // Other platforms
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('fb.watch')) {
          return 'facebook'
        }
        if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) {
          return 'instagram'
        }
        if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) {
          return 'tiktok'
        }
        if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('t.co')) {
          return 'twitter'
        }
        if (urlLower.includes('twitch.tv') || urlLower.includes('twitch.com')) {
          return 'twitch'
        }
        if (urlLower.includes('dailymotion.com') || urlLower.includes('dai.ly')) {
          return 'dailymotion'
        }
        if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) {
          return 'reddit'
        }
        
        return 'unknown'
      };

      const isYouTubePlatform = (platform) => {
        return platform === 'youtube' || 
               platform === 'youtube_music' || 
               platform === 'youtube_kids'
      };

      // Fetch thumbnail for non-YouTube content
      const fetchThumbnail = async (url) => {
        try {
          const platform = detectPlatform(url)
          if (isYouTubePlatform(platform)) {
            return null // Skip YouTube content, it already has thumbnails
          }
          
          const thumbnail = await getThumbnailInfo(url)
          return thumbnail
        } catch (error) {
          console.error('Error fetching thumbnail:', error)
          return null
        }
      };

      // Create title promise - this will fetch and sanitize the title
      const title = fetchAndSanitizeTitle();

      const setupDownloadPath = async () => {
        const sanitizedTitle = await title; // Single sanitized title
        const sanitizedQuality = customSanitize(selectedQuality) || 'Unknown'; // Sanitize quality
        const sanitizedBitrate = customSanitize(selectBitrate) || 'Unknown'; // Sanitize bitrate
      
        // Create title with quality for display and filenames
        // Use the extracted title if available, otherwise create fallback
        let titleWithQuality;
        if (sanitizedTitle && sanitizedTitle !== 'Unknown' && !sanitizedTitle.startsWith('Unknown Video')) {
          titleWithQuality = isAudioOnly 
            ? `${sanitizedTitle}_${sanitizedBitrate}` // Use underscore to avoid confusion
            : `${sanitizedTitle}_${sanitizedQuality}`;
        
          console.log(`[${downloadId}] Title with quality:`, titleWithQuality); // Debug log
        
          // Send progress update with title including quality
          event.sender.send('download-progress', { 
            downloadId,
            sanitizedTitle: titleWithQuality,
            message: `Using sanitized title: ${titleWithQuality}`
          });
        } else {
          // If we still have "Unknown", create a fallback title for the file path
          // But don't send it as progress update - the video info extraction should have sent the real title
          const hostname = url.includes('://') ? new URL(url).hostname.replace('www.', '') : 'unknown';
          titleWithQuality = isAudioOnly 
            ? `Unknown Video - ${hostname}_${sanitizedBitrate}`
            : `Unknown Video - ${hostname}_${sanitizedQuality}`;
          
          console.log(`[${downloadId}] Using fallback title with quality:`, titleWithQuality);
          console.warn(`[${downloadId}] Warning: Could not extract proper title, using fallback. Video info extraction may have failed.`);
        }
      
        let downloadPath;
        if (isPlaylist) {
          const playlistDir = join(baseDir, '%(playlist_title)s');
          downloadPath = join(playlistDir, `%(title)s.%(ext)s`);         
        } else {
          const formatDir = isAudioOnly ? 'Audio' : 'Video';
          const downloadDir = join(baseDir, formatDir);
          try {
            if (!existsSync(downloadDir)) {
              mkdirSync(downloadDir, { recursive: true });
            }
          } catch (dirError) {
            throw new Error(`Failed to create format directory: ${dirError.message}`);
          }
          downloadPath = join(downloadDir, `${titleWithQuality}.%(ext)s`); // Use titleWithQuality for single file
        }
        console.log('Download path:', downloadPath); // Debug log
        return downloadPath;
      };

      setupDownloadPath().then(async (downloadPath) => {
        // Fetch thumbnail for non-YouTube content before starting download
        const thumbnail = await fetchThumbnail(url);
        
        // Send thumbnail information to renderer
        if (thumbnail) {
          event.sender.send('download-progress', { 
            downloadId,
            thumbnail,
            message: 'Thumbnail fetched for non-YouTube content'
          });
        }

        // Detect if this is a Dailymotion URL
        const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');
        
        const args = [
          '--continue',
          '--ffmpeg-location', ffmpegPath,
          '-o', downloadPath,
          '--cookies', cookiesPath,
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--newline',
          '--ignore-errors',
          '--progress',
          '--extractor-retries', '3',
        ];

        // Add Dailymotion-specific options for better compatibility
        if (isDailymotion) {
          args.push('--referer', 'https://www.dailymotion.com/');
          args.push('--sleep-requests', '1'); // Add small delay between requests
        }

        args.push(...formatSpecifier.split(' '));
        args.push(url);
        args.push(isPlaylist ? '--yes-playlist' : '--no-playlist');

        console.log('Downloading with args:', args);

        const getYtdlpPath = () => {
          if (app.isPackaged) {
            return join(process.resourcesPath, getYtdlpExecutableName());
          }
          
          // In development, check for system yt-dlp first (macOS/Linux)
          if (process.platform !== 'win32') {
            try {
              const { execSync } = require('child_process');
              const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
              if (systemYtdlp && existsSync(systemYtdlp)) {
                return systemYtdlp;
              }
            } catch (err) {
              // System yt-dlp not found, use bundled version
            }
          }
          
          return join(__dirname, '../../public', getYtdlpExecutableName());
        };

        const currentYtdlpPath = getYtdlpPath();
        console.log('Using yt-dlp path:', currentYtdlpPath);

        const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
        downloadProcess = spawn(currentYtdlpPath, args, spawnOptions);
        activeDownloads[downloadId] = true;

        downloadProcess.stdout.on('data', (data) => {
          const line = data.toString().trim();
          event.sender.send('download-progress', { downloadId, message: line });
        });

        downloadProcess.stderr.on('data', (data) => {
          const errorMessage = data.toString().trim();
          
          // Check if this is a Twitch authentication error
          const isTwitchError = errorMessage.includes('[twitch]') && (
            errorMessage.includes('logged-in') || 
            errorMessage.includes('cookies') ||
            errorMessage.includes('OAuth token')
          );
          
          // Check if this is a Dailymotion error
          const isDailymotionError = errorMessage.includes('[dailymotion]') && (
            errorMessage.includes('403') || 
            errorMessage.includes('Forbidden') ||
            errorMessage.includes('No video formats found') ||
            errorMessage.includes('Failed to download m3u8')
          );
          
          if (isTwitchError) {
            event.sender.send('download-progress', { 
              downloadId,
              error: 'This Twitch video requires authentication. Please add Twitch cookies to your browser and try again.',
              isAuthError: true
            });
          } else if (isDailymotionError) {
            event.sender.send('download-progress', { 
              downloadId,
              error: 'Dailymotion download failed. This may be due to regional restrictions or access limitations. Try visiting the video in your browser first, or ensure yt-dlp is up to date using: yt-dlp -U',
              isAuthError: true
            });
          } else {
            event.sender.send('download-progress', { downloadId, error: errorMessage });
          }
        });

        downloadProcess.on('close', (code) => {
          delete activeDownloads[downloadId];
          downloadProcess = null;

          if (code === 0) {
            event.sender.send('download-progress', { downloadId, status: 'Download complete!', file: downloadPath });
            resolve();
          } else {
            event.sender.send('download-progress', { downloadId, error: `Download failed with code ${code}` });
            reject(new Error(`Download failed with code ${code}`));
          }
        });

        downloadProcess.on('error', (err) => {
          delete activeDownloads[downloadId];
          downloadProcess = null;
          reject(err);
        });
      }).catch((err) => {
        event.sender.send('download-progress', { downloadId, error: err.message });
        reject(err);
      });
    } catch (err) {
      event.sender.send('download-progress', { downloadId: options?.id, error: err.message });
      reject(err);
    }
  });
};
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0]; // Return null if canceled, else folder path
})
ipcMain.handle('downloadVideo', async (event, options) => {
  console.log('Starting download...');
  try {
    await startDownload(event, options);
    console.log('Download completed successfully.');
  } catch (err) {
    console.error('Download failed:', err);
    throw err;
  }
});

ipcMain.handle('show-message-box', async (_, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('resumeDownload', async (event, options) => {
  if (!downloadProcess) {
    console.log('Resuming download...');
    await startDownload(event, options);
    return true;
  }
  return false;
});

const treeKill = require('tree-kill');
ipcMain.handle('pauseDownload', () => {
  console.log('Attempting to pause download...');
  if (downloadProcess) {
    console.log('Killing download process with PID:', downloadProcess.pid);
    treeKill(downloadProcess.pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Failed to kill process tree:', err);
      } else {
        console.log('Process tree killed successfully.');
      }
    });
    downloadProcess = null;
    return true;
  }
  console.log('No active download to pause.');
  return false;
});

function saveDownloadState(state) {
  const filePath = join(app.getPath('userData'), 'downloadState.json');
  fs.writeFileSync(filePath, JSON.stringify(state));
}

ipcMain.handle('load-download-state', () => {
  const filePath = join(app.getPath('userData'), 'downloadState.json');
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null;
});

ipcMain.handle('openPath', async (event, path) => {
  try {
    await shell.openPath(path); // Use Electron's shell.openPath for local files
    return { success: true };
  } catch (error) {
    console.error(`Failed to open path ${path}:`, error);
    throw error;
  }
});

ipcMain.handle('openExternal', async (event, url) => {
  try {
    await shell.openExternal(url); // Use Electron's shell.openExternal for URLs
    return { success: true };
  } catch (error) {
    console.error(`Failed to open external URL ${url}:`, error);
    throw error;
  }
});

ipcMain.handle('read-directory', async (event, dir) => {
  const fs = require('fs').promises;
  try {
    const files = await fs.readdir(dir);
    return files;
  } catch (error) {
    console.error(`Failed to read directory ${dir}:`, error);
    throw error;
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      console.log(`Directory created: ${dirPath}`);
    }
    return { success: true };
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
});

ipcMain.handle('accessFile', async (event, filePath) => {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return { success: true };
  } catch (error) {
    console.error(`Cannot access file ${filePath}:`, error);
    throw error;
  }
});
ipcMain.handle('get-path', async (event, name) => {
  try {
    return app.getPath(name);
  } catch (error) {
    console.error(`Failed to get path ${name}:`, error);
    throw error;
  }
});
ipcMain.handle('show-confirm-dialog', async (event, options) => {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: options.title || "Confirm",
    message: options.message || "Are you sure?",
    buttons: options.buttons || ["Yes", "No"],
    defaultId: 0,
    cancelId: 1,
  });
  return result.response;
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('update-download-progress', (progress) => {
  console.log("progress",progress);
  
  console.log(`Download speed: ${progress.bytesPerSecond}`);
  console.log(`Downloaded ${progress.percent.toFixed(2)}%`);
  console.log(`${progress.transferred} / ${progress.total}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-download-progress', progress);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', err);
  }
});

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

let isInitialized = false;

async function checkDependencies() {
  try {
    const ffmpegExists = await fs.access(ffmpegPath).then(() => true).catch(() => false);
    const ytdlpExists = await fs.access(ytdlpPath).then(() => true).catch(() => false);
    
    if (ffmpegExists && ytdlpExists) {
      const ffmpegStats = await fs.stat(ffmpegPath);
      const ytdlpStats = await fs.stat(ytdlpPath);
      return {
        ready: ffmpegStats.size > 0 && ytdlpStats.size > 0,
        ffmpeg: ffmpegStats.size > 0,
        ytdlp: ytdlpStats.size > 0
      };
    }
    return { ready: false, ffmpeg: false, ytdlp: false };
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return { ready: false, ffmpeg: false, ytdlp: false };
  }
}

ipcMain.handle('check-dependencies', async () => {
  return await checkDependencies();
});

// ipcMain.handle('getPath', (event, pathName) => {
//   return app.getPath(pathName);
// });

ipcMain.handle('fileExists', (event, filePath) => {
  return existsSync(filePath);
});

ipcMain.handle('openFile', (event, filePath) => {
  shell.openPath(filePath);
});
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const extractPlaylistId = (url) => {
  const playlistMatch = url.match(
    /(?:youtube\.com|music\.youtube\.com|youtu\.be|youtube.googleapis\.com|youtubekids\.com)\/(?:playlist|watch)?.*?[?&]list=([^&#]+)/i
  )
  return playlistMatch ? playlistMatch[1] : null
}
const getVideoInfo = async (url) => {
  const videoId = extractVideoId(url);
  const playlistId = extractPlaylistId(url);
  const customSanitize = (str) => {
    if (!str) return 'Unknown';
    return str
      .replace(/[<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9._-]/g, ' ')
      .replace(/^[.-]+|[.-]+$/g, ' ')
      .substring(0, 200);
  };
  if (!videoId && !playlistId) return null;

  if (url.includes('watch') || videoId) {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`
    );
    const data = await response.json();
    if (data.items.length === 0) return null;
    const { snippet, contentDetails } = data.items[0];

    return {
      videoUrl: url,
      title: customSanitize(snippet.title),
      thumbnail:
        snippet?.thumbnails?.standard?.url ||
        snippet?.thumbnails.default.url ||
        snippet.thumbnails.high.url,
      duration: contentDetails.duration,
      isPlaylist: false
    };
  }

  if (!url.includes('watch') && playlistId) {
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`
    );
    const playlistData = await playlistResponse.json();

    if (playlistData.items.length === 0) return null;
    const { snippet } = playlistData.items[0];

    const itemsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=2&key=${API_KEY}`
    );
    const itemsData = await itemsResponse.json();

    const isYouTubeMusic = new URL(url).hostname === 'music.youtube.com';
    const videos = itemsData.items.map((item) => ({
      videoUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: isYouTubeMusic
        ? snippet.thumbnails.standard.url ||
          snippet.thumbnails.default.url ||
          snippet.thumbnails.high.url
        : snippet.thumbnails.standard.url ||
          snippet.thumbnails.default.url ||
          snippet.thumbnails.high.url
    }));

    return {
      playlistUrl: url,
      playlistTitle: customSanitize(snippet.title),
      thumbnail: isYouTubeMusic
        ? snippet.thumbnails.standard.url ||
          snippet.thumbnails.default.url ||
          snippet.thumbnails.high.url
        : snippet.thumbnails.standard.url ||
          snippet.thumbnails.default.url ||
          snippet.thumbnails.high.url,
      videos,
      isPlaylist: true
    };
  }
};

// Get thumbnail information from yt-dlp
const getThumbnailInfo = async (url) => {
  return new Promise((resolve, reject) => {
    const args = [
      '--get-thumbnail',
      '--no-playlist',
      '--extractor-retries', '3',
      url
    ];
    
    const getYtdlpPath = () => {
      if (app.isPackaged) {
        return join(process.resourcesPath, getYtdlpExecutableName());
      }
      
      // In development, check for system yt-dlp first (macOS/Linux)
      if (process.platform !== 'win32') {
        try {
          const { execSync } = require('child_process');
          const systemYtdlp = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (systemYtdlp && existsSync(systemYtdlp)) {
            return systemYtdlp;
          }
        } catch (err) {
          // System yt-dlp not found, use bundled version
        }
      }
      
      return join(__dirname, '../../public', getYtdlpExecutableName());
    };

    const currentYtdlpPath = getYtdlpPath();
    const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
    const thumbnailProcess = spawn(currentYtdlpPath, args, spawnOptions);
    
    let thumbnailData = '';
    let errorData = '';

    thumbnailProcess.stdout.on('data', (data) => {
      thumbnailData += data.toString().trim();
    });

    thumbnailProcess.stderr.on('data', (data) => {
      errorData += data.toString().trim();
      console.error('Thumbnail fetch stderr:', data.toString().trim());
    });

    thumbnailProcess.on('close', (code) => {
      if (code === 0 && thumbnailData) {
        const thumbnails = thumbnailData.split('\n').filter(Boolean);
        resolve(thumbnails[0] || null); // Return first thumbnail URL
      } else {
        // Check if this is a Twitch authentication error
        const isTwitchError = errorData.includes('[twitch]') && (
          errorData.includes('logged-in') || 
          errorData.includes('cookies') ||
          errorData.includes('OAuth token')
        );
        
        if (isTwitchError) {
          console.warn('Twitch video requires authentication - attempting fallback thumbnail');
          // Try to extract Twitch video ID and construct a fallback thumbnail URL
          const twitchMatch = url.match(/twitch\.tv\/(?:videos|\w+)\/?(\d+)?/);
          if (twitchMatch) {
            const videoId = twitchMatch[1] || twitchMatch[2];
            // Use Twitch's default thumbnail pattern
            const fallbackThumbnail = `https://static-cdn.jtvnw.net/video-twitch-thumbnails/${videoId}.jpg`;
            resolve(fallbackThumbnail);
          } else {
            resolve(null);
          }
        } else {
          console.warn(`Failed to fetch thumbnail with code ${code}: ${errorData}`);
          resolve(null); // Return null instead of rejecting
        }
      }
    });

    thumbnailProcess.on('error', (err) => {
      console.error('Thumbnail process error:', err);
      resolve(null); // Return null instead of rejecting
    });
  });
};

// Helper function to parse cookies from cookies.txt (Netscape format)
const parseCookiesFromFile = async (domain) => {
  try {
    if (!existsSync(cookiesPath)) {
      return null;
    }
    
    const content = await fs.readFile(cookiesPath, 'utf-8');
    const lines = content.split('\n');
    const cookies = [];
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue;
      
      // Netscape cookie format: domain, flag, path, secure, expiration, name, value
      const parts = line.split('\t');
      if (parts.length >= 7) {
        const cookieDomain = parts[0].trim();
        const cookieName = parts[5].trim();
        const cookieValue = parts[6].trim();
        
        // Check if cookie matches the domain
        if (cookieDomain.includes(domain) || domain.includes(cookieDomain.replace(/^\./, ''))) {
          cookies.push(`${cookieName}=${cookieValue}`);
        }
      }
    }
    
    return cookies.length > 0 ? cookies.join('; ') : null;
  } catch (error) {
    // Silently fail - cookies.txt might not exist or be readable
    return null;
  }
};

// Image proxy handler to bypass 403 errors from external CDNs
ipcMain.handle('proxy-image', async (event, imageUrl) => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const parsedUrl = new URL(imageUrl);
      
      // Enhanced headers specifically for Instagram/Facebook CDN
      const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 Instagram 300.0.0.0.81',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"iOS"',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      // Add platform-specific headers
      if (parsedUrl.hostname.includes('instagram.com') || parsedUrl.hostname.includes('fbcdn.net')) {
        // Instagram/Facebook specific headers
        headers['X-IG-App-ID'] = '936619743392459';
        headers['X-IG-WWW-Claim'] = '0';
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers['Authority'] = parsedUrl.hostname;
        headers['Scheme'] = 'https';
        headers['Path'] = parsedUrl.pathname + parsedUrl.search;
        headers['Method'] = 'GET';
        headers['Referer'] = 'https://www.instagram.com/';
        headers['Origin'] = 'https://www.instagram.com';
        
        // Try to get Instagram cookies from the session first
        let cookieString = null;
        try {
          const cookies = await session.defaultSession.cookies.get({ domain: '.instagram.com' });
          if (cookies && cookies.length > 0) {
            cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
          }
        } catch (cookieError) {
          // Silently continue to try cookies.txt
        }
        
        // Fallback to cookies.txt if session cookies aren't available
        if (!cookieString) {
          cookieString = await parseCookiesFromFile('instagram.com');
        }
        
        if (cookieString) {
          headers['Cookie'] = cookieString;
        }
      } else if (parsedUrl.hostname.includes('twimg.com')) {
        // Twitter specific headers
        headers['Referer'] = 'https://twitter.com/';
        headers['Origin'] = 'https://twitter.com';
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        
        // Try to get Twitter cookies from the session
        let cookieString = null;
        try {
          const cookies = await session.defaultSession.cookies.get({ domain: '.twitter.com' });
          if (cookies && cookies.length > 0) {
            cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
          }
        } catch (cookieError) {
          // Silently continue to try cookies.txt
        }
        
        // Fallback to cookies.txt if session cookies aren't available
        if (!cookieString) {
          cookieString = await parseCookiesFromFile('twitter.com');
        }
        
        if (cookieString) {
          headers['Cookie'] = cookieString;
        }
      } else if (parsedUrl.hostname.includes('hdslb.com')) {
        // Bilibili specific headers
        headers['Referer'] = 'https://www.bilibili.com/';
        headers['Origin'] = 'https://www.bilibili.com';
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        headers['Accept'] = 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
        headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
        headers['Accept-Encoding'] = 'gzip, deflate, br';
        headers['Sec-Fetch-Dest'] = 'image';
        headers['Sec-Fetch-Mode'] = 'no-cors';
        headers['Sec-Fetch-Site'] = 'cross-site';
        
        // Try to get Bilibili cookies from the session
        let cookieString = null;
        try {
          const cookies = await session.defaultSession.cookies.get({ domain: '.bilibili.com' });
          if (cookies && cookies.length > 0) {
            cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
          }
        } catch (cookieError) {
          // Silently continue to try cookies.txt
        }
        
        // Fallback to cookies.txt if session cookies aren't available
        if (!cookieString) {
          cookieString = await parseCookiesFromFile('bilibili.com');
        }
        
        if (cookieString) {
          headers['Cookie'] = cookieString;
        }
      }

      // Try using Node's fetch if available, otherwise fall back to http module
      let response;
      if (global.fetch) {
        // Create AbortController with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
          response = await global.fetch(imageUrl, { 
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } else {
        // Fallback to http/https modules
        const https = require('https');
        const http = require('http');
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        response = await new Promise((resolve, reject) => {
          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers,
            timeout: 15000
          };

          const req = client.request(options, (res) => {
            if (res.statusCode === 200) {
              const chunks = [];
              res.on('data', (chunk) => chunks.push(chunk));
              res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                  ok: true,
                  status: res.statusCode,
                  headers: {
                    get: (name) => res.headers[name.toLowerCase()]
                  },
                  arrayBuffer: async () => buffer
                });
              });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
          });

          req.on('error', reject);
          req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
          req.end();
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to proxy image: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${contentType};base64,${base64}`;
      
    } catch (error) {
      // Only log non-403 errors to reduce console spam
      // 403 errors are expected for Instagram/Facebook CDN images without proper authentication
      const is403Error = error.message.includes('403') || error.message.includes('Forbidden');
      
      if (!is403Error && attempt === maxRetries) {
        console.warn(`Failed to proxy image after ${maxRetries} attempts:`, error.message);
      }
      
      // If this is the last attempt, return fallback
      if (attempt === maxRetries) {
        // Return a fallback placeholder image for protected CDN failures
        if (imageUrl.includes('instagram.com') || imageUrl.includes('fbcdn.net') || imageUrl.includes('twimg.com') || imageUrl.includes('hdslb.com')) {
          // Simple 1x1 transparent PNG as fallback
          const fallbackImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
          return fallbackImage;
        }
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
});

ipcMain.handle('get-youtube-info', async (event, url) => {
  try {
    return await getVideoInfo(url);
  } catch (error) {
    console.error('Error getting video info:', error);
    return null;
  }
});