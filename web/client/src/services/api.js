import axios from 'axios';
import io from 'socket.io-client';

// API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

// Socket.io connection
let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(API_BASE_URL);
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

// Download API
export const downloadAPI = {
  start: (downloadOptions) => {
    console.log('🌐 [API] Starting download request')
    console.log('📤 [API] Request payload:', downloadOptions)
    
    return api.post('/download/start', downloadOptions)
      .then(response => {
        console.log('✅ [API] Download start response:', response.data)
        return response
      })
      .catch(error => {
        console.error('❌ [API] Download start failed:', error)
        console.error('❌ [API] Response data:', error.response?.data)
        console.error('❌ [API] Status:', error.response?.status)
        throw error
      })
  },
  pause: (downloadId) => api.post(`/download/pause/${downloadId}`),
  resume: (downloadId) => api.post(`/download/resume/${downloadId}`),
  cancel: (downloadId) => api.post(`/download/cancel/${downloadId}`),
  getStatus: (downloadId) => api.get(`/download/status/${downloadId}`),
  getActive: () => api.get('/download/active'),
};

// Video API
export const videoAPI = {
  getInfo: (url, options = {}) => api.post('/video/info', { url, ...options }),
  getPlaylist: (url, options = {}) => api.post('/video/playlist', { url, ...options }),
  getYoutubeInfo: (url, options = {}) => api.post('/video/youtube', { url, ...options }),
};

// System API
export const systemAPI = {
  getVersion: () => api.get('/system/version'),
  getYtdlpVersion: () => api.get('/system/ytdlp-version'),
  getFfmpegVersion: () => api.get('/system/ffmpeg-version'),
  fileExists: (filePath) => api.post('/system/file-exists', { filePath }),
  createDirectory: (dirPath) => api.post('/system/create-directory', { dirPath }),
  readDirectory: (dirPath) => api.post('/system/read-directory', { dirPath }),
  deleteFile: (filePath) => api.post('/system/delete-file', { filePath }),
  getPlatform: () => api.get('/system/platform'),
};

// File download URL helper
export const getDownloadUrl = (filename) => {
  return `${API_BASE_URL}/downloads/${filename}`;
};

export default api;
