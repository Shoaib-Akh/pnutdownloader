import React, { useState, useEffect, useRef } from "react";
import { FaDownload } from "react-icons/fa";
import "../common.css";
import PlatformIcons from "../PlatformIcons";
import DownloadList from "../DownloadList";

function BottomSection({ downloadType, quality, format, saveTo,selectedItem,setIsSidebarOpen }) {
  const [url, setUrl] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [showWebView, setShowWebView] = useState(false);
  const [isDownloadable, setIsDownloadable] = useState(false);
  const [currentWebViewUrl, setCurrentWebViewUrl] = useState("");
  const [downloadListOpen, setDownloadListOpen] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [downloading, setDownloading] = useState(false);
  const webviewRef = useRef(null);
console.log(lastUrl);

  useEffect(() => {
    if (webviewRef.current) {
      const webview = webviewRef.current;

      const handleNavigation = (event) => {
        setCurrentWebViewUrl(event.url);
        checkIfDownloadable(event.url);
      };

      webview.addEventListener("did-navigate", handleNavigation);
      webview.addEventListener("did-navigate-in-page", handleNavigation);

      return () => {
        webview.removeEventListener("did-navigate", handleNavigation);
        webview.removeEventListener("did-navigate-in-page", handleNavigation);
      };
    }
  
    
  }, [showWebView]);
  useEffect(() => {
    if ( currentWebViewUrl) {
      window.api.getYoutubeCookies();
    }
   
  }, [ currentWebViewUrl]);
 
  
  const handlePlatformClick = (platformUrl) => {
    setUrl(platformUrl);
    setShowWebView(true);
    setIsDownloadable(false);
    setIsSidebarOpen(false)
  
  };

  const handleCloseWebView = () => {
    setLastUrl(currentWebViewUrl || url);
    setUrl("");
    setShowWebView(false);
    setIsDownloadable(false);
    setIsSidebarOpen(true)
  };

  const handleResumeBrowser = () => {
    if (lastUrl) {
      setUrl(lastUrl);
      setShowWebView(true);
      setIsSidebarOpen(false)
    }
  };

  const checkIfDownloadable = (currentUrl) => {
    const videoPatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /vimeo\.com\/\d+/,
      /facebook\.com\/watch\//,
      /tiktok\.com\/@.+\/video\/\d+/,
      /twitter\.com\/.+\/status\/\d+/
    ];
    setIsDownloadable(videoPatterns.some((pattern) => pattern.test(currentUrl)));
  };

  return (
    <div>
      {!showWebView ? (
        <>
          {downloadListOpen && selectedItem ? (
            <div className="video-preview m-4">
              {/* <h3>Video Preview</h3> */}
              <DownloadList
              downloadType={downloadType}
              quality={quality}
              format={format}
              saveTo={saveTo}
              url={currentWebViewUrl}
              selectedItem={selectedItem}
              />
            
              {lastUrl && (
                <button className="close-webview-btn" onClick={handleResumeBrowser}>
                  Resume Browser
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
        // <div className="bottom-container">
        <div className="webview-container">
          <webview ref={webviewRef} src={url} style={{ height: "100%", width: "100%" }} />
          <button className="close-webview-btn" onClick={handleCloseWebView}>Close Browser</button>
          {isDownloadable && (
            <button className="download-btn" onClick={() => {setDownloadListOpen(true); setShowWebView(!showWebView), setIsSidebarOpen(true)}}>
              {downloading ? "Downloading..." : <><FaDownload /> Download</>}
            </button>
          )}
        </div>
        // </div>

      )}
    </div>
  );
}

export default BottomSection;
