import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCheckCircle, FaTimesCircle, FaRegClock,
  FaPause, FaPlay, FaEllipsisV, FaTrash
} from 'react-icons/fa';
import { ProgressBar } from 'react-bootstrap';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import '../common.css';

function DownloadList({ url, downloadType, quality, format, saveTo,selectedItem }) {
  const [downloadList, setDownloadList] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  
  console.log("selectedItem",selectedItem);
  
  console.log("format",format);

  
  useEffect(() => {
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
    setDownloadList(storedDownloads);
  }, []);

  useEffect(() => {
    if (url) {
      
        startDownload(url);
      }
    
  }, [url]);
;
  
const startDownload = useCallback(async (url) => {
  try {
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
    const existingDownload = storedDownloads.some((item) => item.url === url);

    if (existingDownload) {
      if (!window.alertShown) {
        window.api.showMessageBox({
          type: "warning",
          title: "Duplicate Download",
          message: "This URL is already in the download list."
        });
        window.alertShown = true;
        setTimeout(() => (window.alertShown = false), 1000);
      }
      return;
    }

    // Add loading state while fetching info
    setDownloadList((prev) => [{ url, loading: true }, ...prev]);

    var info = await window.api.fetchVideoInfo(url);
console.log("info",info);

    setDownloadList((prev) => prev.map(item => item.url === url ? { ...item, loading: false } : item));

    const newDownload = {
      url,
      title: info.title,
      thumbnail: info.thumbnail,
      quality,
      format:format,
      duration: info.duration,
      progress: 0,
      fileSize: 'Unknown',
      speed: 'Unknown',
      eta: 'Unknown',
      status: 'Downloading',
      isCompleted: false,
      isPaused: false,
    };
    
    const updatedList = [newDownload, ...storedDownloads];
    localStorage.setItem('downloadList', JSON.stringify(updatedList));
    setDownloadList(updatedList);
    await window.api.downloadVideo({
      url,
      isAudioOnly: downloadType === 'Audio',
      selectedFormat: format,
      selectedQuality: quality,
      saveTo
    })
    window.api.onDownloadProgress((progressData) => {
      if (!progressData.message) return;

      const parseMessage = progressData.message.match(
        /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
      );

      if (parseMessage) {
        const [, progress, fileSize, speed, eta] = parseMessage;

        setDownloadList((prev) => {
          const updatedList = prev.map((item) =>
            item.url === url
              ? { ...item, progress: parseFloat(progress), fileSize, speed, eta, status: parseFloat(progress) >= 100 ? 'Completed' : 'Downloading', isCompleted: parseFloat(progress) >= 100 }
              : item
          );
          localStorage.setItem('downloadList', JSON.stringify(updatedList));
          return updatedList;
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    setDownloadList((prev) =>
      prev.map((item) => (item.url === url ? { ...item, status: 'Error', loading: false } : item))
    );
  }
}, [downloadType, quality, format, saveTo]);

  const handleDelete = (url) => {
    setDownloadList((prev) => {
      const updatedList = prev.filter((item) => item.url !== url);
      localStorage.setItem('downloadList', JSON.stringify(updatedList));
      return updatedList;
    });
  };
  const filteredList = downloadList.filter(item => 
    selectedItem === "Video" ? item.format === "MP4" :
    selectedItem === "Audio" ? item.format === "MP3" :
    selectedItem === "Recent Download" ? true : false
  );
  console.log("filteredList",filteredList);
  
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

          {filteredList.map((item) => (
              <tr key={item.url} className="data-row">
                <td className="data-cell">
                  {item.loading ? <Skeleton width={100} height={50} /> : (
                    <>
                      <img src={item.thumbnail} style={{ width: 50, height: 50, borderRadius: 10, marginRight: 5 }} alt="Thumbnail" />
                      {item.title?  `#${item.title.split(' ').slice(0, 5).join(' ')}${item.title.split(' ').length > 5 ? '...' : ''}`:"" || <Skeleton width={50} />}
                    </>
                  )}
                </td>
                <td className="data-cell">{item.loading ? <Skeleton width={50} /> : item.duration}</td>
                <td className="data-cell">{item.loading ? <Skeleton width={50} /> : item.format}</td>
                <td className="data-cell status-cell">
                  {item.loading ? <Skeleton width={100} /> : item.isCompleted ? <FaCheckCircle className="text-success" /> :
                    item.isPaused ? <FaPause className="text-warning" /> :
                      <ProgressBar now={item.progress} className="flex-grow-1" style={{ height: 4 }} />}
                </td>
              
                <td className="data-cell action-cell">
                  <button className="three-dots-btn" onClick={() => setDropdownOpen(dropdownOpen === item.url ? null : item.url)}>
                    <FaEllipsisV />
                  </button>
                  {dropdownOpen === item.url && (
                    <div className="dropdown-menu show">
                      {!item.isCompleted &&
                       <button className="dropdown-item" onClick={() => handlePauseResume(item.url)}>
                       {item.isPaused ? <FaPlay className="me-2" /> : <FaPause className="me-2" />} {item.isPaused ? 'Resume' : 'Pause'}
                     </button>
                      }
                     
                      <button className="dropdown-item" onClick={() => handleDelete(item.url)}>
                        <FaTrash className="me-2" /> Delete
                      </button>
                    </div>
                  )}
              </td>
            </tr>
))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DownloadList;