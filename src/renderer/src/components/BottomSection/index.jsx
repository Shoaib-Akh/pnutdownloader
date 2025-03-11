import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaDownload } from 'react-icons/fa';
import '../common.css';
import PlatformIcons from '../PlatformIcons';
import DownloadList from '../DownloadList';
import { v4 as uuidv4 } from 'uuid';

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
  downloadListOpen
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

    // Add the URL to the queue and process it
    addToQueue(currentWebViewUrl);
  };

  // Add URL to the download queue
  const addToQueue = (url) => {
    if (!url) return;
  
    // Create a new download item with "Fetching Info..." status
    const newId = uuidv4();
    const newDownload = {
      id: newId,
      url,
      title: 'Fetching Info...',
      thumbnail: '',
      filename: '',
      quality: quality,
      format: format,
      duration: 'Unknown',
      progress: 0,
      fileSize: 'Unknown',
      speed: 'Unknown',
      eta: 'Unknown',
      status: 'Fetching Info..',
      isCompleted: false,
      isFailed: false,
      isPaused: false,
    };
  
    // Add the new download to the list
    setDownloadList((prev) => [newDownload, ...prev]);
    localStorage.setItem('downloadList', JSON.stringify([newDownload, ...JSON.parse(localStorage.getItem('downloadList') || '[]')]));
  
    // Add the URL to the queue and process it
    downloadQueue.current.push(url);
  
    if (!isDownloading.current) {
      processQueue();
    }
  };

  // Process the download queue
  const processQueue = async () => {
    if (downloadQueue.current.length === 0) {
      isDownloading.current = false;
      return;
    }
  
    isDownloading.current = true;
    const url = downloadQueue.current[0]; // Get the first item in the queue without removing it
  
    try {
      // Fetch video info
      const info = await window.api.fetchVideoInfo(url);
  
      // Update the download item with the fetched info
      setDownloadList((prev) => {
        const updatedList = prev.map((item) => {
          if (item.url === url) {
            return {
              ...item,
              title: info?.title || 'Unknown',
              thumbnail: info?.thumbnail || '',
              filename: info?.filename || '',
              duration: info?.duration || 'Unknown',
              status: 'Downloading', // Update status to "Downloading"
            };
          }
          return item;
        });
  
        // Update localStorage
        localStorage.setItem('downloadList', JSON.stringify(updatedList));
        return updatedList;
      });
  
      // Remove the URL from the queue
      downloadQueue.current.shift();
  
      // Start the download
      await startDownload([url], info);
    } catch (error) {
      console.error('Error fetching video info:', error);
  
      // If fetching info fails, mark the item as failed
      setDownloadList((prev) => {
        const updatedList = prev.map((item) => {
          if (item.url === url) {
            return {
              ...item,
              status: 'Failed',
              isFailed: true,
            };
          }
          return item;
        });
  
        // Update localStorage
        localStorage.setItem('downloadList', JSON.stringify(updatedList));
        return updatedList;
      });
  
      // Remove the URL from the queue
      downloadQueue.current.shift();
    } finally {
      // Process the next item in the queue after a delay
      setTimeout(() => {
        processQueue();
      }, 500); // Wait 500ms before processing the next one
    }
  };
  useEffect(() => {
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []
    setDownloadList(storedDownloads)
  }, [])
  // Start downloading a URL
  // const startDownload = useCallback(async (urls) => {
  //   try {
  //     let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
  
  //     for (const url of urls) {
  //       if (!url) continue;
  
  //       const newId = uuidv4();
  
  //       const existingDownload = storedDownloads.some((item) => item.url === url);
  //       if (existingDownload) {
  //         if (!window.alertShown) {
  //           window.api.showMessageBox({
  //             type: 'warning',
  //             title: 'Duplicate Download',
  //             message: 'This URL is already in the download list.',
  //           });
  //           window.alertShown = true;
  //           setTimeout(() => (window.alertShown = false), 1000);
  //         }
  //         continue;
  //       }
  
  //       const newDownload = {
  //         id: newId,
  //         url,
  //         title: '',
  //         thumbnail: '',
  //         filename: '',
  //         quality:quality ,
  //         format: format,
  //         duration: '',
  //         progress: 0,
  //         fileSize: 'Unknown',
  //         speed: 'Unknown',
  //         eta: 'Unknown',
  //         status: 'Fetching Info...',
  //         isCompleted: false,
  //         isFailed: false,
  //         isPaused:false
  //       };
  
  //       storedDownloads = [newDownload, ...storedDownloads];
  //       localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
  //       setDownloadList((prev) => [newDownload, ...prev]);
  
  //       // Set loading state for this specific download
  //       setFetchingInfoMap((prev) => new Map(prev).set(newId, true));
  
  //       let retries = 3;
  //       let info = null;
  //       while (retries > 0) {
  //         try {
  //           info = await window.api.fetchVideoInfo(url);
  //           break;
  //         } catch (error) {
  //           retries--;
  //           if (retries === 0) {
  //             storedDownloads = storedDownloads.map((item) =>
  //               item.id === newId ? { ...item, status: 'Failed', isFailed: true } : item
  //             );
  //             localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
  //             setDownloadList(storedDownloads);
  //             setFetchingInfoMap((prev) => new Map(prev).set(newId, false)); // Reset loading state on failure
  //             return;
  //           }
  //         }
  //       }
  
  //       // Reset loading state after fetching info
  //       setFetchingInfoMap((prev) => new Map(prev).set(newId, false));
  
  //       const updatedDownload = {
  //         ...newDownload,
  //         title: info?.title || 'Unknown',
  //         thumbnail: info?.thumbnail || '',
  //         filename: info?.filename || '',
  //         duration: info?.duration || 'Unknown',
  //         status: 'Downloading',
  //       };
  
  //       storedDownloads = storedDownloads.map((item) =>
  //         item.id === newId ? updatedDownload : item
  //       );
  //       localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
  //       setDownloadList(storedDownloads);
  
  //       try {
  //         const handleProgress = (progressData) => {
  //           const parseMessage = progressData.message.match(
  //             /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
  //           );
  
  //           if (parseMessage) {
  //             const [, progress, fileSize, speed, eta] = parseMessage;
  
  //             setDownloadList((prev) => {
  //               const updatedList = prev.map((item) => {
  //                 if (item.id === newId && item.status !== "Completed" && !item.isPaused) {
  //                   return {
  //                     ...item,
  //                     progress: parseFloat(progress),
  //                     fileSize,
  //                     speed,
  //                     eta,
  //                     status: item.isPaused ? 'Paused' : (parseFloat(progress) >= 100 ? 'Completed' : 'Downloading'),
  //                     isCompleted: parseFloat(progress) >= 100,
  //                   };
  //                 }
  //                 return item;
  //               });
  
  //               localStorage.setItem('downloadList', JSON.stringify(updatedList));
  //               return updatedList;
  //             });
  //           }
  //         };
  
  //         // Attach the progress handler
  //         window.api.onDownloadProgress(handleProgress);
  
  //         // Start the download
  //         await window.api.downloadVideo({
  //           id: newId,
  //           url,
  //           isAudioOnly: downloadType === 'Audio',
  //           selectedFormat: format,
  //           selectedQuality: quality,
  //           saveTo,
  //         });
  
  //         // Mark the download as completed
  //         storedDownloads = storedDownloads.map((item) =>
  //           item.id === newId ? { ...item, status: 'Completed', isCompleted: true } : item
  //         );
  //         localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
  //         setDownloadList(storedDownloads);
  //       } catch (error) {
  //         console.log("error", error);
  
  //         if (error.message.includes("Error invoking remote method 'downloadVideo': Error: Download failed with code")) {
  //           storedDownloads = storedDownloads.map((item) =>
  //             item.id === newId ? { ...item, status: 'Paused', isPaused: true } : item
  //           );
  //         } else {
  //           storedDownloads = storedDownloads.map((item) =>
  //             item.id === newId ? { ...item, status: 'Failed', isFailed: true } : item
  //           );
  //         }
  
  //         localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
  //         setDownloadList(storedDownloads);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('❌ Download error:', error);
  //   }
  // }, [downloadType, format, quality, saveTo]);
  const startDownload = useCallback(async (urls, info) => {
    try {
      let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
  
      for (const url of urls) {
        if (!url) continue;
  
        // Find the existing download item in the list
        const existingDownloadIndex = storedDownloads.findIndex((item) => item.url === url);
        if (existingDownloadIndex === -1) {
          console.error('Download item not found in the list.');
          continue;
        }
  
        // Update the existing download item with the fetched info
        const updatedDownload = {
          ...storedDownloads[existingDownloadIndex],
          title: info?.title || 'Unknown',
          thumbnail: info?.thumbnail || '',
          filename: info?.filename || '',
          duration: info?.duration || 'Unknown',
          status: 'Downloading', // Set status to "Downloading"
        };
  
        // Update the download list and localStorage
        storedDownloads[existingDownloadIndex] = updatedDownload;
        localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
        setDownloadList(storedDownloads);
  
        try {
          // Attach the progress handler
          const handleProgress = (progressData) => {
            const parseMessage = progressData.message.match(
              /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
            );
  
            if (parseMessage) {
              const [, progress, fileSize, speed, eta] = parseMessage;
  
              setDownloadList((prev) => {
                const updatedList = prev.map((item) => {
                  if (item.url === url && item.status !== "Completed" && !item.isPaused) {
                    return {
                      ...item,
                      progress: parseFloat(progress),
                      fileSize,
                      speed,
                      eta,
                      status: item.isPaused ? 'Paused' : (parseFloat(progress) >= 100 ? 'Completed' : 'Downloading'),
                      isCompleted: parseFloat(progress) >= 100,
                    };
                  }
                  return item;
                });
  
                // Update localStorage
                localStorage.setItem('downloadList', JSON.stringify(updatedList));
                return updatedList;
              });
            }
          };
  
          // Attach the progress handler
          window.api.onDownloadProgress(handleProgress);
  
          // Start the download
          await window.api.downloadVideo({
            id: updatedDownload.id,
            url,
            isAudioOnly: downloadType === 'Audio',
            selectedFormat: format,
            selectedQuality: quality,
            saveTo,
          });
  
          // Mark the download as completed
          storedDownloads = storedDownloads.map((item) =>
            item.url === url ? { ...item, status: 'Completed', isCompleted: true } : item
          );
          localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
          setDownloadList(storedDownloads);
        } catch (error) {
          console.log("error", error);
  
          // Handle paused or failed downloads
          if (error.message.includes("Error invoking remote method 'downloadVideo': Error: Download failed with code")) {
            storedDownloads = storedDownloads.map((item) =>
              item.url === url ? { ...item, status: 'Paused', isPaused: true } : item
            );
          } else {
            storedDownloads = storedDownloads.map((item) =>
              item.url === url ? { ...item, status: 'Failed', isFailed: true } : item
            );
          }
  
          // Update localStorage
          localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
          setDownloadList(storedDownloads);
        }
      }
    } catch (error) {
      console.error('❌ Download error:', error);
    }
  }, [downloadType, format, quality, saveTo]);
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
                fetchingInfoMap={fetchingInfoMap}
                
              />

              {lastUrl ? (
                <button className="close-webview-btn" onClick={handleResumeBrowser}>
                  Resume Browser
                </button>
              ) : (
                <button
                  className="close-webview-btn"
                  onClick={() => {
                    if (lastUrl) {
                      handleResumeBrowser();
                    } else {
                      setShowWebView(false);
                      setDownloadListOpen(false);
                    }
                  }}
                >
                  Back
                </button>
              )}
            </div>
          ) : (
            <div className="bottom-container">
              <h1>Select a service below and enter your search query</h1>
              <PlatformIcons handlePlatformClick={handlePlatformClick} />
              {lastUrl && (
                <button className="close-webview-btn" onClick={handleResumeBrowser}>
                  Resume Browser
                </button>
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
          <button className="close-webview-btn" onClick={handleCloseWebView}>
            Close Browser
          </button>
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