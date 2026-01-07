import React, { useState, useEffect } from 'react'
import { FaCheckCircle, FaRegClock, FaEllipsisV, FaTrash, FaTimesCircle, FaFolderOpen } from 'react-icons/fa'
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
                      {item.status === 'Fetching Info...' || item.status === 'Queued' ||item.status === 'Waiting'? (
                        <Skeleton width={100} height={50} />
                      ) : (
                        <MediaThumbnail
                          thumbnail={item.thumbnail}
                          title={item.title}
                          format={item.quality}
                          status={item.status}
                          url={item.url}
                          onClick={()=>handleThumbnailClick(item)}
                          downloadType={item.downloadType}
                          bitrate={item.bitrate}
                          id={item.id}
                          onRetry={onRetry}
                        />
                      )}
                    </td>
                    <td className="data-cell">
                      {item.status === 'Fetching Info...' ||  item.status === 'Queued' ||item.status === 'Waiting' ? (
                        <Skeleton width={50} />
                      ) : (
                        formatTime(convertISODurationToSeconds(item.duration))
                      )}
                    </td>
                    <td className="data-cell text-uppercase">
                      {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting'? (
                        <Skeleton width={50} />
                      ) : (
                        item.format
                      )}
                    </td>
                    <td className="data-cell" style={{ fontWeight: '600', }}>
                      {['Fetching Info...', 'Queued',"Waiting"].includes(item.status) ? (
                        <Skeleton width={100} />
                      ) : item.isPlaylist ? (
                        <>
                          <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
                            {`${item.playlistTitle.slice(0, 20)}${item.playlistTitle.length > 20 ? '...' : ''}` ||
                              'Unnamed Playlist'}
                          </div>
                          <div>
                            {item.isPlaylistCompleted && (
                              <FaCheckCircle className="text-success" style={{ marginRight: 5,color:"#28a745" }} />
                            )}
                            {item.currentItem > 0 && item.totalItems > 0
                              ? `${item.currentItem}/${item.totalItems} ${item.isPlaylistCompleted ? 'Playlist download Complete' : 'videos downloaded'} `
                              : 'Preparing playlist...'}
                          </div>
                        </>
                      ) : (
                        <div className="">
                        {item.status === 'Failed' ? (
                          <div className="text-danger d-flex align-items-center justify-content-center">
                            <FaTimesCircle className="me-1 align-middle" />
                            <span className="align-middle d-inline-block">Failed</span>
                          </div>
                        ) : item.isCompleted ? (
                          <div className=" d-flex align-items-center justify-content-center" style={{color:"#28a745"}}>
                            <FaCheckCircle className="me-1 align-middle" />
                            <span className="align-middle d-inline-block">{item.status}</span>
                          </div>
                          
                        ) : (
                          <>
                         
                            <div className="">
  {item.status === "Downloading" ? (
    <span className="align-middle d-inline-block">
      Downloading
      <span className="dot-animate">.</span>
      <span className="dot-animate">.</span>
      <span className="dot-animate">.</span>
    </span>
  ) : (
    <span className="align-middle d-inline-block">{item.status}</span>
  )}
</div>
                            {!item.isCompleted && (
                              
                              <div style={{ width: '100%' }}>
                              {progress === undefined || progress === 0 ? (
                                <Skeleton height={10} width="100%" style={{ marginTop: 4 }} />
                              ) : (
                                <ProgressBar
                                  now={progress || 0}
                                  style={{ height: 10, width: '100%', marginTop: 4 }}
                                  key={item.id}
                                />
                              )}
                            </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-light btn-sm"
                            onClick={() => handleOpenFolder(item)}
                            title="Open folder"
                          >
                            <FaFolderOpen />
                          </button>
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
                                Delete <FaTrash className="me-2" />
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => {
                                  handleDeleteAll()
                                  setOpenDropdown(null)
                                }}
                              >
                                Delete All <FaTrash className="me-2" /> 
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
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
