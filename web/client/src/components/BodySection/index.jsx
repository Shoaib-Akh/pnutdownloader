import React, { useState, useEffect, useRef } from 'react'
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
import alljson from '../../all.json'
import AboutUs from '../AboutUs'
import PlaylistSelectionModal from '../PlaylistSelectionModal'
import useDownloadManager from '../../hooks/useDownloadManager'
import { videoAPI, downloadAPI, getSocket } from '../../services/api'

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
  setDownloadListOpen,
  downloadListOpen,
  pastLinkUrl,
  aboutUs,
  setAboutUs,
  updateInfo,
  currentUrl,
  setCurrentUrl
}) {
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [url, setUrl] = useState('')
  const [lastUrl, setLastUrl] = useState('')
  const [isDownloadable, setIsDownloadable] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false)
  const [playlistModalLoading, setPlaylistModalLoading] = useState(false)
  const [playlistData, setPlaylistData] = useState(null)

  const {
    enqueueDownload,
    enqueuePlaylistVideos,
    retryDownload,
    progressMap: downloadProgressMap,
    activeDownloads,
    normalizeYouTubeUrlForSingleVideo: normalizeYouTubeSingle,
  } = useDownloadManager({
    downloadType,
    format,
    quality,
    saveTo,
    bitrate,
    onDonationPrompt: () => setShowDonationModal(true),
  })

  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(currentUrl)
      .catch((err) => {
        console.error('Failed to copy URL:', err)
      })
  }

  const handleGo = () => {
    if (currentUrl) {
      setUrl(currentUrl)
      checkIfDownloadable(currentUrl)
    }
  }

  const checkIfDownloadable = async (urlToCheck) => {
    try {
      // For web version, we'll check if it's a valid URL we can process
      const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|tiktok\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|vimeo\.com|dailymotion\.com|twitch\.tv)/i
      const isDownloadable = urlPattern.test(urlToCheck)
      setIsDownloadable(isDownloadable)
    } catch (error) {
      console.error('Error checking URL:', error)
      setIsDownloadable(false)
    }
  }

  const handleDownload = async () => {
    if (!url || downloading) return

    setDownloading(true)
    try {
      setDownloading(true)
      console.log('🚀 [DOWNLOAD] Starting download process')
      console.log('📥 [DOWNLOAD] URL:', url)
      console.log('⚙️ [DOWNLOAD] Format:', format)
      console.log('📊 [DOWNLOAD] Quality:', quality)
      console.log('🎵 [DOWNLOAD] Download type:', downloadType)
      console.log('🔊 [DOWNLOAD] Bitrate:', bitrate)
      console.log('💾 [DOWNLOAD] Save to:', saveTo)
      
      // Check if it's a playlist
      const playlistRegex = /(youtube\.com\/playlist\?list=|youtube\.com\/.*\&list=)/
      if (playlistRegex.test(url)) {
        console.log('📋 [DOWNLOAD] Detected playlist URL')
        setPlaylistModalLoading(true)
        const response = await videoAPI.getPlaylist(url)
        setPlaylistData(response.data)
        setPlaylistModalOpen(true)
      } else {
        console.log('🎬 [DOWNLOAD] Starting single video download')
        const downloadOptions = {
          url: url,
          title: 'video',
          isAudioOnly: downloadType === 'Audio',
          selectedFormat: format,
          selectedQuality: quality,
          saveTo,
          selectBitrate: bitrate
        }
        console.log('📦 [DOWNLOAD] Download options:', downloadOptions)
        
        await enqueueDownload(downloadOptions)
        console.log('✅ [DOWNLOAD] Download enqueued successfully')
        
        setPastLinkUrl(url)
      }
    } catch (error) {
      console.error('❌ [DOWNLOAD] Download error:', error)
      console.error('❌ [DOWNLOAD] Error details:', {
        message: error.message,
        stack: error.stack,
        url: url,
        format: format,
        quality: quality,
        downloadType: downloadType
      })
    } finally {
      setDownloading(false)
      console.log('🏁 [DOWNLOAD] Download process completed')
      setPlaylistModalLoading(false)
    }
  }

  const handlePlaylistDownload = async (selectedVideos) => {
    try {
      await enqueuePlaylistVideos(selectedVideos.map(video => ({
        url: video.webpage_url || video.url,
        title: video.title || video.id,
        isAudioOnly: downloadType === 'Audio',
        selectedFormat: format,
        selectedQuality: quality,
        saveTo,
        selectBitrate: bitrate
      })))
      
      setPlaylistModalOpen(false)
      setPastLinkUrl(url)
    } catch (error) {
      console.error('Playlist download error:', error)
    }
  }

  const handleUrlChange = (newUrl) => {
    setCurrentUrl(newUrl)
    setUrl(newUrl)
    checkIfDownloadable(newUrl)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setZoomLevel(1.0)
  }

  return (
    <div className="body-section">
      {/* URL Input Section */}
      <div className="url-input-section">
        <div className="url-input-container">
          <input
            type="text"
            value={currentUrl || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Enter video URL (YouTube, TikTok, Facebook, etc.)"
            className="url-input"
            onKeyPress={(e) => e.key === 'Enter' && handleGo()}
          />
          <button
            onClick={handleGo}
            className="go-button"
            disabled={!currentUrl}
          >
            <FaArrowCircleRight />
          </button>
        </div>
        
        {currentUrl && (
          <div className="url-info">
            <PlatformIcons url={currentUrl} />
            {isDownloadable && (
              <span className="downloadable-indicator">✓ Downloadable</span>
            )}
          </div>
        )}
      </div>

      {/* Browser Preview Section - Simplified for web */}
      {currentUrl && (
        <div className="browser-preview">
          <div className="browser-controls">
            <div className="navigation-controls">
              <OverlayTrigger placement="top" overlay={<Tooltip>Zoom In</Tooltip>}>
                <button onClick={handleZoomIn} className="control-button">
                  <FaPlus />
                </button>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={<Tooltip>Zoom Out</Tooltip>}>
                <button onClick={handleZoomOut} className="control-button">
                  <FaMinus />
                </button>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={<Tooltip>Reset Zoom</Tooltip>}>
                <button onClick={handleResetZoom} className="control-button">
                  <FaUndo />
                </button>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={<Tooltip>Copy URL</Tooltip>}>
                <button onClick={handleCopyUrl} className="control-button">
                  <FaCopy />
                </button>
              </OverlayTrigger>
            </div>
            
            <div className="download-controls">
              <button
                onClick={handleDownload}
                disabled={!isDownloadable || downloading}
                className="download-button"
              >
                {downloading ? (
                  <>
                    <FaSync className="spinning" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaDownload />
                    Download {downloadType}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* URL Preview */}
          <div className="url-preview">
            <div className="url-bar">
              <FaGlobe className="url-icon" />
              <span className="url-text">{currentUrl}</span>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Selection Modal */}
      <PlaylistSelectionModal
        show={playlistModalOpen}
        onHide={() => setPlaylistModalOpen(false)}
        playlistData={playlistData}
        onDownload={handlePlaylistDownload}
        loading={playlistModalLoading}
      />

      {/* Donation Modal */}
      {/* <DonationModal
        show={showDonationModal}
        onHide={() => setShowDonationModal(false)}
      /> */}
    </div>
  )
}

export default BodySection
