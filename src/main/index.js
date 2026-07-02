import { app, shell, BrowserWindow, ipcMain, session, dialog, globalShortcut, Notification, clipboard } from 'electron'
import { basename, isAbsolute, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs'
import { spawn, spawnSync } from 'child_process'
import fs from 'fs/promises'
import { autoUpdater } from 'electron-updater';
import { extractVideoId ,isDownloadableVideoUrl} from '../shared/platformUtils'
import { IPC_CHANNELS, IPC_EVENTS } from '../shared/ipcChannels'
import { appendTitleTimestamp } from '../shared/titleUtils'

// Set app user model ID for Windows notifications immediately
if (process.platform === 'win32') {
  app.setAppUserModelId('com.shoaibakh.pnutdownloader');
}

const https = require('https');
 const treeKill = require('tree-kill');

const YTDLP_INFO_TIMEOUT_MS = 45 * 1000;
const YTDLP_DOWNLOAD_STALL_TIMEOUT_MS = 120 * 1000;
const YTDLP_AUTO_UPDATE_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;
const YTDLP_AUTO_UPDATE_POLL_MS = 24 * 60 * 60 * 1000;
const YTDLP_DEBUG_TAIL_LIMIT = 3500;
const WEBVIEW_SESSION_PARTITION = 'persist:main';

const getBrowserCookieSessions = () => {
  const sessions = [{ label: 'defaultSession', value: session.defaultSession }];

  try {
    const webviewSession = session.fromPartition(WEBVIEW_SESSION_PARTITION);
    if (webviewSession && webviewSession !== session.defaultSession) {
      sessions.push({ label: WEBVIEW_SESSION_PARTITION, value: webviewSession });
    }
  } catch (err) {
    console.warn(`Failed to access ${WEBVIEW_SESSION_PARTITION} cookie session:`, err.message);
  }

  return sessions;
};

const isYouTubeUrl = (url = '') => {
  const urlLower = String(url).toLowerCase();
  return urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
};

let dependencyStatus = {
  status: 'idle',
  tool: 'dependencies',
  action: 'idle',
  message: 'Waiting to check dependencies...',
  isBusy: false,
  ready: false,
  percent: null,
  downloadedBytes: null,
  totalBytes: null,
  speedBps: null,
  timestamp: Date.now()
};

const emitDependencyStatus = (update = {}) => {
  dependencyStatus = {
    ...dependencyStatus,
    ...update,
    timestamp: Date.now()
  };

  if (typeof dependencyStatus.percent === 'number') {
    dependencyStatus.percent = Math.max(0, Math.min(100, dependencyStatus.percent));
  }

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.DEPENDENCY_PROGRESS, dependencyStatus);
    }
  } catch (err) {
    console.warn('Failed to send dependency status:', err.message);
  }

  return dependencyStatus;
};

const getDependencyStatusSnapshot = () => ({ ...dependencyStatus });

const getLogSafeYtdlpArgs = (args) => {
  const redactValueAfter = new Set(['--cookies']);
  return args.map((arg, index) => {
    const previousArg = args[index - 1];
    if (redactValueAfter.has(previousArg)) {
      return '[redacted]';
    }
    return arg;
  });
};

const logYtdlpCommand = (label, executable, args) => {
  console.log(`[${label}] yt-dlp executable: ${executable}`);
  console.log(`[${label}] yt-dlp args: ${getLogSafeYtdlpArgs(args).join(' ')}`);
};

const appendLogTail = (current, chunk, limit = YTDLP_DEBUG_TAIL_LIMIT) => {
  const next = `${current || ''}${chunk || ''}`;
  return next.length > limit ? next.slice(-limit) : next;
};

const killProcessTree = (proc, label, signal = 'SIGKILL') => {
  if (!proc?.pid) return;

  treeKill(proc.pid, signal, (err) => {
    if (err) {
      console.warn(`[${label}] Failed to kill process tree ${proc.pid}: ${err.message}`);
    } else {
      console.warn(`[${label}] Killed process tree ${proc.pid} with ${signal}`);
    }
  });
};

const createYtdlpTimeout = ({ proc, label, timeoutMs, onTimeout }) => {
  let timedOut = false;
  let timeout = null;

  const arm = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timedOut = true;
      const message = `${label} timed out after ${Math.round(timeoutMs / 1000)}s`;
      console.error(`[${label}] ${message}`);
      if (typeof onTimeout === 'function') {
        onTimeout(message);
      }
      killProcessTree(proc, label);
    }, timeoutMs);
  };

  arm();

  return {
    clear: () => clearTimeout(timeout),
    reset: arm,
    get timedOut() {
      return timedOut;
    }
  };
};

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
  }
  if (process.platform === 'darwin') {
    return 'yt-dlp_macos';
  }
  return 'yt-dlp';
};

const getFfmpegExecutableName = () => {
  return getPlatformExecutableName('ffmpeg');
};

const getStagedBinaryPath = (targetPath) => {
  if (process.platform === 'win32' && targetPath.toLowerCase().endsWith('.exe')) {
    return `${targetPath.slice(0, -4)}.download.exe`;
  }

  return `${targetPath}.download`;
};

const replaceBinaryFromStagedFile = async (stagedPath, targetPath, displayName) => {
  const stagedStats = await fs.stat(stagedPath);
  if (!stagedStats.isFile() || stagedStats.size <= 0) {
    throw new Error(`Downloaded ${displayName} file is empty`);
  }

  const hadPreviousBinary = existsSync(targetPath);

  // rename() atomically replaces an existing file on Unix. This keeps the old
  // working binary available until the fresh download is completely prepared.
  if (process.platform !== 'win32') {
    await fs.rename(stagedPath, targetPath);
    console.log(
      hadPreviousBinary
        ? `Replaced previous ${displayName} binary: ${targetPath}`
        : `Installed ${displayName} binary: ${targetPath}`
    );
    return;
  }

  // Windows cannot rename over an existing executable, so keep a rollback copy
  // until the new binary is in place.
  const backupPath = `${targetPath}.backup`;
  await fs.rm(backupPath, { force: true }).catch(() => {});

  if (hadPreviousBinary) {
    await fs.rename(targetPath, backupPath);
  }

  try {
    await fs.rename(stagedPath, targetPath);
    await fs.rm(backupPath, { force: true }).catch(() => {});
    console.log(
      hadPreviousBinary
        ? `Replaced previous ${displayName} binary: ${targetPath}`
        : `Installed ${displayName} binary: ${targetPath}`
    );
  } catch (error) {
    await fs.rm(targetPath, { force: true }).catch(() => {});
    if (hadPreviousBinary && existsSync(backupPath)) {
      await fs.rename(backupPath, targetPath).catch((restoreError) => {
        console.error(`Failed to restore previous ${displayName} binary: ${restoreError.message}`);
      });
    }
    throw error;
  }
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
let isAppClosing = false;
const { dirname } = require('path');

const emitDebugLog = ({ level = 'info', source = 'main', message, details = '', downloadId = null }, sender = null) => {
  const target = sender || mainWindow?.webContents;
  if (!target || target.isDestroyed()) return;

  target.send(IPC_EVENTS.DEBUG_LOG, {
    timestamp: new Date().toISOString(),
    level,
    source,
    message: String(message || ''),
    details: details ? String(details) : '',
    downloadId
  });
};
// Get yt-dlp path - always use bundled/downloaded version
const getYtdlpPath = () => {
  if (app.isPackaged) {
    return join(process.resourcesPath, getYtdlpExecutableName());
  }
  
  return join(__dirname, '../../public', getYtdlpExecutableName());
};

let compatibleMacPythonPath;

const getCompatibleMacPythonPath = () => {
  if (process.platform !== 'darwin') return null;
  if (compatibleMacPythonPath !== undefined) return compatibleMacPythonPath;

  const pathCandidates = (process.env.PATH || '')
    .split(':')
    .filter(Boolean)
    .map((dir) => join(dir, 'python3'));
  const candidates = [
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/Current/bin/python3',
    ...pathCandidates
  ];

  compatibleMacPythonPath = null;
  for (const candidate of [...new Set(candidates)]) {
    if (!existsSync(candidate)) continue;
    const result = spawnSync(
      candidate,
      ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'],
      { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const [major, minor] = String(result.stdout || '').trim().split('.').map(Number);
    if (result.status === 0 && (major > 3 || (major === 3 && minor >= 10))) {
      compatibleMacPythonPath = candidate;
      console.log(`Using Python ${major}.${minor} for fast yt-dlp startup: ${candidate}`);
      break;
    }
  }

  return compatibleMacPythonPath;
};

const getYtdlpLaunch = (args, scriptPath = getYtdlpPath()) => {
  if (process.platform !== 'darwin') {
    return { executable: scriptPath, args, mode: 'native' };
  }

  const pythonPath = getCompatibleMacPythonPath();
  const pythonScriptPath = app.isPackaged
    ? join(process.resourcesPath, 'yt-dlp')
    : join(__dirname, '../../public', 'yt-dlp');
  if (pythonPath && existsSync(pythonScriptPath)) {
    return {
      executable: pythonPath,
      args: [pythonScriptPath, ...args],
      mode: 'python'
    };
  }

  const standalonePath = app.isPackaged
    ? join(process.resourcesPath, 'yt-dlp_macos')
    : join(__dirname, '../../public', 'yt-dlp_macos');
  return {
    executable: existsSync(standalonePath) ? standalonePath : scriptPath,
    args,
    mode: existsSync(standalonePath) ? 'standalone' : 'native'
  };
};

const getYtdlpVersionFilePath = () => {
  return app.isPackaged
    ? join(process.resourcesPath, 'ytdlp_version.txt')
    : join(__dirname, '../../public/ytdlp_version.txt');
};

// Initialize with default path, will be updated in app.whenReady()
let ytdlpPath = app.isPackaged
  ? join(process.resourcesPath, getYtdlpExecutableName())
  : join(__dirname, '../../public', getYtdlpExecutableName());
let downloadToolsUpdateInProgress = false;
// Set icon path based on OS
let iconPath = ''
switch (process.platform) {
  case 'win32':
    iconPath = join(__dirname, '../../public/icon.ico')
    break
  default:
    // electron-vite resolves this asset in both development and packaged builds.
    iconPath = icon
}

ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
  return app.getVersion();
});

// Get yt-dlp version
ipcMain.handle(IPC_CHANNELS.GET_YT_VERSION, async () => {
  try {
    const version = await checkYtdlpVersion();
    console.log("version",version)
    return version;
  } catch (error) {
    console.error('Error getting yt-dlp version:', error);
    return 'Error: ' + error.message;
  }
});

// Get FFmpeg version
ipcMain.handle(IPC_CHANNELS.GET_FFMPEG_VERSION, async () => {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    
    // Add 10 second timeout
    const timeout = setTimeout(() => {
      console.error('FFmpeg version check timed out');
      if (proc) proc.kill();
      resolve('Error: FFmpeg version check timed out');
    }, 10000);

    const proc = spawn(ffmpegPath, ['-version'], { 
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let versionOutput = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      versionOutput += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.error('FFmpeg version check error:', err);
      resolve('Error: ' + err.message);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        // Extract version from first line
        const firstLine = versionOutput.split('\n')[0];
        resolve(firstLine.trim());
      } else {
        console.error('FFmpeg version check failed with code:', code);
        resolve('Error: FFmpeg not available');
      }
    });
  });
});

