import React, { useState, useEffect } from 'react'
import { FaCheckCircle, FaRegClock, FaPause, FaPlay, FaEllipsisV, FaTrash } from 'react-icons/fa'
import { ProgressBar, Dropdown } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'

function DownloadList({
  selectedItem,
  setDownloadList,
  downloadList,
  progressMap,
  handlePauseResume
}) {
  useEffect(() => {
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []
    setDownloadList(storedDownloads)
  }, [setDownloadList])

  useEffect(() => {
    async function fetchDownloadedFiles() {
      try {
        const desktopPath = await window.api.getPath('downloads')
        const downloadDir = `${desktopPath}/pnutdownloader`
        const files = await window.api.readDirectory(downloadDir)
        const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []

        const updatedList = storedDownloads.map((item) => {
          const normalizedTitle = item.title.replace(/\|/g, '｜').trim()
          const possibleExtensions = ['mp4', 'webm', 'mkv', 'avi']
          const fileExists = files.some((file) =>
            possibleExtensions.some((ext) => file === `${normalizedTitle}.${ext}`)
          )
          return fileExists
            ? { ...item, status: 'Completed', isCompleted: true, progress: 100 }
            : item
        })

        setDownloadList(updatedList)
        localStorage.setItem('downloadList', JSON.stringify(updatedList))
      } catch (error) {
        console.error('❌ Error reading directory:', error)
      }
    }
    fetchDownloadedFiles()
  }, [setDownloadList])

  const handleDelete = (url) => {
    setDownloadList((prev) => {
      const updatedList = prev.filter((item) => item.url !== url)
      localStorage.setItem('downloadList', JSON.stringify(updatedList))
      return updatedList
    })
  }

  const filteredList = downloadList
    .filter((item) => {
      const isPlaylist =
        item.url.includes('playlist') || item.url.includes('&list=') || item.url.includes('?list=')

      if (selectedItem === 'Video') return item.format === 'MP4'
      if (selectedItem === 'Audio') return item.format === 'MP3'
      if (selectedItem === 'Playlist') return isPlaylist
      if (selectedItem === 'Recent Download') return true
      return false
    })
    .sort((a, b) => (selectedItem === 'Playlist' ? a.url.localeCompare(b.url) : 0))

  const [openDropdown, setOpenDropdown] = useState(null)

  // Function to convert ISO duration to seconds
  const convertISODurationToSeconds = (duration) => {
    if (typeof duration !== 'string' || !duration.startsWith('PT')) {
      return 0 // Invalid format
    }

    const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!matches) return 0

    const hours = matches[1] ? parseInt(matches[1]) : 0
    const minutes = matches[2] ? parseInt(matches[2]) : 0
    const seconds = matches[3] ? parseInt(matches[3]) : 0

    return hours * 3600 + minutes * 60 + seconds
  }

  // Function to calculate remaining download time
  const calculateRemainingTime = (duration, progress) => {
    const totalSeconds = convertISODurationToSeconds(duration)
    const remainingSeconds = (totalSeconds * (100 - progress)) / 100
    return remainingSeconds
  }

  // Function to format seconds into MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container-fluid p-0">
      <div className="table-container">
        <table className="file-table">
          <thead>
            <tr>
              <th className="header-cell">Files</th>
              <th className="header-cell">DURATION</th>
              {/* <th className="header-cell">REMAINING</th> */}
              <th className="header-cell">Format</th>
              <th className="header-cell">Status</th>
              <th className="header-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => {
              const progress = progressMap.get(item.id)?.progress || 0
              const remainingTime = calculateRemainingTime(item.duration, progress)
              const formattedRemainingTime = formatTime(remainingTime)

              return (
                <tr key={item.id} className="data-row">
                  <td className="data-cell">
                    {item.status === 'Fetching Info..' || item.status === 'Queued' ? (
                      <Skeleton width={100} height={50} />
                    ) : (
                      <>
                        <img
                          src={item.thumbnail}
                          style={{ width: 50, height: 50, borderRadius: 10, marginRight: 10 }}
                          alt="Thumbnail"
                        />
                        {`#${item.title.slice(0, 20)}${item.title.length > 15 ? '...' : ''}`}
                      </>
                    )}
                  </td>
                  <td className="data-cell">
                    {item.status === 'Fetching Info..' || item.status === 'Queued' ? (
                      <Skeleton width={50} />
                    ) : (
                      formatTime(convertISODurationToSeconds(item.duration))
                    )}
                  </td>
                  {/* <td className="data-cell">
                    {item.status === 'Fetching Info..' || item.status === 'Queued' ? (
                      <Skeleton width={50} />
                    ) : (
                      formattedRemainingTime
                    )}
                  </td> */}
                  <td className="data-cell">
                    {item.status === 'Fetching Info..' || item.status === 'Queued' ? (
                      <Skeleton width={50} />
                    ) : (
                      item.format
                    )}
                  </td>
                  <td className="data-cell status-cell">
                    {item.status == 'Fetching Info..' || item.status == 'Queued' ? (
                      <Skeleton width={100} />
                    ) : item.isCompleted || progress === 100 ? (
                      <>
                        <FaCheckCircle className="text-success" />

                        {item.status}
                      </>
                    ) : (
                      <div>
                       

                        <FaRegClock className="text-primary" style={{ marginRight: 10 }} />
                        {item.isPlaylist
                          ? `${item.currentItem}/${item.totalItems} videos downloaded`
                          : item.status}
                        <ProgressBar now={progress} className="flex-grow-1" style={{ height: 4 }} />
                      </div>
                    )}
                  </td>

                  {/* <td className="data-cell action-cell">
                  {item.status=="Fetching Info.." ? (
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
                          onClick={() => {handlePauseResume(item.id); setDropdownOpen(false)}}
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
                  </td> */}
                  <td className="data-cell action-cell">
                    {item.status === 'Fetching Info..' ? (
                      <Skeleton width={40} height={40} borderRadius={100} />
                    ) : (
                      <Dropdown
                        show={openDropdown === item.id}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? item.id : null)}
                      >
                        <Dropdown.Toggle as="button" className="three-dots-btn">
                          <FaEllipsisV />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="dropdown-menu">
                          {!item.isCompleted && (
                            <Dropdown.Item
                              onClick={() => {
                                handlePauseResume(item.id)
                                setOpenDropdown(null)
                              }}
                            >
                              {item.isPaused ? (
                                <FaPlay className="me-2" />
                              ) : (
                                <FaPause className="me-2" />
                              )}
                              {item.isPaused ? 'Resume' : 'Pause'}
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item
                            onClick={() => {
                              handleDelete(item.url)
                              setOpenDropdown(null)
                            }}
                          >
                            <FaTrash className="me-2" /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DownloadList
