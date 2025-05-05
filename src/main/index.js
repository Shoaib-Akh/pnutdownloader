import { app, shell, BrowserWindow, ipcMain, session, dialog ,globalShortcut} from 'electron'
import { join } from 'path'
const tar = require('tar'); // You'll need to install this: npm install tar
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import { autoUpdater } from 'electron-updater';
import { machineId, machineIdSync } from 'node-machine-id'
const https = require('https');
const ffmpegPath = app.isPackaged
  ? join(process.resourcesPath, 'ffmpeg.exe')
  : join(__dirname, '../../public/ffmpeg.exe')
const cookiesPath = app.isPackaged
  ? join(process.resourcesPath, 'cookies.txt')
  : join(__dirname, '../../public/cookies.txt')
let mainWindow
const { dirname } = require('path');
const ytdlpPath = app.isPackaged
  ? join(process.resourcesPath, 'yt-dlp.exe')
  : join(__dirname, '../../public/yt-dlp.exe')
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

ipcMain.handle('getMachineId', async () => {
  try {
    return await machineId();
  } catch (error) {
    console.error('Failed to get machine ID:', error);
    return 'anonymous-machine-id';
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
    throw new Error(`yt-dlp.exe not found at ${ytdlpPath}`);
  }

  const stats = await fs.stat(ytdlpPath);
  if (stats.size === 0) {
    throw new Error(`yt-dlp.exe is empty at ${ytdlpPath}`);
  }

  return new Promise((resolve, reject) => {
    console.log(`Attempting to spawn yt-dlp at: ${ytdlpPath}`);
    const proc = spawn(ytdlpPath, ['--version'], { windowsHide: true });
    
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
  const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  try {
    await downloadFile(ytdlpUrl, ytdlpPath);
    console.log('yt-dlp downloaded successfully');
    const stats = await fs.stat(ytdlpPath);
    console.log(`File size after download: ${stats.size} bytes`);
    await fs.chmod(ytdlpPath, 0o755).catch(err => console.warn(`chmod failed: ${err.message}`));
  } catch (error) {
    console.error(`Failed to update yt-dlp: ${error.message}`);
    throw error;
  }
}

async function downloadAndExtractFFmpeg() {
  const ffmpegUrl = 'https://cdn.pnutdownloader.com/ffmpeg.exe.tar.gz';
  const tempTarPath = join(app.getPath('temp'), 'ffmpeg.exe.tar.gz');
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

    console.log('Downloading FFmpeg...');
    await downloadFile(ffmpegUrl, tempTarPath);

    console.log('Extracting FFmpeg...');
    await tar.x({
      file: tempTarPath,
      cwd: extractPath,
      filter: (path) => path.endsWith('ffmpeg.exe')
    });

    await fs.unlink(tempTarPath);
    await fs.chmod(ffmpegPath, 0o755).catch(err => 
      console.warn(`Failed to set FFmpeg permissions: ${err.message}`)
    );

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
}

app.whenReady().then(() => {
  downloadAndExtractFFmpeg();
  if (!existsSync(ytdlpPath)) {
    console.log('yt-dlp not found, downloading...');
    updateYtdlp();
  } else {
    checkYtdlpVersion().then(version => {
      console.log('yt-dlp version:', version);
    }).catch(err => console.error('Failed to check yt-dlp version:', err));
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
    const cookies = await session.defaultSession.cookies.get({ domain: '.youtube.com' });
    if (!cookies.length) {
      console.error('No YouTube cookies found.');
      return;
    }

    const lines = [
      '# Netscape HTTP Cookie File',
      '# This file is generated by Electron for use by yt-dlp.',
      '# This file was last updated on ' + new Date().toString(),
      ''
    ];

    cookies.forEach((cookie) => {
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
    console.log('Cookies updated successfully at:', cookiesPath);
  } catch (error) {
    console.error('Error updating cookies:', error);
  }
}

ipcMain.handle('getYoutubeCookies', async () => {
  await updateCookiesFile();
  return cookiesPath;
});

ipcMain.handle('fetch-video-info', async (event, url) => {
  console.log("url",url);
  
  return new Promise((resolve, reject) => {
    const args = ['-J', url];
    const proc = spawn(ytdlpPath, args);

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
        reject(new Error(`yt-dlp exited with code ${code}. Error:\n${stderr}`));
        return;
      }

      try {
        const json = JSON.parse(stdout);
        const title = json.title || '';
        let thumbnail = '';
        if (Array.isArray(json.thumbnails) && json.thumbnails.length > 0) {
          thumbnail = json.thumbnails[json.thumbnails.length - 1].url;
        }
        const timeDuration = json.duration || 0;
        const duration = formatDuration(timeDuration);
        const filename = title && json.ext ? `${title}.${json.ext}` : title;
        resolve({ title, thumbnail, filename, duration });
      } catch (err) {
        reject(new Error(`Failed to parse JSON from yt-dlp: ${err.message}`));
      }
    });
  });
});

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

let downloadProcess = null;
const activeDownloads = {};

const startDownload = async (event, options) => {
  return new Promise((resolve, reject) => {
    try {
      if (downloadProcess) {
        event.sender.send('download-progress', { status: 'A download is already in progress!' });
        return reject(new Error('A download is already in progress.'));
      }

      const { id: downloadId, url, isAudioOnly, selectedFormat, selectedQuality, saveTo, selectBitrate } = options;
console.log("options",options);

      if (!url || typeof url !== 'string') {
        return reject(new Error('Invalid URL.'));
      }

      if (activeDownloads[downloadId]) {
        return reject(new Error('Download already in progress.'));
      }
      let baseDir;
      if (saveTo === 'desktop') {
        baseDir = join(app.getPath('desktop'), 'PNUT Downloader');
      } else if (saveTo === 'downloads') {
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
          const titleProcess = spawn(ytdlpPath, titleArgs, { windowsHide: true });
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

      const fetchAndSanitizeTitle = async () => {
        try {
          const rawTitle = await getTitle();
          const sanitizedTitle = sanitize(rawTitle);
          return sanitizedTitle || 'Unknown';
        } catch (error) {
          console.error('Error fetching title:', error.message);
          return 'Unknown';
        }
      };

      const setupDownloadPath = async () => {
        const sanitizedTitle = await fetchAndSanitizeTitle(); // Single sanitized title
        const sanitizedQuality = customSanitize(selectedQuality) || 'Unknown'; // Sanitize quality
        const sanitizedBitrate = customSanitize(selectBitrate) || 'Unknown'; // Sanitize bitrate
      
        // Create title with quality for display and filenames
        const titleWithQuality = isAudioOnly 
          ? `${sanitizedTitle}_${sanitizedBitrate}` // Use underscore to avoid confusion
          : `${sanitizedTitle}_${sanitizedQuality}`;
      
        console.log('Title with quality:', titleWithQuality); // Debug log
      
        // Send progress update with title including quality
        event.sender.send('download-progress', { 
          downloadId,
          sanitizedTitle: titleWithQuality,
          message: `Using sanitized title: ${titleWithQuality}`
        });
      
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

      setupDownloadPath().then((downloadPath) => {
        const args = [
          '--continue',
          '--ffmpeg-location', ffmpegPath,
          '-o', downloadPath,
          '--cookies', cookiesPath,
          '--newline',
          '--ignore-errors',
          '--progress',
          ...formatSpecifier.split(' '),
          url,
          isPlaylist ? '--yes-playlist' : '--no-playlist',
        ];

        console.log('Downloading with args:', args);

        downloadProcess = spawn(ytdlpPath, args, { windowsHide: true });
        activeDownloads[downloadId] = true;

        downloadProcess.stdout.on('data', (data) => {
          const line = data.toString().trim();
          event.sender.send('download-progress', { message: line });
        });

        downloadProcess.stderr.on('data', (data) => {
          const errorMessage = data.toString().trim();
          event.sender.send('download-progress', { error: errorMessage });
        });

        downloadProcess.on('close', (code) => {
          delete activeDownloads[downloadId];
          downloadProcess = null;

          if (code === 0) {
            event.sender.send('download-progress', { status: 'Download complete!', file: downloadPath });
            resolve();
          } else {
            event.sender.send('download-progress', { error: `Download failed with code ${code}` });
            reject(new Error(`Download failed with code ${code}`));
          }
        });

        downloadProcess.on('error', (err) => {
          delete activeDownloads[downloadId];
          downloadProcess = null;
          reject(err);
        });
      }).catch((err) => {
        event.sender.send('download-progress', { error: err.message });
        reject(err);
      });
    } catch (err) {
      event.sender.send('download-progress', { error: err.message });
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

ipcMain.handle('get-path', async (_event, name) => {
  return app.getPath(name);
});

ipcMain.handle('read-directory', async (_event, dirPath) => {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    console.error('Failed to read directory:', error);
    return [];
  }
});

ipcMain.handle('file-exists', async (_event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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

ipcMain.handle('getPath', (event, pathName) => {
  return app.getPath(pathName);
});

ipcMain.handle('fileExists', (event, filePath) => {
  return existsSync(filePath);
});

ipcMain.handle('openFile', (event, filePath) => {
  shell.openPath(filePath);
});