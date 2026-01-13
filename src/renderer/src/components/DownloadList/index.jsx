import React, { useState, useEffect } from 'react'
import { FaCheckCircle, FaRegClock, FaEllipsisV, FaTrash, FaTimesCircle, FaFolderOpen, FaTh, FaVideo } from 'react-icons/fa'
import { ProgressBar, Dropdown } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'
import { convertISODurationToSeconds, formatTime } from '../convertISODurationToSeconds'
import MediaThumbnail from './MediaThumbnail'

function DownloadList({ selectedItem, progressMap, videoInfo ,bitrate,downloadType,downloadListOpen,onRetry}) {
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
  const filteredList = (downloadListData )
    .filter((item) => {
      const isPlaylist =
        item.url.includes('playlist') || item.url.includes('&list=') || item.url.includes('?list=');
      if (selectedItem === 'Playlist') return isPlaylist;
      if (selectedItem === 'Video') return item.format === 'mp4' && !isPlaylist;
      if (selectedItem === 'Audio') return ['mp3', 'flac', 'wav', 'aac'].includes(item.format);
      if (selectedItem === 'All File') return true;
      return false;
    })
    .sort((a, b) => {
      // If filtering by Audio, sort by format; otherwise, sort by URL for Playlists or keep original order
      if (selectedItem === 'Audio') {
        const audioFormats = ['mp3', 'flac', 'wav', 'aac']; // Define order of formats
        return audioFormats.indexOf(a.format) - audioFormats.indexOf(b.format);
      }
      if (selectedItem === 'Playlist') return a.url.localeCompare(b.url);
      return 0; // No sorting for other cases
    })
    // .filter((item, index, self) => index === self.findIndex((t) => t.url === item.url));
  const calculateRemainingTime = (duration, progress) => {
    const totalSeconds = convertISODurationToSeconds(duration)
    const remainingSeconds = (totalSeconds * (100 - progress)) / 100
    return remainingSeconds
  }
  const handleOpenFolder = async (item) => {
    try {
      const allPathsToSearch = []

      if (item.saveTo && typeof item.saveTo === 'string') {
        try {
          await window.api.readDirectory(item.saveTo)
          allPathsToSearch.push(item.saveTo)
        } catch (err) {
          console.warn(`saveTo path not accessible: ${item.saveTo}`, err)
        }
      }

      const fallbackFolders = [
        await window.api.getPath('downloads'),
        await window.api.getPath('desktop')
      ]

      fallbackFolders.forEach((path) => {
        if (!allPathsToSearch.includes(path)) allPathsToSearch.push(path)
      })

      const subDir = item.downloadType === 'audio' ? 'Audio' : 'Video'
      const directories = allPathsToSearch.map((path) => `${path}/PNUT Downloader/${subDir}`)

      for (const dir of directories) {
        try {
          // Create directory if it doesn't exist
          await window.api.createDirectory(dir);
          await window.api.readDirectory(dir)
          if (window.api.openPath) {
            await window.api.openPath(dir)
          } else {
            const encodedPath = encodeURI(dir.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/%/g, '%25')
            const folderUrl = `file:///${encodedPath}`
            await window.api.openExternal(folderUrl)
          }
          return
        } catch (err) {
          console.warn(`Folder not accessible: ${dir}`, err)
        }
      }

      alert('Could not locate the download folder. It may have been moved or is not accessible.')
    } catch (error) {
      console.error('Error in handleOpenFolder:', error)
      alert('Failed to open folder. Please check the console for details.')
    }
  }
const handleThumbnailClick = async (item) => {
  window.api.trackEvent('play', { playUrl: item.url });
  if (!item.isCompleted || item.status !== 'Completed') {
    console.log('Thumbnail click ignored: Item not completed or status not Completed', {
      id: item.id,
      title: item.title,
      isCompleted: item.isCompleted,
      status: item.status,
    });
    return;
  }

  console.log(`Starting handleThumbnailClick: title=${item.title}, fileType=${item.downloadType}, saveTo=${item.saveTo}`);

  try {
    const videoExtensions = ['mp4', 'webm', 'mkv', 'avi'];
    const audioExtensions = ['mp3', 'flac', 'wav', 'aac'];
    const possibleExtensions = item.downloadType === 'audio' ? audioExtensions : videoExtensions;
    console.log(`Possible extensions: ${possibleExtensions}`);

    let allPathsToSearch = [];
    if (item.saveTo && typeof item.saveTo === 'string') {
      try {
        await window.api.readDirectory(item.saveTo);
        allPathsToSearch.push(item.saveTo);
        console.log(`Valid saveTo path added: ${item.saveTo}`);
      } catch (err) {
        console.warn(`saveTo path not accessible: ${item.saveTo}`, err);
      }
    }

    const fallbackFolders = [
      await window.api.getPath('downloads'),
      await window.api.getPath('desktop'),
    ];
    console.log(`Fallback folders: ${fallbackFolders}`);

    fallbackFolders.forEach((path) => {
      if (!allPathsToSearch.includes(path)) allPathsToSearch.push(path);
    });
    console.log(`All paths to search: ${allPathsToSearch}`);

    const subDir = item.downloadType === 'audio' ? 'Audio' : 'Video';
    const directories = allPathsToSearch.map((path) => `${path}/PNUT Downloader/${subDir}`);
    console.log(`Search directories: ${directories}`);

    const normalizedTitle = item.title
      .normalize('NFC') // Normalize Unicode characters
      .toLowerCase()
      .replace(/[\|\:]/g, '_')
      .replace(/’/g, "'")
      .replace(/[^\p{L}\p{N}._-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.(mp3|mp4|webm|mkv|avi|flac|wav|aac)$/i, '');
    console.log(`Normalized title: ${normalizedTitle}`);

    let filePath = null;
    for (const dir of directories) {
      try {
        // Create directory if it doesn't exist
        await window.api.createDirectory(dir);
        console.log(`Reading directory: ${dir}`);
        const files = await window.api.readDirectory(dir);
        console.log(`Files found in ${dir}: ${files.join(', ')}`);

        filePath = files.find((file) => {
          const fileName = file.toLowerCase();
          const titlePart = fileName.split('.').slice(0, -1).join('.').trim();
          const hasValidExtension = possibleExtensions.some((ext) => fileName.endsWith(`.${ext}`));
          const normalizedFileTitle = titlePart
            .normalize('NFC')
            .replace(/[\|\:]/g, '_')
            .replace(/[^\p{L}\p{N}._-]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const isExactMatch = normalizedFileTitle === normalizedTitle;
          const isPartialMatch = normalizedFileTitle.includes(
            normalizedTitle.slice(0, Math.min(40, normalizedTitle.length))
          );

          console.log(
            `Checking file: ${fileName}, Normalized file title: ${normalizedFileTitle}, Has valid extension: ${hasValidExtension}, Exact match: ${isExactMatch}, Partial match: ${isPartialMatch}`
          );

          return hasValidExtension && (isExactMatch || isPartialMatch);
        });

        if (filePath) {
          filePath = `${dir}/${filePath}`;
          console.log(`File found: ${filePath}`);
          break;
        } else {
          console.log(`No matching file found in ${dir}`);
        }
      } catch (dirError) {
        console.error(`Error reading directory ${dir}:`, dirError);
      }
    }

    if (filePath) {
      console.log(`Attempting to open file: ${filePath}`);
      // Verify file existence before attempting to open
      try {
        await window.api.accessFile(filePath); // Assumes an API to check file existence
        console.log(`File exists at: ${filePath}`);
      } catch (accessError) {
        console.error(`File is not accessible: ${filePath}`, accessError);
        alert(`Cannot access file: ${filePath}. It may have been moved or deleted.`);
        return;
      }

      try {
        // Prefer openPath for local files
        if (window.api.openPath) {
          console.log(`Using openPath for: ${filePath}`);
          await window.api.openPath(filePath);
          console.log('File opened successfully with openPath');
        } else {
          console.warn('window.api.openPath not available, falling back to openExternal');
          // Encode the file path for file:// URL
          const encodedPath = encodeURI(filePath.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/%/g, '%25');
          const fileUrl = `file:///${encodedPath}`;
          console.log(`Attempting to open file URL: ${fileUrl}`);
          await window.api.openExternal(fileUrl);
          console.log('File opened successfully with openExternal');
        }
      } catch (openError) {
        console.error(`Failed to open file ${filePath}:`, openError);
        alert(`Failed to open file: ${openError.message}. Path: ${filePath}`);
      }
    } else {
      console.error(`File not found for title: ${item.title}, Normalized: ${normalizedTitle}, fileType: ${item.downloadType}`);
      alert(`File not found. It may have been moved, deleted, or saved with a different name. Expected path: ${filePath}`);
    }
  } catch (error) {
    console.error('Error in handleThumbnailClick:', error);
    alert('Failed to process file. Please check the console for details.');
  }
};
  

  const getFormattedDate = (item) => {
    // If item has a date, use it; otherwise use current date
    if (item.downloadDate) {
      const date = new Date(item.downloadDate);
      return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
    }
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
  };

  return (
    <div className="container-fluid p-0" style={{ padding: '20px' }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#333',
          margin: 0
        }}>
          Recent downloaded
        </h2>
        <button 
          className="btn"
          style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            padding: '8px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#333'
          }}
        >
          <FaTh /> Select
        </button>
      </div>

      {/* Download List - Card Layout */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        maxHeight: '70vh',
        overflowY: 'auto',
        paddingRight: '10px'
      }}>
        {filteredList?.length > 0 ? (
          [...new Set(filteredList.map((item) => item.id))].map((uniqueId, index) => {
            const item = filteredList.find((i) => i.id === uniqueId);
            const progress = progressMap.get(item.id)?.progress || 0;
            const remainingTime = calculateRemainingTime(item.duration, progress);
            const formattedRemainingTime = formatTime(remainingTime);
            const duration = formatTime(convertISODurationToSeconds(item.duration));

            if (progress === 100) {
              let storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]');
              storedDownloads = storedDownloads.map((download) =>
                download.id === item.id
                  ? { ...download, isCompleted: true, status: 'Completed' }
                  : download
              );
              localStorage.setItem('downloadList', JSON.stringify(storedDownloads));
            }

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  transition: 'box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Number */}
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#666',
                  minWidth: '30px'
                }}>
                  {index + 1}.
                </span>

                {/* Thumbnail with Duration Overlay */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting' ? (
                    <Skeleton width={180} height={100} />
                  ) : (
                    <>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          style={{
                            width: '180px',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            cursor: item.isCompleted ? 'pointer' : 'default'
                          }}
                          onClick={() => item.isCompleted && handleThumbnailClick(item)}
                        />
                      ) : (
                        <div style={{
                          width: '180px',
                          height: '100px',
                          background: '#f0f0f0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FaVideo style={{ fontSize: '32px', color: '#999' }} />
                        </div>
                      )}
                      {duration && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {duration}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Content Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Title */}
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting' ? (
                      <Skeleton width={300} />
                    ) : (
                      item.title || 'Untitled'
                    )}
                  </h3>

                  {/* Status, Format, Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Status Badge */}
                    {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting' ? (
                      <Skeleton width={80} height={24} />
                    ) : item.isPlaylist ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {item.isPlaylistCompleted && (
                          <FaCheckCircle style={{ color: '#28a745', fontSize: '14px' }} />
                        )}
                        <span style={{
                          background: item.isPlaylistCompleted ? '#d4edda' : '#fff3cd',
                          color: item.isPlaylistCompleted ? '#155724' : '#856404',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {item.isPlaylistCompleted ? 'Done' : `${item.currentItem || 0}/${item.totalItems || 0} videos`}
                        </span>
                      </div>
                    ) : item.isCompleted ? (
                      <div style={{
                        background: '#d4edda',
                        color: '#155724',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <FaCheckCircle style={{ fontSize: '14px' }} />
                        Done
                      </div>
                    ) : item.status === 'Failed' ? (
                      <div style={{
                        background: '#f8d7da',
                        color: '#721c24',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <FaTimesCircle style={{ fontSize: '14px' }} />
                        Failed
                      </div>
                    ) : (
                      <div style={{
                        background: '#d1ecf1',
                        color: '#0c5460',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {item.status === "Downloading" ? (
                          <>
                            Downloading
                            <span className="dot-animate">.</span>
                            <span className="dot-animate">.</span>
                            <span className="dot-animate">.</span>
                          </>
                        ) : (
                          item.status
                        )}
                      </div>
                    )}

                    {/* Format Tag */}
                    {!item.isPlaylist && item.format && (
                      <span style={{
                        background: '#e9ecef',
                        color: '#495057',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'uppercase'
                      }}>
                        {item.format}
                      </span>
                    )}

                    {/* Date */}
                    <span style={{
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      {getFormattedDate(item)}
                    </span>

                    {/* Progress Bar for Downloading */}
                    {!item.isCompleted && item.status === 'Downloading' && progress > 0 && (
                      <div style={{ width: '100%', marginTop: '4px' }}>
                        <ProgressBar
                          now={progress || 0}
                          style={{ height: '6px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleOpenFolder(item)}
                    title="Open folder"
                    style={{
                      background: 'transparent',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#666',
                      fontSize: '16px'
                    }}
                  >
                    <FaFolderOpen />
                  </button>
                  <Dropdown
                    show={openDropdown === item.id}
                    onToggle={(isOpen) => setOpenDropdown(isOpen ? item.id : null)}
                  >
                    <Dropdown.Toggle 
                      as="button" 
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        fontSize: '18px',
                        padding: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <FaEllipsisV />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="dropdown-menu">
                      <Dropdown.Item
                        onClick={() => {
                          handleDelete(item);
                          setOpenDropdown(null);
                        }}
                      >
                        Delete <FaTrash className="me-2" />
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => {
                          handleDeleteAll();
                          setOpenDropdown(null);
                        }}
                      >
                        Delete All <FaTrash className="me-2" />
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'gray'
          }}>
            No Data Found
          </div>
        )}
      </div>
    </div>
  )
}

export default DownloadList
