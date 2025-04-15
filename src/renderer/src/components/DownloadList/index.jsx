import React, { useState, useEffect } from 'react'
import { FaCheckCircle, FaRegClock, FaEllipsisV, FaTrash, FaTimesCircle } from 'react-icons/fa'
import { ProgressBar, Dropdown } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'
import { convertISODurationToSeconds, formatTime } from '../convertISODurationToSeconds'
import MediaThumbnail from './MediaThumbnail'

function DownloadList({ selectedItem, progressMap, videoInfo }) {
  const [openDropdown, setOpenDropdown] = useState(null)
  // useEffect(() => {
  //   async function fetchDownloadedFiles() {
  //     try {
  //       const desktopPath = await window.api.getPath('downloads')
  //       const downloadDir = `${desktopPath}/pnutdownloader`
  //       const files = await window.api.readDirectory(downloadDir)
  //       const storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || []

  //       const updatedList = storedDownloads.map((item) => {
  //         const normalizedTitle = item.title.replace(/\|/g, '｜').trim()
  //         const possibleExtensions = ['mp4', 'webm', 'mkv', 'avi']
  //         const fileExists = files.some((file) =>
  //           possibleExtensions.some((ext) => file === `${normalizedTitle}.${ext}`)
  //         )
  //         return fileExists
  //           ? { ...item, status: 'Completed', isCompleted: true, progress: 100 }
  //           : item
  //       })

  //       localStorage.setItem('downloadList', JSON.stringify(updatedList))
  //     } catch (error) {
  //       console.error('❌ Error reading directory:', error)
  //     }
  //   }
  //   fetchDownloadedFiles()
  // }, [])

  const handleDeleteAll = () => {
    localStorage.setItem('downloadList', JSON.stringify([])) // Clear the entire list
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
    // Pause all downloads before clearing
    storedDownloads.forEach((item) => window.api.pauseDownload(item.id))
    setOpenDropdown(null) // Close the dropdown after deletion
  }

  // Existing delete single item function
  const handleDelete = (items) => {
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
    const updatedList = storedDownloads.filter((item) => item.id !== items.id)
    localStorage.setItem('downloadList', JSON.stringify(updatedList))
    window.api.pauseDownload(items.id)
  }
console.log("selectedItem",selectedItem);

  // const filteredList =
  //   JSON.parse(localStorage.getItem('downloadList')) ||
  //   videoInfo
  //     .filter((item) => {
  //       const isPlaylist =
  //         item.url.includes('playlist') ||
  //         item.url.includes('&list=') ||
  //         item.url.includes('?list=')
  //       if (selectedItem === 'Playlist') return isPlaylist
  //       if (selectedItem === 'Video') return item.format === 'MP4' && !isPlaylist
  //       if (selectedItem === 'Audio') return item.format === 'MP3'
  //       if (selectedItem === 'All File') return true
  //       return false
  //     })
  //     .sort((a, b) => (selectedItem === 'Playlist' ? a.url.localeCompare(b.url) : 0))
  //     .filter((item, index, self) => index === self.findIndex((t) => t.url === item.url))
  let downloadListData = JSON.parse(localStorage.getItem('downloadList')) || [];
  const filteredList = (downloadListData || videoInfo)
    .filter((item) => {
      const isPlaylist =
        item.url.includes('playlist') || item.url.includes('&list=') || item.url.includes('?list=');
      if (selectedItem === 'Playlist') return isPlaylist;
      if (selectedItem === 'Video') return item.format === 'MP4' && !isPlaylist;
      if (selectedItem === 'Audio') return ['MP3', 'FLAC', 'WAV', 'AAC'].includes(item.format);
      if (selectedItem === 'All File') return true;
      return false;
    })
    .sort((a, b) => {
      // If filtering by Audio, sort by format; otherwise, sort by URL for Playlists or keep original order
      if (selectedItem === 'Audio') {
        const audioFormats = ['MP3', 'FLAC', 'WAV', 'AAC']; // Define order of formats
        return audioFormats.indexOf(a.format) - audioFormats.indexOf(b.format);
      }
      if (selectedItem === 'Playlist') return a.url.localeCompare(b.url);
      return 0; // No sorting for other cases
    })
    .filter((item, index, self) => index === self.findIndex((t) => t.url === item.url));
  const calculateRemainingTime = (duration, progress) => {
    const totalSeconds = convertISODurationToSeconds(duration)
    const remainingSeconds = (totalSeconds * (100 - progress)) / 100
    return remainingSeconds
  }
  const handleThumbnailClick = async (item) => {
  if (item.isCompleted && item.status === 'Completed') {
    try {
      const desktopPath = await window.api.getPath('downloads');
      const audioDownloadDir = `${desktopPath}/pnutdownloader/audio`;
      const videoDownloadDir = `${desktopPath}/pnutdownloader/video`;

      // Normalize the title
      const normalizedTitle = item.title
        .replace(/\|/g, '｜')
        .replace(/：/g, ':')
        .replace(/’/g, "'")
        .trim()
        .toLowerCase();
      const possibleExtensions = ['mp4', 'webm', 'mkv', 'avi', 'mp3', 'flac', 'wav', 'aac'];

      const directories = [videoDownloadDir, audioDownloadDir];
      let filePath = null;

      for (const dir of directories) {
        const files = await window.api.readDirectory(dir);
        console.log(`Files in ${dir}:`, files);
        console.log('Searching for normalized title:', normalizedTitle);

        filePath = files
          .filter((file) => {
            const fileName = file.toLowerCase();
            // Use the full filename (minus extension) for comparison
            const titlePart = fileName.split('.').slice(0, -1).join('.').trim();
            console.log(`Comparing titlePart: ${titlePart} with normalizedTitle: ${normalizedTitle}`);
            return (
              possibleExtensions.some((ext) => fileName.endsWith(`.${ext}`)) &&
              titlePart.includes(normalizedTitle)
            );
          })
          .map((file) => `${dir}/${file}`)[0];

        if (filePath) break;
      }

      if (filePath) {
        console.log('Found and opening file:', filePath);
        window.api.openFile(filePath);
      } else {
        console.error('File not found for title:', item.title, 'Normalized:', normalizedTitle);
        console.error('Checked directories:', directories);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }
};
  return (
    <div className="container-fluid p-0">
      <div className="table-container">
        <table className="file-table">
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 1
            }}
          >
            <tr>
              <th className="header-cell" style={{ textAlign: 'start' }}>
                Files
              </th>
              <th className="header-cell">Duration</th>
              <th className="header-cell">Format</th>
              <th className="header-cell">Status</th>
              <th className="header-cell" style={{ textAlign: 'start' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredList?.length > 0 ? (
              [...new Set(filteredList.map((item) => item.id))].map((uniqueId) => {
                const item = filteredList.find((i) => i.id === uniqueId)
                const progress = progressMap.get(item.id)?.progress || 0
                const remainingTime = calculateRemainingTime(item.duration, progress)
                const formattedRemainingTime = formatTime(remainingTime)
                // const isYouTubeMusic = new URL(url).hostname === 'music.youtube.com'
                if (progress === 100) {
                  let storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
                  storedDownloads = storedDownloads.map((download) =>
                    download.id === item.id
                      ? { ...download, isCompleted: true, status: 'Completed' }
                      : download
                  )
                  localStorage.setItem('downloadList', JSON.stringify(storedDownloads))
                }

                return (
                  <tr key={item.id} className="data-row">
                    <td className="data-cell" style={{ textAlign: 'start' }}>
                      {item.status === 'Fetching Info...' || item.status === 'Queued' ? (
                        <Skeleton width={100} height={50} />
                      ) : (
                        <MediaThumbnail
                          thumbnail={item.thumbnail}
                          title={item.title}
                          url={item.url}
                          onClick={()=>handleThumbnailClick(item)}
                        />
                      )}
                    </td>
                    <td className="data-cell">
                      {item.status === 'Fetching Info...' || item.status === 'Queued' ? (
                        <Skeleton width={50} />
                      ) : (
                        formatTime(convertISODurationToSeconds(item.duration))
                      )}
                    </td>
                    <td className="data-cell">
                      {item.status === 'Fetching Info...' || item.status === 'Queued' ? (
                        <Skeleton width={50} />
                      ) : (
                        item.format
                      )}
                    </td>
                    <td className="data-cell">
                      {['Fetching Info...', 'Queued'].includes(item.status) ? (
                        <Skeleton width={100} />
                      ) : item.isPlaylist ? (
                        <>
                          <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
                            {`${item.playlistTitle.slice(0, 20)}${item.playlistTitle.length > 20 ? '...' : ''}` ||
                              'Unnamed Playlist'}
                          </div>
                          <div>
                            {item.isPlaylistCompleted && (
                              <FaCheckCircle className="text-success" style={{ marginRight: 5 }} />
                            )}
                            {item.currentItem > 0 && item.totalItems > 0
                              ? `${item.currentItem}/${item.totalItems} ${item.isPlaylistCompleted ? 'Playlist download Complete' : 'videos downloaded'} `
                              : 'Preparing playlist...'}
                          </div>
                        </>
                      ) : (
                        <div className="">
                        {item.status === 'Failed' ? (
                          <div className="text-danger d-flex align-items-center">
                            <FaTimesCircle className="me-1 align-middle" />
                            <span className="align-middle d-inline-block">Failed</span>
                          </div>
                        ) : item.isCompleted ? (
                          <div className="text-success d-flex align-items-center justify-content-center">
                            <FaCheckCircle className="me-1 align-middle" />
                            <span className="align-middle d-inline-block">{item.status}</span>
                          </div>
                        ) : (
                          <>
                            <div className="">
                              <FaRegClock className="me-1 align-middle text-warning" />
                              <span className="align-middle d-inline-block">{item.status}</span>
                            </div>
                            {!item.isCompleted && (
                              <ProgressBar
                                now={progressMap.get(item.id)?.progress || 0}
                                style={{ height: 4, width: '100%', marginTop: 4 }}
                                key={item.id}
                              />
                            )}
                          </>
                        )}
                      </div>
                      
                      
                      )}
                    </td>

                    <td className="data-cell">
                      {item.status === 'Fetching Info...' ? (
                        <Skeleton width={40} height={40} borderRadius={100} />
                      ) : (
                        <Dropdown
                          style={{ marginLeft: '6px' }}
                          show={openDropdown === item.id}
                          onToggle={(isOpen) => setOpenDropdown(isOpen ? item.id : null)}
                        >
                          <Dropdown.Toggle as="button" className="three-dots-btn">
                            <FaEllipsisV color='white' />
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="dropdown-menu">
                            <Dropdown.Item
                              onClick={() => {
                                handleDelete(item)
                                setOpenDropdown(null)
                              }}
                            >
                           Delete    <FaTrash className="me-2" />
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => {
                                handleDeleteAll()
                                setOpenDropdown(null)
                              }}
                            >
                         Delete All     <FaTrash className="me-2" /> 
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'gray'
                  }}
                >
                  No Data Found
                </td>
              </tr>
            )}
          </tbody>
        </table >
      </div>
    </div>
  )
}

export default DownloadList
