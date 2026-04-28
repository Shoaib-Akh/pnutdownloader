import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import BodySection from './components/BodySection'
import DownloadList from './components/DownloadList'
import { PlatformGrid } from './components/PlatformIcons'
import useDownloadManager from './hooks/useDownloadManager'
import useTheme from './hooks/useTheme'
import { initializeSocket } from './services/api'
import './App.css'
import './assets/theme.css'

function App() {
  const { theme, toggleTheme } = useTheme()
  const [downloadType, setDownloadType] = useState('Video')
  const [bitrate, setBitrate] = useState('128k')
  const [quality, setQuality] = useState('1080p')
  const [format, setFormat] = useState('mp4')
  const [saveTo, setSaveTo] = useState('Downloads')
  const [downloadListOpen, setDownloadListOpen] = useState(false)
  const [pastLinkUrl, setPastLinkUrl] = useState('')
  const [aboutUs, setAboutUs] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  const {
    enqueueDownload,
    enqueuePlaylistVideos,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    progressMap,
    activeDownloads,
    getAllActiveDownloads
  } = useDownloadManager({
    downloadType,
    format,
    quality,
    saveTo,
    bitrate
  })

  useEffect(() => {
    // Initialize socket connection
    initializeSocket()
  }, [])

  const handlePlatformClick = (url) => {
    console.log('Platform clicked:', url)
    setCurrentUrl(url)
  }

  const allDownloads = getAllActiveDownloads()

  return (
    <div className={`app ${theme}-theme`} data-theme={theme}>
      <Navbar
        downloadListOpen={downloadListOpen}
        setDownloadListOpen={setDownloadListOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        downloadType={downloadType}
        setDownloadType={setDownloadType}
        quality={quality}
        setQuality={setQuality}
        format={format}
        setFormat={setFormat}
        bitrate={bitrate}
        setBitrate={setBitrate}
        saveTo={saveTo}
        setSaveTo={setSaveTo}
      />

      <div className="main-content">
        {!downloadListOpen ? (
          <div className="home-view">
            <BodySection
              downloadType={downloadType}
              setPastLinkUrl={setPastLinkUrl}
              bitrate={bitrate}
              quality={quality}
              format={format}
              saveTo={saveTo}
              setIsSidebarOpen={() => {}}
              isSidebarOpen={false}
              setSelectedItem={() => {}}
              download={false}
              setDownload={() => {}}
              setShowWebView={() => {}}
              showWebView={false}
              setDownloadListOpen={setDownloadListOpen}
              downloadListOpen={downloadListOpen}
              pastLinkUrl={pastLinkUrl}
              aboutUs={aboutUs}
              setAboutUs={setAboutUs}
              updateInfo={null}
              currentUrl={currentUrl}
              setCurrentUrl={setCurrentUrl}
            />
            
            <PlatformGrid onPlatformClick={handlePlatformClick} />
          </div>
        ) : (
          <div className="downloads-view">
            <DownloadList
              downloads={allDownloads}
              progressMap={progressMap}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
