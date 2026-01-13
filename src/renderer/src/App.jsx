import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import BodySection from './components/BodySection'
import Sidebar from './components/Sidebar'
import UpdateNotification from './components/UpdateNotification'
import { FaRegLightbulb } from 'react-icons/fa'
import { MdFeedback } from 'react-icons/md'

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

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (window.api) {
          const checkDependencies = async () => {
            try {
              const status = await window.api.checkDependencies()
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
          window.api.checkForUpdates()

          window.api.onUpdateAvailable((info) => {
            console.log('Update available:', info)
            setUpdateAvailable(true)
            setUpdateInfo(info)
          })

          window.api.onUpdateDownloaded((info) => {
            console.log('Update downloaded:', info)
            setUpdateDownloaded(true)
            setUpdateInfo(info)
          })

          window.api.onUpdateDownloadedProgress((progress) => {
            setDownloadProgress(progress.percent)
          })

          window.api.onUpdateError((err) => {
            console.error('Update error:', err)
          })
        } else {
          console.error('window.api is not defined')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('App initialization error:', error)
        setIsLoading(false)
      }
    }

    initializeApp()
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
            color: '#333',
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

  return (
    <div className="vh-100">
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

     

      <div className="d-flex" style={{ paddingTop: '0', borderTop: '1px solid #e0e0e0',  }}>
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
            />
        </div>

        <button className="feedback-button" onClick={handleFeedbackClick}>
          <MdFeedback /> Feedback
        </button>

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