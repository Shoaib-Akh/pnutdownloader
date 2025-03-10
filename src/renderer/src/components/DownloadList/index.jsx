import React, { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaRegClock,
  FaPause,
  FaPlay,
  FaEllipsisV,
  FaTrash,
  FaDownload,
} from "react-icons/fa";
import { ProgressBar } from "react-bootstrap";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import "../common.css";

function DownloadList({ selectedItem, setDownloadList, downloadList, fetchingInfoMap }) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    async function fetchDownloadedFiles() {
      try {
        const desktopPath = await window.api.getPath("downloads");
        const downloadDir = `${desktopPath}/pnutdownloader`;
        const files = await window.api.readDirectory(downloadDir);
        const storedDownloads = JSON.parse(localStorage.getItem("downloadList")) || [];

        const updatedList = storedDownloads.map((item) => {
          const normalizedTitle = item.title.replace(/\|/g, "｜").trim();
          const possibleExtensions = ["mp4", "webm", "mkv", "avi"];
          const fileExists = files.some((file) =>
            possibleExtensions.some((ext) => file === `${normalizedTitle}.${ext}`)
          );
          return fileExists ? { ...item, status: "Completed", isCompleted: true, progress: 100 } : item;
        });

        setDownloadList(updatedList);
        localStorage.setItem("downloadList", JSON.stringify(updatedList));
      } catch (error) {
        console.error("❌ Error reading directory:", error);
      }
    }
    fetchDownloadedFiles();
  }, [setDownloadList]);

  const handleDelete = (url) => {
    setDownloadList((prev) => {
      const updatedList = prev.filter((item) => item.url !== url)
      localStorage.setItem('downloadList', JSON.stringify(updatedList))
      return updatedList
    })
  }
  const filteredList = downloadList.filter((item) =>
    selectedItem === 'Video'
      ? item.format === 'MP4'
      : selectedItem === 'Audio'
        ? item.format === 'MP3'
        : selectedItem === 'Recent Download'
          ? true
          : false
  )

  const handlePauseResume = async (id) => {
    setDownloadList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.isPaused) {
            window.api.resumeDownload({
              url: item.url,
              isAudioOnly: item.downloadType === "Audio",
              selectedFormat: item.format,
              selectedQuality: item.quality,
              saveTo: item.saveTo,
            });
            return { ...item, isPaused: false, status: "Downloading" };
          } else {
            window.api.showConfirmDialog(
              "Pause Download",
              "If you pause the download, resuming may start from the beginning. Do you want to continue?"
            ).then((response) => {
              if (response === 0) {
                window.api.pauseDownload(item.id);
                setDownloadList((prevState) =>
                  prevState.map((itm) =>
                    itm.id === id ? { ...itm, isPaused: true, status: "Paused" } : itm
                  )
                );
              }
            });
          }
        }
        return item;
      })
    );
  };
  const getThumbnailUrl = (videoId, quality) => 
    videoId ? `https://i.ytimg.com/vi/${videoId}/${quality}.jpg` : null;

  const handleImageError = (videoId) => {
    setImageErrors((prevErrors) => {
      const fallbackQualities = ["hqdefault", "mqdefault", "default"];
      const currentIndex = prevErrors[videoId] || 0;

      if (currentIndex < fallbackQualities.length) {
        return { ...prevErrors, [videoId]: currentIndex + 1 };
      } else {
        return { ...prevErrors, [videoId]: "error" }; // Mark as failed
      }
    });
  };
  return (
    <div className="container-fluid p-0">
      <div className="table-container">
        <table className="file-table">
          <thead>
            <tr>
              <th className="header-cell">Files</th>
              <th className="header-cell">DURATION</th>
              <th className="header-cell">Format</th>
              <th className="header-cell">Status</th>
              <th className="header-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => {
                const imageQuality =
                ["maxresdefault", "hqdefault", "mqdefault", "default"][
                  imageErrors[item.videoId] || 0
                ];
              const imageSrc =
                imageErrors[item.videoId] === "error"
                  ? null
                  : getThumbnailUrl(item.videoId, imageQuality);
                  return(
              <tr key={item.url} className="data-row">
                <td className="data-cell">
                  {fetchingInfoMap.get(item.id) ? (
                    <Skeleton width={100} height={50} />
                  ) : (
                    <>
                       {imageSrc ? (
              <img
                src={imageSrc}
                onError={handleImageError}
                style={{ width: 50, height: 50, borderRadius: 10, marginRight: 10 }}
                alt="Thumbnail"
              />
            ) : (
              <FaDownload  className="text-danger"  style={{ width: 30,height: 30, borderRadius: 10, marginRight: 10 }}/>
            )}   

                      {fetchingInfoMap.get(item.id) ? (
                        <Skeleton width={50} />
                       
                      ) : (
                         `#${item.title.slice(0, 20)}${item.title.length > 15 ? '...' : ''}`
                      )}
                    </>
                  )}
                  </td>
                <td className="data-cell">
                  {fetchingInfoMap.get(item.id) ? <Skeleton width={50} /> : item.duration}
                </td>
                <td className="data-cell">
                  {fetchingInfoMap.get(item.id) ? <Skeleton width={50} /> : item.format}
                </td>
                <td className="data-cell status-cell">
                  {fetchingInfoMap.get(item.id) ? (
                    <Skeleton width={100} />
                  ) : item.isCompleted ? (
                    <>
                      <FaCheckCircle className="text-success" /> {item.status}
                    </>
                    ) : (
                      <div>
                        <FaRegClock className="text-primary" /> {item.status}
                      <ProgressBar
                        now={item.progress}
                        className="flex-grow-1"
                        style={{ height: 4 }}
                      />
                      </div>
                    )}
                  </td>

                <td className="data-cell action-cell">
                  {fetchingInfoMap.get(item.id) ? (
                    <Skeleton width={40} height={40} borderRadius={100} />
                  ) : (
                    <button
                      className="three-dots-btn"
                      onClick={() => setDropdownOpen(dropdownOpen === item.url ? null : item.url)}
                    >
                      <FaEllipsisV />
                    </button>
                  )}

                    {dropdownOpen === item.url && (
                    <div className="dropdown-menu show">
                        {!item.isCompleted && (
                        <button
                          className="dropdown-item"
                          onClick={() => handlePauseResume(item.id)}
                        >
                          {item.isPaused ? (
                            <FaPlay className="me-2" />
                          ) : (
                            <FaPause className="me-2" />
                          )}{' '}
                          {item.isPaused ? 'Resume' : 'Pause'}
                          </button>
                        )}

                      <button className="dropdown-item" onClick={() => handleDelete(item.url)}>
                        <FaTrash className="me-2" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
            )})}
          
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DownloadList
