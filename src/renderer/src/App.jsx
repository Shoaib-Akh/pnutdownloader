import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomSection from './components/BottomSection';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification'; 
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent, setUserId, setAnalyticsCollectionEnabled, isSupported } from 'firebase/analytics';
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
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  // Google Analytics Measurement ID
  const GA_MEASUREMENT_ID = 'G-HKMV37FXQ3';

  // Initialize Google Analytics gtag
  useEffect(() => {
    // Add gtag.js script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);

    return () => {
      // Cleanup script to prevent memory leaks
      document.head.removeChild(script);
    };
  }, []);

  // Modified event tracking function for both Firebase and Google Analytics
  const sendAnalyticsEvent = async (eventName, params = {}) => {
    try {
      // Firebase Analytics
      if (!window.api) {
        console.error('window.api is undefined');
        logEvent(analytics, eventName, { client_id: 'unknown', ...params });
      } else {
        let clientId = localStorage.getItem('client_id');
        if (!clientId) {
          clientId = await window.api.getMachineId();
          localStorage.setItem('client_id', clientId);
          console.log('Stored new clientId:', clientId);
        }
        const appVersion = await window.api.getAppVersion();
        console.log('clientId:', clientId, 'appVersion:', appVersion);
        setUserId(analytics, clientId);
        logEvent(analytics, eventName, {
          client_id: clientId,
          app_version: appVersion,
          ...params
        });
        console.log('Firebase Event logged:', eventName);
      }

      // Google Analytics
      window.gtag('event', eventName, {
        client_id: localStorage.getItem('client_id') || 'unknown',
        ...params
      });
      console.log('Google Analytics Event logged:', eventName);
    } catch (error) {
      console.error('Analytics Error:', error);
      logEvent(analytics, eventName, { client_id: 'error', ...params });
    }
  };

  console.log('Analytics initialized:', analytics);

  useEffect(() => {
    const initializeApp = async () => {
      // Check dependencies
      if (window.api) {
        const checkDependencies = async () => {
          const status = await window.api.checkDependencies();
          if (status.ready) {
            setIsLoading(false);
          } else {
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

      // Send initial analytics event
      sendAnalyticsEvent('app_start');
    };

    initializeApp();
  }, []);
  useEffect(() => {
    const activeInterval = setInterval(() => {
      sendAnalyticsEvent('app_active', {
        timestamp: new Date().toISOString(),
      });
      console.log('Logged app_active event');
    }, 900000 ); // 5 minutes in milliseconds

    return () => clearInterval(activeInterval);
  }, []);
  useEffect(() => {
    const initializeAnalytics = async () => {
      if (await isSupported()) {
        setAnalyticsCollectionEnabled(analytics, true);
        console.log('Firebase Analytics collection enabled');
      } else {
        console.error('Firebase Analytics not supported');
      }

      if (window.api) {
        const clientId = await window.api.getMachineId();
        setUserId(analytics, clientId);
        console.log('Set user ID:', clientId);
      }

      sendAnalyticsEvent('app_start');
    };

    initializeAnalytics();
  }, []);

  const handleInstallUpdate = () => {
    if (window.api) {
      window.api.installUpdate();
      setUpdateAvailable(false);
      setUpdateDownloaded(false);
      setUpdateInfo(null);
      sendAnalyticsEvent('update_installed');
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
        <div style={{width: showWebView?"0%":"20%"}}>
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
          sendAnalyticsEvent={sendAnalyticsEvent}
        />
      </div>
    </div>
  );
}

export default App;