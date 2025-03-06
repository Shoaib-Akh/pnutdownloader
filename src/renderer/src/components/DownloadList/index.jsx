import React, { useState, useEffect, useCallback } from 'react'
import {
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
  FaPause,
  FaPlay,
  FaEllipsisV,
  FaTrash
} from 'react-icons/fa'
import { ProgressBar } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'

function DownloadList({
  url,
  downloadType,
  quality,
  format,
  saveTo,
  selectedItem,
  download,
  setdownload,
  setDownloadList,
  downloadList
}) {
 
  const [dropdownOpen, setDropdownOpen] = useState(null)
console.log("downloadList",downloadList);

 

  useEffect(() => {
    async function fetchDownloadedFiles() {
      const desktopPath = await window.api.getPath('downloads')
      const downloadDir = `${desktopPath}/pnutdownloader`
      try {
        const files = await window.api.readDirectory(downloadDir)
        const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []
        const updatedList = storedDownloads.map((item) => {
          const normalizedTitle = item.title.replace(/\|/g, '｜').trim()
          const possibleExtensions = ['mp4', 'webm', 'mkv', 'avi']
          const fileExists = files.some((file) => {
            return possibleExtensions.some((ext) => {
              const expectedFilename = `${normalizedTitle}.${ext}`
              return file === expectedFilename
            })
          })
          if (fileExists) {
            return { ...item, status: 'Completed', isCompleted: true, progress: 100 }
          }
          return item
        })
        setDownloadList(updatedList)
        localStorage.setItem('downloadList', JSON.stringify(updatedList))
      } catch (error) {
        console.error('❌ Error reading directory:', error)
      }
    }
    if (!download) {
      fetchDownloadedFiles()
    }
  }, [])
  

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
  
  const handlePauseResume = (url) => {
    setDownloadList((prev) =>
      prev.map((item) => {
        if (item.url === url) {
          item.isPaused
            ? window.api.resumeDownload({
                url,
                isAudioOnly: downloadType === 'Audio',
                selectedFormat: item.format,
                selectedQuality: item.quality,
                saveTo
              })
            : window.api.pauseDownload()
          return { ...item, isPaused: !item.isPaused }
        }
        return item
      })
    )
  }
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
                  {item.loading ? (
                    <Skeleton width={100} height={50} />
                  ) : (
                    <>
                      <img
                        src={item.thumbnail}
                        style={{ width: 50, height: 50, borderRadius: 10, marginRight: 5 }}
                        alt="Thumbnail"
                      />
                      {item.title
                        ? `#${item.title.split(' ').slice(0, 5).join(' ')}${item.title.split(' ').length > 5 ? '...' : ''}`
                        : '' || <Skeleton width={50} />}
                    </>
                  )}
                </td>
                <td className="data-cell">
                  {item.loading ? <Skeleton width={50} /> : item.duration}
                </td>
                <td className="data-cell">
                  {item.loading ? <Skeleton width={50} /> : item.format}
                </td>
                <td className="data-cell status-cell">
                  {item.loading ? (
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
                  <button
                    className="three-dots-btn"
                    onClick={() => setDropdownOpen(dropdownOpen === item.url ? null : item.url)}
                  >
                    <FaEllipsisV />
                  </button>
                  {dropdownOpen === item.url && (
                    <div className="dropdown-menu show">
                      {!item.isCompleted && (
                        <button
                          className="dropdown-item"
                          onClick={() => handlePauseResume(item.url)}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DownloadList
