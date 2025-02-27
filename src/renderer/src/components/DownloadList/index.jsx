import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaPause, FaPlay } from "react-icons/fa";
import "../common.css";

function DownloadList({ url, downloadType, quality, format }) {
  const [videoTitle, setVideoTitle] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [fileSize, setFileSize] = useState("");
  const [speed, setSpeed] = useState("");
  const [eta, setEta] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState("");
  const [isPaused, setIsPaused] = useState(false);


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
        await window.api.downloadVideo({ url, isAudioOnly: downloadType === "audio", selectedFormat: format, selectedQuality: quality });
        setDownloadStatus("Downloading...");
      } catch (error) {
        setError(error.message);
        setDownloadStatus("Error occurred.");
      }
    };

    fetchAndDownload();

    window.api.onDownloadProgress((progressData) => {
    
      const parseMessage = progressData.message.match(/(\d+\.\d+)% of\s+(\d+\.\d+MiB) at\s+(\d+\.\d+KiB\/s) ETA\s+(\d+:\d+)/);
      if (parseMessage) {
        const [_, progress, fileSize, speed, eta] = parseMessage;
    
        setDownloadProgress(parseFloat(progress));
        setFileSize(fileSize);
        setSpeed(speed);
        setEta(eta);
        setDownloadStatus('Downloading');
    
        // Check if download is completed
        if (parseFloat(progress) >= 100) {
          setIsCompleted(true);
          setDownloadStatus('Completed');
        }
      }
    });

  }, [url]);

  const handlePauseResume = async () => {
    if (isPaused) {
      await window.api.resumeDownload();
      setIsPaused(false);
    } else {
      await window.api.pauseDownload();
      setIsPaused(true);
    }
  };

  return (
    <div className="download-card">
      <h3>{videoTitle || "Fetching Video..."}</h3>
      <img src={videoThumbnail} alt="Thumbnail" />
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${downloadProgress}%` }}></div>
      </div>
      <p className="progress-info">
        Progress: {downloadProgress?.toFixed(2)}% | File Size: {fileSize} | Speed: {speed} | ETA: {eta}
      </p>
      <button onClick={handlePauseResume}>{isPaused ? <FaPlay /> : <FaPause />} {isPaused ? "Resume" : "Pause"}</button>
      {isCompleted && <FaCheckCircle color="green" />}
    </div>
  );
}

export default DownloadList;
