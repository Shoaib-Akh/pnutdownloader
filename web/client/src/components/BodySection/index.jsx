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
import './FormatMessage.css'
import PlatformIcons from '../PlatformIcons'
import DownloadList from '../DownloadList'
import VideoInfoPreview from '../VideoInfoPreview'
import FormatGrid from '../FormatGrid'
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
  const [videoInfo, setVideoInfo] = useState(null)
  const [loadingVideoInfo, setLoadingVideoInfo] = useState(false)
  const [availableFormats, setAvailableFormats] = useState([])

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

  const handleGo = async () => {
    if (currentUrl) {
      setUrl(currentUrl)
      checkIfDownloadable(currentUrl)
      await fetchVideoInfo(currentUrl)
    }
  }

  const fetchVideoInfo = async (url) => {
    if (!url || !isDownloadable) return
    
    setLoadingVideoInfo(true)
    try {
      console.log('🎬 [VIDEO] Fetching video info for:', url)
      const response = await videoAPI.getInfo(url)
      const info = response.data.videoInfo || response.data
      
      console.log('📊 [VIDEO] Video info received:', info)
      setVideoInfo(info)
      
      // Process and set available formats
      if (info.formats && Array.isArray(info.formats)) {
        const processedFormats = processFormats(info.formats)
        console.log('🎞️ [VIDEO] Processed formats:', processedFormats)
        setAvailableFormats(processedFormats)
      }
    } catch (error) {
      console.error('❌ [VIDEO] Error fetching video info:', error)
      setVideoInfo(null)
      setAvailableFormats([])
    } finally {
      setLoadingVideoInfo(false)
    }
  }

  const processFormats = (formats) => {
    // Filter and organize formats
    const videoFormats = formats.filter(f => f.vcodec !== 'none' && f.height)
    const audioFormats = formats.filter(f => f.acodec !== 'none' && !f.height)
    
    // Get best format for each resolution
    const bestByResolution = {}
    videoFormats.forEach(format => {
      const resolution = format.height
      if (!bestByResolution[resolution] || 
          (format.fps > bestByResolution[resolution].fps) ||
          (format.fps === bestByResolution[resolution].fps && format.filesize > bestByResolution[resolution].filesize)) {
        bestByResolution[resolution] = format
      }
    })
    
    // Sort resolutions descending
    const sortedVideoFormats = Object.values(bestByResolution)
      .sort((a, b) => (b.height || 0) - (a.height || 0))
    
    // Add audio formats
    const sortedAudioFormats = audioFormats
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))
      .slice(0, 3) // Show top 3 audio formats
    
    return [...sortedVideoFormats, ...sortedAudioFormats]
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

    // For single videos, just fetch video info (already done by handleGo)
    // The actual download should happen via format selection
    if (!videoInfo) {
      await fetchVideoInfo(url)
    }
    
    // If we have video info but no formats selected, show a message
    if (videoInfo && availableFormats.length === 0) {
      console.log('� [DOWNLOAD] Please select a format from the options below')
      return
    }
    
    if (videoInfo && availableFormats.length > 0) {
      console.log('📋 [DOWNLOAD] Please select a specific format to download')
      return
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

  const handleFormatDownload = async (format) => {
    if (!url || downloading) return

    setDownloading(true)
    try {
      console.log('🎯 [FORMAT] Starting format-specific download')
      console.log('📥 [FORMAT] URL:', url)
      console.log('🎞️ [FORMAT] Selected format:', format)
      
      const downloadOptions = {
        url: url,
        title: videoInfo?.title || 'video',
        isAudioOnly: !format.height, // Audio-only if no height
        selectedFormat: format.ext || 'mp4',
        selectedQuality: format.height ? `${format.height}p` : quality,
        saveTo,
        selectBitrate: format.abr ? `${format.abr}k` : bitrate,
        formatId: format.format_id // Pass the specific format ID
      }
      
      console.log('📦 [FORMAT] Download options:', downloadOptions)
      
      await enqueueDownload(downloadOptions)
      console.log('✅ [FORMAT] Format download enqueued successfully')
      
      setPastLinkUrl(url)
    } catch (error) {
      console.error('❌ [FORMAT] Format download error:', error)
      console.error('❌ [FORMAT] Error details:', {
        message: error.message,
        stack: error.stack,
        url: url,
        format: format
      })
    } finally {
      setDownloading(false)
      console.log('🏁 [FORMAT] Format download process completed')
    }
  }

  const handleUrlChange = (newUrl) => {
    setCurrentUrl(newUrl)
    setUrl(newUrl)
    checkIfDownloadable(newUrl)
    // Reset video info when URL changes
    setVideoInfo(null)
    setAvailableFormats([])
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
                ) : videoInfo && availableFormats.length > 0 ? (
                  <>
                    <FaDownload />
                    Select Format Below
                  </>
                ) : (
                  <>
                    <FaDownload />
                    Get Formats
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

      {/* Video Info Preview */}
      {currentUrl && isDownloadable && (
        <VideoInfoPreview 
          videoInfo={videoInfo} 
          loading={loadingVideoInfo} 
        />
      )}

      {/* Format Selection Message */}
      {videoInfo && availableFormats.length > 0 && (
        <div className="format-selection-message">
          <h4>📋 Select a format to download:</h4>
          <p>Choose from the available formats below. Each format includes different quality levels and codecs optimized for various use cases.</p>
        </div>
      )}

      {/* Format Grid */}
      {currentUrl && isDownloadable && availableFormats.length > 0 && (
        <FormatGrid 
          formats={availableFormats}
          onFormatDownload={handleFormatDownload}
          loading={loadingVideoInfo}
        />
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
