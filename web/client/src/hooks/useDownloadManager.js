import { useState, useEffect, useCallback } from 'react'
import { downloadAPI, getSocket } from '../services/api'

const useDownloadManager = ({
  downloadType,
  format,
  quality,
  saveTo,
  bitrate,
  onDonationPrompt,
  onLoginRequired,
}) => {
  const [activeDownloads, setActiveDownloads] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const socket = getSocket()

  useEffect(() => {
    if (!socket) return

    // Listen for download progress updates
    socket.on('download-progress', (progressData) => {
      setProgressMap(prev => ({
        ...prev,
        [progressData.id]: progressData
      }))
    })

    return () => {
      socket.off('download-progress')
    }
  }, [socket])

  const enqueueDownload = useCallback(async (options) => {
    try {
      const response = await downloadAPI.start(options)
      const downloadId = response.data.downloadId
      
      // Add to active downloads
      setActiveDownloads(prev => [...prev, {
        id: downloadId,
        ...options,
        status: 'starting',
        progress: 0,
        createdAt: new Date()
      }])
      
      return downloadId
    } catch (error) {
      console.error('Failed to start download:', error)
      throw error
    }
  }, [])

  const enqueuePlaylistVideos = useCallback(async (videoOptions) => {
    try {
      const downloadPromises = videoOptions.map(options => enqueueDownload(options))
      const downloadIds = await Promise.all(downloadPromises)
      return downloadIds
    } catch (error) {
      console.error('Failed to start playlist downloads:', error)
      throw error
    }
  }, [enqueueDownload])

  const pauseDownload = useCallback(async (downloadId) => {
    try {
      await downloadAPI.pause(downloadId)
      setProgressMap(prev => ({
        ...prev,
        [downloadId]: {
          ...prev[downloadId],
          status: 'paused'
        }
      }))
    } catch (error) {
      console.error('Failed to pause download:', error)
      throw error
    }
  }, [])

  const resumeDownload = useCallback(async (downloadId) => {
    try {
      await downloadAPI.resume(downloadId)
      setProgressMap(prev => ({
        ...prev,
        [downloadId]: {
          ...prev[downloadId],
          status: 'downloading'
        }
      }))
    } catch (error) {
      console.error('Failed to resume download:', error)
      throw error
    }
  }, [])

  const cancelDownload = useCallback(async (downloadId) => {
    try {
      await downloadAPI.cancel(downloadId)
      setProgressMap(prev => {
        const newMap = { ...prev }
        delete newMap[downloadId]
        return newMap
      })
      setActiveDownloads(prev => prev.filter(d => d.id !== downloadId))
    } catch (error) {
      console.error('Failed to cancel download:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        downloadId
      })
      throw error
    }
  }, [])

  const retryDownload = useCallback(async (downloadId, options) => {
    try {
      console.log('Retrying download:', downloadId)
      
      // Cancel the existing download
      await cancelDownload(downloadId)
      console.log('Existing download cancelled')
      
      // Start a new download
      await enqueueDownload(options)
      console.log('New download started')
    } catch (error) {
      console.error('Failed to retry download:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        downloadId,
        options
      })
      throw error
    }
  }, [cancelDownload, enqueueDownload])

  const normalizeYouTubeUrlForSingleVideo = useCallback((url) => {
    console.log('Normalizing YouTube URL for single video:', url)
    
    // Extract video ID from various YouTube URL formats
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    const match = url.match(regex)
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`
    }
    return url
  }, [])

  const getDownloadProgress = useCallback((downloadId) => {
    return progressMap[downloadId] || null
  }, [progressMap])

  const getAllActiveDownloads = useCallback(() => {
    return activeDownloads.map(download => ({
      ...download,
      progress: progressMap[download.id] || { progress: 0, status: 'starting' }
    }))
  }, [activeDownloads, progressMap])

  return {
    enqueueDownload,
    enqueuePlaylistVideos,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    normalizeYouTubeUrlForSingleVideo,
    getDownloadProgress,
    getAllActiveDownloads,
    activeDownloads,
    progressMap,
  }
}

export default useDownloadManager
