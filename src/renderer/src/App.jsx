import React, { useState } from 'react'
import Navbar from './components/Navbar'
import BodySection from './components/BodySection'
import Sidebar from './components/Sidebar'
import UpdateNotification from './components/UpdateNotification'
import UrlDetectionModal from './components/UrlDetectionModal'
import ErrorBoundary from './components/ErrorBoundary'
import useAppLifecycle from './viewmodels/useAppLifecycle'

function App() {
  const [downloadType, setDownloadType] = useState('Video')
  const [bitrate, setBitrate] = useState('64k')
  const [quality, setQuality] = useState('1080p')
  const [format, setFormat] = useState('MP4')
  const [saveTo, setSaveTo] = useState('Downloads')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState('')
  const [download, setDownload] = useState(false)
  const [showWebView, setShowWebView] = useState(false)
  const [downloadListOpen, setDownloadListOpen] = useState(false)
  const [pastLinkUrl, setPastLinkUrl] = useState('')
  const [aboutUs, setAboutUs] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const {
    updateAvailable,
    updateInfo,
    updateDownloaded,
    downloadProgress,
    handleInstallUpdate,
    isLoading,
    dependencyProgressText,
    urlDetectionModalOpen,
    detectedUrl,
    isUrlDownloading,
    handleUrlDetectionClose,
    handleUrlDetectionDownload,
  } = useAppLifecycle({ onDetectedUrlDownload: setPastLinkUrl })

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

  return (
    <ErrorBoundary fallbackTitle="App Error" fallbackMessage="An unexpected error occurred in the application.">
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
    </ErrorBoundary>
  )
}

export default App