// Function to detect if URL is downloadable video URL


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
ipcMain.handle(IPC_CHANNELS.SHOW_VIDEO_URL_NOTIFICATION, async (event, url) => {
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

function downloadFile(url, destPath, options = {}) {
  return new Promise(async (resolve, reject) => {
    const {
      tool = 'dependencies',
      action = 'download',
      displayName = tool === 'yt-dlp' ? 'yt-dlp' : tool === 'ffmpeg' ? 'FFmpeg' : 'Dependency',
      message = `Downloading ${displayName}...`
    } = options;
    const dir = dirname(destPath);
    if (!existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      mkdirSync(dir, { recursive: true });
    }

    // Remove existing file if it exists to allow overwrite
    if (existsSync(destPath)) {
      try {
        await fs.unlink(destPath);
        console.log(`Removed existing file: ${destPath}`);
      } catch (err) {
        console.warn(`Failed to remove existing file: ${err.message}`);
        // Continue anyway, will try to overwrite
      }
    }

    const file = createWriteStream(destPath, { flags: 'w' });
    console.log(`Starting download of ${url} to ${destPath}`);
    emitDependencyStatus({
      status: 'downloading',
      tool,
      action,
      message,
      isBusy: true,
      ready: false,
      percent: 0,
      downloadedBytes: 0,
      totalBytes: null,
      speedBps: null,
      error: null
    });

    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        return downloadFile(response.headers.location, destPath, options).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath).catch(() => {});
        emitDependencyStatus({
          status: 'failed',
          tool,
          action,
          message: `${displayName} download failed with HTTP ${response.statusCode}.`,
          isBusy: false,
          ready: false,
          error: `HTTP ${response.statusCode}`
        });
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      let downloadedBytes = 0;
      const totalBytesHeader = response.headers['content-length'];
      const totalBytes = totalBytesHeader ? Number(totalBytesHeader) : null;
      const startTimeMs = Date.now();
      let lastLogTimeMs = 0;
      let lastLogBytes = 0;

      const formatBytes = (bytes) => {
        if (!Number.isFinite(bytes)) return 'unknown';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let v = bytes;
        let i = 0;
        while (v >= 1024 && i < units.length - 1) {
          v /= 1024;
          i++;
        }
        return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
      };

      const logProgress = (force = false) => {
        const now = Date.now();
        if (!force && now - lastLogTimeMs < 500) return;

        const elapsedSec = Math.max((now - startTimeMs) / 1000, 0.001);
        const overallSpeedBps = downloadedBytes / elapsedSec;

        const windowElapsedSec = Math.max((now - (lastLogTimeMs || startTimeMs)) / 1000, 0.001);
        const windowSpeedBps = (downloadedBytes - lastLogBytes) / windowElapsedSec;

        const speedBps = Number.isFinite(windowSpeedBps) && windowSpeedBps > 0 ? windowSpeedBps : overallSpeedBps;
        const speedStr = `${formatBytes(speedBps)}/s`;

        const progressPayload = {
          status: 'downloading',
          tool,
          action,
          destPath,
          url,
          downloadedBytes,
          totalBytes: totalBytes && Number.isFinite(totalBytes) ? totalBytes : null,
          speedBps: Number.isFinite(speedBps) ? speedBps : null,
          percent: totalBytes && Number.isFinite(totalBytes) && totalBytes > 0
            ? Math.min((downloadedBytes / totalBytes) * 100, 100)
            : null,
          message,
          isBusy: true,
          ready: false,
          timestamp: now
        };

        emitDependencyStatus(progressPayload);

        if (totalBytes && Number.isFinite(totalBytes) && totalBytes > 0) {
          const pct = Math.min((downloadedBytes / totalBytes) * 100, 100);
          console.log(
            `Download progress: ${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)} (${pct.toFixed(1)}%) @ ${speedStr}`
          );
        } else {
          console.log(`Download progress: ${formatBytes(downloadedBytes)} downloaded @ ${speedStr}`);
        }

        lastLogTimeMs = now;
        lastLogBytes = downloadedBytes;
      };

      if (totalBytes && Number.isFinite(totalBytes) && totalBytes > 0) {
        console.log(`Download size: ${formatBytes(totalBytes)} (content-length)`);
      } else {
        console.log('Download size: unknown (missing content-length)');
      }

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        logProgress(false);
      });

      response.on('end', () => {
        logProgress(true);
      });

      file.on('finish', async () => {
        file.close();
        console.log(`Download completed, file size: ${downloadedBytes} bytes`);
        emitDependencyStatus({
          status: 'downloaded',
          tool,
          action,
          message: `${displayName} download finished. Preparing it now...`,
          isBusy: true,
          ready: false,
          percent: 100,
          downloadedBytes,
          totalBytes: totalBytes && Number.isFinite(totalBytes) ? totalBytes : downloadedBytes,
          speedBps: null
        });
        
        // Set executable permissions for binary files on Unix-like systems
        if (process.platform !== 'win32' && (
          destPath.includes('yt-dlp') || 
          destPath.includes('ffmpeg') ||
          destPath.endsWith('.sh')
        )) {
          try {
            await fs.chmod(destPath, 0o755);
            console.log(`Set executable permissions for: ${destPath}`);
          } catch (chmodErr) {
            console.warn(`Failed to set executable permissions: ${chmodErr.message}`);
          }
        }
        
        resolve(destPath);
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlink(destPath).catch(() => {});
      emitDependencyStatus({
        status: 'failed',
        tool,
        action,
        message: `${displayName} download failed: ${err.message}`,
        isBusy: false,
        ready: false,
        error: err.message
      });
      reject(new Error(`Download failed: ${err.message}`));
    });

    file.on('error', (err) => {
      file.close();
      fs.unlink(destPath).catch(() => {});
      emitDependencyStatus({
        status: 'failed',
        tool,
        action,
        message: `Could not save ${displayName}: ${err.message}`,
        isBusy: false,
        ready: false,
        error: err.message
      });
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
    let proc;
    
    // Add 10 second timeout
    const timeout = setTimeout(() => {
      console.error('yt-dlp version check timed out');
      if (proc) proc.kill();
      reject(new Error('yt-dlp version check timed out'));
    }, 100000);

    const launch = getYtdlpLaunch(['--version'], ytdlpPath);
    proc = spawn(launch.executable, launch.args, {
      ...spawnOptions,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
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
      clearTimeout(timeout);
      console.error(`Spawn error: ${err.message}`);
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
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

// Function to fetch latest nightly release from GitHub API
async function getLatestNightlyRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/yt-dlp/yt-dlp-nightly-builds/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'PNUTDownloader',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const release = JSON.parse(data);
            resolve({
              tag: release.tag_name,
              publishedAt: release.published_at,
              assets: release.assets
            });
          } catch (err) {
            reject(new Error(`Failed to parse GitHub API response: ${err.message}`));
          }
        } else {
          reject(new Error(`GitHub API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Failed to fetch latest nightly release: ${err.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout while fetching latest nightly release'));
    });

    req.end();
  });
}

// Function to get the download URL for the latest nightly build
async function getNightlyDownloadUrl() {
  try {
    const release = await getLatestNightlyRelease();
    console.log(`Latest nightly release: ${release.tag}`);
    
    // Determine which asset to download based on platform
    const assetName = getYtdlpExecutableName();

    // Find the matching asset
    const asset = release.assets.find(a => a.name === assetName);
    if (!asset) {
      // Fallback to direct download URL pattern
      const baseUrl = `https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/download/${release.tag}/${assetName}`;
      console.log(`Using fallback URL: ${baseUrl}`);
      return { url: baseUrl, tag: release.tag };
    }

    return { url: asset.browser_download_url, tag: release.tag };
  } catch (error) {
    console.error(`Failed to get nightly download URL: ${error.message}`);
    // Fallback to latest stable if nightly fails
    throw error;
  }
}

async function readYtdlpVersionMetadata() {
  const versionFile = getYtdlpVersionFilePath();

  try {
    const versionData = await fs.readFile(versionFile, 'utf8');
    const lines = versionData.trim().split('\n');
    const lastKnownVersion = lines[0] || null;
    const parsedTimestamp = lines[1] ? Number.parseInt(lines[1], 10) : null;
    const lastCheckTime = Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;

    console.log(`Last known yt-dlp version: ${lastKnownVersion || 'Unknown'}`);
    console.log(`Last yt-dlp update check: ${lastCheckTime ? new Date(lastCheckTime).toISOString() : 'Unknown'}`);

    return { versionFile, lastKnownVersion, lastCheckTime };
  } catch (err) {
    console.log('No previous yt-dlp version metadata found');
    return { versionFile, lastKnownVersion: null, lastCheckTime: null };
  }
}

async function saveYtdlpVersionMetadata(version, timestamp = Date.now()) {
  if (!version) return;

  const versionFile = getYtdlpVersionFilePath();

  try {
    const versionData = `${version}\n${timestamp}`;
    await fs.writeFile(versionFile, versionData, 'utf8');
    console.log(`Saved yt-dlp metadata: ${version} checked at ${new Date(timestamp).toISOString()}`);
  } catch (err) {
    console.warn(`Failed to save yt-dlp metadata: ${err.message}`);
  }
}

// Function to check if update is needed
async function checkYtdlpUpdate() {
  try {
    const { lastKnownVersion, lastCheckTime } = await readYtdlpVersionMetadata();
    const now = Date.now();

    try {
      const stats = await fs.stat(ytdlpPath);
      if (stats.size === 0) {
        return { needsUpdate: true, reason: 'empty_binary', currentVersion: lastKnownVersion };
      }
    } catch (err) {
      console.log('yt-dlp binary is missing, will download:', err.message);
      return { needsUpdate: true, reason: 'missing_binary', currentVersion: lastKnownVersion };
    }

    if (lastCheckTime && now - lastCheckTime < YTDLP_AUTO_UPDATE_INTERVAL_MS) {
      const nextCheckAt = lastCheckTime + YTDLP_AUTO_UPDATE_INTERVAL_MS;
      console.log(`Skipping yt-dlp update check; last check was less than 2 days ago. Next check after ${new Date(nextCheckAt).toISOString()}`);
      return {
        needsUpdate: false,
        reason: 'recently_checked',
        currentVersion: lastKnownVersion,
        lastCheckedAt: lastCheckTime,
        nextCheckAt
      };
    }

    if (lastCheckTime) {
      console.log('At least 2 days passed since the last yt-dlp update check; checking now.');
    }

    let currentVersion = lastKnownVersion;
    if (!currentVersion) {
      try {
        currentVersion = await checkYtdlpVersion();
        console.log(`Current yt-dlp version: ${currentVersion}`);
      } catch (err) {
        console.log('Could not get current yt-dlp version, will update:', err.message);
        return { needsUpdate: true, reason: 'version_check_failed' };
      }
    }

    // Get latest nightly release
    const release = await getLatestNightlyRelease();
    console.log(`Latest nightly release tag: ${release.tag}`);

    // Update only when a new release is available, not just because time passed.
    if (!lastKnownVersion || lastKnownVersion !== release.tag) {
      return { 
        needsUpdate: true, 
        reason: !lastKnownVersion ? 'first_time' : 
                'new_version_available',
        currentVersion: lastKnownVersion || currentVersion,
        latestVersion: release.tag
      };
    }

    await saveYtdlpVersionMetadata(release.tag, now);

    return {
      needsUpdate: false,
      reason: 'up_to_date',
      currentVersion: release.tag,
      latestVersion: release.tag,
      lastCheckedAt: now,
      nextCheckAt: now + YTDLP_AUTO_UPDATE_INTERVAL_MS
    };
  } catch (error) {
    console.error(`Error checking for yt-dlp update: ${error.message}`);
    return { needsUpdate: false, reason: 'check_failed', error: error.message };
  }
}

async function updateYtdlp(forceUpdate = false, options = {}) {
  const { skipUpdateCheck = false } = options;
  let markedYtdlpUpdateInProgress = false;
  let stagedYtdlpPath = null;
  // Determine download URL and target path
  let ytdlpUrl;
  let releaseTag = null;
  const bundledPath = app.isPackaged
    ? join(process.resourcesPath, getYtdlpExecutableName())
    : join(__dirname, '../../public', getYtdlpExecutableName());

  // Always use bundled/downloaded version
  if (!ytdlpPath || ytdlpPath === bundledPath || !existsSync(ytdlpPath)) {
    ytdlpPath = bundledPath;
  }
  
  try {
    if (hasActiveDownloads()) {
      const message = 'Skipped yt-dlp update because a download is active.';
      console.log(message);
      if (forceUpdate) {
        throw new Error('A download is in progress. Try Repair Downloads again after it finishes.');
      }
      return { success: true, message, skipped: true, reason: 'download_active' };
    }

    emitDependencyStatus({
      status: 'checking',
      tool: 'yt-dlp',
      action: forceUpdate ? 'manual-update' : 'update',
      message: forceUpdate ? 'Preparing a fresh yt-dlp download...' : 'Checking yt-dlp for updates...',
      isBusy: true,
      ready: false,
      percent: null,
      downloadedBytes: null,
      totalBytes: null,
      speedBps: null,
      error: null
    });

    // Check if update is needed (unless forced)
    if (!forceUpdate && !skipUpdateCheck) {
      const updateCheck = await checkYtdlpUpdate();
      if (!updateCheck.needsUpdate) {
        const wasRecentlyChecked = updateCheck.reason === 'recently_checked';
        const message = wasRecentlyChecked
          ? 'yt-dlp update check skipped; it was checked less than 2 days ago.'
          : `yt-dlp is already up to date${updateCheck.currentVersion ? ` (${updateCheck.currentVersion})` : ''}.`;
        console.log(message);
        emitDependencyStatus({
          status: 'ready',
          tool: 'yt-dlp',
          action: 'update',
          message,
          isBusy: false,
          ready: true,
          percent: 100,
          currentVersion: updateCheck.currentVersion || null,
          latestVersion: updateCheck.latestVersion || updateCheck.currentVersion || null,
          nextCheckAt: updateCheck.nextCheckAt || null,
          error: null
        });
        return {
          success: true,
          message: wasRecentlyChecked ? 'Recently checked' : 'Already up to date',
          version: updateCheck.currentVersion,
          skipped: true,
          reason: updateCheck.reason,
          nextCheckAt: updateCheck.nextCheckAt || null
        };
      }
    }

    if (hasActiveDownloads()) {
      const message = 'Skipped yt-dlp update because a download started.';
      console.log(message);
      if (forceUpdate) {
        throw new Error('A download is in progress. Try Repair Downloads again after it finishes.');
      }
      return { success: true, message, skipped: true, reason: 'download_active' };
    }

    downloadToolsUpdateInProgress = true;
    markedYtdlpUpdateInProgress = true;

    try {
      // Get latest nightly build URL
      const nightlyInfo = await getNightlyDownloadUrl();
      ytdlpUrl = nightlyInfo.url;
      releaseTag = nightlyInfo.tag;
      console.log(`Downloading yt-dlp nightly build: ${releaseTag}`);
      emitDependencyStatus({
        status: 'updating',
        tool: 'yt-dlp',
        action: forceUpdate ? 'manual-update' : 'update',
        message: `Downloading yt-dlp ${releaseTag}...`,
        isBusy: true,
        ready: false,
        percent: 0,
        latestVersion: releaseTag
      });
    } catch (error) {
      console.warn(`Failed to get nightly build URL, falling back to stable: ${error.message}`);
      // Fallback to stable releases if nightly fails
      if (process.platform === 'win32') {
        ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
      } else if (process.platform === 'darwin') {
        ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
      } else {
        ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
      }
      emitDependencyStatus({
        status: 'updating',
        tool: 'yt-dlp',
        action: forceUpdate ? 'manual-update' : 'update',
        message: 'Downloading the latest stable yt-dlp build...',
        isBusy: true,
        ready: false,
        percent: 0
      });
    }

    if (hasActiveDownloads()) {
      const message = 'Skipped yt-dlp replacement because a download started.';
      console.log(message);
      if (forceUpdate) {
        throw new Error('A download is in progress. Try Repair Downloads again after it finishes.');
      }
      return { success: true, message, skipped: true, reason: 'download_active' };
    }

    stagedYtdlpPath = getStagedBinaryPath(ytdlpPath);
    await fs.rm(stagedYtdlpPath, { force: true }).catch(() => {});

    console.log(`Downloading yt-dlp from: ${ytdlpUrl}`);
    await downloadFile(ytdlpUrl, stagedYtdlpPath, {
      tool: 'yt-dlp',
      action: forceUpdate ? 'manual-update' : 'update',
      displayName: 'yt-dlp',
      message: releaseTag ? `Downloading yt-dlp ${releaseTag}...` : 'Downloading yt-dlp...'
    });
    console.log('yt-dlp downloaded successfully');
    const stats = await fs.stat(stagedYtdlpPath);
    console.log(`File size after download: ${stats.size} bytes`);
    emitDependencyStatus({
      status: 'verifying',
      tool: 'yt-dlp',
      action: forceUpdate ? 'manual-update' : 'update',
      message: 'Verifying yt-dlp and setting permissions...',
      isBusy: true,
      ready: false,
      percent: 100
    });
    
    // Set executable permissions on Unix-like systems with retry logic
    if (process.platform !== 'win32') {
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.chmod(stagedYtdlpPath, 0o755);
          console.log(`Successfully set executable permissions for yt-dlp`);
          break;
        } catch (err) {
          retries--;
          console.warn(`chmod failed (attempt ${4 - retries}/3): ${err.message}`);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.error(`Failed to set executable permissions after 3 attempts`);
          }
        }
      }
    }
    
    // Verify the downloaded binary works (skip on Windows as it might show a console window)
    // Note: Verification is optional - if it fails, we still consider the download successful
    // since the file was downloaded and has proper size. PyInstaller bundles might take longer to start.
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require('child_process');
        // Increase timeout to 15 seconds for PyInstaller bundles
        const version = execSync(`"${stagedYtdlpPath}" --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 }).trim();
        console.log(`Downloaded yt-dlp binary verified successfully, version: ${version}`);
      } catch (verifyErr) {
        // Don't throw error - just warn. File was downloaded successfully and has proper size.
        // PyInstaller bundles might fail verification but still work when actually used.
        console.warn('Downloaded yt-dlp binary verification failed (this is OK for PyInstaller bundles):', verifyErr.message);
        console.log('File downloaded successfully. Verification will happen when yt-dlp is actually used.');
        // Continue - don't throw error
      }
    }

    emitDependencyStatus({
      status: 'updating',
      tool: 'yt-dlp',
      action: forceUpdate ? 'manual-update' : 'update',
      message: 'Replacing the previous yt-dlp binary...',
      isBusy: true,
      ready: false,
      percent: 100
    });
    await replaceBinaryFromStagedFile(stagedYtdlpPath, ytdlpPath, 'yt-dlp');

    // Save version info only after the fresh binary has replaced the previous one.
    await saveYtdlpVersionMetadata(releaseTag);
    
    emitDependencyStatus({
      status: 'ready',
      tool: 'yt-dlp',
      action: forceUpdate ? 'manual-update' : 'update',
      message: releaseTag ? `yt-dlp updated to ${releaseTag}.` : 'yt-dlp updated successfully.',
      isBusy: false,
      ready: true,
      percent: 100,
      version: releaseTag,
      latestVersion: releaseTag,
      error: null
    });

    return { success: true, message: 'yt-dlp updated successfully', version: releaseTag };
  } catch (error) {
    console.error(`Failed to update yt-dlp: ${error.message}`);
    emitDependencyStatus({
      status: 'failed',
      tool: 'yt-dlp',
      action: forceUpdate ? 'manual-update' : 'update',
      message: `yt-dlp update failed: ${error.message}`,
      isBusy: false,
      ready: false,
      error: error.message
    });
    throw error;
  } finally {
    if (stagedYtdlpPath) {
      await fs.rm(stagedYtdlpPath, { force: true }).catch(() => {});
    }
    if (markedYtdlpUpdateInProgress) {
      downloadToolsUpdateInProgress = false;
    }
  }
}

async function runYtdlpAutoUpdateCheck(source = 'automatic') {
  try {
    if (downloadProcess || (activeDownloads && Object.keys(activeDownloads).length > 0)) {
      console.log(`${source} yt-dlp update check skipped because a download is active.`);
      return;
    }

    console.log(`${source} yt-dlp update check...`);
    const updateCheck = await checkYtdlpUpdate();
    if (updateCheck.needsUpdate) {
      console.log(`New yt-dlp version available: ${updateCheck.latestVersion}`);
      console.log('Updating yt-dlp automatically...');
      const updateResult = await updateYtdlp(false, { skipUpdateCheck: true });
      if (updateResult.success) {
        console.log(`yt-dlp updated successfully to ${updateResult.version}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_EVENTS.YTDLP_UPDATED, {
            version: updateResult.version,
            message: 'yt-dlp has been updated to the latest nightly build'
          });
        }
      }
    } else {
      if (updateCheck.reason === 'recently_checked') {
        console.log(`yt-dlp update check skipped until ${updateCheck.nextCheckAt ? new Date(updateCheck.nextCheckAt).toISOString() : 'later'}.`);
        return;
      }

      if (updateCheck.reason === 'check_failed') {
        console.log(`yt-dlp update check failed and will not retry until the next startup: ${updateCheck.error || 'Unknown error'}`);
        return;
      }

      console.log(`yt-dlp is up to date. Reason: ${updateCheck.reason}`);
      emitDependencyStatus({
        status: 'ready',
        tool: 'yt-dlp',
        action: 'auto-update',
        message: updateCheck.currentVersion
          ? `yt-dlp is up to date (${updateCheck.currentVersion}).`
          : 'yt-dlp is up to date.',
        isBusy: false,
        ready: true,
        percent: 100,
        currentVersion: updateCheck.currentVersion || null,
        latestVersion: updateCheck.latestVersion || updateCheck.currentVersion || null,
        nextCheckAt: updateCheck.nextCheckAt || null,
        error: null
      });
    }
  } catch (error) {
    console.error(`Error during ${source} yt-dlp update check:`, error.message);
    emitDependencyStatus({
      status: 'failed',
      tool: 'yt-dlp',
      action: 'auto-update',
      message: `Could not update yt-dlp: ${error.message}`,
      isBusy: false,
      ready: false,
      error: error.message
    });
  }
}

async function downloadAndExtractFFmpeg(options = {}) {
  const { forceUpdate = false } = options;
  let markedDownloadToolsUpdateInProgress = false;
  let ffmpegUrl;
  let tempTarPath;
  let ffmpegFileName;
  let isZip = false;
  let isTarGz = false;
  let isTarXz = false;
  const stagedFfmpegPath = getStagedBinaryPath(ffmpegPath);
  let extractDir = null;
  
  if (process.platform === 'win32') {
    // Windows: Use GitHub releases for reliable static builds
    // Using BtbN FFmpeg builds which are reliable and widely used
    ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    tempTarPath = join(app.getPath('temp'), 'ffmpeg-win.zip');
    ffmpegFileName = 'ffmpeg.exe';
    isZip = true;
  } else if (process.platform === 'darwin') {
    // macOS: Use a direct download from evermeet.cx with full URL
    ffmpegUrl = 'https://evermeet.cx/ffmpeg/ffmpeg-8.0.1.zip';
    tempTarPath = join(app.getPath('temp'), 'ffmpeg-mac.zip');
    ffmpegFileName = 'ffmpeg';
    isZip = true;
  } else {
    // Linux: Use reliable static build
    ffmpegUrl = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
    tempTarPath = join(app.getPath('temp'), 'ffmpeg-linux.tar.xz');
    ffmpegFileName = 'ffmpeg';
    isTarXz = true;
  }
  
  const extractPath = dirname(ffmpegPath);

  try {
    emitDependencyStatus({
      status: 'checking',
      tool: 'ffmpeg',
      action: forceUpdate ? 'manual-update' : 'install',
      message: forceUpdate ? 'Preparing a fresh FFmpeg download...' : 'Checking FFmpeg...',
      isBusy: true,
      ready: false,
      percent: null,
      downloadedBytes: null,
      totalBytes: null,
      speedBps: null,
      error: null
    });

    if (!forceUpdate && existsSync(ffmpegPath)) {
      const stats = await fs.stat(ffmpegPath);
      if (stats.size > 0) {
        console.log('FFmpeg already exists, skipping download');
        emitDependencyStatus({
          status: 'ready',
          tool: 'ffmpeg',
          action: 'install',
          message: 'FFmpeg is already installed.',
          isBusy: false,
          ready: true,
          percent: 100,
          error: null
        });
        return { success: true, message: 'FFmpeg already installed', skipped: true };
      }
    }

    if (hasActiveDownloads()) {
      const message = 'Skipped FFmpeg install/update because a download is active.';
      console.log(message);
      if (forceUpdate) {
        throw new Error('A download is in progress. Try Repair Downloads again after it finishes.');
      }
      return { success: true, message, skipped: true, reason: 'download_active' };
    }

    downloadToolsUpdateInProgress = true;
    markedDownloadToolsUpdateInProgress = true;

    await fs.rm(stagedFfmpegPath, { force: true }).catch(() => {});

    if (!existsSync(extractPath)) {
      mkdirSync(extractPath, { recursive: true });
    }

    const { execSync } = require('child_process');
    
    if (process.platform === 'win32') {
      console.log('Downloading FFmpeg for Windows...');
      await downloadFile(ffmpegUrl, tempTarPath, {
        tool: 'ffmpeg',
        action: forceUpdate ? 'manual-update' : 'install',
        displayName: 'FFmpeg',
        message: 'Downloading FFmpeg for Windows...'
      });
      console.log('Extracting FFmpeg...');
      emitDependencyStatus({
        status: 'extracting',
        tool: 'ffmpeg',
        action: forceUpdate ? 'manual-update' : 'install',
        message: 'Extracting FFmpeg...',
        isBusy: true,
        ready: false,
        percent: 100
      });
      
      // Extract ZIP file for Windows using PowerShell
      extractDir = join(app.getPath('temp'), `ffmpeg_extract_${process.pid}`);
      await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      mkdirSync(extractDir, { recursive: true });
      
      // Use PowerShell Expand-Archive (built into Windows 10+)
      try {
        const psCommand = `Expand-Archive -Path "${tempTarPath.replace(/\\/g, '/')}" -DestinationPath "${extractDir.replace(/\\/g, '/')}" -Force`;
        execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error('PowerShell extraction failed, trying alternative method...', err.message);
        // Alternative: Use tar if available (Windows 10 1903+)
        try {
          execSync(`tar -xf "${tempTarPath}" -C "${extractDir}"`, { stdio: 'inherit' });
        } catch (tarErr) {
          throw new Error(`Failed to extract FFmpeg: ${err.message}. Please ensure PowerShell or tar is available.`);
        }
      }
      
      // Find ffmpeg.exe in extracted files
      const findFfmpeg = async (dir) => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = join(dir, file.name);
          if (file.isDirectory()) {
            const found = await findFfmpeg(fullPath);
            if (found) return found;
          } else if (file.name === 'ffmpeg.exe') {
            return fullPath;
          }
        }
        return null;
      };
      
      const extractedFfmpeg = await findFfmpeg(extractDir);
      if (extractedFfmpeg) {
        await fs.copyFile(extractedFfmpeg, stagedFfmpegPath);
        // Clean up
        await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      } else {
        throw new Error('FFmpeg.exe not found in extracted archive');
      }
    } else if (process.platform === 'darwin') {
      // macOS: Always download bundled version (don't use system FFmpeg)
      console.log('Downloading FFmpeg for macOS...');
      await downloadFile(ffmpegUrl, tempTarPath, {
        tool: 'ffmpeg',
        action: forceUpdate ? 'manual-update' : 'install',
        displayName: 'FFmpeg',
        message: 'Downloading FFmpeg for macOS...'
      });
      
      // Extract ZIP file
      emitDependencyStatus({
        status: 'extracting',
        tool: 'ffmpeg',
        action: forceUpdate ? 'manual-update' : 'install',
        message: 'Extracting FFmpeg...',
        isBusy: true,
        ready: false,
        percent: 100
      });
      extractDir = join(app.getPath('temp'), `ffmpeg_extract_${process.pid}`);
      await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
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
        await fs.copyFile(extractedFfmpeg, stagedFfmpegPath);
        // Clean up
        await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      } else {
        throw new Error('FFmpeg binary not found in extracted archive');
      }
    } else {
      // Linux - download and extract tar.xz
      console.log('Downloading FFmpeg for Linux...');
      await downloadFile(ffmpegUrl, tempTarPath, {
        tool: 'ffmpeg',
        action: forceUpdate ? 'manual-update' : 'install',
        displayName: 'FFmpeg',
        message: 'Downloading FFmpeg for Linux...'
      });
      emitDependencyStatus({
        status: 'extracting',
        tool: 'ffmpeg',
        action: forceUpdate ? 'manual-update' : 'install',
        message: 'Extracting FFmpeg...',
        isBusy: true,
        ready: false,
        percent: 100
      });
      extractDir = join(app.getPath('temp'), `ffmpeg_extract_${process.pid}`);
      await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      mkdirSync(extractDir, { recursive: true });
      execSync(`tar -xf "${tempTarPath}" -C "${extractDir}" --strip-components=1 --wildcards "*/ffmpeg"`);
      const extractedFfmpeg = join(extractDir, 'ffmpeg');
      if (!existsSync(extractedFfmpeg)) {
        throw new Error('FFmpeg binary not found in extracted archive');
      }
      await fs.copyFile(extractedFfmpeg, stagedFfmpegPath);
    }

    await fs.unlink(tempTarPath).catch(() => {});
    
    // Set executable permissions on Unix-like systems
    if (process.platform !== 'win32') {
      await fs.chmod(stagedFfmpegPath, 0o755).catch(err =>
        console.warn(`Failed to set FFmpeg permissions: ${err.message}`)
      );
    }

    const stats = await fs.stat(stagedFfmpegPath);
    console.log(`FFmpeg downloaded and extracted successfully. Size: ${stats.size} bytes`);
    emitDependencyStatus({
      status: 'verifying',
      tool: 'ffmpeg',
      action: forceUpdate ? 'manual-update' : 'install',
      message: 'Verifying FFmpeg...',
      isBusy: true,
      ready: false,
      percent: 100
    });
    
    // Verify the downloaded FFmpeg works before replacing the previous binary.
    let ffmpegVersion;
    try {
      const { execSync } = require('child_process');
      const version = execSync(`"${stagedFfmpegPath}" -version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
      ffmpegVersion = version.split('\n')[0];
      console.log(`FFmpeg verification successful. Version: ${ffmpegVersion}`);
    } catch (verifyErr) {
      console.error(`FFmpeg verification failed: ${verifyErr.message}`);
      throw new Error(`Downloaded FFmpeg binary is not working: ${verifyErr.message}`);
    }

    emitDependencyStatus({
      status: 'updating',
      tool: 'ffmpeg',
      action: forceUpdate ? 'manual-update' : 'install',
      message: 'Replacing the previous FFmpeg binary...',
      isBusy: true,
      ready: false,
      percent: 100
    });
    await replaceBinaryFromStagedFile(stagedFfmpegPath, ffmpegPath, 'FFmpeg');
    emitDependencyStatus({
      status: 'ready',
      tool: 'ffmpeg',
      action: forceUpdate ? 'manual-update' : 'install',
      message: 'FFmpeg is ready.',
      isBusy: false,
      ready: true,
      percent: 100,
      version: ffmpegVersion,
      error: null
    });
    return { success: true, message: 'FFmpeg updated successfully', version: ffmpegVersion };
  } catch (error) {
    console.error(`Failed to download/extract FFmpeg: ${error.message}`);
    console.error(`Platform: ${process.platform}, FFmpeg path: ${ffmpegPath}`);
    emitDependencyStatus({
      status: 'failed',
      tool: 'ffmpeg',
      action: forceUpdate ? 'manual-update' : 'install',
      message: `FFmpeg update failed: ${error.message}`,
      isBusy: false,
      ready: false,
      error: error.message
    });
    throw error;
  } finally {
    await fs.rm(stagedFfmpegPath, { force: true }).catch(() => {});
    if (extractDir) {
      await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    }
    if (tempTarPath) {
      await fs.rm(tempTarPath, { force: true }).catch(() => {});
    }
    if (markedDownloadToolsUpdateInProgress) {
      downloadToolsUpdateInProgress = false;
    }
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
  width: 1250,
  height: 800,
  minWidth: 1250,
  minHeight: 800,
  maxWidth: 1250,
  maxHeight: 800,
  resizable: false,
  maximizable: false,
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
    if (isAppClosing) {
      return;
    }
    event.preventDefault(); // Prevent immediate close
    console.log('Main window close requested, showing confirmation dialog...');
    try {
      const dependencyBusy = Boolean(dependencyStatus?.isBusy);
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Confirm Exit',
        message: dependencyBusy
          ? ''
          : 'Are you sure you want is still downloading/updating. Closing now can leave the dependency incomplete. Keep PNUT Downloader open until it finishes?to exit PNUT Downloader?',
        buttons: dependencyBusy ? ['Keep Waiting', 'Close Anyway'] : ['Yes', 'No'],
        defaultId: dependencyBusy ? 0 : 1, // Default to safest option
        cancelId: dependencyBusy ? 0 : 1,
        noLink: true,
      });

      if (!dependencyBusy && result.response === 0) { // User clicked "Yes"
        console.log('User confirmed exit, closing main window...');
        isAppClosing = true;
        try {
          await cancelActiveDownloads({ reason: 'app_close' });
        } catch (e) {
          // ignore
        }
        mainWindow.destroy(); // Destroy window to trigger 'closed' event
      } else if (dependencyBusy && result.response === 1) {
        console.log('User chose to close while dependency operation is active.');
        isAppClosing = true;
        try {
          await cancelActiveDownloads({ reason: 'app_close_dependency_active' });
        } catch (e) {
          // ignore
        }
        mainWindow.destroy();
      } else {
        console.log('User canceled exit, keeping window open.');
        // Window remains open
      }
    } catch (error) {
      console.error('Error showing exit confirmation dialog:', error);
      isAppClosing = true;
      try {
        await cancelActiveDownloads({ reason: 'app_close_error' });
      } catch (e) {
        // ignore
      }
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

  // Listen for cookie changes in both the main window and embedded browser sessions.
  getBrowserCookieSessions().forEach((browserSession) => {
    if (cookieChangeListenerSessions.has(browserSession.label)) {
      return;
    }

    cookieChangeListenerSessions.add(browserSession.label);
    browserSession.value.cookies.on('changed', async (event, cookie, cause, removed) => {
      if (!removed && cookie.domain) {
        const cookieDomain = cookie.domain.toLowerCase();
        const isSupportedPlatform = platformDomains.some(domain => {
          const normalizedDomain = domain.startsWith('.') ? domain.substring(1) : domain;
          return cookieDomain.includes(normalizedDomain);
        });

        if (isSupportedPlatform) {
          console.log(`Cookie changed for ${cookie.domain} in ${browserSession.label}, updating cookies file...`);
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
              }
              
              // Send IPC event to renderer to open modal
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(IPC_EVENTS.VIDEO_URL_DETECTED, clipboardText);
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

async function cancelActiveDownloads({ reason } = {}) {
  const hasActive = Boolean(downloadProcess) || Object.keys(activeDownloads || {}).length > 0;
  if (!hasActive) return;

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
        status: 'Download cancelled (app closing).',
        reason: reason || 'app_closing'
      });
    }
  } catch (e) {
    // ignore IPC errors
  }

  const ids = Object.keys(activeDownloads || {});
  ids.forEach((id) => {
    delete activeDownloads[id];
  });

  if (downloadProcess && typeof downloadProcess.pid === 'number') {
    const pid = downloadProcess.pid;
    await new Promise((resolve) => {
      treeKill(pid, 'SIGKILL', () => resolve());
      setTimeout(resolve, 1500);
    });
  }

  downloadProcess = null;
}

app.whenReady().then(async () => {
  // Keep the Dock icon in sync with the bundled brand asset. This also avoids
  // macOS showing a stale icon from an older installation after an update.
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath);
  }

  // Create window immediately
  createWindow();

  // Start initialization in the background
  const initDependencies = async () => {
    emitDependencyStatus({
      status: 'checking',
      tool: 'dependencies',
      action: 'startup',
      message: 'Checking FFmpeg and yt-dlp...',
      isBusy: true,
      ready: false,
      percent: null,
      downloadedBytes: null,
      totalBytes: null,
      speedBps: null,
      error: null
    });

    // Initialize yt-dlp path - always use bundled/downloaded version
    const initializeYtdlp = async () => {
      // Check if bundled version exists
      const bundledPath = app.isPackaged
        ? join(process.resourcesPath, getYtdlpExecutableName())
        : join(__dirname, '../../public', getYtdlpExecutableName());
      
      if (existsSync(bundledPath)) {
        ytdlpPath = bundledPath;
        try {
          const stats = await fs.stat(bundledPath);
          const ready = stats.size > 1000000;
          if (process.platform !== 'win32') {
            await fs.chmod(bundledPath, 0o755).catch((err) => {
              console.warn(`Could not set yt-dlp executable permission during startup: ${err.message}`);
            });
          }

          emitDependencyStatus({
            status: ready ? 'ready' : 'failed',
            tool: 'yt-dlp',
            action: 'startup',
            message: ready ? 'yt-dlp is available.' : 'yt-dlp is missing or incomplete.',
            isBusy: false,
            ready,
            percent: ready ? 100 : null
          });

          if (ready) {
            console.log('Using existing yt-dlp at:', bundledPath);
            return true;
          }

          console.warn(`Existing yt-dlp is too small (${stats.size} bytes), will download a fresh copy.`);
        } catch (err) {
          console.warn('Could not inspect existing yt-dlp, will download a fresh copy:', err.message);
        }
      }
      
      return false;
    };
    
    const ytdlpInitialized = await initializeYtdlp();
    console.log('yt-dlp initialized:', ytdlpInitialized, 'path:', ytdlpPath);
    
    try {
      await downloadAndExtractFFmpeg();
      console.log('FFmpeg initialization completed successfully');
    } catch (ffmpegErr) {
      console.error('FFmpeg initialization failed:', ffmpegErr.message);
      // Don't crash the app, but log the error for debugging
      // The app will still work but some features might not
    }
    
    if (!ytdlpInitialized) {
      console.log('yt-dlp not found or not working, downloading...');
      await updateYtdlp(false, { skipUpdateCheck: true }).catch(downloadErr => {
        console.error('Failed to download yt-dlp:', downloadErr);
      });
      console.log('yt-dlp path after update:', ytdlpPath);
    } else {
      // Auto-update check: Run once after startup, and only if the 2-day throttle allows it.
      setTimeout(() => {
        runYtdlpAutoUpdateCheck('Automatic').catch((error) => {
          console.error('Auto-update failed:', error.message);
        });
      }, 30000); // Wait 30 seconds after app start

      setInterval(() => {
        runYtdlpAutoUpdateCheck('Daily').catch((error) => {
          console.error('Daily yt-dlp update check failed:', error.message);
        });
      }, YTDLP_AUTO_UPDATE_POLL_MS);
    }

    const deps = await checkDependencies();
    isInitialized = deps.ready;
    if (isInitialized) {
      console.log('All dependencies initialized successfully');
      emitDependencyStatus({
        status: 'ready',
        tool: 'dependencies',
        action: 'startup',
        message: 'All download dependencies are ready.',
        isBusy: false,
        ready: true,
        percent: 100,
        dependencies: {
          ffmpeg: deps.ffmpeg,
          ytdlp: deps.ytdlp
        },
        error: null
      });
    } else {
      console.error('Failed to initialize all dependencies');
      emitDependencyStatus({
        status: 'failed',
        tool: 'dependencies',
        action: 'startup',
        message: deps.error || 'Could not prepare all download dependencies.',
        isBusy: false,
        ready: false,
        dependencies: {
          ffmpeg: deps.ffmpeg,
          ytdlp: deps.ytdlp
        },
        error: deps.error || 'Dependencies are missing or incomplete'
      });
    }
  };

  initDependencies().catch(err => {
    console.error('Background initialization failed:', err);
  });

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  electronApp.setAppUserModelId('pnutdownloader');
  
  // Configure auto updater for development
  if (is.dev) {
    // Completely disable auto updater in development
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    console.log('Development mode: Auto-updater completely disabled');
  } else {
    // Production: Use GitHub releases
    autoUpdater.setFeedURL({
      provider: "github",
      owner: "Shoaib-Akh",
      repo: "pnutdownloader",
      private: false,
    });
    
    try {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('autoUpdater.checkForUpdates() error:', err.message);
      });
    } catch (err) {
      console.error('Failed to initiate checkForUpdates:', err.message);
    }
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on(IPC_CHANNELS.OPEN_WEBVIEW, (event, url) => {
    console.log('Received YouTube Video URL:', url);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.WEBVIEW_URL_UPDATE, url);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', (event) => {
  if (isAppClosing) return;
  if (downloadProcess || (activeDownloads && Object.keys(activeDownloads).length > 0)) {
    event.preventDefault();
    isAppClosing = true;
    cancelActiveDownloads({ reason: 'before_quit' }).finally(() => {
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  console.log('All windows closed, quitting app...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Function to clean up partial download files
async function cleanupPartialFile(filePath) {
  try {
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
      console.log(`Cleaned up partial file: ${filePath}`);
      return true;
    }
  } catch (cleanupError) {
    console.warn(`Failed to clean up partial file ${filePath}:`, cleanupError.message);
  }
  return false;
}

// Function to handle manual file deletion and update tracking
async function handleFileDeletion(filePath) {
  try {
    if (existsSync(filePath)) {
      const stats = await fs.stat(filePath);
      console.log(`File exists before deletion: ${filePath} (${stats.size} bytes)`);
      
      // Delete the file
      await fs.unlink(filePath);
      console.log(`Manually deleted file: ${filePath}`);
      
      // Update any internal tracking or UI state
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_EVENTS.FILE_DELETED, { 
          filePath: filePath,
          timestamp: new Date().toISOString(),
          message: `File deleted: ${require('path').basename(filePath)}`
        });
      }
      
      return true;
    } else {
      console.log(`File not found for deletion: ${filePath}`);
      return false;
    }
  } catch (deleteError) {
    console.error(`Failed to delete file ${filePath}:`, deleteError.message);
    throw deleteError;
  }
}

// Function to safely delete file with verification
async function safeDeleteFile(filePath) {
  try {
    // Check if file exists first
    if (!existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return { success: false, message: 'File does not exist' };
    }
    
    // Get file info before deletion
    const stats = await fs.stat(filePath);
    const fileName = require('path').basename(filePath);
    const fileSize = stats.size;
    
    console.log(`Deleting file: ${fileName} (${fileSize} bytes)`);
    
    // Delete the file
    await fs.unlink(filePath);
    
    // Verify deletion
    if (existsSync(filePath)) {
      throw new Error('File still exists after deletion attempt');
    }
    
    console.log(`Successfully deleted: ${fileName}`);
    
    // Notify renderer of successful deletion
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.FILE_DELETED_SUCCESS, {
        filePath: filePath,
        fileName: fileName,
        fileSize: fileSize,
        timestamp: new Date().toISOString()
      });
    }
    
    return { 
      success: true, 
      message: `Successfully deleted ${fileName}`,
      fileName: fileName,
      fileSize: fileSize
    };
    
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
    
    // Notify renderer of deletion failure
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.FILE_DELETION_FAILED, {
        filePath: filePath,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return { 
      success: false, 
      message: `Failed to delete file: ${error.message}` 
    };
  }
}

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

    const cookiesByKey = new Map();
    
    for (const browserSession of getBrowserCookieSessions()) {
      for (const domain of domains) {
        try {
          const cookies = await browserSession.value.cookies.get({ domain });
          if (cookies && cookies.length > 0) {
            cookies.forEach((cookie) => {
              const normalizedDomain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`;
              const key = `${normalizedDomain}\t${cookie.path}\t${cookie.name}`;
              cookiesByKey.set(key, {
                ...cookie,
                domain: normalizedDomain
              });
            });
          }
        } catch (err) {
          console.warn(`Failed to get cookies for ${domain} from ${browserSession.label}:`, err.message);
        }
      }
    }

    const allCookies = Array.from(cookiesByKey.values());

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
      const domain = cookie.domain;
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
    console.log(`Cookies updated successfully at: ${cookiesPath} (${allCookies.length} cookies from ${domains.length} platforms across ${getBrowserCookieSessions().length} sessions)`);
  } catch (error) {
    console.error('Error updating cookies:', error);
  }
}

async function getCookieHeaderFromBrowserSessions(domain) {
  const sessionsToCheck = getBrowserCookieSessions().reverse();

  for (const browserSession of sessionsToCheck) {
    try {
      const cookies = await browserSession.value.cookies.get({ domain });
      if (cookies && cookies.length > 0) {
        return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      }
    } catch (cookieError) {
      console.warn(`Failed to read ${domain} cookies from ${browserSession.label}:`, cookieError.message);
    }
  }

  return null;
}

ipcMain.handle(IPC_CHANNELS.GET_YOUTUBE_COOKIES, async () => {
  // Note: This handler name is kept for backward compatibility
  // but now updates cookies for all platforms (YouTube, Facebook, Instagram, Twitter, Dailymotion)
  await updateCookiesFile();
  return cookiesPath;
});

ipcMain.handle(IPC_CHANNELS.FETCH_VIDEO_INFO, async (event, url) => {
  const requestId = `fetch-video-info:${Date.now()}`;
  console.log(`[${requestId}] url:`, url);
  
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
    
    return join(__dirname, '../../public', getYtdlpExecutableName());
  };

  const currentYtdlpPath = getYtdlpPath();
  console.log(`[${requestId}] Using yt-dlp path for video info:`, currentYtdlpPath);
  
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
    const launch = getYtdlpLaunch(args, currentYtdlpPath);
    logYtdlpCommand(requestId, launch.executable, launch.args);
    const startedAt = Date.now();
    const proc = spawn(launch.executable, launch.args, spawnOptions);

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = createYtdlpTimeout({
      proc,
      label: requestId,
      timeoutMs: YTDLP_INFO_TIMEOUT_MS,
      onTimeout: (message) => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      }
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[${requestId}] yt-dlp stdout chunk: ${data.length} bytes`);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      console.error(`[${requestId}] yt-dlp stderr:`, text.trim());
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      timeout.clear();
      console.log(`[${requestId}] yt-dlp closed with code ${code} after ${Date.now() - startedAt}ms (stdout=${stdout.length} chars, stderr=${stderr.length} chars)`);
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
      if (settled) return;
      settled = true;
      timeout.clear();
      console.error(`[${requestId}] Failed to spawn yt-dlp:`, err.message);
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
});

ipcMain.handle(IPC_CHANNELS.FETCH_PLAYLIST_ENTRIES, async (event, url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL.')
  }

  // Update cookies before fetching playlist info
  try {
    await updateCookiesFile()
  } catch (cookieError) {
    console.warn('Failed to update cookies before fetching playlist info:', cookieError.message)
  }

  const getYtdlpPath = () => {
    if (app.isPackaged) {
      return join(process.resourcesPath, getYtdlpExecutableName())
    }
    return join(__dirname, '../../public', getYtdlpExecutableName())
  }

  const currentYtdlpPath = getYtdlpPath()
  const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {}

  return new Promise((resolve, reject) => {
    const args = [
      '-J',
      '--yes-playlist',
      '--cookies', cookiesPath,
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--extractor-retries', '3',
      '--js-runtimes', 'node',
      url,
    ]

    const launch = getYtdlpLaunch(args, currentYtdlpPath)
    const proc = spawn(launch.executable, launch.args, spawnOptions)

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited with code ${code}. Error:\n${stderr}`))
      }

      try {
        const json = JSON.parse(stdout)
        const entries = Array.isArray(json.entries) ? json.entries : []

        const playlistTitle = json.playlist_title || json.title || 'Playlist'
        const playlistThumbnail = (Array.isArray(json.thumbnails) && json.thumbnails.length > 0)
          ? json.thumbnails[json.thumbnails.length - 1].url
          : (json.thumbnail || '')

        const videos = entries
          .map((entry, index) => {
            const videoId = entry?.id || entry?.display_id
            const thumbs = entry?.thumbnails
            const thumbnail = (Array.isArray(thumbs) && thumbs.length > 0)
              ? thumbs[thumbs.length - 1].url
              : (entry?.thumbnail || '')

            return {
              videoId,
              title: entry?.title || 'Untitled',
              thumbnail,
              position: typeof entry?.playlist_index === 'number' ? entry.playlist_index : index,
            }
          })
          .filter((v) => v.videoId)

        resolve({
          isPlaylist: true,
          playlistTitle,
          thumbnail: playlistThumbnail,
          videoCount: videos.length,
          videos,
        })
      } catch (err) {
        reject(new Error(`Failed to parse JSON from yt-dlp: ${err.message}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`))
    })
  })
})

let downloadProcess = null;
const activeDownloads = {};
const cookieChangeListenerSessions = new Set();

function hasActiveDownloads() {
  return Boolean(downloadProcess) || Object.keys(activeDownloads || {}).length > 0;
}

const startDownload = async (event, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (downloadProcess) {
        event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { status: 'A download is already in progress!' });
        return reject(new Error('A download is already in progress.'));
      }

      const { id: downloadId, url, isAudioOnly, selectedFormat, selectedQuality, saveTo, selectBitrate, title: titleFromOptions, titleTimestamp, playlistTitle: playlistTitleFromOptions, forceSingle, debugMode = false } = options;
      const isDebugMode = Boolean(debugMode);
      const downloadLogId = downloadId || `download:${Date.now()}`;
      const downloadStartedAt = Date.now();
      console.log(`[${downloadLogId}] ⏱ Download request received at ${new Date().toISOString()}`);
      emitDebugLog({
        source: 'download',
        message: 'Download request received',
        details: `URL: ${url || '(missing)'}\nFormat: ${selectedFormat || '(default)'}\nQuality: ${selectedQuality || '(default)'}\nAudio only: ${Boolean(isAudioOnly)}\nSave to: ${saveTo || '(default)'}\nDebug mode: ${isDebugMode ? 'on' : 'off'}`,
        downloadId: downloadLogId
      }, event.sender);

      if (downloadToolsUpdateInProgress) {
        const message = 'Download tools are being updated. Try again when the repair/update finishes.';
        event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
          downloadId,
          error: message,
          repairRecommended: true
        });
        return reject(new Error(message));
      }

      console.log(`[${downloadLogId}] Download request:`, {
        url,
        isAudioOnly,
        selectedFormat,
        selectedQuality,
        saveTo,
        selectBitrate,
        titleFromOptions,
        playlistTitleFromOptions,
        forceSingle,
        debugMode: isDebugMode
      });

      if (!url || typeof url !== 'string') {
        return reject(new Error('Invalid URL.'));
      }

      if (activeDownloads[downloadId]) {
        return reject(new Error('Download already in progress.'));
      }

      // Update cookies in background — do NOT await this, it must not block yt-dlp start
      updateCookiesFile().catch((cookieError) => {
        console.warn('Failed to update cookies before download:', cookieError.message);
      });
      
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

      const isPlaylist = Boolean(
        playlistTitleFromOptions ||
        url.includes("playlist") ||
        url.includes("&list=") ||
        url.includes("?list=")
      );

      const shouldDownloadPlaylist = isPlaylist && !forceSingle;

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

      const playlistTitleSanitized = playlistTitleFromOptions ? sanitize(playlistTitleFromOptions) : null;
      if (isPlaylist && playlistTitleSanitized) {
        try {
          const playlistDir = join(baseDir, playlistTitleSanitized);
          if (!existsSync(playlistDir)) {
            mkdirSync(playlistDir, { recursive: true });
          }
        } catch (dirError) {
          console.warn(`[${downloadId}] Failed to pre-create playlist directory: ${dirError.message}`);
        }
      }

      const getTitle = () => {
        return new Promise((titleResolve, titleReject) => {
          const titleArgs = [
            shouldDownloadPlaylist ? '--get-filename' : '--get-title',
            '-o', shouldDownloadPlaylist ? '%(playlist_title)s' : '%(title)s',
            shouldDownloadPlaylist ? '--yes-playlist' : '--no-playlist',
            '--js-runtimes', 'node',
          ];

          if (!isYouTubePlatform(detectPlatform(url))) {
            titleArgs.push(
              '--cookies', cookiesPath,
              '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
          }

          titleArgs.push(url);
          
  const getYtdlpPath = () => {
    if (app.isPackaged) {
      return join(process.resourcesPath, getYtdlpExecutableName());
    }
    
    return join(__dirname, '../../public', getYtdlpExecutableName());
  };

          const currentYtdlpPath = getYtdlpPath();
          const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
          const titleLabel = `${downloadLogId}:title`;
          const launch = getYtdlpLaunch(titleArgs, currentYtdlpPath);
          logYtdlpCommand(titleLabel, launch.executable, launch.args);
          const startedAt = Date.now();
          const titleProcess = spawn(launch.executable, launch.args, spawnOptions);
          let titleData = '';
          let titleStderr = '';
          let settled = false;
          const timeout = createYtdlpTimeout({
            proc: titleProcess,
            label: titleLabel,
            timeoutMs: YTDLP_INFO_TIMEOUT_MS,
            onTimeout: (message) => {
              if (settled) return;
              settled = true;
              titleReject(new Error(message));
            }
          });

          titleProcess.stdout.on('data', (data) => {
            titleData += data.toString().trim();
            console.log(`[${titleLabel}] yt-dlp stdout chunk: ${data.length} bytes`);
          });

          titleProcess.stderr.on('data', (data) => {
            const text = data.toString();
            titleStderr += text;
            console.error(`[${titleLabel}] yt-dlp stderr:`, text.trim());
          });

          titleProcess.on('close', (code) => {
            if (settled) return;
            settled = true;
            timeout.clear();
            console.log(`[${titleLabel}] yt-dlp closed with code ${code} after ${Date.now() - startedAt}ms (stdout=${titleData.length} chars, stderr=${titleStderr.length} chars)`);
            if (code === 0 && titleData) {
              const titles = titleData.split('\n').filter(Boolean);
              titleResolve(titles[0] || 'Unknown');
            } else {
              titleReject(new Error(titleStderr.trim() || 'Failed to fetch title'));
            }
          });

          titleProcess.on('error', (err) => {
            if (settled) return;
            settled = true;
            timeout.clear();
            console.error(`[${titleLabel}] Failed to spawn yt-dlp:`, err.message);
            titleReject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
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
            
            return join(__dirname, '../../public', getYtdlpExecutableName());
          };

          const currentYtdlpPath = getYtdlpPath();
          const args = [
            '-J',
            '--no-playlist',
            '--cookies', cookiesPath,
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--extractor-retries', '3',
            '--js-runtimes', 'node',
            url
          ];

          const infoLabel = `${downloadLogId}:info`;
          const launch = getYtdlpLaunch(args, currentYtdlpPath);
          logYtdlpCommand(infoLabel, launch.executable, launch.args);

          const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
          const startedAt = Date.now();
          const proc = spawn(launch.executable, launch.args, spawnOptions);

          let stdout = '';
          let stderr = '';
          let settled = false;
          const timeout = createYtdlpTimeout({
            proc,
            label: infoLabel,
            timeoutMs: YTDLP_INFO_TIMEOUT_MS,
            onTimeout: (message) => {
              if (settled) return;
              settled = true;
              reject(new Error(message));
            }
          });

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`[${infoLabel}] yt-dlp stdout chunk: ${data.length} bytes`);
          });

          proc.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            console.error(`[${infoLabel}] yt-dlp stderr:`, text.trim());
          });

          proc.on('close', (code) => {
            if (settled) return;
            settled = true;
            timeout.clear();
            console.log(`[${infoLabel}] yt-dlp closed with code ${code} after ${Date.now() - startedAt}ms (stdout=${stdout.length} chars, stderr=${stderr.length} chars)`);
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
            if (settled) return;
            settled = true;
            timeout.clear();
            console.error(`[${downloadId}] Failed to spawn yt-dlp:`, err.message);
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
          });
        });
      };

      const isGeneratedMetadataTitle = (value) => {
        if (!value || typeof value !== 'string') return true;
        const normalized = value.trim().toLowerCase();

        if (!normalized || normalized === 'unknown' || normalized === 'unknown video' || normalized === 'pending...') {
          return true;
        }

        return /^(unknown video|unknown platform video|snapchat video|instagram (post|video)|facebook video|twitter (post|video)|tiktok video|vimeo video|dailymotion video|reddit (post|video)|twitch video|soundcloud track|bilibili video)(?:\s*(?:-|$|\().*)?$/i.test(normalized);
      };

      const fetchAndSanitizeTitle = async () => {
        try {
          // ── Fast path: renderer already sent the title ──────────────────────────
          // titleFromOptions is populated by the renderer from its own video-info
          // lookup. Use it directly and skip spawning an extra yt-dlp process.
          if (titleFromOptions && titleFromOptions.trim() !== '' && !isGeneratedMetadataTitle(titleFromOptions)) {
            const sanitizedTitle = sanitize(titleFromOptions.trim());
            if (sanitizedTitle && sanitizedTitle !== 'Unknown' && !isGeneratedMetadataTitle(sanitizedTitle)) {
              console.log(`[${downloadId}] Using pre-fetched title from renderer: "${titleFromOptions}" -> "${sanitizedTitle}"`);
              return sanitizedTitle;
            }
          } else if (titleFromOptions && isGeneratedMetadataTitle(titleFromOptions)) {
            console.log(`[${downloadId}] Ignoring generated fallback title from renderer: "${titleFromOptions}"`);
          }

          const platform = detectPlatform(url);
          const isYouTube = isYouTubePlatform(platform);
          
          console.log(`[${downloadId}] Platform detected: ${platform}, isYouTube: ${isYouTube}, isPlaylist: ${isPlaylist}`);
          
          // For non-YouTube videos, try full yt-dlp info extraction
          // This works for all platforms (Facebook, Instagram, Reddit, TikTok, etc.)
          if (!isYouTube && !isPlaylist) {
            try {
              console.log(`[${downloadId}] Attempting yt-dlp info extraction for non-YouTube video: ${url}`);
              const videoInfo = await getVideoInfoFromYtDlp();
              
              console.log(`[${downloadId}] yt-dlp extraction completed. Title:`, videoInfo?.title || 'N/A');
              
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
                  event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
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
              }
            } catch (error) {
              console.error(`[${downloadId}] Error fetching video info from yt-dlp:`, error.message);
              
              event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
                downloadId,
                message: `Failed to extract video info: ${error.message}`,
                error: `yt-dlp info extraction failed: ${error.message}`
              });
              // Continue to fallback
            }
          }
          
          // Last resort: spawn yt-dlp --get-title (slow, may timeout)
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
          return 'Unknown';
        }
      };

      // Import platform detection utilities
      const detectPlatform = (url) => {
        if (!url || typeof url !== 'string') return 'unknown'
        const urlLower = url.toLowerCase()
        
        // YouTube variants
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('youtubekids.com')) {
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
        if (urlLower.includes('snapchat.com')) {
          return 'snapchat'
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
        let sanitizedTitle = 'Unknown';
        try {
          sanitizedTitle = await title; // Single sanitized title
        } catch (e) {
          console.error(`[${downloadId}] Title promise rejected:`, e);
        }
        
        const sanitizedQuality = customSanitize(selectedQuality) || 'Unknown'; // Sanitize quality
        const sanitizedBitrate = customSanitize(selectBitrate) || 'Unknown'; // Sanitize bitrate
      
        console.log(`[${downloadId}] Setup path vars:`, { sanitizedTitle, isAudioOnly, sanitizedQuality, sanitizedBitrate });

        // Create title with quality for display and filenames
        // Use the extracted title if available, otherwise create fallback
        let titleWithQuality;
        const titlePlatform = detectPlatform(url);
        const shouldTimestampTitle = !isYouTubePlatform(titlePlatform);
        const stableTitleTimestamp = titleTimestamp || downloadStartedAt;
        if (sanitizedTitle && sanitizedTitle !== 'Unknown' && !isGeneratedMetadataTitle(sanitizedTitle)) {
          titleWithQuality = isAudioOnly 
            ? `${sanitizedTitle}_${sanitizedBitrate}` // Use underscore to avoid confusion
            : `${sanitizedTitle}_${sanitizedQuality}`;

          if (shouldTimestampTitle) {
            titleWithQuality = appendTitleTimestamp(titleWithQuality, stableTitleTimestamp);
          }
        
          console.log(`[${downloadId}] Title with quality (from sanitized):`, titleWithQuality);
        
          // Send progress update with title including quality
          event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
            downloadId,
            sanitizedTitle: titleWithQuality,
            message: `Using sanitized title: ${titleWithQuality}`
          });
        } else {
          // If we still have "Unknown", let yt-dlp handle the title substitution using output template
          // This ensures we get the real title even if our pre-fetch failed
          // We need to ensure we don't end up with "undefined" in the string
          const safeBitrate = sanitizedBitrate || 'best';
          const safeQuality = sanitizedQuality || 'best';
          
          titleWithQuality = isAudioOnly 
            ? `%(title)s_${safeBitrate}`
            : `%(title)s_${safeQuality}`;

          if (shouldTimestampTitle) {
            titleWithQuality = appendTitleTimestamp(titleWithQuality, stableTitleTimestamp);
          }
          
          console.log(`[${downloadId}] Using template title with quality:`, titleWithQuality);
          console.warn(`[${downloadId}] Warning: Could not extract proper title during pre-fetch, relying on yt-dlp template.`);
        }
        
        // FINAL SAFETY CHECK
        if (!titleWithQuality) {
           console.error(`[${downloadId}] CRITICAL: titleWithQuality is undefined! Forcing fallback.`);
           titleWithQuality = `%(title)s_${isAudioOnly ? (sanitizedBitrate || 'audio') : (sanitizedQuality || 'video')}`;
           if (shouldTimestampTitle) {
             titleWithQuality = appendTitleTimestamp(titleWithQuality, stableTitleTimestamp);
           }
        }
      
        let downloadPath;
        if (isPlaylist) {
          const playlistDir = join(baseDir, playlistTitleSanitized || '%(playlist_title)s');
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
        console.log(`[${downloadId}] Final Download path:`, downloadPath); // Debug log
        return downloadPath;
      };

      setupDownloadPath().then(async (downloadPath) => {
        emitDebugLog({
          source: 'download',
          message: 'Output path prepared',
          details: downloadPath,
          downloadId: downloadLogId
        }, event.sender);
        // Fetch thumbnail in background — do NOT await before spawning yt-dlp
        fetchThumbnail(url).then((thumbnail) => {
          if (thumbnail) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
              downloadId,
              thumbnail,
              message: 'Thumbnail fetched for non-YouTube content'
            });
          }
        }).catch(() => {});

        console.log(`[${downloadId}] ⏱ Pre-download setup complete. Spawning yt-dlp now...`);

        // Detect if this is a Dailymotion URL
        const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

        const args = [
          '--continue',
          '--ffmpeg-location', ffmpegPath, // Reverting back to binary path since ffprobe doesn't exist
          '-o', downloadPath,
          '--newline',
          '--ignore-errors',
          '--progress',
          '--extractor-retries', '8',
          '--concurrent-fragments', '4',
          '--fixup', 'never', // Without ffprobe, fixing up M3U8 takes 80 seconds byte-by-byte. This skips it.
        ];

        if (isDebugMode) {
          args.push('--verbose');
        }

        // Pass cookies for non-YouTube platforms (like Facebook/Instagram/Dailymotion)
        // Passing cookies for public YouTube videos often triggers 80-second Bot/JS challenges.
        if (!isYouTube) {
          args.push('--cookies', cookiesPath);
        }

        // Add Dailymotion-specific options for better compatibility
        if (isDailymotion) {
          args.push('--referer', 'https://www.dailymotion.com/');
          args.push('--sleep-requests', '1'); // Add small delay between requests
        }

        args.push(...formatSpecifier.split(' '));
        args.push(url);
        args.push(shouldDownloadPlaylist ? '--yes-playlist' : '--no-playlist');

  const getYtdlpPath = () => {
    if (app.isPackaged) {
      return join(process.resourcesPath, getYtdlpExecutableName());
    }
    
    return join(__dirname, '../../public', getYtdlpExecutableName());
  };

        const currentYtdlpPath = getYtdlpPath();
        const downloadLabel = `${downloadLogId}:download`;
        const launch = getYtdlpLaunch(args, currentYtdlpPath);
        logYtdlpCommand(downloadLabel, launch.executable, launch.args);
        emitDebugLog({
          source: 'yt-dlp',
          message: launch.mode === 'python'
            ? 'Starting download process (fast Python mode)'
            : 'Starting download process',
          details: [
            `Executable: ${launch.executable}`,
            `Mode: ${launch.mode}`,
            `yt-dlp path: ${currentYtdlpPath}`,
            `ffmpeg path: ${ffmpegPath}`,
            `Platform: ${process.platform} ${process.arch}`,
            `App version: ${app.getVersion()}`,
            `Cookies file: ${existsSync(cookiesPath) ? cookiesPath : 'missing'}`,
            `YouTube URL: ${isYouTube ? 'yes' : 'no'}`,
            `Debug mode: ${isDebugMode ? 'on' : 'off'}`,
            `Args: ${getLogSafeYtdlpArgs(launch.args).join(' ')}`
          ].join('\n'),
          downloadId: downloadLogId
        }, event.sender);

        const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
        const startedAt = Date.now();
        console.log(`[${downloadId}] ⏱ yt-dlp spawning after ${startedAt - downloadStartedAt}ms from button click`);
        downloadProcess = spawn(launch.executable, launch.args, spawnOptions);
        activeDownloads[downloadId] = true;

        let resolvedDownloadPath = downloadPath;
        let downloadStdoutTail = '';
        let downloadStderrTail = '';
        const stallTimeout = createYtdlpTimeout({
          proc: downloadProcess,
          label: downloadLabel,
          timeoutMs: YTDLP_DOWNLOAD_STALL_TIMEOUT_MS,
          onTimeout: (message) => {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
              downloadId,
              error: 'Download stalled with no output from yt-dlp.',
              details: message
            });
          }
        });

        downloadProcess.stdout.on('data', (data) => {
          stallTimeout.reset();
          const text = data.toString();
          downloadStdoutTail = appendLogTail(downloadStdoutTail, text);
          const line = text.trim();
          console.log(`[${downloadLabel}] yt-dlp stdout:`, line);
          emitDebugLog({
            source: 'yt-dlp',
            message: line,
            downloadId: downloadLogId
          }, event.sender);
          
          // Capture actual filename from yt-dlp output if we used a template
          // Matches: "[download] Destination: /path/to/file.mp4" or "[download] /path/to/file.mp4 has already been downloaded"
          const destinationMatch = line.match(/Destination:\s+(.*)$/) || line.match(/\[download\]\s+(.*?)\s+has already been downloaded/);
          if (destinationMatch && destinationMatch[1]) {
            resolvedDownloadPath = destinationMatch[1].trim();
            console.log(`[${downloadId}] Captured actual file path: ${resolvedDownloadPath}`);
            // Also update the title in the frontend if we can extract it from the filename
            try {
              const basename = require('path').basename(resolvedDownloadPath);
              // Send an update with the likely title (stripping extension)
              const likelyTitle = basename.substring(0, basename.lastIndexOf('.'));
              if (likelyTitle) {
                 event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
                   downloadId, 
                   title: likelyTitle,
                   message: `Title resolved: ${likelyTitle}`
                 });
              }
            } catch (e) { /* ignore path parsing errors */ }
          }
          
          event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { downloadId, message: line });
        });

        downloadProcess.stderr.on('data', (data) => {
          stallTimeout.reset();
          const text = data.toString();
          downloadStderrTail = appendLogTail(downloadStderrTail, text);
          const errorMessage = text.trim();
          const stderrIsError = /ERROR:|failed|unable to|not found|forbidden|unsupported/i.test(errorMessage);
          console.error(`[${downloadLabel}] yt-dlp stderr:`, errorMessage);
          emitDebugLog({
            level: stderrIsError ? 'error' : 'warn',
            source: 'yt-dlp stderr',
            message: errorMessage,
            downloadId: downloadLogId
          }, event.sender);
          
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

          const isInstagramAuthError = errorMessage.includes('[Instagram]') && (
            errorMessage.includes('empty media response') ||
            errorMessage.includes('Check if this post is accessible') ||
            errorMessage.includes('cookies') ||
            errorMessage.includes('login')
          );
          
          // Check for YouTube-specific errors
          const isYouTubeUnavailable = errorMessage.includes('[youtube]') && (
            errorMessage.includes('Video unavailable') ||
            errorMessage.includes('This video is not available') ||
            errorMessage.includes('private video') ||
            errorMessage.includes('members-only') ||
            errorMessage.includes('age-restricted') ||
            errorMessage.includes('sign in to view')
          );
          
          // Check for other common errors
          const isGeoBlocked = errorMessage.includes('geo') || errorMessage.includes('region') || errorMessage.includes('country') || errorMessage.includes('not available in your country');
          const isPrivateVideo = errorMessage.includes('private') || errorMessage.includes('members-only');
          const isNotFoundError = errorMessage.includes('not found') || errorMessage.includes('404');
          const isNetworkError = errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout');
          
          if (isTwitchError) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
              downloadId,
              error: 'This Twitch video requires authentication. Please add Twitch cookies to your browser and try again.',
              isAuthError: true,
              details: errorMessage
            });
          } else if (isDailymotionError) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
              downloadId,
              error: 'Dailymotion download failed. This may be due to regional restrictions or access limitations. Try visiting the video in your browser first, or ensure yt-dlp is up to date using: yt-dlp -U',
              isAuthError: true,
              details: errorMessage
            });
          } else if (isInstagramAuthError) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
              downloadId,
              error: 'Instagram requires a logged-in browser session for this post. Open Instagram in Explore, sign in, then retry the download.',
              isAuthError: true,
              loginUrl: 'https://www.instagram.com/accounts/login/',
              details: errorMessage
            });
          } else if (isYouTubeUnavailable) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId,
              error: 'This YouTube video is unavailable. It may be private, deleted, age-restricted, or geo-blocked.',
              isAuthError: true,
              details: errorMessage
            });
          } else if (isGeoBlocked) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId,
              error: 'This video is geo-blocked and not available in your region.',
              details: errorMessage
            });
          } else if (isPrivateVideo) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId,
              error: 'This video is private or requires membership to access.',
              details: errorMessage
            });
          } else if (isNotFoundError) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId,
              error: 'Video not found. The URL may be incorrect or the video may have been removed.',
              details: errorMessage
            });
          } else if (isNetworkError) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId,
              error: 'Network error occurred. Please check your internet connection and try again.',
              details: errorMessage
            });
          } else if (stderrIsError) {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId, 
              error: errorMessage,
              details: errorMessage
            });
          } else {
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, {
              downloadId,
              message: errorMessage,
              details: errorMessage
            });
          }
        });

        downloadProcess.on('error', async (err) => {
          stallTimeout.clear();
          delete activeDownloads[downloadId];
          downloadProcess = null;
          
          // Clean up partial file on process error
          if (resolvedDownloadPath) {
            await cleanupPartialFile(resolvedDownloadPath);
          }
          emitDebugLog({
            level: 'error',
            source: 'download',
            message: 'Could not start yt-dlp',
            details: err.message,
            downloadId: downloadLogId
          }, event.sender);
          
          reject(err);
        });

        downloadProcess.on('close', async (code) => {
          stallTimeout.clear();
          delete activeDownloads[downloadId];
          downloadProcess = null;
          console.log(`[${downloadLabel}] yt-dlp closed with code ${code} after ${Date.now() - startedAt}ms`);

          if (code === 0) {
            emitDebugLog({
              source: 'download',
              message: 'Download completed successfully',
              details: resolvedDownloadPath,
              downloadId: downloadLogId
            }, event.sender);
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { downloadId, status: 'Download complete!', file: resolvedDownloadPath });
            resolve();
          } else {
            console.error(`[${downloadLogId}] Download process exited with code ${code}`);
            
            // Clean up partial file on download failure
            if (resolvedDownloadPath) {
              await cleanupPartialFile(resolvedDownloadPath);
            }
            
            // Provide more specific error messages based on common exit codes
            let errorMessage = `Download failed with code ${code}`;
            let errorDetails = '';

            if (stallTimeout.timedOut) {
              errorMessage = 'Download stalled with no output from yt-dlp';
              errorDetails = `yt-dlp produced no stdout/stderr for ${Math.round(YTDLP_DOWNLOAD_STALL_TIMEOUT_MS / 1000)} seconds.`;
            } else {
            
              switch (code) {
                case 1:
                  errorMessage = 'Download failed - General error';
                  errorDetails = 'This could be due to network issues, invalid URL, or video not available.';
                  break;
                case 2:
                  errorMessage = 'Download failed - No video formats found';
                  errorDetails = 'The video may not be available in the requested format or quality.';
                  break;
                case 3:
                  errorMessage = 'Download failed - Network error';
                  errorDetails = 'Check your internet connection and try again.';
                  break;
                case 4:
                  errorMessage = 'Download failed - Authentication required';
                  errorDetails = 'This video may require login or cookies to access.';
                  break;
                default:
                  errorDetails = `Exit code ${code} indicates an error occurred during download.`;
              }
            }

            const failureDiagnostics = [
              errorDetails,
              `Exit code: ${code}`,
              `Elapsed: ${Date.now() - startedAt}ms`,
              `Platform: ${process.platform} ${process.arch}`,
              `App version: ${app.getVersion()}`,
              `Debug mode: ${isDebugMode ? 'on' : 'off'}`,
              `Executable: ${launch.executable}`,
              `yt-dlp path: ${currentYtdlpPath}`,
              `ffmpeg path: ${ffmpegPath}`,
              `Cookies file: ${existsSync(cookiesPath) ? cookiesPath : 'missing'}`,
              `Cookies passed to yt-dlp: ${launch.args.includes('--cookies') ? 'yes' : 'no'}`,
              `Args: ${getLogSafeYtdlpArgs(launch.args).join(' ')}`,
              downloadStderrTail.trim()
                ? `yt-dlp stderr tail:\n${downloadStderrTail.trim()}`
                : 'yt-dlp stderr tail: (empty)',
              downloadStdoutTail.trim()
                ? `yt-dlp stdout tail:\n${downloadStdoutTail.trim()}`
                : 'yt-dlp stdout tail: (empty)'
            ].filter(Boolean).join('\n\n');
            
            event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { 
              downloadId, 
              error: errorMessage,
              details: failureDiagnostics,
              exitCode: code
            });
            emitDebugLog({
              level: 'error',
              source: 'download',
              message: errorMessage,
              details: failureDiagnostics,
              downloadId: downloadLogId
            }, event.sender);
            reject(new Error(`${errorMessage}: ${failureDiagnostics}`));
          }
        });
      }).catch((err) => {
        event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { downloadId, error: err.message });
        reject(err);
      });
    } catch (err) {
      event.sender.send(IPC_EVENTS.DOWNLOAD_PROGRESS, { downloadId: options?.id, error: err.message });
      reject(err);
    }
  });
};

ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0]; // Return null if canceled, else folder path
})

ipcMain.handle(IPC_CHANNELS.DOWNLOAD_VIDEO, async (event, options) => {
  console.log('Starting download...');
  try {
    await startDownload(event, options);
    console.log('Download completed successfully.');
  } catch (err) {
    console.error('Download failed:', err);
    emitDebugLog({
      level: 'error',
      source: 'download',
      message: 'Download request failed',
      details: err?.stack || err?.message || String(err),
      downloadId: options?.id || null
    }, event.sender);
    throw err;
  }
});

ipcMain.handle(IPC_CHANNELS.SHOW_MESSAGE_BOX, async (_, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle(IPC_CHANNELS.RESUME_DOWNLOAD, async (event, options) => {
  if (!downloadProcess) {
    console.log('Resuming download...');
    await startDownload(event, options);
    return true;
  }
  return false;
});

ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD, async () => {
  console.log('Attempting to pause download...');
  if (downloadProcess) {
    console.log('Killing download process with PID:', downloadProcess.pid);
    
    // Get current download path for cleanup
    let currentDownloadPath = null;
    if (downloadProcess && downloadProcess.resolvedDownloadPath) {
      currentDownloadPath = downloadProcess.resolvedDownloadPath;
    }
    
    treeKill(downloadProcess.pid, 'SIGKILL', async (err) => {
      if (err) {
        console.error('Failed to kill process tree:', err);
      } else {
        console.log('Process tree killed successfully.');
        
        // Clean up partial file when download is paused
        if (currentDownloadPath) {
          await cleanupPartialFile(currentDownloadPath);
        }
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

ipcMain.handle(IPC_CHANNELS.LOAD_DOWNLOAD_STATE, () => {
  const filePath = join(app.getPath('userData'), 'downloadState.json');
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null;
});

ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (event, path) => {
  try {
    await shell.openPath(path); // Use Electron's shell.openPath for local files
    return { success: true };
  } catch (error) {
    console.error(`Failed to open path ${path}:`, error);
    throw error;
  }
});

const DOWNLOAD_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mkv',
  '.avi',
  '.mov',
  '.mp3',
  '.flac',
  '.wav',
  '.aac',
  '.m4a',
  '.ogg',
  '.opus'
]);

const sanitizeDownloadFolderName = (value) =>
  String(value || 'Unknown')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9._-]/g, ' ')
    .replace(/^[.-]+|[.-]+$/g, ' ')
    .substring(0, 200);

const normalizeDownloadName = (value) =>
  basename(String(value || ''))
    .normalize('NFD')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_\-\s]+\d+[pP]$/i, '')
    .replace(/[_\-\s]+\d+[kK]$/i, '')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getAccessiblePathType = async (targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') return null;
  try {
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) return 'file';
    if (stats.isDirectory()) return 'directory';
  } catch {
    return null;
  }
  return null;
};

const listDownloadMediaFiles = async (directory, maxDepth = 0, depth = 0) => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const entryPath = join(directory, entry.name);
      if (entry.isFile()) {
        const extension = entry.name.includes('.')
          ? `.${entry.name.split('.').pop().toLowerCase()}`
          : '';
        if (DOWNLOAD_MEDIA_EXTENSIONS.has(extension) && !entry.name.toLowerCase().endsWith('.part')) {
          files.push(entryPath);
        }
      } else if (entry.isDirectory() && depth < maxDepth) {
        files.push(...(await listDownloadMediaFiles(entryPath, maxDepth, depth + 1)));
      }
    }

    return files;
  } catch {
    return [];
  }
};

const scoreDownloadFileMatch = (filePath, item) => {
  const candidate = normalizeDownloadName(filePath);
  const wantedNames = [item?.filename, item?.title]
    .map(normalizeDownloadName)
    .filter(Boolean);

  if (!candidate || wantedNames.length === 0) return 0;

  let bestScore = 0;
  for (const wanted of wantedNames) {
    if (candidate === wanted) {
      bestScore = Math.max(bestScore, 1000);
      continue;
    }

    if (wanted.length >= 4 && (candidate.includes(wanted) || wanted.includes(candidate))) {
      bestScore = Math.max(bestScore, 600 - Math.abs(candidate.length - wanted.length));
    }
  }

  const extension = `.${filePath.split('.').pop().toLowerCase()}`;
  const isAudio = ['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.opus'].includes(extension);
  if (bestScore > 0 && (item?.downloadType === 'audio') === isAudio) bestScore += 10;
  return bestScore;
};

const revealDownloadedItem = async (item = {}) => {
  const recordedPaths = [item.filePath, item.outputPath, item.localPath, item.path]
    .filter((value) => typeof value === 'string' && value.trim());

  for (const recordedPath of recordedPaths) {
    const pathType = await getAccessiblePathType(recordedPath);
    if (pathType) {
      shell.showItemInFolder(recordedPath);
      return { success: true, path: recordedPath, revealed: pathType, exact: true };
    }
  }

  const roots = [];
  const addRoot = (root) => {
    if (root && !roots.includes(root)) roots.push(root);
  };
  const savedLocation = typeof item.saveTo === 'string' ? item.saveTo.trim() : '';
  const savedLocationKey = savedLocation.toLowerCase();

  if (savedLocationKey === 'desktop') {
    addRoot(app.getPath('desktop'));
  } else if (savedLocationKey === 'downloads' || savedLocationKey === 'download') {
    addRoot(app.getPath('downloads'));
  } else if (isAbsolute(savedLocation)) {
    addRoot(savedLocation);
  }

  // Always check both standard destinations for older download records.
  addRoot(app.getPath('downloads'));
  addRoot(app.getPath('desktop'));

  const formatDirectory = item.downloadType === 'audio' ? 'Audio' : 'Video';
  const playlistDirectoryName = item.playlistTitle
    ? sanitizeDownloadFolderName(item.playlistTitle)
    : null;
  const searchDirectories = [];
  const playlistDirectories = [];
  const fallbackDirectories = [];
  const addSearchDirectory = (path, maxDepth = 0) => {
    if (path && !searchDirectories.some((entry) => entry.path === path)) {
      searchDirectories.push({ path, maxDepth });
    }
  };

  for (const root of roots) {
    const pnutRoot = join(root, 'PNUT Downloader');
    addSearchDirectory(root, 0); // Files moved directly into a chosen folder.

    if (playlistDirectoryName) {
      const playlistDirectory = join(pnutRoot, playlistDirectoryName);
      const legacyPlaylistDirectory = join(pnutRoot, formatDirectory, playlistDirectoryName);
      playlistDirectories.push(playlistDirectory, legacyPlaylistDirectory);
      addSearchDirectory(playlistDirectory, 1);
      addSearchDirectory(legacyPlaylistDirectory, 1);
    }

    const mediaDirectory = join(pnutRoot, formatDirectory);
    fallbackDirectories.push(
      ...(playlistDirectoryName ? [join(pnutRoot, playlistDirectoryName)] : []),
      mediaDirectory,
      pnutRoot
    );
    addSearchDirectory(mediaDirectory, playlistDirectoryName ? 1 : 0);
    addSearchDirectory(pnutRoot, 2);
  }

  let bestMatch = null;
  for (const directory of searchDirectories) {
    const files = await listDownloadMediaFiles(directory.path, directory.maxDepth);
    for (const filePath of files) {
      const score = scoreDownloadFileMatch(filePath, item);
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { path: filePath, score };
      }
    }
    if (bestMatch?.score >= 1000) break;
  }

  if (bestMatch) {
    shell.showItemInFolder(bestMatch.path);
    return { success: true, path: bestMatch.path, revealed: 'file', exact: true };
  }

  // For a playlist record, reveal the exact playlist folder when no individual file can be matched.
  for (const playlistDirectory of playlistDirectories) {
    if ((await getAccessiblePathType(playlistDirectory)) === 'directory') {
      shell.showItemInFolder(playlistDirectory);
      return { success: true, path: playlistDirectory, revealed: 'playlist-folder', exact: true };
    }
  }

  for (const fallbackDirectory of fallbackDirectories) {
    if ((await getAccessiblePathType(fallbackDirectory)) === 'directory') {
      const openError = await shell.openPath(fallbackDirectory);
      if (!openError) {
        return { success: true, path: fallbackDirectory, revealed: 'folder', exact: false };
      }
    }
  }

  return {
    success: false,
    error: 'Could not locate this download on Desktop or in Downloads. It may have been moved or deleted.'
  };
};

ipcMain.handle(IPC_CHANNELS.REVEAL_DOWNLOAD, async (_event, item) => {
  try {
    return await revealDownloadedItem(item);
  } catch (error) {
    console.error('Failed to reveal downloaded item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(IPC_CHANNELS.DELETE_FILE, async (event, filePath) => {
  try {
    console.log(`Delete file request received for: ${filePath}`);
    const result = await safeDeleteFile(filePath);
    return result;
  } catch (error) {
    console.error(`Error in deleteFile handler:`, error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(IPC_CHANNELS.HANDLE_FILE_DELETION, async (event, filePath) => {
  try {
    console.log(`Handle file deletion request for: ${filePath}`);
    const result = await handleFileDeletion(filePath);
    return { success: result, message: result ? 'File deleted successfully' : 'File not found' };
  } catch (error) {
    console.error(`Error in handleFileDeletion handler:`, error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(IPC_CHANNELS.DELETE_MULTIPLE_FILES, async (event, filePaths) => {
  try {
    console.log(`Batch delete request for ${filePaths.length} files`);
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await safeDeleteFile(filePath);
        results.push({ filePath, ...result });
      } catch (error) {
        results.push({ 
          filePath, 
          success: false, 
          message: error.message 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`Batch deletion completed: ${successCount} success, ${failureCount} failed`);
    
    return {
      success: failureCount === 0,
      message: `Deleted ${successCount} of ${results.length} files`,
      results: results
    };
  } catch (error) {
    console.error(`Error in batch delete handler:`, error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle(IPC_CHANNELS.CHECK_FILE_EXISTS, async (event, filePath) => {
  try {
    const exists = existsSync(filePath);
    if (exists) {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    }
    return { exists: false };
  } catch (error) {
    console.error(`Error checking file existence ${filePath}:`, error.message);
    return { exists: false, error: error.message };
  }
});

ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (event, url) => {
  try {
    await shell.openExternal(url); // Use Electron's shell.openExternal for URLs
    return { success: true };
  } catch (error) {
    console.error(`Failed to open external URL ${url}:`, error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.READ_DIRECTORY, async (event, dir) => {
  const fs = require('fs').promises;
  try {
    const files = await fs.readdir(dir);
    return files;
  } catch (error) {
    console.error(`Failed to read directory ${dir}:`, error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.CREATE_DIRECTORY, async (event, dirPath) => {
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

ipcMain.handle(IPC_CHANNELS.ACCESS_FILE, async (event, filePath) => {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return { success: true };
  } catch (error) {
    console.error(`Cannot access file ${filePath}:`, error);
    throw error;
  }
});
ipcMain.handle(IPC_CHANNELS.GET_PATH, async (event, name) => {
  try {
    return app.getPath(name);
  } catch (error) {
    console.error(`Failed to get path ${name}:`, error);
    throw error;
  }
});
ipcMain.handle(IPC_CHANNELS.SHOW_CONFIRM_DIALOG, async (event, options) => {
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

autoUpdater.on(IPC_EVENTS.UPDATE_AVAILABLE, (info) => {
  console.log('Update available:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_EVENTS.UPDATE_AVAILABLE, info);
  }
});

autoUpdater.on(IPC_EVENTS.UPDATE_DOWNLOADED, (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_EVENTS.UPDATE_DOWNLOADED, info);
  }
});

autoUpdater.on(IPC_EVENTS.UPDATE_DOWNLOAD_PROGRESS, (progress) => {
  console.log("progress",progress);
  
  console.log(`Download speed: ${progress.bytesPerSecond}`);
  console.log(`Downloaded ${progress.percent.toFixed(2)}%`);
  console.log(`${progress.transferred} / ${progress.total}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_EVENTS.UPDATE_DOWNLOAD_PROGRESS, progress);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_EVENTS.UPDATE_ERROR, err);
  }
});

ipcMain.on(IPC_EVENTS.CHECK_FOR_UPDATES, () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on(IPC_CHANNELS.DOWNLOAD_UPDATE, () => {
  autoUpdater.downloadUpdate();
});

// IPC handler to check for yt-dlp updates
ipcMain.handle(IPC_CHANNELS.CHECK_YTDLP_UPDATE, async () => {
  try {
    const updateCheck = await checkYtdlpUpdate();
    return {
      success: true,
      needsUpdate: updateCheck.needsUpdate,
      reason: updateCheck.reason,
      currentVersion: updateCheck.currentVersion || null,
      latestVersion: updateCheck.latestVersion || null,
      lastCheckedAt: updateCheck.lastCheckedAt || null,
      nextCheckAt: updateCheck.nextCheckAt || null
    };
  } catch (error) {
    console.error('Error checking yt-dlp update:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_DEPENDENCY_STATUS, async () => {
  return getDependencyStatusSnapshot();
});

// IPC handler to manually update yt-dlp
ipcMain.handle(IPC_CHANNELS.UPDATE_YTDLP, async () => {
  try {
    console.log('Manual yt-dlp update requested');
    const updateResult = await updateYtdlp(true); // Force update
    return {
      success: updateResult.success,
      message: updateResult.message,
      version: updateResult.version
    };
  } catch (error) {
    console.error('Error updating yt-dlp:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle(IPC_CHANNELS.UPDATE_FFMPEG, async () => {
  try {
    console.log('Manual FFmpeg update requested');
    const updateResult = await downloadAndExtractFFmpeg({ forceUpdate: true });
    return {
      success: updateResult?.success !== false,
      message: updateResult?.message || 'FFmpeg updated successfully',
      version: updateResult?.version || null
    };
  } catch (error) {
    console.error('Error updating FFmpeg:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.on(IPC_CHANNELS.INSTALL_UPDATE, () => {
  autoUpdater.quitAndInstall();
});

let isInitialized = false;

async function checkDependencies() {
  try {
    if (hasActiveDownloads()) {
      console.log('Skipping dependency check because a download is active.');
      return {
        ready: true,
        ffmpeg: true,
        ytdlp: true,
        isBusy: false,
        dependencyStatus: getDependencyStatusSnapshot()
      };
    }

    console.log('Checking dependencies...');
    console.log('FFmpeg path:', ffmpegPath);
    console.log('yt-dlp path:', ytdlpPath);
    
    const ffmpegExists = await fs.access(ffmpegPath).then(() => true).catch(() => false);
    const ytdlpExists = await fs.access(ytdlpPath).then(() => true).catch(() => false);
    
    console.log('FFmpeg exists:', ffmpegExists);
    console.log('yt-dlp exists:', ytdlpExists);
    
    if (ffmpegExists && ytdlpExists) {
      // Ensure executable permissions on Unix-like systems
      if (process.platform !== 'win32') {
        try {
          await fs.chmod(ytdlpPath, 0o755);
          await fs.chmod(ffmpegPath, 0o755);
          console.log('Ensured executable permissions for binaries');
        } catch (permErr) {
          console.warn(`Failed to set permissions: ${permErr.message}`);
        }
      }
      
      const ffmpegStats = await fs.stat(ffmpegPath);
      const ytdlpStats = await fs.stat(ytdlpPath);
      
      console.log('FFmpeg size:', ffmpegStats.size);
      console.log('yt-dlp size:', ytdlpStats.size);
      
      const ready = ffmpegStats.size > 1000000 && ytdlpStats.size > 1000000; // Minimum 1MB each
      console.log('Dependencies ready:', ready);

      return {
        ready: ready,
        ffmpeg: ffmpegStats.size > 1000000,
        ytdlp: ytdlpStats.size > 1000000,
        ffmpegSize: ffmpegStats.size,
        ytdlpSize: ytdlpStats.size,
        isBusy: Boolean(dependencyStatus?.isBusy),
        dependencyStatus: getDependencyStatusSnapshot()
      };
    }
    
    console.log('Dependencies not ready - missing files');
    return {
      ready: false,
      ffmpeg: ffmpegExists,
      ytdlp: ytdlpExists,
      isBusy: Boolean(dependencyStatus?.isBusy),
      dependencyStatus: getDependencyStatusSnapshot()
    };
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return {
      ready: false,
      ffmpeg: false,
      ytdlp: false,
      isBusy: Boolean(dependencyStatus?.isBusy),
      dependencyStatus: getDependencyStatusSnapshot(),
      error: error.message
    };
  }
}

ipcMain.handle(IPC_CHANNELS.CHECK_DEPENDENCIES, async () => {
  return await checkDependencies();
});

// ipcMain.handle('getPath', (event, pathName) => {
//   return app.getPath(pathName);
// });

ipcMain.handle(IPC_CHANNELS.FILE_EXISTS, (event, filePath) => {
  return existsSync(filePath);
});

ipcMain.handle(IPC_CHANNELS.OPEN_FILE, (event, filePath) => {
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
      '--js-runtimes', 'node',
    ];

    if (!isYouTubeUrl(url)) {
      args.push(
        '--cookies', cookiesPath,
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    args.push(url);
    
  const getYtdlpPath = () => {
    if (app.isPackaged) {
      return join(process.resourcesPath, getYtdlpExecutableName());
    }
    
    return join(__dirname, '../../public', getYtdlpExecutableName());
  };

    const currentYtdlpPath = getYtdlpPath();
    const spawnOptions = process.platform === 'win32' ? { windowsHide: true } : {};
    const launch = getYtdlpLaunch(args, currentYtdlpPath);
    const thumbnailProcess = spawn(launch.executable, launch.args, spawnOptions);
    
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
ipcMain.handle(IPC_CHANNELS.PROXY_IMAGE, async (event, imageUrl) => {
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
        let cookieString = await getCookieHeaderFromBrowserSessions('.instagram.com');
        
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
        let cookieString = await getCookieHeaderFromBrowserSessions('.twitter.com');
        
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
        let cookieString = await getCookieHeaderFromBrowserSessions('.bilibili.com');
        
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

ipcMain.handle(IPC_CHANNELS.GET_YOUTUBE_INFO, async (event, url) => {
  try {
    return await getVideoInfo(url);
  } catch (error) {
    console.error('Error getting video info:', error);
    return null;
  }
});

// Additional IPC handlers for context menu functions
ipcMain.handle('moveFile', async (event, sourcePath, destPath) => {
  try {
    const fs = require('fs').promises;
    await fs.rename(sourcePath, destPath);
    return { success: true };
  } catch (error) {
    console.error('Error moving file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('showFileInFolder', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error showing file in folder:', error);
    return { success: false, error: error.message };
  }
});
