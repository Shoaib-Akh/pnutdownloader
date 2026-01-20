import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { trackEvent } from "@aptabase/electron/renderer";

const api = {
  openWebview: (url) => ipcRenderer.send('open-webview', url),
  getYoutubeCookies: () => ipcRenderer.invoke('getYoutubeCookies'),
  fetchVideoInfo: (url) => ipcRenderer.invoke('fetch-video-info', url),
  getYoutubeInfo: (url) => ipcRenderer.invoke('get-youtube-info', url),

  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
trackEvent: (eventName, props) => trackEvent(eventName, props),
  downloadVideo: ({ url, isAudioOnly, selectedFormat, selectedQuality, saveTo,id,selectBitrate ,title}) =>
    ipcRenderer.invoke('downloadVideo', {
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo,
      selectBitrate,
      id,
      title
    }),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    
    pauseDownload: (downloadId) => ipcRenderer.invoke('pauseDownload', downloadId),
  resumeDownload: ({ url, isAudioOnly, selectedFormat, selectedQuality, saveTo,id }) =>
    ipcRenderer.invoke('resumeDownload', {
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo,
      id
    }),
    showConfirmDialog: (title, message) => {
      return ipcRenderer.invoke('show-confirm-dialog', { title, message });
    },
  saveDownloadState: (state) => ipcRenderer.invoke('save-download-state', state),
  loadDownloadState: () => ipcRenderer.invoke('load-download-state'),

  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, progressData) => callback(progressData))
  },
  openExternal: (url) => shell.openExternal(url),
  getPath: (type) => ipcRenderer.invoke('get-path', type),
accessFile: (path) => ipcRenderer.invoke('accessFile', path),
openPath: (path) => ipcRenderer.invoke('openPath', path),
  // ✅ New function to read directory contents
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),

  // ✅ New function to create directory
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),

  // ✅ New function to check if a file exists
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  openFile: (openFile) => ipcRenderer.invoke('openFile', openFile),

  
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),

  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
  onUpdateDownloadedProgress: (callback) => ipcRenderer.on('update-download-progress', (_, info) => callback(info)),

  onUpdateError: (callback) => ipcRenderer.on('update-error', (_, err) => callback(err)),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Image proxy for external CDN images
  proxyImage: (imageUrl) => ipcRenderer.invoke('proxy-image', imageUrl),

  // Show notification when downloadable video URL is detected
  showVideoUrlNotification: (url) => ipcRenderer.invoke('show-video-url-notification', url),

  // Listen for video URL detection events from main process
  onVideoUrlDetected: (callback) => {
    ipcRenderer.on('video-url-detected', (_event, url) => callback(url))
  },

  // Remove listener for video URL detection
  removeVideoUrlDetectedListener: () => {
    ipcRenderer.removeAllListeners('video-url-detected')
  },

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
