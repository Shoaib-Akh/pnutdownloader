import React, { useState, useEffect, useRef } from 'react'
import Navbar from './components/Navbar'
import BodySection from './components/BodySection'
import Sidebar from './components/Sidebar'
import UpdateNotification from './components/UpdateNotification'
import UrlDetectionModal from './components/UrlDetectionModal'
import { FaRegLightbulb } from 'react-icons/fa'
import { MdFeedback } from 'react-icons/md'

function App() {
  // Theme state - detect system preference on load
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) return savedTheme;
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });
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
  const [dependencyProgressText, setDependencyProgressText] = useState('')
  const dependencyLastProgressAtRef = useRef(0)
  const [aboutUs, setAboutUs] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [urlDetectionModalOpen, setUrlDetectionModalOpen] = useState(false)
  const [detectedUrl, setDetectedUrl] = useState('')
  const [isUrlDownloading, setIsUrlDownloading] = useState(false)

  // Apply theme to document and listen for system theme changes
  useEffect(() => {
    // Apply theme class to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      // Only auto-switch if user hasn't set a manual preference
      const savedTheme = localStorage.getItem('appTheme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const handleThemeToggle = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
  };

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
          if (window.api.onDownloadProgress) {
            try {
              window.api.onDownloadProgress((progressData) => {
                try {
                  dependencyLastProgressAtRef.current = Date.now()
                  const downloadedBytes = Number(progressData?.downloadedBytes || 0)
                  const totalBytes = progressData?.totalBytes ? Number(progressData.totalBytes) : null
                  const speedBps = progressData?.speedBps ? Number(progressData.speedBps) : null

                  const formatBytes = (bytes) => {
                    if (!Number.isFinite(bytes)) return '0 B'
                    const units = ['B', 'KB', 'MB', 'GB', 'TB']
                    let v = bytes
                    let i = 0
                    while (v >= 1024 && i < units.length - 1) {
                      v /= 1024
                      i++
                    }
                    return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
                  }

                  const speedStr = speedBps && Number.isFinite(speedBps) ? `${formatBytes(speedBps)}/s` : ''
                  if (totalBytes && Number.isFinite(totalBytes) && totalBytes > 0) {
                    const pct = Math.min((downloadedBytes / totalBytes) * 100, 100)
                    setDependencyProgressText(
                      `Downloading dependencies: ${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)} (${pct.toFixed(1)}%)${speedStr ? ` @ ${speedStr}` : ''}`
                    )
                  } else {
                    setDependencyProgressText(
                      `Downloading dependencies: ${formatBytes(downloadedBytes)}${speedStr ? ` @ ${speedStr}` : ''}`
                    )
                  }
                } catch (err) {
                  setDependencyProgressText('Downloading dependencies...')
                }
              })
            } catch (err) {
              // ignore
            }
          }

          const checkDependencies = async () => {
            try {
              const status = await window.api.checkDependencies()
              if (status.ready) {
                const now = Date.now()
                const lastProgressAt = dependencyLastProgressAtRef.current
                const hasRecentProgress = lastProgressAt && now - lastProgressAt < 3000

                if (hasRecentProgress) {
                  setTimeout(checkDependencies, 2000)
                } else {
                  setIsLoading(false)
                }
              } else {
                setTimeout(checkDependencies, 20000)
              }
            } catch (error) {
              console.error('Dependency check error:', error)
              setTimeout(checkDependencies, 5000)
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
              setDownloadProgress(progress.percent)
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
    if (window.api) {
      try {
        window.api.trackEvent('feedback_button_clicked')
       
        window.api.openExternal(feedbackUrl)
      } catch (error) {
        console.error('Failed to track feedback_button_clicked:', error)
      }
    } else {
      console.error('window.api is not defined')
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
          color: theme === 'dark' ? '#e2e8f0' : '#333',

          }}
        >
          Initializing Dependencies...
        </div>
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
        {dependencyProgressText ? (
          <div
            style={{
              marginTop: '16px',
              fontSize: '14px',
              color: '#555',
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            {dependencyProgressText}
          </div>
        ) : null}
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
    
    setIsUrlDownloading(true)
    try {
      // Set the detected URL to pastLinkUrl so BodySection can handle it
      setPastLinkUrl(detectedUrl)
      // Close the modal
      setUrlDetectionModalOpen(false)
      // Optionally trigger download automatically
      // You can add auto-download logic here if needed
    } catch (error) {
      console.error('Error handling URL detection download:', error)
    } finally {
      setIsUrlDownloading(false)
    }
  }

  return (
    <div className="vh-100" style={{
      background: theme === 'dark' 
        ? 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)' 
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      minHeight: '100vh',
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b'
    }}>
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

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
              theme={theme}
              onThemeToggle={handleThemeToggle}
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
        theme={theme}
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
        theme={theme}
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