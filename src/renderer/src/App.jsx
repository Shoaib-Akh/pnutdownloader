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
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const analyticsSupported = await isSupported();
        
        if (analyticsSupported) {
          const analyticsInstance = getAnalytics(app);
          setAnalytics(analyticsInstance);
          setAnalyticsCollectionEnabled(analyticsInstance, true);
          console.log('Firebase Analytics initialized successfully');
        } else {
          throw new Error('Firebase Analytics not supported in this environment');
        }
      } catch (error) {
        console.error('Firebase initialization error:', error);
        setAnalyticsError(`Firebase Error: ${error.message}`);
      }
    };

    initFirebase();
  }, []);

  // Initialize Google Analytics
  useEffect(() => {
    const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
    
    if (!GA_MEASUREMENT_ID) {
      console.error('Google Analytics Measurement ID not found');
      setAnalyticsError(prev => `${prev ? prev + ' | ' : ''}GA Error: Missing Measurement ID`);
      return;
    }

    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID);

      console.log('Google Analytics initialized successfully');
    } catch (error) {
      console.error('Google Analytics initialization error:', error);
      setAnalyticsError(prev => `${prev ? prev + ' | ' : ''}GA Error: ${error.message}`);
    }
  }, []);

  // Get client ID with fallback
  const getClientId = async () => {
    try {
      if (window.api) {
        return await window.api.getMachineId();
      } else {
        // Fallback for non-Electron environments
        let clientId = localStorage.getItem('client_id');
        if (!clientId) {
          clientId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
          localStorage.setItem('client_id', clientId);
        }
        return clientId;
      }
    } catch (error) {
      console.error('Error getting client ID:', error);
      return 'unknown-client-id';
    }
  };

  // Unified analytics event tracking
  const sendAnalyticsEvent = async (eventName, params = {}) => {
    try {
      const clientId = await getClientId();
      const appVersion = window.api ? await window.api.getAppVersion() : 'web';

      // Firebase Analytics
      if (analytics) {
        setUserId(analytics, clientId);
        logEvent(analytics, eventName, {
          client_id: clientId,
          app_version: appVersion,
          ...params
        });
        console.log('Firebase event logged:', eventName);
      }

      // Google Analytics
      if (window.gtag) {
        window.gtag('event', eventName, {
          client_id: clientId,
          app_version: appVersion,
          ...params
        });
        console.log('GA event logged:', eventName);
      }
    } catch (error) {
      console.error('Error sending analytics event:', error);
    }
  };

  // App initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check dependencies
        if (window.api) {
          const checkDependencies = async () => {
            try {
              const status = await window.api.checkDependencies();
              if (status.ready) {
                setIsLoading(false);
              } else {
                setTimeout(checkDependencies, 20000);
              }
            } catch (error) {
              console.error('Dependency check error:', error);
              setIsLoading(false); // Continue even if dependencies fail
            }
          };
          checkDependencies();

          // Check for updates
          window.api.checkForUpdates();

          window.api.onUpdateAvailable((info) => {
            console.log('Update available:', info);
            setUpdateAvailable(true);
            setUpdateInfo(info);
            sendAnalyticsEvent('update_available');
          });

          window.api.onUpdateDownloaded((info) => {
            console.log('Update downloaded:', info);
            setUpdateDownloaded(true);
            setUpdateInfo(info);
            sendAnalyticsEvent('update_downloaded');
          });

          window.api.onUpdateDownloadedProgress((progress) => {
            setDownloadProgress(progress.percent);
          });

          window.api.onUpdateError((err) => {
            console.error('Update error:', err);
            sendAnalyticsEvent('update_error', { error: err.message });
          });
        } else {
          setIsLoading(false); // No window.api, continue loading
        }

        // Send initial analytics event
        await sendAnalyticsEvent('app_start');
      } catch (error) {
        console.error('App initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Periodic activity tracking
  useEffect(() => {
    const activeInterval = setInterval(async () => {
      await sendAnalyticsEvent('app_active', {
        timestamp: new Date().toISOString(),
      });
    }, 900000); // 15 minutes

    return () => clearInterval(activeInterval);
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
        {analyticsError && (
          <div style={{
            marginTop: '20px',
            color: '#d9534f',
            maxWidth: '80%',
            textAlign: 'center'
          }}>
            Analytics Warning: {analyticsError}
          </div>
        )}
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
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

      {analyticsError && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '12px'
        }}>
          Analytics Error: {analyticsError}
        </div>
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

      <div className="d-flex" style={{ transition: 'margin-left 0.3s ease-in-out' }}>
        <div style={{ width: showWebView ? "0%" : "20%" }}>
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