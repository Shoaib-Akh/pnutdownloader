import { app, shell, BrowserWindow, ipcMain, session, dialog } from 'electron'
import { join } from 'path'
const tar = require('tar'); // You'll need to install this: npm install tar
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { existsSync, mkdirSync, writeFileSync ,createWriteStream} from 'fs'
// import https  from'https';
import { spawn } from 'child_process'
import fs from 'fs/promises'
// import ffmpeg from '@ffmpeg-installer/ffmpeg';
// import ffmpegFluent from 'fluent-ffmpeg';
import { autoUpdater } from 'electron-updater';
import { machineId, machineIdSync } from 'node-machine-id'
const https = require('https');
const ffmpegPath = app.isPackaged
  ? join(process.resourcesPath, 'ffmpeg.exe')
  : join(__dirname, '../../public/ffmpeg.exe')
// const ffprobePath = app.isPackaged
//   ? join(process.resourcesPath, 'ffprobe.exe')
//   : join(__dirname, '../../public/ffprobe.exe')
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

// Or sync version
;
// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
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

// Check yt-dlp version with better error handling
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

// Download latest yt-dlp
async function updateYtdlp() {
  const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  try {
    await downloadFile(ytdlpUrl, ytdlpPath);
    console.log('yt-dlp downloaded successfully');
    const stats = await fs.stat(ytdlpPath);
    console.log(`File size after download: ${stats.size} bytes`);
    // Ensure the file is executable (Windows permissions)
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
    // Check if FFmpeg already exists
    if (existsSync(ffmpegPath)) {
      const stats = await fs.stat(ffmpegPath);
      if (stats.size > 0) {
        console.log('FFmpeg already exists, skipping download');
        return;
      }
    }

    // Ensure the directory exists
    if (!existsSync(extractPath)) {
      mkdirSync(extractPath, { recursive: true });
    }

    console.log('Downloading FFmpeg...');
    
    // Download the tar.gz file
    await downloadFile(ffmpegUrl, tempTarPath);

    console.log('Extracting FFmpeg...');
    
    // Extract the tar.gz
    await tar.x({
      file: tempTarPath,
      cwd: extractPath,
      filter: (path) => path.endsWith('ffmpeg.exe') // Only extract ffmpeg.exe
    });

    // Clean up the temporary tar.gz file
    await fs.unlink(tempTarPath);

    // Ensure executable permissions (important for non-Windows systems)
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
  if (mainWindow) return // Prevent duplicate windows

  mainWindow = new BrowserWindow({
    minWidth: 1020,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null // Cleanup memory
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
// ffmpegFluent.setFfmpegPath(ffmpeg.path);
// const ffmpegPath = ffmpeg.path;
app.whenReady().then(() => {
   downloadAndExtractFFmpeg();
  if (!existsSync(ytdlpPath)) {
    console.log('yt-dlp not found, downloading...');
     updateYtdlp();
  } else {
    const ytdlpVersion =  checkYtdlpVersion();
    console.log('yt-dlp version:', ytdlpVersion);
    // Optionally check against latest release via GitHub API
  }
  const deps =  checkDependencies();
  isInitialized = deps.ready;
  if (isInitialized) {
    console.log('All dependencies initialized successfully');
  } else {
    console.error('Failed to initialize all dependencies');
  }
  electronApp.setAppUserModelId('com.electron')
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Shoaib-Akh",
    repo: "pnutdownloader"
  });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.checkForUpdates()
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('open-webview', (event, url) => {
    console.log('Received YouTube Video URL:', url)
    if (mainWindow) {
      mainWindow.webContents.send('webview-url-update', url)
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
async function updateCookiesFile() {
  try {
    const cookies = await session.defaultSession.cookies.get({ domain: '.youtube.com' })
    if (!cookies.length) {
      console.error('No YouTube cookies found.')
      return
    }

    const lines = [
      '# Netscape HTTP Cookie File',
      '# This file is generated by Electron for use by yt-dlp.',
      '# This file was last updated on ' + new Date().toString(),
      ''
    ]

    cookies.forEach((cookie) => {
      let domain = cookie.domain
      if (!domain.startsWith('.')) {
        domain = '.' + domain
      }
      const includeSubdomains = 'TRUE'
      const isSecure = cookie.secure ? 'TRUE' : 'FALSE'
      const expiry = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0

      const line = [
        domain,
        includeSubdomains,
        cookie.path,
        isSecure,
        expiry,
        cookie.name,
        cookie.value
      ].join('\t')

      lines.push(line)
    })

    const fileContent = lines.join('\n')
    writeFileSync(cookiesPath, fileContent, 'utf8')
    console.log('Cookies updated successfully at:', cookiesPath)
  } catch (error) {
    console.error('Error updating cookies:', error)
  }
}
ipcMain.handle('getYoutubeCookies', async () => {
  await updateCookiesFile()
  return cookiesPath
})
// function formatDuration(seconds) {
//   const minutes = Math.floor(seconds / 60);
//   const remainingSeconds = seconds % 60;
//   return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
// }
ipcMain.handle('fetch-video-info', async (event, url) => {
  return new Promise((resolve, reject) => {
    const args = ['-J', url]
    const proc = spawn(ytdlpPath, args)

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
        reject(new Error(`yt-dlp exited with code ${code}. Error:\n${stderr}`))
        return
      }

      try {
        const json = JSON.parse(stdout)

        const title = json.title || ''
        let thumbnail = ''
        if (Array.isArray(json.thumbnails) && json.thumbnails.length > 0) {
          thumbnail = json.thumbnails[json.thumbnails.length - 1].url
        }

        const timeDuration = json.duration || 0

        // Duration in seconds
        const duration = formatDuration(timeDuration) // Format duration

        const filename = title && json.ext ? `${title}.${json.ext}` : title

        resolve({ title, thumbnail, filename, duration, duration })
      } catch (err) {
        reject(new Error(`Failed to parse JSON from yt-dlp: ${err.message}`))
      }
    })
  })
})

// Helper function to format duration
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 🛠 Ensure ffmpeg & ffprobe exist
// if (!existsSync(ffmpegPath) || !existsSync(ffprobePath)) {
//   console.error('FFmpeg or FFprobe not found! Please install FFmpeg.')
// }
// const activeDownloads = {};

// const getAvailableFormats = (url) => {
//   return new Promise((resolve, reject) => {
//     const args = ['--list-formats', url];
//     const listProcess = spawn(ytdlpPath, args, { windowsHide: true });
//     let output = '';

//     listProcess.stdout.on('data', (data) => {
//       output += data.toString();
//     });

//     listProcess.stderr.on('data', (data) => {
//       console.error('Error listing formats:', data.toString());
//     });

//     listProcess.on('close', (code) => {
//       if (code !== 0) {
//         return reject(new Error(`Failed to list formats with exit code ${code}`));
//       }
//       resolve(output);
//     });
//   });
// };

// const getFormatIdForHeight = (formatsOutput, selectedHeight) => {
//   const heightNumber = selectedHeight.replace(/[pP]$/, '');
//   const lines = formatsOutput.split('\n');
  
//   for (const line of lines) {
//     const resolutionMatch = line.match(/(\d+)x(\d+)/);
//     if (resolutionMatch) {
//       const height = resolutionMatch[2];
//       if (height === heightNumber && line.includes('mp4')) {
//         const columns = line.trim().split(/\s+/);
//         const formatId = columns[0];
//         if (formatId && !isNaN(formatId)) {
//           return formatId;
//         }
//       }
//     }
//   }
//   return null;
// };

// const startDownload = async (event, options) => {
//   console.log("Options:", options);

//   const { id: downloadId, url, isAudioOnly, selectedFormat, selectedQuality, saveTo } = options;

//   try {
//     // Get available formats
//     const formatsOutput = await getAvailableFormats(url);
//     console.log("Formats Output:\n", formatsOutput);

//     // Find format ID based on height
//     const formatId = getFormatIdForHeight(formatsOutput, selectedQuality);
//     console.log("Selected Format ID for height", selectedQuality, ":", formatId);

//     if (!formatId) {
//       const errorMsg = `No format found with height ${selectedQuality}. Available formats:\n${formatsOutput}`;
//       event.sender.send('download-progress', { error: errorMsg });
//       throw new Error(errorMsg);
//     }

//     // Build format specifier with fallback
//     const format = selectedFormat ? selectedFormat.toLowerCase() : 'mp4';
//     const formatSpecifier = isAudioOnly
//       ? '--extract-audio --audio-format mp3 --audio-quality best'
//       : `-f bestvideo[height=${selectedQuality.replace('p', '')}][ext=mp4]+bestaudio/best --merge-output-format ${format}`;

//     // Set download directory
//     const downloadDir = saveTo === 'Desktop'
//       ? join(app.getPath('desktop'), 'pnutdownloader')
//       : join(app.getPath('downloads'), 'pnutdownloader');

//     if (!existsSync(downloadDir)) {
//       mkdirSync(downloadDir, { recursive: true });
//     }
//     const downloadPath = join(downloadDir, '%(title)s.%(ext)s');

//     // Construct yt-dlp arguments
//     const args = [
//       '--continue',
//       '--ffmpeg-location', ffmpegPath,
//       '-o', downloadPath,
//       '--cookies', cookiesPath,
//       '--newline',
//       '--ignore-errors',
//       '--progress',
      
//       ...formatSpecifier.split(' '),
//       url,
//       '--no-playlist'
//     ];

//     console.log("yt-dlp Arguments:", args);

//     // Start download process without global tracking
//     const process = spawn(ytdlpPath, args, { windowsHide: true });
//     activeDownloads[downloadId] = true;

//     process.stdout.on('data', (data) => {
//       const line = data.toString().trim();
//       console.log("Progress:", line);
//       event.sender.send('download-progress', { message: line });
//     });

//     process.stderr.on('data', (data) => {
//       const errorMessage = data.toString().trim();
//       console.error("Error Output:", errorMessage);
//       event.sender.send('download-progress', { error: errorMessage });
//     });

//     process.on('close', (code) => {
//       delete activeDownloads[downloadId];
//       if (code === 0) {
//         event.sender.send('download-progress', { status: 'Download complete!', file: downloadPath });
//       } else {
//         const errorMsg = `Download failed with code ${code}`;
//         event.sender.send('download-progress', { error: errorMsg });
//         throw new Error(errorMsg);
//       }
//     });

//     process.on('error', (err) => {
//       console.error("Process Error:", err.message);
//       event.sender.send('download-progress', { error: err.message });
//       delete activeDownloads[downloadId];
//       throw err;
//     });

//   } catch (err) {
//     console.error("Caught Error:", err.message);
//     event.sender.send('download-progress', { error: err.message });
//     delete activeDownloads[downloadId];
//     throw err;
//   }
// };

let downloadProcess = null; // Track the current download process
const activeDownloads = {};


const startDownload = async (event, options) => {
  return new Promise((resolve, reject) => {
    try {
      if (downloadProcess) {
        event.sender.send('download-progress', { status: 'A download is already in progress!' });
        return reject(new Error('A download is already in progress.'));
      }

      const { id: downloadId, url, isAudioOnly, selectedFormat, selectedQuality, saveTo, selectBitrate } = options;

      if (!url || typeof url !== 'string') {
        return reject(new Error('Invalid URL.'));
      }

      if (activeDownloads[downloadId]) {
        return reject(new Error('Download already in progress.'));
      }

      // Base directory setup
      const baseDir = saveTo === 'Desktop'
        ? join(app.getPath('desktop'), 'pnutdownloader')
        : join(app.getPath('downloads'), 'pnutdownloader');

      // Define media-specific directories
      const audioDir = join(baseDir, 'audio');
      const videoDir = join(baseDir, 'video');
      const downloadDir = isAudioOnly ? audioDir : videoDir;

      // Create base directories
      try {
        if (!existsSync(baseDir)) {
          mkdirSync(baseDir, { recursive: true });
        }
        if (!existsSync(downloadDir)) {
          mkdirSync(downloadDir, { recursive: true });
        }
      } catch (dirError) {
        return reject(new Error(`Failed to create directory: ${dirError.message}`));
      }

      // Playlist detection
      const isPlaylist = (url.includes("playlist") || url.includes("&list=") || url.includes("?list=")) && !url.includes('watch');

      // Format specifier setup
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
      const timestampFormat = '%(upload_date)s_';
      // Download path with playlist support
      const downloadPath = isPlaylist
      ? join(baseDir, `${timestampFormat}%(playlist_title)s_%(title)s.%(ext)s`)
      : join(downloadDir, `${timestampFormat}%(title)s.%(ext)s`);

      // yt-dlp arguments
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
        isPlaylist ? '--yes-playlist' : '--no-playlist'
      ];

      console.log('Downloading with args:', args);

      // Start download process
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
          event.sender.send('download-progress', { 
            status: 'Playlist download complete!',
            file: downloadPath 
          });
          resolve();
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });

      downloadProcess.on('error', (err) => {
        delete activeDownloads[downloadId];
        downloadProcess = null;
        reject(err);
      });

    } catch (err) {
      event.sender.send('download-progress', { error: err.message });
      reject(err);
    }
  });
};
ipcMain.handle('downloadVideo', async (event, options) => {
  console.log('Starting download...');
  try {
    await startDownload(event, options); // Wait for the download to complete
    console.log('Download completed successfully.');
  } catch (err) {
    console.error('Download failed:', err);
    throw err; // Propagate the error to the renderer process
  }
});
ipcMain.handle('show-message-box', async (_, options) => {
  return dialog.showMessageBox(mainWindow, options)
})
ipcMain.handle('resumeDownload', async (event, options) => {
  if (!downloadProcess) {
    console.log('Resuming download...')
    await startDownload(event, options)
    return true
  }
  return false
})
const treeKill = require('tree-kill')
ipcMain.handle('pauseDownload', () => {
  console.log('Attempting to pause download...')
  if (downloadProcess) {
    console.log('Killing download process with PID:', downloadProcess.pid)
    treeKill(downloadProcess.pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Failed to kill process tree:', err)
      } else {
        console.log('Process tree killed successfully.')
      }
    })
    downloadProcess = null
    return true
  }
  console.log('No active download to pause.')
  return false
})
function saveDownloadState(state) {
  const filePath = join(app.getPath('userData'), 'downloadState.json')
  fs.writeFileSync(filePath, JSON.stringify(state))
}

