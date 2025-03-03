import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaPause, FaPlay, FaSpinner } from "react-icons/fa";
import "../common.css";

function DownloadList({ url, downloadType, quality, format, saveTo,selectedItem }) {
  const [videoTitle, setVideoTitle] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [fileSize, setFileSize] = useState("Unknown");
  const [speed, setSpeed] = useState("Unknown");
  const [eta, setEta] = useState("Unknown");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
console.log("selectedItemselectedItemselectedItem",selectedItem);

  useEffect(() => {
    if (!url || isDownloading) return;

    const fetchAndDownload = async () => {
      try {
        setDownloadStatus("Fetching video info...");
        setIsDownloading(true);

        const info = await window.api.fetchVideoInfo(url);
        setVideoTitle(info.title);
        setVideoThumbnail(info.thumbnail);

        setDownloadStatus("Starting download...");
        await window.api.downloadVideo({ url, isAudioOnly: downloadType === "Audio", selectedFormat: format, selectedQuality: quality, saveTo });
        setDownloadStatus("Downloading...");

      } catch (error) {
        setError(error.message);
        setDownloadStatus("Error occurred.");
        setIsDownloading(false);
      }
    };

    fetchAndDownload();

    window.api.onDownloadProgress((progressData) => {
      console.log("progressDataprogressData",progressData.message);
      if (progressData.message && progressData.message.includes("has already been downloaded")) {
        alert("The file has already been downloaded.");
        return;
      }
      if (!progressData.message) return;

      const parseMessage = progressData.message.match(/(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/);
      if (parseMessage) {
        const [, progress, fileSize, speed, eta] = parseMessage;

        setDownloadProgress(parseFloat(progress));
        setFileSize(fileSize || "Unknown");
        setSpeed(speed || "Unknown");
        setEta(eta || "Unknown");
        setDownloadStatus("Downloading");

        if (parseFloat(progress) >= 100) {
          setIsCompleted(true);
          setDownloadStatus("Completed");
        }
      }
    });

  }, [url]);

  const handlePauseResume = async () => {
    if (isPaused) {
      await window.api.resumeDownload({ url, isAudioOnly: downloadType === "Audio", selectedFormat: format, selectedQuality: quality, saveTo });
      setIsPaused(false);
    } else {
      await window.api.pauseDownload();
      setIsPaused(true);
    }
  };

  return (
    <>
    <div className="d-flex align-items-center bg-white p-3 shadow-lg rounded w-100 border border-secondary mb-3" >
      {/* Loading Spinner */}
      {/* {isDownloading && !isCompleted && <FaSpinner className="spinner ms-2 text-primary" style={{ animation: "spin 1s linear infinite" }} />} */}
      
      {/* Thumbnail or Skeleton */}
      <div className="flex-shrink-0 me-3">
        {videoThumbnail ? (
          <img src={videoThumbnail} alt="Thumbnail" className="rounded object-fit-cover" style={{ width: "90px", height: "90px" }} />
        ) : (
          <div className="skeleton skeleton-box"></div>
        )}
      </div>

      {/* Video Info or Skeleton */}
      <div className="flex-grow-1">
        {videoTitle ? (
          <>
            <h5 className="fw-semibold text-dark text-truncate">{videoTitle}</h5>
            <p className="text-muted mb-2 small">
              <strong>Progress:</strong> {downloadProgress.toFixed(2)}% •
              <strong> File Size:</strong> {fileSize} •
              <strong> Speed:</strong> {speed} •
              <strong> ETA:</strong> {eta}
            </p>
          </>
        ) : (
          <>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
          </>
        )}
        
        {/* Progress Bar */}
        <div className="progress" style={{ height: "6px" }}>
          <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${downloadProgress}%` }}></div>
        </div>
      </div>

      {/* Action Button & Status Icons */}
      <div className="d-flex align-items-center gap-2 ms-3">
        {speed !=="Unknown" &&
          <button onClick={handlePauseResume} className="btn btn-light border rounded-circle p-2">
          {isPaused ? <FaPlay className="text-secondary" /> : <FaPause className="text-secondary" />}
        </button>
        }
      
        {isCompleted && <FaCheckCircle className="text-success fs-4" />}
        {error && <FaExclamationTriangle className="text-danger fs-4" />}
      </div>
    </div>
    
    </>
    
  );
}

export default DownloadList;