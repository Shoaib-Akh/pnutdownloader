import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FaDownload, FaTimes, FaGlobe, FaArrowLeft } from 'react-icons/fa'
import '../common.css'
import PlatformIcons from '../PlatformIcons'
import DownloadList from '../DownloadList'
import { v4 as uuidv4 } from 'uuid'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'

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
  const [downloadList, setDownloadList] = useState([])
  const webviewRef = useRef(null)
  const downloadQueue = useRef([])
  const isDownloading = useRef(false)
  const [progressMap, setProgressMap] = useState(new Map())

  useEffect(() => {
    if (pastLinkUrl) {
      const fetchAndDownload = async () => {
        try {
          const videoInfo = await getVideoInfo(pastLinkUrl)
          if (videoInfo) {
            addToQueue(pastLinkUrl)
            setDownloadListOpen(true)
            setShowWebView(false)
            setIsSidebarOpen(true)
            setSelectedItem('Recent Download')
            setDownload(true)
          }
        } catch (error) {
          console.error('Error fetching video info:', error)
        }
      }

      fetchAndDownload()
    }
  }, [pastLinkUrl])
  const extractVideoId = (url) => {
    // Handle full YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID)
    const fullUrlMatch = url.match(/[?&]v=([^&]+)/)
    if (fullUrlMatch) return fullUrlMatch[1]

    // Handle shortened YouTube URL (https://youtu.be/VIDEO_ID)
    const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/)
    if (shortUrlMatch) return shortUrlMatch[1]

    // Handle embedded YouTube URL (https://www.youtube.com/embed/VIDEO_ID)
    const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
    if (embedUrlMatch) return embedUrlMatch[1]

    // If no match, return null
    return null
  }
  const API_KEY = 'AIzaSyAqOmz88j_a10_Eoa7-Z9lgW8b-J6YrXI4'

  const extractPlaylistId = (url) => {
    // Handle playlist URL (https://www.youtube.com/playlist?list=PLAYLIST_ID)
    const playlistMatch = url.match(/[?&]list=([^&]+)/)
    if (playlistMatch) return playlistMatch[1]

    // Handle playlist in video URL (https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID)
    const videoPlaylistMatch = url.match(/[?&]list=([^&]+)/)
    if (videoPlaylistMatch) return videoPlaylistMatch[1]

    // If no match, return null
    return null
  }

  // Handle webview navigation
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

  // Update last URL and reset download state
  useEffect(() => {
    if (currentWebViewUrl) {
      window.api.getYoutubeCookies()
    }
    setLastUrl(currentWebViewUrl)
    setDownload(false)
  }, [currentWebViewUrl])

  // Handle platform click
  const handlePlatformClick = (platformUrl) => {
    setUrl(platformUrl)
    setShowWebView(true)
    setIsDownloadable(false)
    setIsSidebarOpen(false)
  }

  // Handle close webview
  const handleCloseWebView = () => {
    setLastUrl(currentWebViewUrl || url)
    setUrl('')
    setShowWebView(false)
    setIsDownloadable(false)
    setIsSidebarOpen(true)
  }

  // Handle resume browser
  const handleResumeBrowser = () => {
    if (lastUrl) {
      setUrl(lastUrl)
      setShowWebView(true)
      setIsSidebarOpen(false)
    }
  }
  const isPlaylist = url.includes('playlist') || url.includes('&list=') || url.includes('?list=')

  // Check if the URL is downloadable
  const checkIfDownloadable = (currentUrl) => {
    const videoPatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /vimeo\.com\/\d+/,
      /facebook\.com\/watch\//,
      /tiktok\.com\/@.+\/video\/\d+/,
      /twitter\.com\/.+\/status\/\d+/
    ]
    setIsDownloadable(videoPatterns.some((pattern) => pattern.test(currentUrl)))
  }
  // Handle download click
  const handleDownloadClick = () => {
    const urlToDownload = pastLinkUrl || currentWebViewUrl

    // Check if URL is available
    if (!urlToDownload) {
      console.error('No URL detected.')
      return
    }

    // Check if the URL already exists in the download list
    const existingDownload = downloadList.some((item) => item.url === urlToDownload)

    if (existingDownload) {
      // Show a warning message if the URL is already in the download list
      if (!window.alertShown) {
        window.api.showMessageBox({
          type: 'warning',
          title: 'Duplicate Download',
          message: 'This URL is already in the download list.'
        })
        window.alertShown = true
        setTimeout(() => (window.alertShown = false), 1000) // Reset the flag after 1 second
      }
      return // Exit the function if the URL already exists
    }

    // Update state
    setUrl(urlToDownload)
    setDownloadListOpen(true)
    setShowWebView(false)
    setIsSidebarOpen(true)
    setSelectedItem('Recent Download')
    setDownload(true)

    // Add URL to the download queue
    addToQueue(urlToDownload)
  }

  const getVideoInfo = async (url) => {
    try {
      const videoId = extractVideoId(url)
      const playlistId = extractPlaylistId(url)

      if (!videoId && !playlistId) throw new Error('Invalid YouTube URL')

      let videoInfo = null
      let playlistInfo = null

      // Fetch video info if it's a single video
      if (videoId) {
        const videoResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`
        )
        const videoData = await videoResponse.json()

        if (videoData.items.length === 0) throw new Error('Video not found')

        const snippet = videoData.items[0].snippet
        const contentDetails = videoData.items[0].contentDetails

        videoInfo = {
          videoUrl: url,
          title: snippet.title,
          thumbnail: snippet.thumbnails.high.url,
          duration: contentDetails.duration, // ISO 8601 format
          isPlaylist: false
        }
      }

      // Fetch playlist info if it's a playlist
      if (playlistId) {
        const playlistResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${API_KEY}`
        )

        const playlistData = await playlistResponse.json()

        if (playlistData.items.length === 0) throw new Error('Playlist not found')

        const playlistSnippet = playlistData.items[0].snippet
        const playlistContentDetails = playlistData.items[0].contentDetails

        // Fetch the list of videos in the playlist
        const playlistItemsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}`
        )
        const playlistItemsData = await playlistItemsResponse.json()

        const videos = playlistItemsData.items.map((item) => ({
          videoUrl: item.snippet.resourceId.url,
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url
        }))

        playlistInfo = {
          playlistUrl: url,
          title: playlistSnippet.title,
          thumbnail: playlistSnippet.thumbnails.high.url,
          totalVideos: playlistContentDetails.itemCount,
          videos: videos,
          isPlaylist: true
        }
      }

      return {
        ...videoInfo,
        ...playlistInfo
      }
    } catch (error) {
      console.error('Error fetching video/playlist info:', error)
      return null
    }
  }

  const addToQueue = async (url) => {
    if (!url) return
    const newId = uuidv4()
    const newDownload = {
      id: newId,
      url,
      title: 'Pending...',
      thumbnail: '',
      filename: '',
      quality: quality,
      format: format,
      duration: 'Unknown',
      progress: 0,
      fileSize: 'Unknown',
      speed: 'Unknown',
      eta: 'Unknown',
      status: 'Queued',
      isCompleted: false,
      isFailed: false,
      isPaused: false,
      playlist: isPlaylist,
      currentItem: 0,
      totalItems: 0
    }

    setDownloadList((prev) => [newDownload, ...prev])
    localStorage.setItem(
      'downloadList',
      JSON.stringify([newDownload, ...JSON.parse(localStorage.getItem('downloadList') || '[]')])
    )
    downloadQueue.current.push(url)

    if (!isDownloading.current) {
      processQueue()
    }
  }

  const processQueue = async () => {
    if (downloadQueue.current.length === 0) {
      isDownloading.current = false
      return
    }

    isDownloading.current = true

    while (downloadQueue.current.length > 0) {
      const url = downloadQueue.current[0]
      try {
        await startDownload([url])
      } catch (error) {
        console.error('Download error:', error)
      }
      downloadQueue.current.shift()
    }

    isDownloading.current = false
  }

  const startDownload = useCallback(
    async (urls) => {
      try {
        let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []

        for (const url of urls) {
          const itemIndex = storedDownloads.findIndex((item) => item.url === url)
          if (itemIndex === -1) continue

          // Update status to Fetching Info
          setDownloadList((prev) => updateStatus(prev, url, 'Fetching Info...'))
          storedDownloads = updateLocalStorage(storedDownloads, url, 'Fetching Info...')

          let info
          try {
            info = await getVideoInfo(url)
          } catch (error) {
            setDownloadList((prev) => markFailed(prev, url))
            storedDownloads = markFailed(storedDownloads, url)
            continue
          }

          // Update with fetched info and save to localStorage
          const updatedItem = {
            ...storedDownloads[itemIndex],
            title: info?.title || 'Unknown',
            thumbnail: info?.thumbnail || '',
            filename: info?.filename || '',
            duration: info?.duration || 'Unknown',
            status: 'Downloading',
            isPlaylist: info?.isPlaylist || false,
            totalVideos: info?.totalVideos || 0,
            downloadedVideos: 0
          }

          setDownloadList((prev) => updateItem(prev, url, updatedItem))
          storedDownloads = updateLocalStorageItem(storedDownloads, url, updatedItem)
          const handleProgress = async (progressData) => {
            // console.log("progressData",progressData);

            const urlMatch = progressData.message.match(
              /(https?:\/\/www\.youtube\.com\/watch\?v=[\w-]+)/
            )
            const isPlaylistOpen = storedDownloads[itemIndex]?.isPlaylist || false

            if (urlMatch && isPlaylistOpen) {
              const youtubeUrl = urlMatch[1]
              //  console.log("urlMatch",urlMatch[1]);

              let info = await getVideoInfo(youtubeUrl)

              const updatedItem = {
                ...storedDownloads[itemIndex],
                title: info?.title || 'Unknown',
                thumbnail: info?.thumbnail || '',

                duration: info?.duration || 'Unknown',
                status: 'Downloading'
              }

              // Store the URL in localStorage
              setDownloadList((prev) => updateItem(prev, url, updatedItem))
              storedDownloads = updateLocalStorageItem(storedDownloads, url, updatedItem)
            }
            const parseMessage = progressData.message.match(
              /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
            )

            if (parseMessage) {
              const [, progress, fileSize, speed, eta] = parseMessage

              setProgressMap((prev) => {
                const newMap = new Map(prev)
                newMap.set(updatedItem.id, { progress: parseFloat(progress), fileSize, speed, eta })
                return newMap
              })

              // Update progress in localStorage
              // storedDownloads = storedDownloads.map((item) =>
              //   item.id === updatedItem.id
              //     ? { ...item, progress: parseFloat(progress), fileSize, speed, eta }
              //     : item
              // );
              // localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
            }

            // Check if the message indicates the current item being downloaded
            const Downloadingitemcount = progressData.message.match(
              /\[download\] Downloading item (\d+) of (\d+)/
            )

            if (Downloadingitemcount) {
              const [, currentItem, totalItems] = Downloadingitemcount

              // Update the current item count in localStorage
              storedDownloads = storedDownloads.map((item) =>
                item.id === updatedItem.id
                  ? {
                      ...item,
                      currentItem: parseInt(currentItem),
                      totalItems: parseInt(totalItems)
                    }
                  : item
              )
              localStorage.setItem('downloadList', JSON.stringify(storedDownloads))
              setDownloadList(storedDownloads)
            }

            // Handle download completion
            if (progressData?.status?.includes('Download complete!')) {
              storedDownloads = storedDownloads.map((item) =>
                item.id === updatedItem.id
                  ? { ...item, status: 'Completed', isCompleted: true }
                  : item
              )

              localStorage.setItem('downloadList', JSON.stringify(storedDownloads))
            }

            // Handle playlist completion
            if (progressData.message.includes('Finished downloading playlist:')) {
              setDownloadList((prev) =>
                prev.map((item) =>
                  item.id === updatedItem.id
                    ? { ...item, status: 'Completed', isCompleted: true }
                    : item
                )
              )
            }
          }

          window.api.onDownloadProgress(handleProgress)

          try {
            await window.api.downloadVideo({
              id: updatedItem.id,
              url,
              isAudioOnly: downloadType === 'Audio',
              selectedFormat: format,
              selectedQuality: quality,
              saveTo
            })

            setDownloadList((prev) => markCompleted(prev, url))
            storedDownloads = markCompleted(storedDownloads, url)
          } catch (error) {
            console.log('error', error)

            if (
              error.message.includes(
                "Error invoking remote method 'downloadVideo': Error: Download failed with code"
              )
            ) {
              storedDownloads = storedDownloads.map((item) =>
                item.id === updatedItem.id ? { ...item, status: 'Paused', isPaused: true } : item
              )
            } else {
              storedDownloads = storedDownloads.map((item) =>
                item.id === updatedItem.id ? { ...item, status: 'Failed', isFailed: true } : item
              )
            }
          }
        }
      } catch (error) {
        console.error('Download error:', error)
      }
    },
    [downloadType, format, quality, saveTo]
  )

  // Helper functions
  const updateStatus = (list, url, status) =>
    list.map((item) => (item.url === url ? { ...item, status } : item))

  const markFailed = (list, url) =>
    list.map((item) => (item.url === url ? { ...item, status: 'Failed', isFailed: true } : item))

  const updateItem = (list, url, newItem) => list.map((item) => (item.url === url ? newItem : item))

  const markCompleted = (list, url) =>
    list.map((item) =>
      item.url === url ? { ...item, status: 'Completed', isCompleted: true } : item
    )

  const updateLocalStorage = (list, url, status) => {
    const updated = list.map((item) => (item.url === url ? { ...item, status } : item))
    localStorage.setItem('downloadList', JSON.stringify(updated))
    return updated
  }

  const updateLocalStorageItem = (list, url, newItem) => {
    const updated = list.map((item) => (item.url === url ? newItem : item))
    localStorage.setItem('downloadList', JSON.stringify(updated))
    return updated
  }

  const updateLocalStorageStatus = (list, url, status) => {
    const updated = list.map((item) =>
      item.url === url
        ? {
            ...item,
            status,
            ...(status === 'Failed' ? { isFailed: true } : {}),
            ...(status === 'Paused' ? { isPaused: true } : {})
          }
        : item
    )
    localStorage.setItem('downloadList', JSON.stringify(updated))
    return updated
  }

  useEffect(() => {
    // Load stored downloads from localStorage
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []

    // Check for any 'Queued' downloads and add them to the queue
    const queuedDownloads = storedDownloads.filter(
      (item) =>
        item.isPaused !== true && (item.status === 'Queued' || item.status === 'Downloading')
    )
    if (queuedDownloads.length > 0) {
      console.log('Found queued downloads in localStorage. Adding to queue...')
      queuedDownloads.forEach((item) => {
        downloadQueue.current.push(item.url) // Add URL to the queue
      })

      // Start processing the queue if not already processing
      if (!isDownloading.current) {
        console.log('Starting queue processing for queued downloads...')
        processQueue()
      }
    }
  }, [])
  const handlePauseResume = async (id) => {
    const item = downloadList.find((itm) => itm.id === id)
    if (!item) return // If item is not found, do nothing

    if (item.isPaused) {
      // ✅ Resume Download (if paused, restart from 0)
      // window.api.resumeDownload({
      //   url: item.url,
      //   isAudioOnly: item.downloadType === 'Audio',
      //   selectedFormat: item.format,
      //   selectedQuality: item.quality,
      //   saveTo: item.saveTo
      // })
      addToQueue(item.url)

      setDownloadList((prev) => {
        const updatedList = prev.map((itm) =>
          itm.id === id
            ? { ...itm, isPaused: false, status: 'Downloading' } // 🔄 Reset progress on resume
            : itm
        )

        localStorage.setItem('downloadList', JSON.stringify(updatedList))
        return updatedList
      })
    } else {
      // ✅ Pause Confirmation: Warn user that progress will reset
      const response = await window.api.showConfirmDialog(
        'Pause Download',
        'If you pause the download, resuming may start from the beginning. Do you want to continue?'
      )

      if (response === 0) {
        // User confirmed pause
        window.api.pauseDownload(id)

        setDownloadList((prev) => {
          const updatedList = prev.map((itm) =>
            itm.id === id ? { ...itm, isPaused: true, status: 'Paused' } : itm
          )

          localStorage.setItem('downloadList', JSON.stringify(updatedList))
          return updatedList
        })

        // Check for any 'Queued' downloads in localStorage
        const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []
        const queuedDownloads = storedDownloads.filter((item) => item.status === 'Queued')

        if (queuedDownloads.length > 0) {
          console.log('Found queued downloads in localStorage. Adding to queue...')
          queuedDownloads.forEach((item) => {
            if (!downloadQueue.current.includes(item.url)) {
              // Avoid duplicate URLs
              downloadQueue.current.push(item.url) // Add URL to the queue
            }
          })

          // Start processing the queue if not already processing
          if (!isDownloading.current) {
            console.log('Starting queue processing for queued downloads...')
            processQueue()
          }
        }
      }
    }
  }

  // Render the component
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
                setDownloadList={setDownloadList}
                downloadList={downloadList}
                progressMap={progressMap}
                handlePauseResume={handlePauseResume}
              />

              {lastUrl ? (
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
              ) : (
                <OverlayTrigger overlay={<Tooltip id="close-tooltip">Back</Tooltip>}>
                  <button
                    className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
                    style={{ width: '48px', height: '48px' }}
                    onClick={() => {
                      if (lastUrl) {
                        handleResumeBrowser()
                      } else {
                        setShowWebView(false)
                        setDownloadListOpen(false)
                        setSelectedItem('')
                      }
                    }}
                  >
                    <FaArrowLeft size={20} />
                  </button>
                </OverlayTrigger>
                // <button
                //   className="close-webview-btn"

                // >
                //   Back
                // </button>
              )}
            </div>
          ) : (
            <div className="bottom-container">
              <h1>Select a service below and enter your search query</h1>
              <PlatformIcons handlePlatformClick={handlePlatformClick} />
              {lastUrl && (
                // <button className="close-webview-btn" onClick={handleResumeBrowser}>
                //   Resume Browser
                // </button>
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
          <webview ref={webviewRef} src={url} style={{ height: '100%', width: '100%' }} />
          {/* <button className="close-webview-btn" onClick={handleCloseWebView}>
            Close Browser
          </button> */}
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
