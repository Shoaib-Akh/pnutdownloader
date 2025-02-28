import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaPause, FaPlay } from "react-icons/fa";
import "../common.css";

function DownloadList({ url, downloadType, quality, format, saveTo }) {
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
      }
    };

    fetchAndDownload();

    window.api.onDownloadProgress((progressData) => {
      console.log("progressData", progressData);

      if (!progressData.message) return;

      // Improved regex to handle different speed formats and optional ETA
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
        <strong>Progress:</strong> {downloadProgress.toFixed(2)}% <br />
        <strong>File Size:</strong> {fileSize} <br />
        <strong>Speed:</strong> {speed} <br />
        <strong>ETA:</strong> {eta} <br />
      </p>

      <button onClick={handlePauseResume}>
        {isPaused ? <FaPlay /> : <FaPause />} {isPaused ? "Resume" : "Pause"}
      </button>

      {isCompleted && <FaCheckCircle color="green" />}
      {error && <p className="error"><FaExclamationTriangle color="red" /> {error}</p>}
    </div>
  );
}

export default DownloadList;
