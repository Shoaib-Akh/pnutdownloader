import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

const api = {
  openWebview: (url) => ipcRenderer.send("open-webview", url),
  getYoutubeCookies: () => ipcRenderer.invoke("getYoutubeCookies"),
  fetchVideoInfo: (url) => ipcRenderer.invoke("fetch-video-info", url),
  
  downloadVideo: ({ url, isAudioOnly, selectedFormat, selectedQuality ,saveTo}) =>
    ipcRenderer.invoke("downloadVideo", { url, isAudioOnly, selectedFormat, selectedQuality,saveTo }),

  pauseDownload: () => ipcRenderer.invoke("pauseDownload"),
  resumeDownload: () => ipcRenderer.invoke("resumeDownload"),
  
  saveDownloadState: (state) => ipcRenderer.invoke("save-download-state", state),
  loadDownloadState: () => ipcRenderer.invoke("load-download-state"),

  onDownloadProgress: (callback) => {
    ipcRenderer.on("download-progress", (_event, progressData) => callback(progressData));
  },
  
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel)
};

// Expose API to renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error("Error exposing Electron API:", error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
