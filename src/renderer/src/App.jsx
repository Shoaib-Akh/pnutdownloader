import React, { useState,useEffect } from 'react'
import Navbar from './components/Navbar'
import BottomSection from './components/BottomSection'
import Sidebar from './components/Sidebar'
import UpdateNotification from './components/UpdateNotification'; 
function App() {
  const [downloadType, setDownloadType] = useState('Video');
  const [quality, setQuality] = useState('1080p');
  const [format, setFormat] = useState('');
  const [saveTo, setSaveTo] = useState('Downloads');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState('');
  const [download, setDownload] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [downloadListOpen, setDownloadListOpen] = useState(false);
  const [pastLinkUrl, setPastLinkUrl] = useState('');

  // State for update notification
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    if (window.api) {
      console.log("Checking for updates...");
      window.api.checkForUpdates();

      window.api.onUpdateAvailable((info) => {
        console.log('Update available:', info);
        setUpdateAvailable(true);
        setUpdateInfo(info);
      });

      window.api.onUpdateDownloaded((info) => {
        console.log('Update downloaded:', info);
        setUpdateDownloaded(true);
        setUpdateInfo(info);
      });

      window.api.onUpdateError((err) => {
        console.error('Update error:', err);
      });
    }
  }, []);
  const handleInstallUpdate = () => {
    if (window.api) {
      window.api.installUpdate();
      // Reset update states after installation
      setUpdateAvailable(false);
      setUpdateDownloaded(false);
      setUpdateInfo(null);
    }
  };
  return (
    <div className="vh-100">
      {/* Render the UpdateNotification component if an update is available */}
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
        />
      )}

      <Navbar
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
      <div
        className=""
        style={{
          marginLeft: isSidebarOpen ? '200px' : '60px',
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
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
        />

        <BottomSection
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
        />
      </div>
    </div>
  )
}

export default App
