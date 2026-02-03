import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import BodySection from './components/BodySection'
import Sidebar from './components/Sidebar'
import UpdateNotification from './components/UpdateNotification'
import UrlDetectionModal from './components/UrlDetectionModal'
import { FaRegLightbulb } from 'react-icons/fa'
import { MdFeedback } from 'react-icons/md'
import FeedbackModal from './components/FeedbackModal'
import { initializeUserTracking } from './utils/userTracking'
import { initializeFirestore, getUserPreferences, saveUserPreferences } from './utils/firestoreService'
import { initializeUserTrackingFirestore } from './utils/firestoreUtils'
import { getDeviceId } from './utils/userTracking'
import { isDuplicateDownload } from './components/commonFunction'


function App() {
  const [downloadType, setDownloadType] = useState('Video')
  const [bitrate, setBitrate] = useState('64k')
  const [quality, setQuality] = useState('1080p')
  const [format, setFormat] = useState('')
  const [saveTo, setSaveTo] = useState('Downloads')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState('')
  const [download, setDownload] = useState(false)
  const [showWebView, setShowWebView] = useState(false)
  const [downloadListOpen, setDownloadListOpen] = useState(false)
  const [pastLinkUrl, setPastLinkUrl] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [aboutUs, setAboutUs] = useState(false)
  const [urlDetectionModalOpen, setUrlDetectionModalOpen] = useState(false)
  const [detectedUrl, setDetectedUrl] = useState('')
  const [isUrlDownloading, setIsUrlDownloading] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [versionInfo, setVersionInfo] = useState({ yt: '', ffmpeg: '' })
console.log(versionInfo)
  // Save preferences to Firestore when they change
  useEffect(() => {
    const savePreferences = async () => {
      try {
        await saveUserPreferences({
          defaultQuality: quality,
          defaultFormat: format,
          defaultBitrate: bitrate,
          defaultSaveTo: saveTo,
          defaultDownloadType: downloadType
        })
      } catch (error) {
        console.error('Error saving preferences:', error)
      }
    }

    // Debounce preference saves (only save after user stops changing for 2 seconds)
    const timeoutId = setTimeout(savePreferences, 2000)
    return () => clearTimeout(timeoutId)
  }, [quality, format, bitrate, saveTo, downloadType])

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for window.api to be available
        let retries = 0
        const maxRetries = 10
        while (!window.api && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100))
          retries++
        }

        if (window.api) {
          const checkDependencies = async () => {
            try {
              const status = await window.api.checkDependencies()
              
              // Get version information
              try {
                const ytVersion = await window.api.getYtVersion()
                const ffmpegVersion = await window.api.getFfmpegVersion()
                setVersionInfo({ yt: ytVersion, ffmpeg: ffmpegVersion })
                console.log('YouTube version:', ytVersion)
                console.log('FFmpeg version:', ffmpegVersion)
              } catch (versionError) {
                console.error('Error getting versions:', versionError)
              }
              
              if (status.ready) {
                setIsLoading(false)
              } else {
                setTimeout(checkDependencies, 20000)
              }
            } catch (error) {
              console.error('Dependency check error:', error)
              setIsLoading(false)
            }
          }
          checkDependencies()

          // Check for updates
          if (window.api.checkForUpdates) {
            window.api.checkForUpdates()
          }

          if (window.api.onUpdateAvailable) {
            window.api.onUpdateAvailable((info) => {
              console.log('Update available:', info)
              setUpdateAvailable(true)
              setUpdateInfo(info)
            })
          }

          if (window.api.onUpdateDownloaded) {
            window.api.onUpdateDownloaded((info) => {
              console.log('Update downloaded:', info)
              setUpdateDownloaded(true)
              setUpdateInfo(info)
            })
          }

          if (window.api.onUpdateDownloadedProgress) {
            window.api.onUpdateDownloadedProgress((progress) => {
              console.log('Update progress received:', progress)
              console.log('Progress percent:', progress.percent)
              setDownloadProgress(progress.percent || 0)
            })
          }

          if (window.api.onUpdateError) {
            window.api.onUpdateError((err) => {
              console.error('Update error:', err)
            })
          }

          // Listen for video URL detection from clipboard
          if (window.api.onVideoUrlDetected && typeof window.api.onVideoUrlDetected === 'function') {
            window.api.onVideoUrlDetected((url) => {
              console.log('Video URL detected:', url)
              setDetectedUrl(url)
              setUrlDetectionModalOpen(true)
            })
          } else {
            console.warn('onVideoUrlDetected is not available. Please restart the app for URL detection to work.')
          }
        } else {
          console.error('window.api is not defined after retries')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('App initialization error:', error)
        setIsLoading(false)
      }
    }

    initializeApp()

    // Initialize user tracking (Realtime Database)
    initializeUserTracking()

    // Initialize Firestore
    const initFirestore = async () => {
      try {
        const deviceId = getDeviceId()
        // Initialize Firestore user tracking (may fail due to permissions, that's OK)
        // Silently handle - function already handles errors internally
        await initializeUserTrackingFirestore(deviceId)
        // Initialize Firestore service
        await initializeFirestore()

        // Load user preferences from Firestore
        const preferences = await getUserPreferences()
        if (preferences) {
          if (preferences.defaultQuality) setQuality(preferences.defaultQuality)
          if (preferences.defaultFormat) setFormat(preferences.defaultFormat)
          if (preferences.defaultBitrate) setBitrate(preferences.defaultBitrate)
          if (preferences.defaultSaveTo) setSaveTo(preferences.defaultSaveTo)
          if (preferences.defaultDownloadType) setDownloadType(preferences.defaultDownloadType)
        }
      } catch (error) {
        console.error('Error initializing Firestore:', error)
        // App continues to work with localStorage
      }
    }
    initFirestore()

    // Cleanup listener on unmount
    return () => {
      if (window.api && typeof window.api.removeVideoUrlDetectedListener === 'function') {
        window.api.removeVideoUrlDetectedListener()
      }
    }
  }, [])

  const handleInstallUpdate = () => {
    if (window.api) {
      try {
        window.api.trackEvent('update_install_clicked', { version: updateInfo?.version })
        console.log('Tracked event: update_install_clicked')
        window.api.installUpdate()
        setUpdateAvailable(false)
        setUpdateDownloaded(false)
        setUpdateInfo(null)
      } catch (error) {
        console.error('Failed to track update_install_clicked:', error)
      }
    }
  }

  const handleFeedbackClick = () => {
    setFeedbackModalOpen(true)
    if (window.api) {
      try {
        window.api.trackEvent('feedback_button_clicked')
      } catch (error) {
        console.error('Failed to track feedback_button_clicked:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f0f0f0',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            marginBottom: '20px',
            color: '#333',
          }}
        >
          Initializing Dependencies...
        </div>
        
        {(versionInfo.yt || versionInfo.ffmpeg) && (
          <div
            style={{
              fontSize: '14px',
              marginBottom: '20px',
              color: '#666',
              textAlign: 'center',
              fontFamily: 'monospace',
            }}
          >
            {versionInfo.yt && (
              <div style={{ marginBottom: '5px' }}>
                YouTube: {versionInfo.yt}
              </div>
            )}
            {versionInfo.ffmpeg && (
              <div>
                FFmpeg: {versionInfo.ffmpeg}
              </div>
            )}
          </div>
        )}
        
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '5px solid #ccc',
            borderTop: '5px solid #BB4F28',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const feedbackUrl =
    'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform'

  const handleUrlDetectionClose = () => {
    setUrlDetectionModalOpen(false)
    setDetectedUrl('')
    setIsUrlDownloading(false)
  }

  const handleUrlDetectionDownload = async () => {
    if (!detectedUrl || !window.api) return

    const list = JSON.parse(localStorage.getItem('downloadList') || '[]')
    const isDuplicate = isDuplicateDownload(
      list,
      detectedUrl,
      format,
      quality,
      saveTo,
      downloadType,
      bitrate
    )
    if (isDuplicate) {
      try {
        await window.api.showMessageBox({
          type: 'warning',
          title: 'Duplicate Download',
          message:
            'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.',
        })
      } catch {
        alert(
          'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.',
        )
      }
      return
    }

    setIsUrlDownloading(true)
    try {
      setPastLinkUrl(detectedUrl)
      setUrlDetectionModalOpen(false)
      setDetectedUrl('')
    } catch (error) {
      console.error('Error handling URL detection download:', error)
    } finally {
      setIsUrlDownloading(false)
    }
  }

  return (
    <div className="vh-100" style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      minHeight: '100vh'
    }}>
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />

      <UrlDetectionModal
        isOpen={urlDetectionModalOpen}
        onClose={handleUrlDetectionClose}
        onDownload={handleUrlDetectionDownload}
        url={detectedUrl}
        isLoading={isUrlDownloading}
      />

      <div className="d-flex" style={{
        paddingTop: '0',
        borderTop: '1px solid #e2e8f0',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>
        <div style={{ width: '16%' }}>
          <Sidebar
            setSelectedItem={setSelectedItem}
            selectedItem={selectedItem}
            setDownload={setDownload}
            download={download}
            setShowWebView={setShowWebView}
            showWebView={showWebView}
            setDownloadListOpen={setDownloadListOpen}
            setAboutUs={setAboutUs}
            setFeedbackModalOpen={setFeedbackModalOpen}
          />
        </div>

        {/* <button className="feedback-button" onClick={handleFeedbackClick}>
          <MdFeedback /> Feedback
        </button> */}

        <div style={{ display: 'none' }}>
          <webview src="https://pnutdownloader.com/app/index.html" title="Bottom Banner" />
        </div>
        {!showWebView && <Navbar
          bitrate={bitrate}
          setBitrate={setBitrate}
          downloadType={downloadType}
          setDownloadType={setDownloadType}
          quality={quality}
          setQuality={setQuality}
          format={format}
          setFormat={setFormat}
          saveTo={saveTo}
          setSaveTo={setSaveTo}
          isSidebarOpen={isSidebarOpen}
          // setIsSidebarOpen={setIsSidebarOpen}
          setPastLinkUrl={setPastLinkUrl}
        />}
        <BodySection
          setPastLinkUrl={setPastLinkUrl}
          bitrate={bitrate}
          setBitrate={setBitrate}
          downloadType={downloadType}
          quality={quality}
          format={format}
          saveTo={saveTo}
          selectedItem={selectedItem}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarOpen={isSidebarOpen}
          setSelectedItem={setSelectedItem}
          setDownload={setDownload}
          download={download}
          setShowWebView={setShowWebView}
          showWebView={showWebView}
          downloadListOpen={downloadListOpen}
          setDownloadListOpen={setDownloadListOpen}
          pastLinkUrl={pastLinkUrl}
          aboutUs={aboutUs}
          updateInfo={updateInfo}
          setAboutUs={setAboutUs}
        />
      </div>
    </div>
  )
}

export default App
