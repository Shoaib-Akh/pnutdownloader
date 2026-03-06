import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { extractVideoId, isDuplicateDownload } from '../components/commonFunction'
import { detectPlatform, isYouTubePlatform, PLATFORMS } from '../components/platformUtils'
import { youtubeAPI } from '../components/YouTubeAPIManager'
import { nonYouTubeExtractor } from '../components/NonYouTubeMetadataExtractor'
import { saveDownload, saveDownloadError } from '../utils/firestoreService'

const DOWNLOAD_STORAGE_KEY = 'downloadList'
const DOWNLOAD_COUNT_KEY = 'downloadCount'

const sanitizeTitle = (str) => {
  if (!str) return 'Unknown'
  return str
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}._-]/gu, ' ')
    .substring(0, 200)
}

const normalizeYouTubeUrlForSingleVideo = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') return inputUrl
  try {
    const u = new URL(inputUrl)
    const host = u.hostname.toLowerCase()
    const isYouTubeHost = host.includes('youtube.com') || host.includes('youtu.be')
    if (!isYouTubeHost) return inputUrl

    const hasVideoId = Boolean(extractVideoId(inputUrl))
    const isPlaylistPage = u.pathname.toLowerCase().includes('/playlist')
    if (!hasVideoId || isPlaylistPage) return inputUrl

    u.searchParams.delete('list')
    u.searchParams.delete('index')
    u.searchParams.delete('start_radio')
    u.searchParams.delete('rv')
    return u.toString()
  } catch {
    return inputUrl
  }
}

