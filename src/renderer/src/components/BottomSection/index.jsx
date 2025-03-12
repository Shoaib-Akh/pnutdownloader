import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaDownload,FaTimes,FaGlobe,FaArrowRight  } from 'react-icons/fa';
import '../common.css';
import PlatformIcons from '../PlatformIcons';
import DownloadList from '../DownloadList';
import { v4 as uuidv4 } from 'uuid';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

function BottomSection({
  downloadType,
  quality,
  format,
  saveTo,
  selectedItem,
  setIsSidebarOpen,
  isSidebarOpen,
  setSelectedItem,
  download,
  setDownload,
  setShowWebView,
  showWebView,
  setDownloadListOpen,
  downloadListOpen,
  pastLinkUrl
}) {
  
  const [url, setUrl] = useState('');
  const [lastUrl, setLastUrl] = useState('');
  const [isDownloadable, setIsDownloadable] = useState(false);
  const [currentWebViewUrl, setCurrentWebViewUrl] = useState('');
 
  const [downloading, setDownloading] = useState(false);
  const [downloadList, setDownloadList] = useState([]);
  const webviewRef = useRef(null);
  const downloadQueue = useRef([]);
  const isDownloading = useRef(false);
  const [fetchingInfoMap, setFetchingInfoMap] = useState(new Map());
  const [progressMap, setProgressMap] = useState(new Map());
  const extractVideoId = (url) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };
  const API_KEY = 'AIzaSyAqOmz88j_a10_Eoa7-Z9lgW8b-J6YrXI4' 
  const getVideoInfo = async (videoUrl) => {
    try {
      const videoId = extractVideoId(videoUrl); // Extract the video ID from the URL
      if (!videoId) throw new Error('Invalid YouTube URL');
  
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`
      );
      const data = await response.json();
  
      if (data.items.length === 0) throw new Error('Video not found');
  
      const videoInfo = data.items[0].snippet;
      console.log("videoInfo",videoInfo)
      
      return {

        videoUrl:videoUrl,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnails.high.url,
        duration: data.items[0].contentDetails.duration, // ISO 8601 format
      };
    } catch (error) {
      console.error('Error fetching video info:', error);
      return null;
    }
  };
  // Handle webview navigation
  useEffect(() => {
    if (webviewRef.current) {
      const webview = webviewRef.current;

      const handleNavigation = (event) => {
        setCurrentWebViewUrl(event.url);
        checkIfDownloadable(event.url);
      };

      webview.addEventListener('did-navigate', handleNavigation);
      webview.addEventListener('did-navigate-in-page', handleNavigation);

      return () => {
        webview.removeEventListener('did-navigate', handleNavigation);
        webview.removeEventListener('did-navigate-in-page', handleNavigation);
      };
    }
  }, [showWebView]);

  // Update last URL and reset download state
  useEffect(() => {
    if (currentWebViewUrl) {
      window.api.getYoutubeCookies();
    }
    setLastUrl(currentWebViewUrl);
    setDownload(false);
  }, [currentWebViewUrl]);

  // Handle platform click
  const handlePlatformClick = (platformUrl) => {
    setUrl(platformUrl);
    setShowWebView(true);
    setIsDownloadable(false);
    setIsSidebarOpen(false);
  };

  // Handle close webview
  const handleCloseWebView = () => {
    setLastUrl(currentWebViewUrl || url);
    setUrl('');
    setShowWebView(false);
    setIsDownloadable(false);
    setIsSidebarOpen(true);
  };

  // Handle resume browser
  const handleResumeBrowser = () => {
    if (lastUrl) {
      setUrl(lastUrl);
      setShowWebView(true);
      setIsSidebarOpen(false);
    }
  };

  // Check if the URL is downloadable
  const checkIfDownloadable = (currentUrl) => {
    const videoPatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /vimeo\.com\/\d+/,
      /facebook\.com\/watch\//,
      /tiktok\.com\/@.+\/video\/\d+/,
      /twitter\.com\/.+\/status\/\d+/,
    ];
    setIsDownloadable(videoPatterns.some((pattern) => pattern.test(currentUrl)));
  };
// Handle download click
const handleDownloadClick = () => {
  if (!currentWebViewUrl) {
    console.error('No URL detected.');
    return;
  }

  setUrl(currentWebViewUrl);
  setDownloadListOpen(true);
  setShowWebView(false);
  setIsSidebarOpen(true);
  setSelectedItem('Recent Download');
  setDownload(true);

  // Add URL to the download queue
  addToQueue(currentWebViewUrl);
};

const addToQueue = (url) => {
  if (!url) return;

  const newId = uuidv4();
  const newDownload = {
    id: newId,
    url,
    title: 'Pending...',
    thumbnail: '',
    filename: '',
    quality: quality,
    format: format,
    duration: 'Unknown',
    progress: 0,
    fileSize: 'Unknown',
    speed: 'Unknown',
    eta: 'Unknown',
    status: 'Queued',
    isCompleted: false,
    isFailed: false,
    isPaused: false,
  };

  setDownloadList((prev) => [newDownload, ...prev]);
  localStorage.setItem('downloadList', JSON.stringify([newDownload, ...JSON.parse(localStorage.getItem('downloadList') || '[]')]))
  downloadQueue.current.push(url);

  if (!isDownloading.current) {
    processQueue();
  }
};

const processQueue = async () => {
  if (downloadQueue.current.length === 0) {
    isDownloading.current = false;
    return;
  }

  isDownloading.current = true;

  while (downloadQueue.current.length > 0) {
    const url = downloadQueue.current[0];
    try {
      await startDownload([url]);
    } catch (error) {
      console.error('Download error:', error);
    }
    downloadQueue.current.shift();
  }

  isDownloading.current = false;
};

const startDownload = useCallback(async (urls) => {
  try {
    let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
    
    for (const url of urls) {
      const itemIndex = storedDownloads.findIndex((item) => item.url === url);
      if (itemIndex === -1) continue;

      // Update status to Fetching Info
      setDownloadList(prev => updateStatus(prev, url, 'Fetching Info...'));
      storedDownloads = updateLocalStorage(storedDownloads, url, 'Fetching Info...');

      let info;
      try {
        info = await getVideoInfo(url);
      } catch (error) {
        setDownloadList(prev => markFailed(prev, url));
        storedDownloads = markFailed(storedDownloads, url);
        continue;
      }

      // Update with fetched info
      const updatedItem = {
        ...storedDownloads[itemIndex],
        title: info?.title || 'Unknown',
        thumbnail: info?.thumbnail || '',
        filename: info?.filename || '',
        duration: info?.duration || 'Unknown',
        status: 'Downloading',
      };

      setDownloadList(prev => updateItem(prev, url, updatedItem));
      storedDownloads = updateLocalStorageItem(storedDownloads, url, updatedItem);
      const handleProgress = (progressData) => {
        console.log('Progress data received:', progressData);
        const parseMessage = progressData.message.match(
          /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
        );

        if (parseMessage) {
          const [, progress, fileSize, speed, eta] = parseMessage;
          console.log('Parsed progress data:', { progress, fileSize, speed, eta });

          // Update local progress state
          setProgressMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(updatedItem.id, { progress: parseFloat(progress), fileSize, speed, eta });
            console.log('Updated progress map:', newMap);
            return newMap;
          });
        }
      };
      window.api.onDownloadProgress(handleProgress);
      try {
        await window.api.downloadVideo({
          id: updatedItem.id,
          url,
          isAudioOnly: downloadType === 'Audio',
          selectedFormat: format,
          selectedQuality: quality,
          saveTo,
        });

        setDownloadList(prev => markCompleted(prev, url));
        storedDownloads = markCompleted(storedDownloads, url);
      } catch (error) {
        const status = error.message.includes('paused') ? 'Paused' : 'Failed';
        setDownloadList(prev => updateStatus(prev, url, status));
        storedDownloads = updateLocalStorageStatus(storedDownloads, url, status);
      }
    }
  } catch (error) {
    console.error('Download error:', error);
  }
}, [downloadType, format, quality, saveTo]);

// Helper functions
const updateStatus = (list, url, status) => 
  list.map(item => item.url === url ? {...item, status} : item);

const markFailed = (list, url) =>
  list.map(item => item.url === url ? {...item, status: 'Failed', isFailed: true} : item);

const updateItem = (list, url, newItem) =>
  list.map(item => item.url === url ? newItem : item);

const markCompleted = (list, url) =>
  list.map(item => item.url === url ? {...item, status: 'Completed', isCompleted: true} : item);

const updateLocalStorage = (list, url, status) => {
  const updated = list.map(item => item.url === url ? {...item, status} : item);
  localStorage.setItem('downloadList', JSON.stringify(updated));
  return updated;
};

const updateLocalStorageItem = (list, url, newItem) => {
  const updated = list.map(item => item.url === url ? newItem : item);
  localStorage.setItem('downloadList', JSON.stringify(updated));
  return updated;
};

const updateLocalStorageStatus = (list, url, status) => {
  const updated = list.map(item => 
    item.url === url ? {
      ...item, 
      status,
      ...(status === 'Failed' ? {isFailed: true} : {}),
      ...(status === 'Paused' ? {isPaused: true} : {})
    } : item
  );
  localStorage.setItem('downloadList', JSON.stringify(updated));
  return updated;
};

useEffect(() => {
  const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
  setDownloadList(storedDownloads);
}, []);
  // Render the component
  return (
    <div>
      {!showWebView ? (
        <>
          {downloadListOpen && selectedItem ? (
            <div className="video-preview" style={{ marginLeft: 60, marginRight: 10 }}>
              <DownloadList
                downloadType={downloadType}
                quality={quality}
                format={format}
                saveTo={saveTo}
                url={currentWebViewUrl}
                selectedItem={selectedItem}
                download={download}
                setDownload={setDownload}
                setDownloadList={setDownloadList}
                downloadList={downloadList}
                progressMap={progressMap}
              />

              {lastUrl ? (
                <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="close-tooltip">Resume Browser</Tooltip>}
              >
                <button
                  className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
                  style={{ width: "48px", height: "48px" }}
                  onClick={handleResumeBrowser}
                >
                  <FaGlobe size={16}/>
                </button>
              </OverlayTrigger>
              ) : (
                <OverlayTrigger
                placement="left"
                overlay={<Tooltip id="close-tooltip">Back</Tooltip>}
              >
                <button
                  className=" shadow close-webview-btn"
                  style={{ width: "48px", height: "48px" }}
                  onClick={() => {
                    if (lastUrl) {
                      handleResumeBrowser();
                    } else {
                      setShowWebView(false);
                      setDownloadListOpen(false);
                    }
                  }}
                >
                  <FaArrowRight size={20} />
                </button>
              </OverlayTrigger>
                // <button
                //   className="close-webview-btn"
                  
                // >
                //   Back
                // </button>
              )}
            </div>
          ) : (
            <div className="bottom-container">
              <h1>Select a service below and enter your search query</h1>
              <PlatformIcons handlePlatformClick={handlePlatformClick} />
              {lastUrl && (
                // <button className="close-webview-btn" onClick={handleResumeBrowser}>
                //   Resume Browser
                // </button>
                <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="close-tooltip">Resume Browser</Tooltip>}
              >
                <button
                  className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
                  style={{ width: "48px", height: "48px" }}
                  onClick={handleResumeBrowser}
                >
                  <FaGlobe size={16}/>
                </button>
              </OverlayTrigger>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          className="webview-container"
          style={{ margin: isSidebarOpen ? '10px 20px 10px 60px' : '10px 20px 10px 30px' }}
        >
          <webview ref={webviewRef} src={url} style={{ height: '100%', width: '100%' }} />
          {/* <button className="close-webview-btn" onClick={handleCloseWebView}>
            Close Browser
          </button> */}
           <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="close-tooltip">Close Process</Tooltip>}
    >
      <button
        className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center shadow close-webview-btn"
        style={{ width: "48px", height: "48px" }}
        onClick={handleCloseWebView}
      >
        <FaTimes size={20} />
      </button>
    </OverlayTrigger>
  
          {isDownloadable && (
            <button className="download-btn" onClick={handleDownloadClick}>
              {downloading ? 'Downloading...' : <><FaDownload /> Download</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default BottomSection;