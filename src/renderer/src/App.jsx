import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import BottomSection from './components/BottomSection'
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
const [aboutUs,setAboutUs]=useState(false)
 
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
          setIsLoading(false)
        }
      } catch (error) {
        console.error('App initialization error:', error)
        setIsLoading(false)
      }
    }

    initializeApp()

    // Google Analytics page view tracking
    // window.dataLayer = window.dataLayer || [];
    // function gtag() { window.dataLayer.push(arguments); }
    // gtag('js', new Date());
    // gtag('config', 'G-HKMV37FXQ3'); // Replace with your Google Analytics Measurement ID
  }, [])

  const handleInstallUpdate = () => {
    if (window.api) {
      window.api.installUpdate()
      setUpdateAvailable(false)
      setUpdateDownloaded(false)
      setUpdateInfo(null)
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
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            fontSize: '24px',
            marginBottom: '20px',
            color: '#333'
          }}
        >
          Initializing Dependencies...
        </div>
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '5px solid #ccc',
            borderTop: '5px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
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
    'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform?edit_requested=true' // Replace with actual feedback URL

  return (
    <div className="vh-100" >
      {/* Google Analytics Script */}
      {/* <script async src="https://www.googletagmanager.com/gtag/js?id=G-HKMV37FXQ3"></script> */}

      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

      <Navbar
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
        setIsSidebarOpen={setIsSidebarOpen}
        setPastLinkUrl={setPastLinkUrl}
        
      />

      <div className="d-flex" style={{ paddingTop: "10px",borderTop:"1px solid #faaa8d" }}>
        <div style={{ width: showWebView ? '0%' : '20%' }}>
          {!showWebView && (
            <Sidebar
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              setSelectedItem={setSelectedItem}
              selectedItem={selectedItem}
              setDownload={setDownload}
              download={download}
              setShowWebView={setShowWebView}
              showWebView={showWebView}
              setDownloadListOpen={setDownloadListOpen}
              setAboutUs={setAboutUs}
            />
          )}
        </div>

        <button
          className="feedback-button"
          onClick={() => {
            if (window.api) {
              window.api.openExternal(feedbackUrl)
            }
          }}
        >
          {' '}
          <MdFeedback /> Feedback{' '}
        </button>

        <div
          style={{
            display: 'none'
          }}
        >
          <webview
            src="https://680241a42964182e1b3c5b01--ornate-twilight-e26d6b.netlify.app/"
            title="Bottom Banner"
          />
        </div>

        <BottomSection
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

      {/* Render banner.html in an iframe */}
    </div>
  )
}

export default App
