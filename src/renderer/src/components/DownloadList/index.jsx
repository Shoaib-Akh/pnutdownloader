import React, { useState, useEffect } from 'react'
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaPause,
  FaPlay,
  FaEllipsisV,
  FaTrash,
  FaRegClock,
  FaTimesCircle
} from 'react-icons/fa'
import { ProgressBar } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'

function DownloadList({ url, downloadType, quality, format, saveTo, selectedItem }) {
  const [videoTitle, setVideoTitle] = useState('')
  const [videoThumbnail, setVideoThumbnail] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [fileSize, setFileSize] = useState('Unknown')
  const [speed, setSpeed] = useState('Unknown')
  const [eta, setEta] = useState('Unknown')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)

  useEffect(() => {
    if (!url || isDownloading) return

    const fetchAndDownload = async () => {
      try {
        setDownloadStatus('Fetching video info...')
        setIsDownloading(true)

        const info = await window.api.fetchVideoInfo(url)
        setVideoTitle(info.title)
        setVideoThumbnail(info.thumbnail)

        setDownloadStatus('Starting download...')
        await window.api.downloadVideo({
          url,
          isAudioOnly: downloadType === 'Audio',
          selectedFormat: format,
          selectedQuality: quality,
          saveTo
        })
        setDownloadStatus('Downloading...')
      } catch (error) {
        setError(error.message)
        setDownloadStatus('Error occurred.')
        setIsDownloading(false)
      }
    }

    fetchAndDownload()

    window.api.onDownloadProgress((progressData) => {
      if (progressData.message && progressData.message.includes('has already been downloaded')) {
        alert('The file has already been downloaded.')
        return
      }
      if (!progressData.message) return

      const parseMessage = progressData.message.match(
        /(\d+\.\d+)% of\s+([\d\.]+[KMGT]?iB)(?: at\s+([\d\.]+[KMGT]?iB\/s))?(?: ETA\s+([\d+:]+))?/
      )
      if (parseMessage) {
        const [, progress, fileSize, speed, eta] = parseMessage

        setDownloadProgress(parseFloat(progress))
        setFileSize(fileSize || 'Unknown')
        setSpeed(speed || 'Unknown')
        setEta(eta || 'Unknown')
        setDownloadStatus('Downloading')

        if (parseFloat(progress) >= 100) {
          setIsCompleted(true)
          setDownloadStatus('Completed')
        }
      }
    })
  }, [url])

  const handlePauseResume = async () => {
    if (isPaused) {
      await window.api.resumeDownload({
        url,
        isAudioOnly: downloadType === 'Audio',
        selectedFormat: format,
        selectedQuality: quality,
        saveTo
      })
      setIsPaused(false)
    } else {
      await window.api.pauseDownload()
      setIsPaused(true)
    }
  }

  const toggleDropdown = (id) => {
    setDropdownOpen(dropdownOpen === id ? null : id)
  }

  const getStatusDisplay = () => {
    if (isCompleted) {
      return (
        <>
          <FaCheckCircle className="text-success" /> Completed
        </>
      )
    }
    if (error) {
      return (
        <>
          <FaTimesCircle className="text-danger" /> Error
        </>
      )
    }
    if (downloadProgress > 0) {
      return (
        <div className="d-flex align-items-center gap-2">
          <FaRegClock className="text-primary" />
          <ProgressBar now={downloadProgress} className="flex-grow-1" style={{ height: 4 }} />
        </div>
      )
    }
    return 'Pending'
  }

  return (
    <div className="container-fluid p-0">
      <div className="table-container">
        <table className="file-table">
          <thead>
            <tr>
              <th className="header-cell">Files</th>
              <th className="header-cell">DURATION</th>
              <th className="header-cell">Quality</th>
              <th className="header-cell">Status</th>
              <th className="header-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="data-row">
              <td className="data-cell">
                <img
                  src={videoThumbnail}
                  style={{ width: 50, height: 50, borderRadius: 10, marginRight: 5 }}
                  alt="Video Thumbnail"
                />
                {videoTitle ? (
                  `#${videoTitle.split(' ').slice(0, 5).join(' ')}${videoTitle.split(' ').length > 5 ? '...' : ''}`
                ) : (
                  <Skeleton width={50} />
                )}{' '}
              </td>
              <td className="data-cell">{videoTitle ? '02:06' : <Skeleton width={50} />}</td>
              <td className="data-cell">{videoTitle ? quality : <Skeleton width={50} />}</td>
              <td className="data-cell status-cell">{getStatusDisplay()}</td>
              <td className="data-cell action-cell">
                <div className="dropdown">
                  <button className="three-dots-btn" onClick={() => toggleDropdown(1)}>
                    <FaEllipsisV />
                  </button>
                  {dropdownOpen === 1 && (
                    <div className="dropdown-menu show">
                      <button className="dropdown-item" onClick={handlePauseResume}>
                        {isPaused ? <FaPlay className="me-2" /> : <FaPause className="me-2" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                      <button className="dropdown-item">
                        <FaTrash className="me-2" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DownloadList