const extractPlaylistId = (url) => {
  const playlistMatch = url?.match(
    /(?:youtube\.com|music\.youtube\.com|youtu\.be|youtube.googleapis\.com|youtubekids\.com)\/(?:playlist|watch)?.*?[?&]list=([^&#]+)/i
  )
  return playlistMatch ? playlistMatch[1] : null
}

const useDownloadManager = ({
  downloadType,
  format,
  quality,
  saveTo,
  bitrate,
  onDonationPrompt = () => {},
  onLoginRequired = () => {},
}) => {
  const [progressMap, setProgressMap] = useState(new Map())
  const [activeDownloads, setActiveDownloads] = useState(new Set())
  const downloadQueue = useRef([])
  const isProcessing = useRef(false)

  const getStoredDownloads = useCallback(
    () => JSON.parse(localStorage.getItem(DOWNLOAD_STORAGE_KEY) || '[]'),
    []
  )

  const setStoredDownloads = useCallback((downloads) => {
    localStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(downloads))
    // Emit custom event to notify other components in the same tab
    window.dispatchEvent(new CustomEvent('downloadListUpdated', { detail: downloads }))
  }, [])

  const bumpDownloadCount = useCallback(() => {
    const current = parseInt(localStorage.getItem(DOWNLOAD_COUNT_KEY) || '0', 10) + 1
    localStorage.setItem(DOWNLOAD_COUNT_KEY, current.toString())
    if (current % 4 === 0) {
      onDonationPrompt()
    }
  }, [onDonationPrompt])

  const isAnyDownloadInProgress = useCallback(() => {
    const stored = getStoredDownloads()
    return stored.some(
      (item) =>
        !item.isCompleted &&
        item.status !== 'Queued' &&
        item.status !== 'Waiting' &&
        item.status !== 'Failed' &&
        item.status !== 'Fetching Info...'
    )
  }, [getStoredDownloads])

  const getVideoInfo = useCallback(
    async (url) => {
      const platform = detectPlatform(url)

      try {
        if (isYouTubePlatform(platform)) {
          const videoId = extractVideoId(url)
          const playlistId = extractPlaylistId(url)

          if (videoId) {
            const normalizedSingle = normalizeYouTubeUrlForSingleVideo(url)
            return await youtubeAPI.extractVideoInfo(normalizedSingle)
          }

          if (playlistId) {
            if (playlistId.startsWith('RD') && window.api?.fetchPlaylistEntries) {
              return await window.api.fetchPlaylistEntries(url)
            }

            const apiPlaylist = await youtubeAPI.extractPlaylistInfo(url)
            if (apiPlaylist && Array.isArray(apiPlaylist.videos) && apiPlaylist.videos.length > 0) {
              return apiPlaylist
            }
            if (window.api?.fetchPlaylistEntries) {
              return await window.api.fetchPlaylistEntries(url)
            }
            return apiPlaylist
          }
        } else {
          return await nonYouTubeExtractor.extractMetadata(url)
        }
      } catch (error) {
        console.error('Failed to fetch video info:', error)

        try {
          if (isYouTubePlatform(platform)) {
            const playlistId = extractPlaylistId(url)
            if (playlistId && window.api?.fetchPlaylistEntries) {
              return await window.api.fetchPlaylistEntries(url)
            }
          }
        } catch (fallbackError) {
          console.warn('Playlist fallback via yt-dlp failed:', fallbackError)
        }

        return {
          videoUrl: url,
          title: `${platform} Video`,
          thumbnail: '',
          duration: 'PT0S',
          isPlaylist: false,
          platform: platform,
        }
      }
    },
    []
  )

  const processQueue = useCallback(async () => {
    if (downloadQueue.current.length === 0 || isProcessing.current) return

    isProcessing.current = true
    const currentId = downloadQueue.current[0]

    try {
      let storedDownloads = getStoredDownloads()
      const itemIndex = storedDownloads.findIndex((item) => item.id === currentId)

      if (itemIndex === -1) {
        downloadQueue.current.shift()
        isProcessing.current = false
        return processQueue()
      }

      const item = storedDownloads[itemIndex]

      storedDownloads[itemIndex].status = 'Fetching Info...'
      setStoredDownloads(storedDownloads)

      storedDownloads[itemIndex] = {
        ...storedDownloads[itemIndex],
        title: item.isPlaylist ? 'Playlist Item' : item.title || 'Unknown',
        playlistTitle: item.isPlaylist ? item.playlistTitle || 'Unknown Playlist' : null,
        thumbnail: item.thumbnail || '',
        filename: item.filename || `${item.title || 'video'}.${format === 'mp3' ? 'mp3' : 'mp4'}`,
        duration: item.duration || 'Unknown',
        fileSize: item.fileSize || 'Unknown',
        status: 'Downloading',
        isPlaylist: item.isPlaylist || false,
      }
      setStoredDownloads(storedDownloads)

      const currentFileTypes = new Map()

      const handleProgress = (progressData) => {
        const stored = getStoredDownloads()
        const itemIdx = stored.findIndex((i) => i.id === currentId)
        if (itemIdx === -1) return

        if (progressData.downloadId && progressData.downloadId !== currentId) {
          return
        }

        if (progressData.title || progressData.sanitizedTitle || progressData.thumbnail || progressData.duration) {
          stored[itemIdx] = {
            ...stored[itemIdx],
            ...(progressData.title
              ? { title: progressData.title }
              : progressData.sanitizedTitle && { title: progressData.sanitizedTitle }),
            ...(progressData.thumbnail && { thumbnail: progressData.thumbnail }),
            ...(progressData.duration && { duration: progressData.duration }),
          }
          setStoredDownloads(stored)
        }

        if (typeof progressData.message === 'string') {
          if (
            progressData.message.match(
              /(https?:\/\/(?:www\.|music\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|https?:\/\/youtu\.be\/)([\w-]{11})/
            ) && stored[itemIdx].isPlaylist
          ) {
            const match = progressData.message.match(
              /(https?:\/\/(?:www\.|music\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|https?:\/\/youtu\.be\/)([\w-]{11})/
            )
            const youtubeUrl = match[0]

            getVideoInfo(youtubeUrl).then((ytInfo) => {
              stored[itemIdx] = {
                ...stored[itemIdx],
                title: ytInfo?.title || 'Unknown',
                thumbnail: ytInfo?.thumbnail || stored[itemIdx].thumbnail,
                duration: ytInfo?.duration || 'Unknown',
                status: 'Downloading',
              }
              setStoredDownloads(stored)
            })
          }

          if (progressData.message.includes('Destination:')) {
            if (progressData.message.includes('.mp4')) {
              currentFileTypes.set(currentId, 'video')
            } else if (progressData.message.includes('.m4a')) {
              currentFileTypes.set(currentId, 'audio')
            } else if (progressData.message.includes('.webm')) {
              currentFileTypes.set(currentId, 'justAudio')
            }
            return
          }

          const progressMatch = progressData.message.match(
            /(\d+\.\d+)%\s+of\s+~?\s*([\d.]+\w+)\s+at\s+([\d.]+\w+\/\w+)\s+ETA\s+(\d+:\d+|Unknown)/
          )

          if (progressMatch) {
            const [, progress, fileSize, speed, eta] = progressMatch
            const rawProgress = parseFloat(progress)
            let totalProgress = 0
            const currentFileType = currentFileTypes.get(currentId)

            if (currentFileType === 'video') {
              totalProgress = rawProgress * 0.9
            } else if (currentFileType === 'audio') {
              totalProgress = 90 + rawProgress * 0.1
            } else if (currentFileType === 'justAudio') {
              totalProgress = rawProgress
            }

            setProgressMap((prev) => {
              const next = new Map(prev)
              next.set(currentId, { progress: totalProgress, fileSize, speed, eta })
              return next
            })
          }

          const simpleProgressMatch = progressData.message.match(/(\d+\.\d+)%\s+of\s+~?\s*([\d.]+\w+)/)
          if (simpleProgressMatch) {
            const [, progress, fileSize] = simpleProgressMatch
            const rawProgress = parseFloat(progress)
            const currentFileType = currentFileTypes.get(currentId)
            let totalProgress = rawProgress
            if (currentFileType === 'video') {
              totalProgress = rawProgress * 0.9
            } else if (currentFileType === 'audio') {
              totalProgress = 90 + rawProgress * 0.1
            }

            setProgressMap((prev) => {
              const next = new Map(prev)
              next.set(currentId, { progress: totalProgress, fileSize, speed: 'N/A', eta: 'N/A' })
              return next
            })
          }

          const itemCountMatch = progressData.message.match(/\[download\] Downloading item (\d+) of (\d+)/)
          if (itemCountMatch) {
            const [, currentItem, totalItems] = itemCountMatch
            stored[itemIdx].currentItem = parseInt(currentItem)
            stored[itemIdx].totalItems = parseInt(totalItems)
            setStoredDownloads(stored)
          }

          if (progressData.message.includes('has already been downloaded')) {
            stored[itemIdx].status = 'Completed'
            stored[itemIdx].isCompleted = true
            setProgressMap((prev) => {
              const next = new Map(prev)
              next.set(currentId, { progress: 100, fileSize: 'N/A', speed: 'N/A', eta: 'N/A' })
              return next
            })
            setStoredDownloads(stored)
            saveDownload(stored[itemIdx])
            bumpDownloadCount()
          }

          if (progressData.message.includes('Finished downloading playlist:')) {
            stored[itemIdx].isPlaylistCompleted = true
            setStoredDownloads(stored)
          }
        }

        if (
          progressData?.error?.includes('Sign in to confirm') ||
          progressData?.error?.includes('exporting YouTube cookies')
        ) {
          onLoginRequired()
        }
      }

      window.api.onDownloadProgress(handleProgress)

      await window.api.downloadVideo({
        id: currentId,
        url: item.url,
        isAudioOnly: item.downloadType === 'audio',
        selectedFormat: item.format,
        selectedQuality: item.quality,
        selectBitrate: item.downloadType === 'audio' ? item.bitrate : null,
        title: sanitizeTitle(item.title),
        playlistTitle: item.playlistTitle ? sanitizeTitle(item.playlistTitle) : null,
        forceSingle: Boolean(item.forceSingle),
        saveTo,
      })

      storedDownloads = getStoredDownloads()
      const completedIndex = storedDownloads.findIndex((i) => i.id === currentId)
      if (completedIndex !== -1) {
        storedDownloads[completedIndex].status = 'Completed'
        storedDownloads[completedIndex].isCompleted = true
        setStoredDownloads(storedDownloads)
        saveDownload(storedDownloads[completedIndex])
        bumpDownloadCount()
      }

      setActiveDownloads((prev) => {
        const next = new Set(prev)
        next.delete(currentId)
        return next
      })
    } catch (error) {
      const storedDownloads = getStoredDownloads()
      const failedIndex = storedDownloads.findIndex((i) => i.id === currentId)

      if (failedIndex !== -1) {
        storedDownloads[failedIndex].status = 'Failed'
        storedDownloads[failedIndex].isFailed = true
        setStoredDownloads(storedDownloads)
        saveDownloadError(storedDownloads[failedIndex], error.message || error.toString())
      }

      setActiveDownloads((prev) => {
        const next = new Set(prev)
        next.delete(currentId)
        return next
      })

      setProgressMap((prev) => {
        const next = new Map(prev)
        next.set(currentId, { progress: 0, fileSize: 'N/A', speed: 'N/A', eta: 'N/A', status: 'Failed' })
        return next
      })
    } finally {
      downloadQueue.current.shift()
      isProcessing.current = false
      if (downloadQueue.current.length > 0) {
        const storedDownloads = getStoredDownloads()
        const nextItemIndex = storedDownloads.findIndex((item) => item.id === downloadQueue.current[0])
        if (nextItemIndex !== -1 && !isAnyDownloadInProgress()) {
          storedDownloads[nextItemIndex].status = 'Queued'
          setStoredDownloads(storedDownloads)
        }
        processQueue()
      }
    }
  }, [bitrate, downloadType, format, getStoredDownloads, isAnyDownloadInProgress, onLoginRequired, quality, saveTo, setStoredDownloads, bumpDownloadCount, getVideoInfo])

  const enqueueDownload = useCallback(
    async (rawUrl, options = {}) => {
      const normalizedUrl = normalizeYouTubeUrlForSingleVideo(rawUrl)
      const stored = getStoredDownloads()
      const duplicate = isDuplicateDownload(stored, normalizedUrl, format, quality, saveTo, downloadType, bitrate)
      if (duplicate) {
        return { duplicate: true }
      }

      const videoInfo = options.videoInfo ?? (await getVideoInfo(normalizedUrl))
      if (videoInfo?.isPlaylist && !options.forceSingle) {
        return { playlist: videoInfo }
      }

      const newId = uuidv4()
      const newDownload = {
        id: newId,
        url: normalizedUrl,
        title: videoInfo?.isPlaylist ? 'Playlist Item' : videoInfo?.title || 'Pending...',
        playlistTitle: videoInfo?.isPlaylist ? videoInfo.playlistTitle : null,
        thumbnail: videoInfo?.thumbnail || '',
        filename: '',
        quality: quality.toLowerCase(),
        saveTo: saveTo.toLowerCase(),
        downloadType: downloadType.toLowerCase(),
        format: format.toLowerCase(),
        duration: videoInfo?.duration || 'Unknown',
        bitrate: bitrate,
        progress: 0,
        fileSize: 'Unknown',
        speed: 'Unknown',
        eta: 'Unknown',
        status: isAnyDownloadInProgress() ? 'Waiting' : 'Queued',
        isPlaylistCompleted: false,
        isCompleted: false,
        isFailed: false,
        isPlaylist: videoInfo?.isPlaylist || false,
        platform: videoInfo?.platform || detectPlatform(normalizedUrl),
        currentItem: 0,
        forceSingle: Boolean(options.forceSingle),
      }

      setStoredDownloads([newDownload, ...stored])
      downloadQueue.current.push(newId)
      setActiveDownloads((prev) => {
        const next = new Set(prev)
        next.add(newId)
        return next
      })

      if (!isProcessing.current) {
        processQueue()
      }

      return { id: newId, videoInfo }
    },
    [
      bitrate,
      downloadType,
      format,
      getStoredDownloads,
      getVideoInfo,
      isAnyDownloadInProgress,
      processQueue,
      quality,
      saveTo,
      setStoredDownloads,
    ]
  )

  const enqueuePlaylistVideos = useCallback(
    (selectedVideos, playlistTitle) => {
      if (!Array.isArray(selectedVideos) || selectedVideos.length === 0) return

      const downloadsToAdd = selectedVideos.map((video) => {
        const newId = uuidv4()
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`
        return {
          id: newId,
          url: videoUrl,
          title: video?.title || 'Pending...',
          playlistTitle: playlistTitle || null,
          thumbnail: video?.thumbnail || '',
          filename: '',
          quality: quality.toLowerCase(),
          saveTo: saveTo.toLowerCase(),
          downloadType: downloadType.toLowerCase(),
          format: format.toLowerCase(),
          duration: 'Unknown',
          bitrate: bitrate,
          progress: 0,
          fileSize: 'Unknown',
          speed: 'Unknown',
          eta: 'Unknown',
          status: isAnyDownloadInProgress() ? 'Waiting' : 'Queued',
          isCompleted: false,
          isFailed: false,
          isPlaylist: false,
          platform: PLATFORMS.YOUTUBE,
          currentItem: 0,
          forceSingle: true,
        }
      })

      setActiveDownloads((prev) => {
        const next = new Set(prev)
        downloadsToAdd.forEach((d) => next.add(d.id))
        return next
      })

      const stored = getStoredDownloads()
      setStoredDownloads([...downloadsToAdd, ...stored])
      downloadsToAdd.forEach((d) => downloadQueue.current.push(d.id))

      if (!isProcessing.current) {
        processQueue()
      }
    },
    [bitrate, downloadType, format, getStoredDownloads, isAnyDownloadInProgress, processQueue, quality, saveTo, setStoredDownloads]
  )

  const retryDownload = useCallback(
    (id) => {
      if (isProcessing.current) return
      const storedDownloads = getStoredDownloads()
      const itemIndex = storedDownloads.findIndex((item) => item.id === id)
      if (itemIndex === -1) return
      const item = storedDownloads[itemIndex]
      if (item.status !== 'Failed') return

      storedDownloads[itemIndex] = {
        ...item,
        status: isAnyDownloadInProgress() ? 'Waiting' : 'Queued',
        isFailed: false,
        progress: 0,
        fileSize: 'Unknown',
        speed: 'Unknown',
        eta: 'Unknown',
      }

      setStoredDownloads(storedDownloads)
      downloadQueue.current.push(id)
      if (!isProcessing.current) {
        processQueue()
      }
    },
    [getStoredDownloads, isAnyDownloadInProgress, processQueue, setStoredDownloads]
  )

  useEffect(() => {
    const queuedDownloads = getStoredDownloads().filter(
      (item) =>
        item.status === 'Queued' ||
        item.status === 'Downloading' ||
        item.status === 'Fetching Info' ||
        item.status === 'Waiting'
    )

    if (queuedDownloads.length > 0) {
      downloadQueue.current = queuedDownloads.map((item) => item.id)
      if (!isProcessing.current) {
        processQueue()
      }
    }
  }, [getStoredDownloads, processQueue])

  return {
    enqueueDownload,
    enqueuePlaylistVideos,
    retryDownload,
    progressMap,
    activeDownloads,
    normalizeYouTubeUrlForSingleVideo,
    getVideoInfo,
  }
}

export default useDownloadManager
