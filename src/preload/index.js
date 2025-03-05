import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openWebview: (url) => ipcRenderer.send('open-webview', url),
  getYoutubeCookies: () => ipcRenderer.invoke('getYoutubeCookies'),
  fetchVideoInfo: (url) => ipcRenderer.invoke('fetch-video-info', url),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  downloadVideo: ({ url, isAudioOnly, selectedFormat, selectedQuality, saveTo }) =>
    ipcRenderer.invoke('downloadVideo', {
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo
    }),

  pauseDownload: () => ipcRenderer.invoke('pauseDownload'),
  resumeDownload: ({ url, isAudioOnly, selectedFormat, selectedQuality, saveTo }) =>
    ipcRenderer.invoke('resumeDownload', {
      url,
      isAudioOnly,
      selectedFormat,
      selectedQuality,
      saveTo
    }),

  saveDownloadState: (state) => ipcRenderer.invoke('save-download-state', state),
  loadDownloadState: () => ipcRenderer.invoke('load-download-state'),

  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, progressData) => callback(progressData))
  },

  getPath: (type) => ipcRenderer.invoke('get-path', type),

  // ✅ New function to read directory contents
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),

  // ✅ New function to check if a file exists
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  removeListener: (channel) => ipcRenderer.removeAllListeners(channel)
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
