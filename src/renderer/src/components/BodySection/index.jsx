import { useState, useEffect, useRef } from 'react'
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
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import alljson from '../../../../../public/all.json'
import AboutUs from '../AboutUs'
import LoginModal from '../LoginModal'
import DonationModal from '../DonationModal'
import PlaylistSelectionModal from '../PlaylistSelectionModal'
import useDownloadManager from '../../viewmodels/useDownloadManager'

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
  updateInfo,
  onOpenFeedback
}) {
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [isWebViewReady, setIsWebViewReady] = useState(false)

  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [url, setUrl] = useState('')
  const [lastUrl, setLastUrl] = useState('')
  const [isDownloadable, setIsDownloadable] = useState(false)
  const [currentWebViewUrl, setCurrentWebViewUrl] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false)
  const [playlistModalLoading, setPlaylistModalLoading] = useState(false)
  const [playlistData, setPlaylistData] = useState(null)
  const webviewRef = useRef(null)
  const hasBrowserUrl = Boolean(url)

  const {
    enqueueDownload,
    enqueuePlaylistVideos,
    retryDownload,
    progressMap: downloadProgressMap,
    activeDownloads,
    normalizeYouTubeUrlForSingleVideo: normalizeYouTubeSingle
  } = useDownloadManager({
    downloadType,
    format,
    quality,
    saveTo,
    bitrate,
    onDonationPrompt: () => setShowDonationModal(true),
    onLoginRequired: () => setShowLoginPopup(true)
  })

  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(currentWebViewUrl)

      .catch((err) => {
        console.error('Failed to copy URL:', err)
      })
  }

  const getNavigableUrl = (value) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return ''
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue)) return trimmedValue
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmedValue)) {
      return `https://${trimmedValue}`
    }
    return `https://www.google.com/search?q=${encodeURIComponent(trimmedValue)}`
  }

  const handleGo = () => {
    const nextUrl = getNavigableUrl(currentWebViewUrl)
    if (!nextUrl) return

    setUrl(nextUrl)
    setCurrentWebViewUrl(nextUrl)
    setIsDownloadable(false)
    setIsWebViewReady(false)

    if (webviewRef.current) {
      webviewRef.current.src = nextUrl
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
        try {
          console.log('[DEBUG] Processing URL:', pastLinkUrl)
          const result = await enqueueDownload(pastLinkUrl)
          console.log('[DEBUG] Enqueue result:', result)

          if (result?.duplicate) {
            if (window.api?.showMessageBox) {
              window.api.showMessageBox({
                type: 'warning',
                title: 'Duplicate Download',
                message:
                  'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.'
              })
            } else {
              alert(
                'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.'
              )
            }
            setPastLinkUrl('')
            return
          }
          if (result?.unsupported) {
            if (window.api?.showMessageBox) {
              window.api.showMessageBox({
                type: 'warning',
                title: 'Download Not Supported',
                message: result.message || 'This URL is not supported for download.'
              })
            } else {
              alert(result.message || 'This URL is not supported for download.')
            }
            return
          }
          if (result?.playlist) {
            setPlaylistModalLoading(true)
            setPlaylistData(result.playlist)
            setPlaylistModalOpen(true)
            setPlaylistModalLoading(false)
          }
          if (result?.id) {
            console.log('[DEBUG] Download added with ID:', result.id)
            setDownloadListOpen(true)
            setShowWebView(false)
            setIsSidebarOpen(true)
            setSelectedItem('All Files')
            setDownload(true)
          }
        } catch (error) {
          console.error('[DEBUG] Error adding download:', error)
          alert('Failed to add download: ' + error.message)
        } finally {
          setPastLinkUrl('')
        }
      }
      fetchAndDownload()
    }
  }, [pastLinkUrl])

  useEffect(() => {
    if (webviewRef.current && showWebView) {
      const webview = webviewRef.current

      const onDomReady = () => {
        setIsWebViewReady(true)
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      }
      webview.addEventListener('dom-ready', onDomReady)
      const handleNavigation = (event) => {
        setCurrentWebViewUrl(event.url)
        checkIfDownloadable(event.url)
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      }

      webview.addEventListener('did-navigate', handleNavigation)
      webview.addEventListener('did-navigate-in-page', handleNavigation)

      return () => {
        webview.removeEventListener('dom-ready', onDomReady)
        webview.removeEventListener('did-navigate', handleNavigation)
        webview.removeEventListener('did-navigate-in-page', handleNavigation)
      }
    }
    setIsWebViewReady(true)
  }, [showWebView, isWebViewReady])

  useEffect(() => {
    if (currentWebViewUrl && hasBrowserUrl) {
      window.api.getYoutubeCookies()
      setLastUrl(currentWebViewUrl)
    }
    setDownload(false)
  }, [currentWebViewUrl, hasBrowserUrl])

  useEffect(() => {
    if (showWebView && selectedItem === 'Browser') {
      setUrl('')
      setCurrentWebViewUrl('')
      setIsDownloadable(false)
      setCanGoBack(false)
      setCanGoForward(false)
      setIsWebViewReady(true)
    }
  }, [showWebView, selectedItem])

  const DONATION_URL = 'https://ko-fi.com/pnutdownloader'

  const handlePlatformClick = (platformUrl) => {
    window.api.trackEvent('platformUrl', { platformUrl })
    setUrl(platformUrl)
    setCurrentWebViewUrl(platformUrl)
    setShowWebView(true)
    setIsDownloadable(false)
    setIsSidebarOpen(false)
    setIsWebViewReady(false)
  }

  const handleCloseWebView = () => {
    if (url) {
      setLastUrl(currentWebViewUrl || url)
    }
    setUrl('')
    setCurrentWebViewUrl('')
    setShowWebView(false)
    setIsDownloadable(false)
    setIsSidebarOpen(true)
    setIsWebViewReady(false)
  }

  const handleResumeBrowser = () => {
    if (lastUrl) {
      setUrl(lastUrl)
      setCurrentWebViewUrl(lastUrl)
      setShowWebView(true)
      setIsSidebarOpen(false)
      setSelectedItem('')
      setIsWebViewReady(false)
    }
  }

  const checkIfDownloadable = (currentUrl) => {
    if (!currentUrl) {
      setIsDownloadable(false)
      return
    }

    // Check against all video patterns from all.json
    const isDownloadable = alljson?.videoPatterns?.some((pattern) => {
      try {
        const regex = new RegExp(pattern)
        return regex.test(currentUrl)
      } catch (error) {
        console.warn(`Invalid regex pattern: ${pattern}`, error)
        return false
      }
    })

    setIsDownloadable(isDownloadable || false)
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
    setAboutUs(false)
    const rawUrlToDownload = pastLinkUrl || currentWebViewUrl
    const urlToDownload = normalizeYouTubeSingle(rawUrlToDownload)
    if (!urlToDownload) return

    const result = await enqueueDownload(urlToDownload)

    if (result?.duplicate) {
      if (window.api?.showMessageBox) {
        window.api.showMessageBox({
          type: 'warning',
          title: 'Duplicate Download',
          message:
            'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.'
        })
      } else {
        alert(
          'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.'
        )
      }
      return
    }

    if (result?.playlist) {
      setPlaylistModalLoading(true)
      setPlaylistData(result.playlist)
      setPlaylistModalOpen(true)
      setPlaylistModalLoading(false)
      return
    }

    setUrl(urlToDownload)
    setDownloadListOpen(true)
    setShowWebView(false)
    setIsSidebarOpen(true)
    setSelectedItem('All Files')
    setDownload(true)
    // enqueueDownload already queued when result.id present
  }

  const handleDonate = () => {
    if (DONATION_URL && window.api) {
      window.api.openExternal(DONATION_URL)
    }
    setShowDonationModal(false)
  }

  const handleLogin = () => {
    window.api.trackEvent('youtube-login')
    // Navigate to YouTube - when user signs in here, cookies will be saved
    // Use youtube.com home page which will redirect to login if needed
    const youtubeUrl = 'https://www.youtube.com'
    setCurrentWebViewUrl(youtubeUrl)
    setUrl(youtubeUrl)
    setLastUrl(youtubeUrl)
    setShowWebView(true)
    setIsSidebarOpen(false)
    setSelectedItem('')
    setShowLoginPopup(false)
    setIsWebViewReady(true)
  }

  const handleRetry = (id) => {
    window.api.trackEvent('handleRetry')
    retryDownload(id)
  }
  return (
    <div
      className={`app-content ${showWebView ? 'app-content--browser' : 'app-content--standard'}`}
    >
      {aboutUs ? (
        <div className="about-page-wrap">
          <AboutUs updateInfo={updateInfo} onOpenFeedback={onOpenFeedback} />
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
                progressMap={downloadProgressMap}
                bitrate={bitrate}
                onRetry={handleRetry}
                activeDownloads={activeDownloads}
              />
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id="close-tooltip">{lastUrl ? 'Resume Explore' : 'Back'}</Tooltip>
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
                    {lastUrl ? 'Resume Explore' : 'Back'}
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
                  overlay={<Tooltip id="close-tooltip">Resume Explore</Tooltip>}
                >
                  <button
                    className="btn btn-danger   d-flex align-items-center justify-content-center shadow close-webview-btn"
                    //
                    onClick={handleResumeBrowser}
                  >
                    <FaGlobe size={20} />
                    <span className="ms-2 fw-medium" style={{ whiteSpace: 'nowrap' }}>
                      Resume Explore
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
                disabled={!hasBrowserUrl || !isWebViewReady || !canGoBack}
              >
                <FaArrowLeft size={16} />
              </button>
              <button
                className="nav-btn"
                onClick={() => webviewRef.current?.goForward()}
                disabled={!hasBrowserUrl || !isWebViewReady || !canGoForward}
              >
                <FaArrowRight size={16} />
              </button>
              <button
                className="nav-btn"
                onClick={() => webviewRef.current?.reload()}
                disabled={!hasBrowserUrl || !isWebViewReady}
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
                onKeyDown={(e) => e.key === 'Enter' && handleGo()}
                placeholder="Enter a URL or search..."
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
              overlay={<Tooltip id="close-tooltip">Close Explore</Tooltip>}
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
            {showWebView && hasBrowserUrl ? (
              <webview
                ref={webviewRef}
                src={url}
                style={{ height: '100%', width: '100%' }}
                allowpopups="true"
                partition="persist:main"
              />
            ) : (
              <div className="explore-start-page">
                <PlatformIcons handlePlatformClick={handlePlatformClick} variant="explore" />
              </div>
            )}
          </div>
          {isDownloadable && (
            <button className="download-btn" onClick={handleDownloadClick}>
              {downloading ? (
                'Adding...'
              ) : (
                <>
                  <FaDownload /> Download this
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
          donationUrl={DONATION_URL}
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
            enqueuePlaylistVideos(selected, title)
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
