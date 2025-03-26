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
  FaMinus
} from 'react-icons/fa'
import '../common.css'
import PlatformIcons from '../PlatformIcons'
import DownloadList from '../DownloadList'
import { v4 as uuidv4 } from 'uuid'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import alljson from '../../../../../public/all.json'

function BottomSection({
  downloadType,
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
  pastLinkUrl
}) {
  const [url, setUrl] = useState('')
  const [lastUrl, setLastUrl] = useState('')
  const [isDownloadable, setIsDownloadable] = useState(false)
  const [currentWebViewUrl, setCurrentWebViewUrl] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [progressMap, setProgressMap] = useState(new Map())
  const [videoInfo, setVideoInfo] = useState()

  const webviewRef = useRef(null)
  const downloadQueue = useRef([])
  const isProcessing = useRef(false)

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
        const videoInfo = await getVideoInfo(pastLinkUrl)
        if (videoInfo) {
          addToQueue(pastLinkUrl)
          setDownloadListOpen(true)
          setShowWebView(false)
          setIsSidebarOpen(true)
          setSelectedItem('Recent Download')
          setDownload(true)
        }
      }
      fetchAndDownload()
    }
  }, [pastLinkUrl])

  const extractVideoId = (url) => {
    const fullUrlMatch = url.match(/[?&]v=([^&]+)/)
    if (fullUrlMatch) return fullUrlMatch[1]
    const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/)
    if (shortUrlMatch) return shortUrlMatch[1]
    const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
    if (embedUrlMatch) return embedUrlMatch[1]
    const shortsUrlMatch = url.match(/youtube\.com\/shorts\/([^?]+)/)
    if (shortsUrlMatch) return shortsUrlMatch[1]
    const musicUrlMatch = url.match(/music\.youtube\.com\/watch\?.*v=([^&]+)/)
    
    if (musicUrlMatch) return musicUrlMatch[1]
    return null
  }

  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
  const extractPlaylistId = (url) => {
    const playlistMatch = url.match(
      /(?:youtube\.com|music\.youtube\.com)\/(?:playlist|watch)?.*?[?&]list=([^&#]+)/
    )

    return playlistMatch ? playlistMatch[1] : null
  }

  useEffect(() => {
    if (webviewRef.current) {
      const webview = webviewRef.current
      const handleNavigation = (event) => {
        setCurrentWebViewUrl(event.url)
        checkIfDownloadable(event.url)
      }
      webview.addEventListener('did-navigate', handleNavigation)
      webview.addEventListener('did-navigate-in-page', handleNavigation)
      return () => {
        webview.removeEventListener('did-navigate', handleNavigation)
        webview.removeEventListener('did-navigate-in-page', handleNavigation)
      }
    }
  }, [showWebView])

  useEffect(() => {
    if (currentWebViewUrl) window.api.getYoutubeCookies()
    setLastUrl(currentWebViewUrl)
    setDownload(false)
  }, [currentWebViewUrl])

  const handlePlatformClick = (platformUrl) => {
    setUrl(platformUrl)
    setShowWebView(true)
    setIsDownloadable(false)
    setIsSidebarOpen(false)
  }

  const handleCloseWebView = () => {
    setLastUrl(currentWebViewUrl || url)
    setUrl('')
    setShowWebView(false)
    setIsDownloadable(false)
    setIsSidebarOpen(true)
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
    setIsDownloadable(
      alljson?.videoPatterns?.some((pattern) => new RegExp(pattern).test(currentUrl))
    )
  }

  const handleDownloadClick = () => {
    const urlToDownload = pastLinkUrl || currentWebViewUrl
    if (!urlToDownload) return

    const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
    if (storedDownloads.some((item) => item.url === urlToDownload)) {
      if (!window.alertShown) {
        window.api.showMessageBox({
          type: 'warning',
          title: 'Duplicate Download',
          message: 'This URL is already in the download list.'
        })
        window.alertShown = true
        setTimeout(() => (window.alertShown = false), 1000)
      }
      return
    }

    setUrl(urlToDownload)
    setDownloadListOpen(true)
    setShowWebView(false)
    setIsSidebarOpen(true)
    setSelectedItem('Recent Download')
    setDownload(true)
    addToQueue(urlToDownload)
  }

  const getVideoInfo = async (url) => {
    const videoId = extractVideoId(url)
    const playlistId = extractPlaylistId(url)

    if (!videoId && !playlistId) return null

    if (videoId && !playlistId) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`
      )
      const data = await response.json()
      if (data.items.length === 0) return null
      const { snippet, contentDetails } = data.items[0]
      
      return {
        videoUrl: url,
        title: snippet.title,
        thumbnail: snippet.thumbnails.standard.url,
        duration: contentDetails.duration,
        isPlaylist: false
      }
    }

    if (playlistId) {
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`
      )
      const playlistData = await playlistResponse.json()

      if (playlistData.items.length === 0) return null
      const { snippet } = playlistData.items[0]

      const itemsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=2&key=${API_KEY}`
      )
      const itemsData = await itemsResponse.json()

      const isYouTubeMusic = new URL(url).hostname === 'music.youtube.com'
      const videos = itemsData.items.map((item) => ({
        videoUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: isYouTubeMusic
          ? item.snippet.thumbnails?.standard?.url
          : item.snippet.thumbnails?.standard?.url
      }))

      return {
        playlistUrl: url,
        playlistTitle: snippet.title, // Explicitly use playlistTitle
        thumbnail: isYouTubeMusic
          ? snippet.thumbnails?.standard?.url
          : snippet.thumbnails?.standard?.url,
        // totalVideos: playlistData.items[0].contentDetails.itemCount ||0,
        videos,
        isPlaylist: true
      }
    }
  }

  const addToQueue = async (url) => {
    if (!url) return
    const newId = uuidv4()
    const videoInfo = await getVideoInfo(url) // Fetch video/playlist info
    const newDownload = {
      id: newId,
      url,
      title: videoInfo?.isPlaylist ? 'Playlist Item' : videoInfo?.title || 'Pending...', // Individual video title or placeholder
      playlistTitle: videoInfo?.isPlaylist ? videoInfo.playlistTitle : null, // Store playlist title if applicable
      thumbnail: videoInfo?.thumbnail || '',
      filename: '',
      quality,
      format,
      duration: videoInfo?.duration || 'Unknown',
      progress: 0,
      fileSize: 'Unknown',
      speed: 'Unknown',
      eta: 'Unknown',
      status: 'Queued',
      isCompleted: false,
      isFailed: false,
      isPlaylist: videoInfo?.isPlaylist || false,
      currentItem: 0,
      totalItems: videoInfo?.totalVideos || 0
    }

    const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
    localStorage.setItem('downloadList', JSON.stringify([newDownload, ...storedDownloads]))
    downloadQueue.current.push(newId)

    if (!isProcessing.current) {
      processQueue()
    }
  }

  const processQueue = useCallback(async () => {
    if (downloadQueue.current.length === 0 || isProcessing.current) return

    isProcessing.current = true
    const currentId = downloadQueue.current[0]

    try {
      let storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
      const itemIndex = storedDownloads.findIndex((item) => item.id === currentId)

      if (itemIndex === -1) {
        downloadQueue.current.shift()
        isProcessing.current = false
        return processQueue()
      }

      const item = storedDownloads[itemIndex]

      storedDownloads[itemIndex].status = 'Fetching Info...'
      localStorage.setItem('downloadList', JSON.stringify(storedDownloads))

      let info = await getVideoInfo(item.url)

      storedDownloads[itemIndex] = {
        ...storedDownloads[itemIndex],
        title: info?.isPlaylist ? 'Playlist Item' : info?.title || 'Unknown', // Individual video title
        playlistTitle: info?.isPlaylist ? info.playlistTitle : null, // Playlist title
        thumbnail: info?.thumbnail || '',
        filename:
          info?.filename ||
          `${info?.isPlaylist ? info.playlistTitle : info?.title || 'video'}.${format === 'mp3' ? 'mp3' : 'mp4'}`,
        duration: info?.duration || 'Unknown',
        fileSize: info?.fileSize || 'Unknown',
        status: 'Downloading',
        isPlaylist: info?.isPlaylist || false,
        totalItems: info?.totalVideos || 0,
        currentItem: info?.isPlaylist ? 1 : 0
      }
      setVideoInfo(info)
      localStorage.setItem('downloadList', JSON.stringify(storedDownloads))

      const handleProgress = (progressData) => {
        const stored = JSON.parse(localStorage.getItem('downloadList') || '[]')
        const itemIdx = stored.findIndex((i) => i.id === currentId)

        if (itemIdx === -1) return

        if (progressData.message.match(/(https?:\/\/www\.youtube\.com\/watch\?v=[\w-]+)/)) {
          const youtubeUrl = progressData.message.match(
            /(https?:\/\/www\.youtube\.com\/watch\?v=[\w-]+)/
          )[1]
          getVideoInfo(youtubeUrl).then((ytInfo) => {
            stored[itemIdx] = {
              ...stored[itemIdx],
              title: ytInfo?.title || 'Unknown', // Update individual video title
              thumbnail: ytInfo?.thumbnail || stored[itemIdx].thumbnail, // Preserve playlist thumbnail if already set
              duration: ytInfo?.duration || 'Unknown',
              status: 'Downloading'
            }
            localStorage.setItem('downloadList', JSON.stringify(stored))
          })
        }

        const progressMatch = progressData.message.match(
          /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
        )
        if (progressMatch) {
          const [, progress, fileSize, speed, eta] = progressMatch
          setProgressMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(currentId, { progress: parseFloat(progress), fileSize, speed, eta })
            return newMap
          })
        }

        const itemCountMatch = progressData.message.match(
          /\[download\] Downloading item (\d+) of (\d+)/
        )
        if (itemCountMatch) {
          const [, currentItem, totalItems] = itemCountMatch
          stored[itemIdx].currentItem = parseInt(currentItem)
          stored[itemIdx].totalItems = parseInt(totalItems)
          localStorage.setItem('downloadList', JSON.stringify(stored))
        }

        if (
          progressData?.status?.includes('Download complete!') ||
          progressData.message.includes('Finished downloading playlist:')
        ) {
          stored[itemIdx].status = 'Completed'
          stored[itemIdx].isCompleted = true
          localStorage.setItem('downloadList', JSON.stringify(stored))
        }
      }

      window.api.onDownloadProgress(handleProgress)

      await window.api.downloadVideo({
        id: currentId,
        url: item.url,
        isAudioOnly: downloadType === 'Audio',
        selectedFormat: format,
        selectedQuality: quality,
        saveTo
      })

      storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
      const completedIndex = storedDownloads.findIndex((i) => i.id === currentId)
      if (completedIndex !== -1) {
        storedDownloads[completedIndex].status = 'Completed'
        storedDownloads[completedIndex].isCompleted = true
        localStorage.setItem('downloadList', JSON.stringify(storedDownloads))
      }
    } catch (error) {
      console.error('Download error:', error)
      const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
      const failedIndex = storedDownloads.findIndex((i) => i.id === currentId)
      if (failedIndex !== -1) {
        storedDownloads[failedIndex].status = 'Failed'
        storedDownloads[failedIndex].isFailed = true
        localStorage.setItem('downloadList', JSON.stringify(storedDownloads))
      }
    } finally {
      downloadQueue.current.shift()
      isProcessing.current = false
      if (downloadQueue.current.length > 0) {
        processQueue()
      }
    }
  }, [downloadType, format, quality, saveTo])

  useEffect(() => {
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
    const queuedDownloads = storedDownloads.filter(
      (item) =>
        item.status === 'Queued' || item.status === 'Downloading' || item.status === 'Fetching Info'
    )

    if (queuedDownloads.length > 0) {
      downloadQueue.current = queuedDownloads.map((item) => item.id)
      if (!isProcessing.current) {
        processQueue()
      }
    }
  }, [])

  return (
    <div>
      {!showWebView ? (
        <>
          {downloadListOpen && selectedItem ? (
            <div className="video-preview" style={{ marginLeft: 60, marginRight: 10 }}>
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
              />
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id="close-tooltip">{lastUrl ? 'Resume Browser' : 'Back'}</Tooltip>
                }
              >
                <button
                  className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
                  style={{ width: '48px', height: '48px' }}
                  onClick={() =>
                    lastUrl
                      ? handleResumeBrowser()
                      : (setShowWebView(false), setDownloadListOpen(false), setSelectedItem(''))
                  }
                >
                  {lastUrl ? <FaGlobe size={16} /> : <FaArrowLeft size={20} />}
                </button>
              </OverlayTrigger>
            </div>
          ) : (
            <div className="bottom-container">
              <h1>Select a service below and enter your search query</h1>
              <PlatformIcons handlePlatformClick={handlePlatformClick} />
              {lastUrl && (
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="close-tooltip">Resume Browser</Tooltip>}
                >
                  <button
                    className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
                    style={{ width: '48px', height: '48px' }}
                    onClick={handleResumeBrowser}
                  >
                    <FaGlobe size={16} />
                  </button>
                </OverlayTrigger>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          className="webview-container"
          style={{ margin: isSidebarOpen ? '10px 20px 10px 60px' : '10px 20px 10px 30px' }}
        >
          <div className="browser-header">
            <div className="navigation-controls">
              <button
                className="nav-btn"
                onClick={() => webviewRef.current?.goBack()}
                disabled={!webviewRef.current?.canGoBack()}
              >
                <FaArrowLeft size={16} />
              </button>
              <button
                className="nav-btn"
                onClick={() => webviewRef.current?.goForward()}
                disabled={!webviewRef.current?.canGoForward()}
              >
                <FaArrowRight size={16} />
              </button>
              <button className="nav-btn" onClick={() => webviewRef.current?.reload()}>
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
            </div>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="close-tooltip">Close Browser</Tooltip>}
            >
              <button
                className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
                style={{ width: '40px', height: '40px' }}
                onClick={handleCloseWebView}
              >
                <FaTimes size={18} />
              </button>
            </OverlayTrigger>
          </div>
          <div style={{ height: '88%', marginBottom: 30 }}>
            <webview ref={webviewRef} src={url} style={{ height: '100%', width: '100%' }} />
          </div>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="close-tooltip">Close Process</Tooltip>}
          >
            <button
              className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
              style={{ width: '48px', height: '48px' }}
              onClick={handleCloseWebView}
            >
              <FaTimes size={20} />
            </button>
          </OverlayTrigger>
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
    </div>
  )
}

export default BottomSection
