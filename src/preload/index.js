import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS, IPC_EVENTS } from '../shared/ipcChannels'

const api = {
  openWebview: (url) => ipcRenderer.send(IPC_CHANNELS.OPEN_WEBVIEW, url),
  getYoutubeCookies: () => ipcRenderer.invoke(IPC_CHANNELS.GET_YOUTUBE_COOKIES),
  fetchVideoInfo: (url) => ipcRenderer.invoke(IPC_CHANNELS.FETCH_VIDEO_INFO, url),
  fetchPlaylistEntries: (url) => ipcRenderer.invoke(IPC_CHANNELS.FETCH_PLAYLIST_ENTRIES, url),
  getYoutubeInfo: (url) => ipcRenderer.invoke(IPC_CHANNELS.GET_YOUTUBE_INFO, url),
  saveWebViewCookies: () => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WEBVIEW_COOKIES),
  showMessageBox: (options) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_MESSAGE_BOX, options),
  trackEvent: () => undefined,
  downloadVideo: ({ url, isAudioOnly, selectedFormat, selectedQuality, saveTo, id, selectBitrate, title, titleTimestamp, playlistTitle, forceSingle, debugMode }) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_VIDEO, {
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo,
      selectBitrate,
      id,
      title,
      titleTimestamp,
      playlistTitle,
      forceSingle,
      debugMode
    }),
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  getYtVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_YT_VERSION),
  getFfmpegVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_FFMPEG_VERSION),

    
    pauseDownload: (downloadId) => ipcRenderer.invoke(IPC_CHANNELS.PAUSE_DOWNLOAD, downloadId),
  resumeDownload: ({ url, isAudioOnly, selectedFormat, selectedQuality, saveTo,id }) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_DOWNLOAD, {
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo,
      id
    }),
    showConfirmDialog: (title, message) => {
      return ipcRenderer.invoke(IPC_CHANNELS.SHOW_CONFIRM_DIALOG, { title, message });
    },
  saveDownloadState: (state) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_DOWNLOAD_STATE, state),
  loadDownloadState: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_DOWNLOAD_STATE),

  onDownloadProgress: (callback) => {
    const listener = (_event, progressData) => callback(progressData)
    ipcRenderer.on(IPC_EVENTS.DOWNLOAD_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.DOWNLOAD_PROGRESS, listener)
  },
  onDebugLog: (callback) => {
    const listener = (_event, logData) => callback(logData)
    ipcRenderer.on(IPC_EVENTS.DEBUG_LOG, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.DEBUG_LOG, listener)
  },
  openExternal: (url) => shell.openExternal(url),
  getPath: (type) => ipcRenderer.invoke(IPC_CHANNELS.GET_PATH, type),
accessFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.ACCESS_FILE, path),
openPath: (path) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, path),
  revealDownload: (item) => ipcRenderer.invoke(IPC_CHANNELS.REVEAL_DOWNLOAD, item),
  // ✅ New function to read directory contents
  readDirectory: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY, dirPath),

  // ✅ New function to create directory
  createDirectory: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_DIRECTORY, dirPath),

  // ✅ New function to check if a file exists
  fileExists: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_EXISTS, filePath),
  openFile: (openFile) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, openFile),

  
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),

  checkForUpdates: () => ipcRenderer.send(IPC_EVENTS.CHECK_FOR_UPDATES),
  onUpdateAvailable: (callback) => ipcRenderer.on(IPC_EVENTS.UPDATE_AVAILABLE, (_, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on(IPC_EVENTS.UPDATE_DOWNLOADED, (_, info) => callback(info)),
  onUpdateDownloadedProgress: (callback) => ipcRenderer.on(IPC_EVENTS.UPDATE_DOWNLOAD_PROGRESS, (_, info) => callback(info)),

  onUpdateError: (callback) => ipcRenderer.on(IPC_EVENTS.UPDATE_ERROR, (_, err) => callback(err)),
  downloadUpdate: () => ipcRenderer.send(IPC_CHANNELS.DOWNLOAD_UPDATE),
  installUpdate: () => ipcRenderer.send(IPC_CHANNELS.INSTALL_UPDATE),
  checkDependencies: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_DEPENDENCIES),
  getDependencyStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DEPENDENCY_STATUS),
  checkYtdlpUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_YTDLP_UPDATE),
  updateYtdlp: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_YTDLP),
  updateFfmpeg: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_FFMPEG),
  onDependencyProgress: (callback) => {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on(IPC_EVENTS.DEPENDENCY_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.DEPENDENCY_PROGRESS, listener)
  },
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),

  // Image proxy for external CDN images
  proxyImage: (imageUrl) => ipcRenderer.invoke(IPC_CHANNELS.PROXY_IMAGE, imageUrl),

  // Show notification when downloadable video URL is detected
  showVideoUrlNotification: (url) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_VIDEO_URL_NOTIFICATION, url),

  // Listen for video URL detection events from main process
  onVideoUrlDetected: (callback) => {
    ipcRenderer.on(IPC_EVENTS.VIDEO_URL_DETECTED, (_event, url) => callback(url))
  },

  // Remove listener for video URL detection
  removeVideoUrlDetectedListener: () => {
    ipcRenderer.removeAllListeners(IPC_EVENTS.VIDEO_URL_DETECTED)
  },

  // New context menu functions
  moveFile: (sourcePath, destPath) => ipcRenderer.invoke('moveFile', sourcePath, destPath),
  showFileInFolder: (filePath) => ipcRenderer.invoke('showFileInFolder', filePath),

}

// Expose API to renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Error exposing Electron API:', error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