ipcMain.handle('load-download-state', () => {
  const filePath = join(app.getPath('userData'), 'downloadState.json')
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null
})

ipcMain.handle('get-path', async (_event, name) => {
  return app.getPath(name)
})

// ✅ Handle directory reading request
ipcMain.handle('read-directory', async (_event, dirPath) => {
  try {
    return await fs.readdir(dirPath) // Reads all files inside the directory
  } catch (error) {
    console.error('Failed to read directory:', error)
    return []
  }
})

// ✅ Handle file existence check
ipcMain.handle('file-exists', async (_event, filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
})
ipcMain.handle('show-confirm-dialog', async (event, options) => {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: options.title || "Confirm",
    message: options.message || "Are you sure?",
    buttons: options.buttons || ["Yes", "No"],
    defaultId: 0, // Default to "Yes"
    cancelId: 1, // Cancel on "No"
  });
  return result.response; // Returns index of clicked button
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  mainWindow.webContents.send('update-downloaded', info);
});
autoUpdater.on('update-download-progress', (progress) => {
  console.log(`Download speed: ${progress.bytesPerSecond}`);
  console.log(`Downloaded ${progress.percent.toFixed(2)}%`);
  console.log(`${progress.transferred} / ${progress.total}`);

  // Send progress to renderer process
  mainWindow.webContents.send('update-download-progress', progress);
})
autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  mainWindow.webContents.send('update-error', err);
});

// IPC Handlers for Renderer
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
    
    // Check if files exist and are non-empty
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