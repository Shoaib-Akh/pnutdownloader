import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomSection from './components/BottomSection';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification'; 
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { firebaseConfig } from './firebase-config';

function App() {
 
  const [downloadType, setDownloadType] = useState('Video');
  const [bitrate, setBitrate] = useState("64k");

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
  const [downloadProgress, setDownloadProgress] = useState(0);

  // State for dependency loading
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  // Modified event tracking function
  const sendGAEvent = async (eventName, params = {}) => {
    try {
      const clientId = await window.api?.getMachineId();
      console.log("clientId", clientId);
      
      const appVersion = await window.api?.getAppVersion();
      console.log("appVersion", appVersion);

      // Using Firebase Analytics SDK
      logEvent(analytics, eventName, {
        client_id: clientId,
        app_version: appVersion,
        ...params
      });
      
      console.log('Event logged:', eventName);
    } catch (error) {
      console.error('Firebase Analytics Error:', error);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      // Check dependencies
      if (window.api) {
        const checkDependencies = async () => {
          const status = await window.api.checkDependencies();
          if (status.ready) {
            setIsLoading(false);
          } else {
            // Poll every second until dependencies are ready
            setTimeout(checkDependencies, 20000);
          }
        };
        checkDependencies();

        // Check for updates
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

        window.api.onUpdateDownloadedProgress((progress) => {
          console.log("Progress:", progress);
          setDownloadProgress(progress.percent);
        });

        window.api.onUpdateError((err) => {
          console.error('Update error:', err);
        });
      }

      // Send initial GA event
      sendGAEvent('app_start');
    };

    initializeApp();
  }, []);

  const handleInstallUpdate = () => {
    if (window.api) {
      window.api.installUpdate();
      setUpdateAvailable(false);
      setUpdateDownloaded(false);
      setUpdateInfo(null);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        flexDirection: 'column'
      }}>
        <div style={{
          fontSize: '24px',
          marginBottom: '20px',
          color: '#333'
        }}>
          Initializing Dependencies...
        </div>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #ccc',
          borderTop: '5px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="vh-100">
      {/* Update Notification */}
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

      <div
        className="d-flex"
        style={{
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
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
          />
        )}

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
        />
      </div>
    </div>
  );
}

export default App;