import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  FaDownload,
  FaTimes,
  FaGlobe,
  FaArrowLeft,
  FaArrowRight,
  FaSync,
  FaUndo,
  FaPlus,
  FaMinus,
  FaCopy,
  FaArrowCircleRight
} from 'react-icons/fa'
import '../common.css'
import PlatformIcons from '../PlatformIcons'
import DownloadList from '../DownloadList'
import { v4 as uuidv4 } from 'uuid'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import alljson from '../../../../../public/all.json'
import { extractVideoId, isDuplicateDownload } from '../commonFunction'
import { detectPlatform, isYouTubePlatform, PLATFORMS } from '../platformUtils'
import AboutUs from '../AboutUs'
import LoginModal from '../LoginModal'
import DonationModal from '../DonationModal'
import PlaylistSelectionModal from '../PlaylistSelectionModal'
import { youtubeAPI } from '../YouTubeAPIManager'
import { nonYouTubeExtractor } from '../NonYouTubeMetadataExtractor'
import { saveDownload, saveDownloadError } from '../../utils/firestoreService'

function BodySection({
  downloadType,
  setPastLinkUrl,
  bitrate,
  quality,
  format,
  saveTo,
  selectedItem,
  setIsSidebarOpen,
  isSidebarOpen,
  setSelectedItem,
  download,
  setDownload,
  setShowWebView,
  showWebView,
  setDownloadListOpen,
  downloadListOpen,
  pastLinkUrl,

  aboutUs,
  setAboutUs,
  updateInfo
}) {
  let storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [downloadCount, setDownloadCount] = useState(() => {
    const saved = localStorage.getItem('downloadCount');
    return saved ? parseInt(saved, 10) : 0;
  });
  // console.log("isWebViewReadyisWebViewReady",isWebViewReady);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [url, setUrl] = useState('')
  const [lastUrl, setLastUrl] = useState('')
  const [isDownloadable, setIsDownloadable] = useState(false)
  const [currentWebViewUrl, setCurrentWebViewUrl] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [progressMap, setProgressMap] = useState(new Map())
  const [videoInfo, setVideoInfo] = useState([])
  const [activeDownloads, setActiveDownloads] = useState(new Set())
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false)
  const [playlistModalLoading, setPlaylistModalLoading] = useState(false)
  const [playlistData, setPlaylistData] = useState(null)
  const currentFileTypes = useRef(new Map())
  const webviewRef = useRef(null)
  const downloadQueue = useRef([])
  const isProcessing = useRef(false)

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

  const customSanitize = (str) => {
    if (!str) return 'Unknown';
    return str
      .replace(/[<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}._-]/gu, ' ')
      .substring(0, 200);
  };
  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(currentWebViewUrl)
     
      .catch((err) => {
        console.error('Failed to copy URL:', err)
      })
  }

  const handleGo = () => {
    if (currentWebViewUrl && webviewRef.current) {
      webviewRef.current.src = currentWebViewUrl
    }
  }
  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.setZoomFactor(zoomLevel)
    }
  }, [zoomLevel])

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 5.0))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.1))
  const handleZoomReset = () => setZoomLevel(1.0)

  useEffect(() => {
    if (pastLinkUrl) {
      const fetchAndDownload = async () => {
        const list = JSON.parse(localStorage.getItem('downloadList') || '[]')
        const normalizedUrl = normalizeYouTubeUrlForSingleVideo(pastLinkUrl)
        const isDuplicate = isDuplicateDownload(
          list,
          normalizedUrl,
          format,
          quality,
          saveTo,
          downloadType,
          bitrate
        )
        if (isDuplicate) {
          if (window.api?.showMessageBox) {
            window.api.showMessageBox({
              type: 'warning',
              title: 'Duplicate Download',
              message:
                'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.',
            })
          } else {
            alert(
              'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.'
            )
          }
          setPastLinkUrl('')
          return
        }
        const videoInfo = await getVideoInfo(normalizedUrl)
        if (videoInfo) {
          if (videoInfo.isPlaylist) {
            setPlaylistModalLoading(true)
            setPlaylistData(videoInfo)
            setPlaylistModalOpen(true)
            setPlaylistModalLoading(false)
          } else {
            addToQueue(normalizedUrl)
            setDownloadListOpen(true)
            setShowWebView(false)
            setIsSidebarOpen(true)
            setSelectedItem('All Files')
            setDownload(true)
          }
        }
        setPastLinkUrl('')
      }
      fetchAndDownload()
    }
  }, [pastLinkUrl])


  const extractPlaylistId = (url) => {
    const playlistMatch = url.match(
      /(?:youtube\.com|music\.youtube\.com|youtu\.be|youtube.googleapis\.com|youtubekids\.com)\/(?:playlist|watch)?.*?[?&]list=([^&#]+)/i
    )
    return playlistMatch ? playlistMatch[1] : null
  }

  useEffect(() => {
    if (webviewRef.current && showWebView) {
      const webview = webviewRef.current;

      const onDomReady = () => {
        setIsWebViewReady(true);
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      };
      webview.addEventListener('dom-ready', onDomReady);
      const handleNavigation = (event) => {
        setCurrentWebViewUrl(event.url);
        checkIfDownloadable(event.url);
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      };

      webview.addEventListener('did-navigate', handleNavigation);
      webview.addEventListener('did-navigate-in-page', handleNavigation);

      return () => {
        webview.removeEventListener('dom-ready', onDomReady);
        webview.removeEventListener('did-navigate', handleNavigation);
        webview.removeEventListener('did-navigate-in-page', handleNavigation);
      };
    }
    setIsWebViewReady(true);

  }, [showWebView, isWebViewReady]);

  useEffect(() => {
    if (currentWebViewUrl) window.api.getYoutubeCookies()
    setLastUrl(currentWebViewUrl)
    setDownload(false)
  }, [currentWebViewUrl])

  // Set YouTube as default URL when Browser is clicked
  useEffect(() => {
    if (showWebView && !url && !currentWebViewUrl) {
      setUrl('https://www.youtube.com');
      setCurrentWebViewUrl('https://www.youtube.com');
    }
  }, [showWebView, url, currentWebViewUrl])

  const DONATION_URL = "https://ko-fi.com/pnutdownloader'"

  const handlePlatformClick = (platformUrl) => {
    window.api.trackEvent('platformUrl', { platformUrl })
    setUrl(platformUrl)
    setShowWebView(true)
    setIsDownloadable(false)
    setIsSidebarOpen(false)
    setIsWebViewReady(false);
  }

  const handleCloseWebView = () => {
    setLastUrl(currentWebViewUrl || url)
    setUrl('')
    setShowWebView(false)
    setIsDownloadable(false)
    setIsSidebarOpen(true)
    setIsWebViewReady(false);
  }

  const handleResumeBrowser = () => {
    if (lastUrl) {
      setUrl(lastUrl)
      setShowWebView(true)
      setIsSidebarOpen(false)
      setSelectedItem('')
    }
  }

  const checkIfDownloadable = (currentUrl) => {
    if (!currentUrl) {
      setIsDownloadable(false);
      return;
    }

    // Check against all video patterns from all.json
    const isDownloadable = alljson?.videoPatterns?.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(currentUrl);
      } catch (error) {
        console.warn(`Invalid regex pattern: ${pattern}`, error);
        return false;
      }
    });

    setIsDownloadable(isDownloadable || false);
  }

  const handleDownloadClick = async () => {

    if (window.api) {
      try {
        window.api.trackEvent('download_button_clicked', {
          url: pastLinkUrl || currentWebViewUrl,
          downloadType: downloadType.toLowerCase(),
          format: format.toLowerCase(),
          quality: quality.toLowerCase(),
          saveTo: saveTo.toLowerCase(),
          bitrate: bitrate?.toLowerCase()
        })
        console.log('Tracked event: download_button_clicked')
      } catch (error) {
        console.error('Failed to track download_button_clicked:', error)
      }
    } else {
      console.error('window.api is not defined')
    }
    setAboutUs(false);
    const rawUrlToDownload = pastLinkUrl || currentWebViewUrl;
    const urlToDownload = normalizeYouTubeUrlForSingleVideo(rawUrlToDownload);
    if (!urlToDownload) return;

    // Duplicate only when same video + same format, quality, saveTo, audio/video, bitrate
    const isDuplicate = isDuplicateDownload(
      storedDownloads,
      urlToDownload,
      format,
      quality,
      saveTo,
      downloadType,
      bitrate
    )

    if (isDuplicate) {
      if (window.api?.showMessageBox) {
        window.api.showMessageBox({
          type: 'warning',
          title: 'Duplicate Download',
          message:
            'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.',
        })
      } else {
        alert(
          'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.'
        )
      }
      return
    }

    try {
      const videoInfo = await getVideoInfo(urlToDownload)
      if (videoInfo?.isPlaylist) {
        setPlaylistModalLoading(true)
        setPlaylistData(videoInfo)
        setPlaylistModalOpen(true)
        setPlaylistModalLoading(false)
        return
      }
    } catch (error) {
      console.error('Failed to determine if URL is playlist:', error)
    }

    setUrl(urlToDownload);
    setDownloadListOpen(true);
    setShowWebView(false);
    setIsSidebarOpen(true);
    setSelectedItem('All Files');
    setDownload(true);
    addToQueue(urlToDownload);
  };

  const handleDonate = () => {
    if (DONATION_URL && window.api) {
      window.api.openExternal(DONATION_URL)
    }
    setShowDonationModal(false)
  }

  const handleLogin = () => {
    window.api.trackEvent('youtube-login')
    const youtubeLoginUrl = 'https://accounts.google.com/ServiceLogin?service=youtube';
    setCurrentWebViewUrl(youtubeLoginUrl);
    setUrl(youtubeLoginUrl);
    setLastUrl(youtubeLoginUrl);
    setShowWebView(true);
    setIsSidebarOpen(false);
    setShowLoginPopup(false);
    setIsWebViewReady(false); // Reset readiness

    if (webviewRef.current) {
      const onDomReady = () => {
        webviewRef.current.src = youtubeLoginUrl;
        setIsWebViewReady(true);
        setCanGoBack(webviewRef.current.canGoBack());
        setCanGoForward(webviewRef.current.canGoForward());
        webviewRef.current.removeEventListener('dom-ready', onDomReady);
      };

      webviewRef.current.addEventListener('dom-ready', onDomReady);
    }
  };
  // Array of API keys from environment variables
  // apiKeys.js


  let currentApiKeyIndex = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('ytKeyIndex')) || 0
    : 0;

  const API_KEYS = [
    import.meta.env.VITE_YOUTUBE_API_KEY1,
    import.meta.env.VITE_YOUTUBE_API_KEY2,
    import.meta.env.VITE_YOUTUBE_API_KEY3,
    import.meta.env.VITE_YOUTUBE_API_KEY4,
    import.meta.env.VITE_YOUTUBE_API_KEY5,
    // ... other keys
  ].filter(key => {
    const isValid = key && key.startsWith('AIza');
    if (!isValid) console.warn('Invalid YouTube API key detected');
    return isValid;
  });

  const getNextApiKey = () => {
    if (API_KEYS.length === 0) throw new Error("No valid YouTube API keys available");

    const key = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;

    // Persist in browser storage (remove if using Node.js)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ytKeyIndex', currentApiKeyIndex.toString());
    }

    return key;
  };

  // Helper function to format duration from seconds to ISO format
  const formatDurationToISO = (duration) => {
    if (typeof duration === 'string' && duration.includes('PT')) {
      // Already in ISO format
      return duration;
    }
    if (typeof duration === 'number') {
      // Convert seconds to ISO format (PT1H2M3S)
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);

      let isoDuration = 'PT';
      if (hours > 0) isoDuration += `${hours}H`;
      if (minutes > 0) isoDuration += `${minutes}M`;
      if (seconds > 0) isoDuration += `${seconds}S`;
      return isoDuration || 'PT0S';
    }
    return duration || 'PT0S';
  };

  const getVideoInfo = async (url) => {
    const platform = detectPlatform(url);

    try {
      if (isYouTubePlatform(platform)) {
        // Use enhanced YouTube API manager
        const videoId = extractVideoId(url);
        const playlistId = extractPlaylistId(url);

        // If we have a videoId (even if URL includes list/index), download as a single video by default.
        if (videoId) {
          const normalizedSingle = normalizeYouTubeUrlForSingleVideo(url)
          return await youtubeAPI.extractVideoInfo(normalizedSingle)
        }

        // No videoId => treat as playlist URL
        if (playlistId) {
          // YouTube Mix/Radio playlists (list=RD...) frequently don't work with Data API.
          // Fallback to yt-dlp playlist extraction via main process.
          if (playlistId.startsWith('RD') && window.api?.fetchPlaylistEntries) {
            return await window.api.fetchPlaylistEntries(url)
          }

          const apiPlaylist = await youtubeAPI.extractPlaylistInfo(url);
          if (apiPlaylist && Array.isArray(apiPlaylist.videos) && apiPlaylist.videos.length > 0) {
            return apiPlaylist
          }
          if (window.api?.fetchPlaylistEntries) {
            return await window.api.fetchPlaylistEntries(url)
          }
          return apiPlaylist
        }
      } else {
        // Use non-YouTube metadata extractor
        return await nonYouTubeExtractor.extractMetadata(url);
      }
    } catch (error) {
      console.error('Failed to fetch video info:', error);

      // If YouTube playlist fetch failed (quota / RD Mix / etc), try yt-dlp fallback via main process
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

      // Fallback to basic metadata
      return {
        videoUrl: url,
        title: `${platform} Video`,
        thumbnail: '',
        duration: 'PT0S',
        isPlaylist: false,
        platform: platform
      };
    }
  };

  const isAnyDownloadInProgress = () => {

    return storedDownloads.some(
      (item) =>
        !item.isCompleted &&
        item.status !== 'Queued' &&
        item.status !== 'Waiting' &&
        item.status !== 'Failed' &&
        item.status !== 'Fetching Info...'
    )
  }

  const addToQueue = async (url) => {
    if (!url) return
    const newId = uuidv4()

    // Add to active downloads immediately for highlighting
    setActiveDownloads(prev => new Set(prev).add(newId))

    const videoInfo = await getVideoInfo(url)

    const newDownload = {
      id: newId,
      url,
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
      status: isAnyDownloadInProgress() ? 'Waiting' : 'Queued', // Set status based on active downloads
      isPlaylistCompleted: false,
      isCompleted: false,
      isFailed: false,
      isPlaylist: videoInfo?.isPlaylist || false,
      platform: videoInfo?.platform || detectPlatform(url),
      currentItem: 0
    }


    localStorage.setItem('downloadList', JSON.stringify([newDownload, ...storedDownloads]))
    downloadQueue.current.push(newId)

    if (!isProcessing.current) {
      processQueue()
    }
  }

  const addSelectedPlaylistVideosToQueue = async (selectedVideos, playlistTitle) => {
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
        platform: PLATFORMS.YOUTUBE, // selectedVideos in this context are YouTube-only
        currentItem: 0,
        forceSingle: true,
      }
    })

    setActiveDownloads((prev) => {
      const next = new Set(prev)
      downloadsToAdd.forEach((d) => next.add(d.id))
      return next
    })

    const stored = JSON.parse(localStorage.getItem('downloadList') || '[]')
    localStorage.setItem('downloadList', JSON.stringify([...downloadsToAdd, ...stored]))
    downloadsToAdd.forEach((d) => downloadQueue.current.push(d.id))

    setDownloadListOpen(true)
    setShowWebView(false)
    setIsSidebarOpen(true)
    setSelectedItem('All Files')
    setDownload(true)

    if (!isProcessing.current) {
      processQueue()
    }
  }

  const processQueue = useCallback(async () => {
    if (downloadQueue.current.length === 0 || isProcessing.current) return;

    isProcessing.current = true;
    const currentId = downloadQueue.current[0];

    try {
      let storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]');
      const itemIndex = storedDownloads.findIndex((item) => item.id === currentId);

      if (itemIndex === -1) {
        downloadQueue.current.shift();
        isProcessing.current = false;
        return processQueue();
      }

      const item = storedDownloads[itemIndex];

      storedDownloads[itemIndex].status = 'Fetching Info...';
      localStorage.setItem('downloadList', JSON.stringify(storedDownloads));

      // Update item with default values instead of fetching from getVideoInfo
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
      };
      setVideoInfo([]); // Clear videoInfo since no metadata is fetched
      localStorage.setItem('downloadList', JSON.stringify(storedDownloads));

      const handleProgress = (progressData) => {
        console.log('progressData', progressData);

        const stored = JSON.parse(localStorage.getItem('downloadList') || '[]');
        const itemIdx = stored.findIndex((i) => i.id === currentId);
        if (itemIdx === -1) return;

        // CRITICAL FIX: Only process progress data if it belongs to THIS download
        // Without this check, progress data from one download overwrites other downloads' metadata
        if (progressData.downloadId && progressData.downloadId !== currentId) {
          console.log(`[IGNORED] Progress data for ${progressData.downloadId}, but current download is ${currentId}`);
          return;
        }

        // Handle video info updates (title, thumbnail, duration) for non-YouTube videos
        if (progressData.title || progressData.sanitizedTitle || progressData.thumbnail || progressData.duration) {
          stored[itemIdx] = {
            ...stored[itemIdx],
            // Prefer title over sanitizedTitle if both are present
            ...(progressData.title ? { title: progressData.title } : (progressData.sanitizedTitle && { title: progressData.sanitizedTitle })),
            ...(progressData.thumbnail && { thumbnail: progressData.thumbnail }),
            ...(progressData.duration && { duration: progressData.duration })
          };
          localStorage.setItem('downloadList', JSON.stringify(stored));
        }

        // Only process message if it exists and is a string
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
            const videoId = match[2]

            getVideoInfo(youtubeUrl).then((ytInfo) => {
              stored[itemIdx] = {
                ...stored[itemIdx],
                title: ytInfo?.title || 'Unknown',
                thumbnail: ytInfo?.thumbnail || stored[itemIdx].thumbnail,
                duration: ytInfo?.duration || 'Unknown',
                status: 'Downloading'
              }
              localStorage.setItem('downloadList', JSON.stringify(stored))
            })

          }

          // Check for authentication error


          if (progressData.message.includes('Destination:')) {
            if (progressData.message.includes('.mp4')) {
              currentFileTypes.current.set(currentId, 'video');
            } else if (progressData.message.includes('.m4a')) {
              currentFileTypes.current.set(currentId, 'audio');
            } else if (progressData.message.includes('.webm')) {
              currentFileTypes.current.set(currentId, 'justAudio');
            } else {
              console.log(`No .mp4, .m4a, or .webm found in Destination message`);
            }
            return;
          }

          const progressMatch = progressData.message.match(
            /(\d+\.\d+)%\s+of\s+~?\s*([\d.]+\w+)\s+at\s+([\d.]+\w+\/\w+)\s+ETA\s+(\d+:\d+|Unknown)/
          );
          if (progressMatch) {
            const [, progress, fileSize, speed, eta] = progressMatch;
            const rawProgress = parseFloat(progress);
            let totalProgress = 0;
            const currentFileType = currentFileTypes.current.get(currentId);

            console.log('Progress matched:', { progress, fileSize, speed, eta, rawProgress, currentFileType });

            if (currentFileType === 'video') {
              totalProgress = rawProgress * 0.9;
            } else if (currentFileType === 'audio') {
              totalProgress = 90 + rawProgress * 0.1;
            } else if (currentFileType === 'justAudio') {
              totalProgress = rawProgress;
            } else {
              console.log(
                `No valid file type for ${currentId}, totalProgress remains ${totalProgress}`
              );
            }

            setProgressMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(currentId, { progress: totalProgress, fileSize, speed, eta });
              return newMap;
            });
          } else {
            // Try to match simpler progress format without ETA
            const simpleProgressMatch = progressData.message.match(
              /(\d+\.\d+)%\s+of\s+~?\s*([\d.]+\w+)/
            );
            if (simpleProgressMatch) {
              const [, progress, fileSize] = simpleProgressMatch;
              const rawProgress = parseFloat(progress);
              let totalProgress = 0;
              const currentFileType = currentFileTypes.current.get(currentId);

              console.log('Simple progress matched:', { progress, fileSize, rawProgress, currentFileType });

              if (currentFileType === 'video') {
                totalProgress = rawProgress * 0.9;
              } else if (currentFileType === 'audio') {
                totalProgress = 90 + rawProgress * 0.1;
              } else if (currentFileType === 'justAudio') {
                totalProgress = rawProgress;
              } else {
                totalProgress = rawProgress; // Default to raw progress if no file type detected
              }

              setProgressMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentId, { progress: totalProgress, fileSize, speed: 'N/A', eta: 'N/A' });
                return newMap;
              });
            }
          }

          const itemCountMatch = progressData.message.match(
            /\[download\] Downloading item (\d+) of (\d+)/
          );
          if (itemCountMatch) {
            const [, currentItem, totalItems] = itemCountMatch;
            stored[itemIdx].currentItem = parseInt(currentItem);
            stored[itemIdx].totalItems = parseInt(totalItems);
            localStorage.setItem('downloadList', JSON.stringify(stored));
          }

          if (progressData.message.includes('has already been downloaded')) {
            stored[itemIdx].status = 'Completed';
            stored[itemIdx].isCompleted = true;
            setProgressMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(currentId, { progress: 100, fileSize: 'N/A', speed: 'N/A', eta: 'N/A' });
              return newMap;
            });
            localStorage.setItem('downloadList', JSON.stringify(stored));
            saveDownload(stored[itemIdx])

            // Increment download count and check if we should show donation modal
            const newCount = downloadCount + 1;
            setDownloadCount(newCount);
            localStorage.setItem('downloadCount', newCount.toString());

            // Show donation modal every 2 downloads
            if (newCount % 2 === 0) {
              setShowDonationModal(true)
            }
          }

          if (progressData.message.includes('Finished downloading playlist:')) {
            stored[itemIdx].isPlaylistCompleted = true;
            localStorage.setItem('downloadList', JSON.stringify(stored));
          }
        }

        // Handle status updates (e.g., completion) even if message is missing
        if (progressData?.status?.includes('Download complete!')) {
          stored[itemIdx].status = 'Completed';
          stored[itemIdx].isCompleted = true;
          setProgressMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(currentId, { progress: 100, fileSize: 'N/A', speed: 'N/A', eta: 'N/A' });
            return newMap;
          });
          localStorage.setItem('downloadList', JSON.stringify(stored));
          saveDownload(stored[itemIdx])

          // Increment download count and check if we should show donation modal
          const newCount = downloadCount + 1;
          setDownloadCount(newCount);
          localStorage.setItem('downloadCount', newCount.toString());

          // Show donation modal every 2 downloads
          if (newCount % 2 === 0) {
            setShowDonationModal(true)
          }

          // Remove from active downloads when completed
          setActiveDownloads(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentId);
            return newSet;
          });

        }
        if (
          progressData?.error?.includes('Sign in to confirm') ||
          progressData?.error?.includes('exporting YouTube cookies')
        ) {
          setShowLoginPopup(true); // Trigger the modal to open


        }
      };

      window.api.onDownloadProgress(handleProgress);

      await window.api.downloadVideo({
        id: currentId,
        url: item.url,
        isAudioOnly: item.downloadType === 'audio',
        selectedFormat: item.format,
        selectedQuality: item.quality,
        selectBitrate: item.downloadType === 'audio' ? item.bitrate : null,
        title: customSanitize(item.title),
        playlistTitle: item.playlistTitle ? customSanitize(item.playlistTitle) : null,
        forceSingle: Boolean(item.forceSingle),
        saveTo,

      });

      storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]');
      const completedIndex = storedDownloads.findIndex((i) => i.id === currentId);
      if (completedIndex !== -1) {
        storedDownloads[completedIndex].status = 'Completed';
        storedDownloads[completedIndex].isCompleted = true;

        // Remove from active downloads when completed
        setActiveDownloads(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentId);
          return newSet;
        });

        localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
        saveDownload(storedDownloads[completedIndex])

        // Increment download count and check if we should show donation modal
        const newCount = downloadCount + 1;
        setDownloadCount(newCount);
        localStorage.setItem('downloadCount', newCount.toString());

        // Show donation modal every 2 downloads
        if (newCount % 2 === 0) {
          setShowDonationModal(true)
        }
      }
    } catch (error) {
      storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]');
      const failedIndex = storedDownloads.findIndex((i) => i.id === currentId);
      console.log('error', error);

      if (failedIndex !== -1) {
        storedDownloads[failedIndex].status = 'Failed';
        storedDownloads[failedIndex].isFailed = true;
        localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
        saveDownloadError(storedDownloads[failedIndex], error.message || error.toString())

        // Remove from active downloads when failed
        setActiveDownloads(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentId);
          return newSet;
        });

        setProgressMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentId, {
            progress: 0,
            fileSize: 'N/A',
            speed: 'N/A',
            eta: 'N/A',
            status: 'Failed',
          });
          return newMap;
        });
      }
    } finally {
      downloadQueue.current.shift();
      isProcessing.current = false;
      if (downloadQueue.current.length > 0) {
        const nextItemIndex = storedDownloads.findIndex(
          (item) => item.id === downloadQueue.current[0]
        );
        if (nextItemIndex !== -1 && !isAnyDownloadInProgress()) {
          storedDownloads[nextItemIndex].status = 'Queued';
          localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
        }
        processQueue();
      }
    }
  }, [downloadType, format, quality, saveTo, bitrate]);

  useEffect(() => {
    const queuedDownloads = storedDownloads.filter(
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
  }, [])
  const handleRetry = (id) => {
    if (isProcessing.current) return;
    window.api.trackEvent('handleRetry')
    let storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]');
    const itemIndex = storedDownloads.findIndex((item) => item.id === id);

    if (itemIndex === -1) return;

    const item = storedDownloads[itemIndex];

    // Only retry if the item has failed
    if (item.status !== 'Failed') return;

    // Reset the item's status and progress
    storedDownloads[itemIndex] = {
      ...item,
      status: isAnyDownloadInProgress() ? 'Waiting' : 'Queued',
      isFailed: false,
      progress: 0,
      fileSize: 'Unknown',
      speed: 'Unknown',
      eta: 'Unknown',
    };

    localStorage.setItem('downloadList', JSON.stringify(storedDownloads));

    // Add the item back to the queue
    downloadQueue.current.push(id);

    // Trigger queue processing if not already in progress
    if (!isProcessing.current) {
      processQueue();
    }
  };
  return (
    <div style={{ width: !showWebView ? '90%' : '100%' }}>
      {aboutUs ? (
        <div style={{ height: '70vh' }}>
          <AboutUs updateInfo={updateInfo} />
        </div>
      ) : !showWebView ? (
        <>
          {downloadListOpen && selectedItem ? (
            <div className="video-preview" style={{ marginRight: 10 }}>
              <DownloadList
                downloadType={downloadType}
                quality={quality}
                format={format}
                saveTo={saveTo}
                url={currentWebViewUrl}
                selectedItem={selectedItem}
                download={download}
                setDownload={setDownload}
                progressMap={progressMap}
                videoInfo={videoInfo}
                bitrate={bitrate}
                onRetry={handleRetry}
                activeDownloads={activeDownloads}
              />
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id="close-tooltip">{lastUrl ? 'Resume Browser' : 'Back'}</Tooltip>
                }
              >
                <button
                  className="btn btn-danger   d-flex align-items-center justify-content-center shadow close-webview-btn"
                  onClick={() =>
                    lastUrl
                      ? handleResumeBrowser()
                      : (setShowWebView(false), setDownloadListOpen(false), setSelectedItem(''))
                  }
                >
                  {lastUrl ? <FaGlobe size={20} /> : <FaArrowLeft size={20} />}
                  <span className="ms-2 fw-medium" style={{ whiteSpace: 'nowrap' }}>
                    {lastUrl ? 'Resume Browser' : 'Back'}
                  </span>
                </button>
              </OverlayTrigger>
            </div>
          ) : (
            <div className="bottom-container">
              <PlatformIcons handlePlatformClick={handlePlatformClick} />
              {lastUrl && (
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="close-tooltip">Resume Browser</Tooltip>}
                >
                  <button
                    className="btn btn-danger   d-flex align-items-center justify-content-center shadow close-webview-btn"
                    //
                    onClick={handleResumeBrowser}
                  >
                    <FaGlobe size={20} />
                    <span className="ms-2 fw-medium" style={{ whiteSpace: 'nowrap' }}>
                      Resume Browser
                    </span>
                  </button>
                </OverlayTrigger>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="webview-container">
          <div className="browser-header">
            <div className="navigation-controls">
              <button
                className="nav-btn"
                onClick={() => webviewRef.current?.goBack()}
                disabled={!isWebViewReady || !canGoBack}
              >
                <FaArrowLeft size={16} />
              </button>
              <button
                className="nav-btn"
                onClick={() => webviewRef.current?.goForward()}
                disabled={!isWebViewReady || !canGoForward}
              >
                <FaArrowRight size={16} />
              </button>
              <button className="nav-btn" onClick={() => webviewRef.current?.reload()}
                disabled={!isWebViewReady}
              >
                <FaSync size={16} />
              </button>
            </div>
            <div className="zoom-controls">
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="zoom-out-tooltip">Zoom Out</Tooltip>}
              >
                <button className="zoom-btn" onClick={handleZoomOut}>
                  <FaMinus size={14} />
                </button>
              </OverlayTrigger>
              <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="zoom-in-tooltip">Zoom In</Tooltip>}
              >
                <button className="zoom-btn" onClick={handleZoomIn}>
                  <FaPlus size={14} />
                </button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="zoom-reset-tooltip">Reset Zoom</Tooltip>}
              >
                <button className="zoom-btn" onClick={handleZoomReset}>
                  <FaUndo size={14} />
                </button>
              </OverlayTrigger>
            </div>
            <div className="url-bar">
              <FaGlobe size={16} className="url-icon" />
              <input
                type="text"
                value={currentWebViewUrl}
                onChange={(e) => setCurrentWebViewUrl(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (webviewRef.current.src = currentWebViewUrl)
                }
                placeholder="Enter URL or search..."
              />
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="copy-tooltip">Copy URL</Tooltip>}
              >
                <button className="url-btn" onClick={handleCopyUrl}>
                  <FaCopy size={16} />
                </button>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={<Tooltip id="go-tooltip">Go</Tooltip>}>
                <button className="url-btn" onClick={handleGo}>
                  <FaArrowCircleRight size={16} />
                </button>
              </OverlayTrigger>
            </div>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="close-tooltip">Close Browser</Tooltip>}
            >
              <button
                className="btn btn-danger d-flex align-items-center justify-content-center shadow close-webview-btn"
                onClick={handleCloseWebView}
              >
                <FaTimes size={16} />
                <span className="ms-2 fw-medium">Close</span>
              </button>
            </OverlayTrigger>
          </div>
          <div className="webview-height">
            {isWebViewReady ?
              <webview ref={webviewRef} src={url} style={{ height: '100%', width: '100%' }} />
              : <p>sdfsdf</p>
            }


          </div>
          {isDownloadable && (
            <button className="download-btn" onClick={handleDownloadClick}>
              {downloading ? (
                'Downloading...'
              ) : (
                <>
                  <FaDownload /> Download
                </>
              )}
            </button>
          )}
        </div>
      )}
      {showLoginPopup && (
        <LoginModal
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          handleLogin={handleLogin}
        />
      )}
      {showDonationModal && (
        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          onDonate={handleDonate}
        />
      )}

      {playlistModalOpen && (
        <PlaylistSelectionModal
          isOpen={playlistModalOpen}
          onClose={() => {
            setPlaylistModalOpen(false)
            setPlaylistData(null)
          }}
          onConfirm={(selected) => {
            const title = playlistData?.playlistTitle || playlistData?.title || null
            setPlaylistModalOpen(false)
            addSelectedPlaylistVideosToQueue(selected, title)
            setPlaylistData(null)
          }}
          playlist={playlistData}
          isLoading={playlistModalLoading}
        />
      )}

    </div>
  )
}

export default BodySection
