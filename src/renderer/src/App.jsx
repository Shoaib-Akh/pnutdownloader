import React, { useState } from 'react'
import Navbar from './components/Navbar'
import BodySection from './components/BodySection'
import Sidebar from './components/Sidebar'
import UpdateNotification from './components/UpdateNotification'
import UrlDetectionModal from './components/UrlDetectionModal'
import ErrorBoundary from './components/ErrorBoundary'
import useAppLifecycle from './viewmodels/useAppLifecycle'
import useTheme from './hooks/useTheme'
import './assets/theme.css'
import './assets/redesign.css'

function App() {
  const { theme, toggleTheme } = useTheme()
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
          backgroundColor: 'var(--theme-bg-primary)',
          flexDirection: 'column',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            marginBottom: '20px',
            color: 'var(--theme-text-primary)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}
        >
          Initializing Dependencies...
        </div>
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '5px solid var(--theme-border)',
            borderTop: '5px solid var(--theme-progress-fill)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
        {dependencyProgressText ? (
          <div
            style={{
              marginTop: '16px',
              fontSize: '14px',
              color: 'var(--theme-text-secondary)',
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
      <div className="pnut-app vh-100">
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

        <div className={`app-shell ${showWebView ? 'app-shell--browser' : ''}`}>
          <aside className="app-sidebar-panel">
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
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          </aside>

          <div style={{ display: 'none' }}>
            <webview src="https://pnutdownloader.com/app/index.html" title="Bottom Banner" />
          </div>
          <main className="app-main-panel">
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
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
