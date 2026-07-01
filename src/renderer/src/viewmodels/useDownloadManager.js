import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { extractVideoId, isDuplicateDownload } from '../components/commonFunction'
import { detectPlatform, isYouTubePlatform, PLATFORMS } from '../components/platformUtils'
import { youtubeAPI } from '../components/YouTubeAPIManager'
import { nonYouTubeExtractor } from '../components/NonYouTubeMetadataExtractor'
import { saveDownload, saveDownloadError } from '../utils/firestoreService'
import { appendTitleTimestamp } from '../../../shared/titleUtils'

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

const timestampNonYouTubeTitle = (title, platform, timestamp) =>
  isYouTubePlatform(platform) ? title : appendTitleTimestamp(title, timestamp)

const isMetadataPlaceholderTitle = (title) => {
  const normalizedTitle = String(title || '').trim()
  return !normalizedTitle || normalizedTitle === 'Pending...'
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

const isPlaylistDownloadUrl = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') return false
  try {
    const url = new URL(inputUrl)
    const host = url.hostname.toLowerCase()
    if (!host.includes('youtube.com') && !host.includes('youtu.be')) return false
    return url.pathname.toLowerCase().includes('/playlist') || (
      url.searchParams.has('list') && !extractVideoId(inputUrl)
    )
  } catch {
    return false
  }
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
    let removeProgressListener = () => {}

    try {
      let storedDownloads = getStoredDownloads()
      let itemIndex = storedDownloads.findIndex((item) => item.id === currentId)

      if (itemIndex === -1) {
        downloadQueue.current.shift()
        isProcessing.current = false
        return processQueue()
      }

      let item = storedDownloads[itemIndex]
      let itemPlatform = item.platform || detectPlatform(item.url)
      let itemTitleTimestamp = isYouTubePlatform(itemPlatform)
        ? null
        : item.titleTimestamp || Date.now()
      let itemIsPlaylist = Boolean(
        item.isPlaylist || item.playlistTitle || item.playlistBatchId || isPlaylistDownloadUrl(item.url)
      )

      if (itemIsPlaylist) {
        console.log('[PlaylistProgress] Starting playlist queue item', {
          downloadId: currentId,
          url: item.url,
          playlistTitle: item.playlistTitle || null,
          playlistBatchId: item.playlistBatchId || `direct:${item.id}`,
        })
      }

      setActiveDownloads((prev) => {
        const next = new Set(prev)
        next.add(currentId)
        return next
      })

      storedDownloads[itemIndex].status = 'Fetching Info...'
      setStoredDownloads(storedDownloads)

      if (item.needsMetadata) {
        const videoInfo = await getVideoInfo(item.url)
        if (videoInfo?.unsupportedDownload) {
          throw new Error(videoInfo.unsupportedReason || 'This URL is not supported for download.')
        }

        storedDownloads = getStoredDownloads()
        itemIndex = storedDownloads.findIndex((latestItem) => latestItem.id === currentId)
        if (itemIndex === -1) {
          setActiveDownloads((prev) => {
            const next = new Set(prev)
            next.delete(currentId)
            return next
          })
          return
        }
        item = storedDownloads[itemIndex]

        itemPlatform = videoInfo?.platform || itemPlatform
        itemTitleTimestamp = isYouTubePlatform(itemPlatform)
          ? null
          : item.titleTimestamp || Date.now()
        itemIsPlaylist = Boolean(videoInfo?.isPlaylist || itemIsPlaylist)

        const metadataTitle = videoInfo?.isPlaylist
          ? 'Playlist Item'
          : videoInfo?.title || item.title || 'Unknown'

        storedDownloads[itemIndex] = {
          ...storedDownloads[itemIndex],
          title: timestampNonYouTubeTitle(metadataTitle, itemPlatform, itemTitleTimestamp),
          playlistTitle: videoInfo?.isPlaylist ? videoInfo.playlistTitle : item.playlistTitle || null,
          thumbnail: videoInfo?.thumbnail || item.thumbnail || '',
          duration: videoInfo?.duration || item.duration || 'Unknown',
          isPlaylist: itemIsPlaylist,
          playlistBatchId:
            storedDownloads[itemIndex].playlistBatchId ||
            (itemIsPlaylist ? `direct:${storedDownloads[itemIndex].id}` : null),
          platform: itemPlatform,
          titleTimestamp: itemTitleTimestamp,
          needsMetadata: false,
          status: 'Fetching Info...',
        }
        setStoredDownloads(storedDownloads)
        item = storedDownloads[itemIndex]
      }

      itemPlatform = item.platform || detectPlatform(item.url)
      itemTitleTimestamp = isYouTubePlatform(itemPlatform)
        ? null
        : item.titleTimestamp || Date.now()
      const itemTitle = timestampNonYouTubeTitle(
        item.title || 'Unknown',
        itemPlatform,
        itemTitleTimestamp
      )
      itemIsPlaylist = Boolean(
        item.isPlaylist || item.playlistTitle || item.playlistBatchId || isPlaylistDownloadUrl(item.url)
      )

      storedDownloads[itemIndex] = {
        ...storedDownloads[itemIndex],
        title: itemIsPlaylist && (!item.title || item.title === 'Pending...')
          ? 'Preparing playlist…'
          : itemTitle,
        playlistTitle: item.playlistTitle || null,
        playlistBatchId: item.playlistBatchId || (itemIsPlaylist ? `direct:${item.id}` : null),
        thumbnail: item.thumbnail || '',
        filename: item.filename || `${itemTitle}.${format === 'mp3' ? 'mp3' : 'mp4'}`,
        duration: item.duration || 'Unknown',
        fileSize: item.fileSize || 'Unknown',
        status: 'Downloading',
        isPlaylist: itemIsPlaylist,
        platform: itemPlatform,
        titleTimestamp: itemTitleTimestamp,
        needsMetadata: false,
      }
      setStoredDownloads(storedDownloads)

      const currentFileTypes = new Map()
      const requestedPlaylistVideos = new Set()

      const handleProgress = (progressData) => {
        const stored = getStoredDownloads()
        const itemIdx = stored.findIndex((i) => i.id === currentId)
        if (itemIdx === -1) return

        if (progressData.downloadId && progressData.downloadId !== currentId) {
          return
        }

        if (progressData.file) {
          stored[itemIdx] = {
            ...stored[itemIdx],
            filePath: String(progressData.file),
          }
          setStoredDownloads(stored)
        }

        if (progressData.title || progressData.sanitizedTitle || progressData.thumbnail || progressData.duration) {
          const incomingTitle = progressData.title || progressData.sanitizedTitle
          const progressTitle = incomingTitle
            ? timestampNonYouTubeTitle(
                incomingTitle,
                stored[itemIdx].platform || detectPlatform(stored[itemIdx].url),
                stored[itemIdx].titleTimestamp || Date.now()
              )
            : null
          stored[itemIdx] = {
            ...stored[itemIdx],
            ...(progressTitle && { title: progressTitle }),
            ...(progressData.thumbnail && { thumbnail: progressData.thumbnail }),
            ...(progressData.duration && { duration: progressData.duration }),
          }
          setStoredDownloads(stored)
        }

        if (typeof progressData.message === 'string') {
          const playlistTitleMatch = progressData.message.match(
            /\[download\]\s+Downloading playlist:\s*(.+)$/
          )
          if (playlistTitleMatch) {
            console.log('[PlaylistProgress] Playlist title detected', {
              downloadId: currentId,
              playlistTitle: playlistTitleMatch[1].trim(),
            })
            stored[itemIdx] = {
              ...stored[itemIdx],
              isPlaylist: true,
              playlistTitle: playlistTitleMatch[1].trim() || stored[itemIdx].playlistTitle,
              playlistBatchId: stored[itemIdx].playlistBatchId || `direct:${currentId}`,
            }
            setStoredDownloads(stored)
          }

          const playlistTotalMatch = progressData.message.match(
            /\[youtube:tab\]\s+Playlist\s+(.+?):\s+Downloading\s+(\d+)\s+items?\s+of\s+(\d+)/
          )
          if (playlistTotalMatch) {
            const [, playlistTitle, visibleItems, totalItems] = playlistTotalMatch
            const total = Number(totalItems) || Number(visibleItems) || 1
            console.log('[PlaylistProgress] Playlist total detected', {
              downloadId: currentId,
              playlistTitle: playlistTitle.trim(),
              visibleItems: Number(visibleItems),
              totalItems: total,
            })
            stored[itemIdx] = {
              ...stored[itemIdx],
              isPlaylist: true,
              playlistTitle: playlistTitle.trim() || stored[itemIdx].playlistTitle,
              playlistBatchId: stored[itemIdx].playlistBatchId || `direct:${currentId}`,
              currentItem: Number(stored[itemIdx].currentItem) || 1,
              totalItems: total,
              playlistTotal: total,
              status: 'Downloading',
            }
            setStoredDownloads(stored)
          }

          const youtubeMatch = progressData.message.match(
            /(https?:\/\/(?:www\.|music\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|https?:\/\/youtu\.be\/)([\w-]{11})/
          )
          const isPlaylistJob = Boolean(
            stored[itemIdx].isPlaylist ||
            stored[itemIdx].playlistTitle ||
            isPlaylistDownloadUrl(stored[itemIdx].url)
          )

          if (youtubeMatch && isPlaylistJob && !requestedPlaylistVideos.has(youtubeMatch[2])) {
            const youtubeUrl = youtubeMatch[0]
            const videoId = youtubeMatch[2]
            requestedPlaylistVideos.add(videoId)

            console.log('[PlaylistProgress] Current playlist video detected', {
              downloadId: currentId,
              currentItem: stored[itemIdx].currentItem || 0,
              totalItems: stored[itemIdx].totalItems || 0,
              videoId,
              videoUrl: youtubeUrl,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            })

            stored[itemIdx] = {
              ...stored[itemIdx],
              title: stored[itemIdx].currentItem
                ? `Video ${stored[itemIdx].currentItem} of ${stored[itemIdx].totalItems || '…'}`
                : 'Loading playlist video…',
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              currentVideoId: videoId,
              currentVideoUrl: youtubeUrl,
              status: 'Downloading',
              isPlaylist: true,
            }
            setStoredDownloads(stored)

            getVideoInfo(youtubeUrl).then((ytInfo) => {
              const latestDownloads = getStoredDownloads()
              const latestIndex = latestDownloads.findIndex((download) => download.id === currentId)
              if (latestIndex === -1 || latestDownloads[latestIndex].currentVideoId !== videoId) return

              latestDownloads[latestIndex] = {
                ...latestDownloads[latestIndex],
                title: ytInfo?.title || latestDownloads[latestIndex].title,
                thumbnail: ytInfo?.thumbnail || latestDownloads[latestIndex].thumbnail,
                duration: ytInfo?.duration || latestDownloads[latestIndex].duration || 'Unknown',
                status: 'Downloading',
              }
              console.log('[PlaylistProgress] Current video metadata loaded', {
                downloadId: currentId,
                videoId,
                title: latestDownloads[latestIndex].title,
                thumbnail: latestDownloads[latestIndex].thumbnail,
                duration: latestDownloads[latestIndex].duration,
              })
              setStoredDownloads(latestDownloads)
            }).catch((metadataError) => {
              console.warn('Could not load current playlist video metadata:', metadataError)
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
            console.log('[PlaylistProgress] Playlist item count updated', {
              downloadId: currentId,
              currentItem: Number(currentItem),
              totalItems: Number(totalItems),
              downloaded: Math.max(Number(currentItem) - 1, 0),
              remaining: Math.max(Number(totalItems) - Number(currentItem) + 1, 0),
            })
            stored[itemIdx] = {
              ...stored[itemIdx],
              currentItem: parseInt(currentItem),
              totalItems: parseInt(totalItems),
              playlistTotal: parseInt(totalItems),
              isPlaylist: true,
              playlistTitle: stored[itemIdx].playlistTitle || null,
              playlistBatchId: stored[itemIdx].playlistBatchId || `direct:${currentId}`,
            }
            setProgressMap((prev) => {
              const next = new Map(prev)
              next.set(currentId, { progress: 0, fileSize: 'Unknown', speed: 'Unknown', eta: 'Unknown' })
              return next
            })
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
            console.log('[PlaylistProgress] Playlist download finished', {
              downloadId: currentId,
              playlistTitle: stored[itemIdx].playlistTitle,
              totalItems: stored[itemIdx].totalItems || stored[itemIdx].playlistTotal || 0,
            })
            setStoredDownloads(stored)
          }
        }

        if (
          progressData?.error?.includes('Sign in to confirm') ||
          progressData?.error?.includes('exporting YouTube cookies')
        ) {
          onLoginRequired()
        }

        if (progressData?.error) {
          const latest = getStoredDownloads()
          const latestIndex = latest.findIndex((i) => i.id === currentId)
          if (latestIndex !== -1) {
            const previous = latest[latestIndex]
            const nextDetails = progressData.details ? String(progressData.details) : ''
            latest[latestIndex] = {
              ...previous,
              lastError: String(progressData.error),
              errorDetails:
                nextDetails.length >= (previous.errorDetails?.length || 0)
                  ? nextDetails
                  : previous.errorDetails,
              errorExitCode: progressData.exitCode ?? previous.errorExitCode ?? null,
            }
            setStoredDownloads(latest)
          }
        }
      }

      removeProgressListener = window.api.onDownloadProgress(handleProgress) || (() => {})

      await window.api.downloadVideo({
        id: currentId,
        url: item.url,
        isAudioOnly: item.downloadType === 'audio',
        selectedFormat: item.format,
        selectedQuality: item.quality,
        selectBitrate: item.downloadType === 'audio' ? item.bitrate : null,
        title: sanitizeTitle(itemTitle),
        titleTimestamp: itemTitleTimestamp,
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
      const errorMessage = error.message || error.toString()
      const shouldSuggestRepair =
        /yt-dlp|ffmpeg|download tools|media processor|PYI-|Failed to extract script from archive/i.test(
          errorMessage
        )

      if (shouldSuggestRepair && window.api?.showMessageBox) {
        window.api.showMessageBox({
          type: 'warning',
          title: 'Repair Downloads',
          message: 'Download tools need attention.',
          detail: 'Click Repair Downloads in the sidebar, then try the download again after repair finishes.',
          buttons: ['OK'],
          defaultId: 0
        }).catch(() => {})
      }

      const storedDownloads = getStoredDownloads()
      const failedIndex = storedDownloads.findIndex((i) => i.id === currentId)

      if (failedIndex !== -1) {
        storedDownloads[failedIndex].status = 'Failed'
        storedDownloads[failedIndex].isFailed = true
        storedDownloads[failedIndex].lastError = storedDownloads[failedIndex].lastError || errorMessage
        setStoredDownloads(storedDownloads)
        saveDownloadError(storedDownloads[failedIndex], storedDownloads[failedIndex].lastError)
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
      removeProgressListener()
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
      const platform = detectPlatform(normalizedUrl)
      const playlistUrlDetected = isPlaylistDownloadUrl(normalizedUrl)

      const stored = getStoredDownloads()
      const duplicate = isDuplicateDownload(stored, normalizedUrl, format, quality, saveTo, downloadType, bitrate)
      if (duplicate) {
        return { duplicate: true }
      }

      const shouldFetchMetadataBeforeQueue = Boolean(
        options.videoInfo || (playlistUrlDetected && !options.forceSingle)
      )
      const videoInfo = shouldFetchMetadataBeforeQueue
        ? options.videoInfo ?? (await getVideoInfo(normalizedUrl))
        : null

      console.log('[PlaylistProgress] URL classification', {
        url: normalizedUrl,
        playlistUrlDetected,
        metadataIsPlaylist: Boolean(videoInfo?.isPlaylist),
        metadataTitle: videoInfo?.playlistTitle || videoInfo?.title || null,
      })
      if (videoInfo?.unsupportedDownload) {
        return {
          unsupported: true,
          message: videoInfo.unsupportedReason || 'This URL is not supported for download.',
          videoInfo,
        }
      }

      if (videoInfo?.isPlaylist && !options.forceSingle) {
        return { playlist: videoInfo }
      }

      const newId = uuidv4()
      const resolvedPlatform = videoInfo?.platform || platform
      const titleTimestamp = isYouTubePlatform(resolvedPlatform) ? null : Date.now()
      const queueBusy = isProcessing.current || isAnyDownloadInProgress()
      const extractedTitle = videoInfo?.isPlaylist
        ? 'Playlist Item'
        : playlistUrlDetected
          ? 'Preparing playlist…'
          : videoInfo?.title || ''
      const newDownload = {
        id: newId,
        url: normalizedUrl,
        title: isMetadataPlaceholderTitle(extractedTitle)
          ? ''
          : timestampNonYouTubeTitle(extractedTitle, resolvedPlatform, titleTimestamp),
        playlistTitle: videoInfo?.isPlaylist
          ? videoInfo.playlistTitle
          : null,
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
        status: videoInfo ? (queueBusy ? 'Waiting' : 'Queued') : queueBusy ? 'Waiting' : 'Fetching Info...',
        isPlaylistCompleted: false,
        isCompleted: false,
        isFailed: false,
        lastError: '',
        errorDetails: '',
        errorExitCode: null,
        isPlaylist: Boolean(videoInfo?.isPlaylist || playlistUrlDetected),
        playlistBatchId: playlistUrlDetected ? `direct:${newId}` : null,
        platform: resolvedPlatform,
        titleTimestamp,
        needsMetadata: !videoInfo,
        currentItem: 0,
        forceSingle: Boolean(options.forceSingle),
      }

      setStoredDownloads([newDownload, ...stored])
      downloadQueue.current.push(newId)

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

      const playlistBatchId = uuidv4()
      const playlistTotal = selectedVideos.length
      const downloadsToAdd = selectedVideos.map((video, index) => {
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
          lastError: '',
          errorDetails: '',
          errorExitCode: null,
          isPlaylist: false,
          playlistBatchId,
          playlistIndex: index + 1,
          playlistTotal,
          platform: PLATFORMS.YOUTUBE,
          currentItem: 0,
          forceSingle: true,
        }
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
        lastError: '',
        errorDetails: '',
        errorExitCode: null,
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
        item.status === 'Fetching Info...' ||
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
