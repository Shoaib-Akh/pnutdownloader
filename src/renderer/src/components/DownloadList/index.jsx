import React, { useState } from 'react'
import { FaCheckCircle, FaRegClock, FaEllipsisV, FaTrash, FaTimesCircle, FaFolderOpen, FaTh, FaVideo, FaCopy, FaExternalLinkAlt, FaSearch, FaCheckSquare, FaSquare, FaRedoAlt } from 'react-icons/fa'
import { ProgressBar, Dropdown } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'
import { convertISODurationToSeconds, formatTime } from '../convertISODurationToSeconds'
import MediaThumbnail from './MediaThumbnail'
import useDownloadListVM from '../../viewmodels/useDownloadListVM'
import './ActiveDownloadAnimations.css'

function DownloadList({ selectedItem, progressMap, bitrate, downloadType, onRetry, activeDownloads }) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState(new Set())

  const {
    getThumbnailUrl,
    handleDeleteItem: deleteItem,
    handleDeleteSelected: deleteSelected,
    handleCopyUrl,
    handleOpenFolder,
    handleThumbnailClick,
    downloadListData,
  } = useDownloadListVM()

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
  }

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

  const handleDelete = (items) => {
    deleteItem(items)
  }

  // Handle select mode toggle
  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode)
    if (isSelectMode) {
      setSelectedItems(new Set()) // Clear selections when exiting select mode
    }
  }

  // Handle item selection
  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Handle select all - will be defined after searchFilteredList
  const handleSelectAll = () => {
    const currentList = searchQuery
      ? filteredList.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      : filteredList

    if (selectedItems.size === currentList.length && currentList.length > 0) {
      // Deselect all
      setSelectedItems(new Set())
    } else {
      // Select all
      const allIds = new Set(currentList.map(item => item.id))
      setSelectedItems(allIds)
    }
  }

  // Handle delete selected items
  const handleDeleteSelectedItems = () => {
    if (selectedItems.size === 0) return

    deleteSelected(selectedItems)
    // Clear selections and exit select mode
    setSelectedItems(new Set())
    setIsSelectMode(false)
  }

  // New handler functions for context menu
  const handleAddToFolder = async (item) => {
    try {
      // Get the actual file path first
      const videoExtensions = ['mp4', 'webm', 'mkv', 'avi']
      const audioExtensions = ['mp3', 'flac', 'wav', 'aac']
      const possibleExtensions = item.downloadType === 'audio' ? audioExtensions : videoExtensions

      const customSanitize = (str) => {
        if (!str) return 'Unknown'
        return str
          .replace(/[<>:"/\\|?*]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[^a-zA-Z0-9._-]/g, ' ')
          .replace(/^[.-]+|[.-]+$/g, ' ')
          .substring(0, 200)
      }

      const normalizeForMatch = (value) => {
        if (!value) return ''
        return value
          .toString()
          .normalize('NFD')
          .toLowerCase()
          .replace(/[''‛‹›""「」『』【】〔〕]/g, "'")
          .replace(/["""„""«»‹›]/g, '"')
          .replace(/[\s\u2000-\u200F\u2028-\u202F\u205F\u3000]+/g, ' ')
          .trim()
          .replace(/[_\-\s]+\d+[pP](\.[a-z0-9]+)?$/i, '')
          .replace(/[_\-\s]+\d+[kK]$/i, '')
          .replace(/\.[a-z0-9]{2,5}$/i, '')
          .replace(/[\|\:\/\\]/g, '_')
          .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u20D0-\u20FF]/g, '')
          .replace(/[^\p{L}\p{N}._\-\s'"']/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      let allPathsToSearch = []
      if (item.saveTo && typeof item.saveTo === 'string') {
        try {
          await window.api.readDirectory(item.saveTo)
          allPathsToSearch.push(item.saveTo)
        } catch (err) {
          console.warn(`saveTo path not accessible: ${item.saveTo}`, err)
        }
      }

      const fallbackFolders = [await window.api.getPath('downloads'), await window.api.getPath('desktop')]
      fallbackFolders.forEach((path) => {
        if (!allPathsToSearch.includes(path)) allPathsToSearch.push(path)
      })

      const subDir = item.downloadType === 'audio' ? 'Audio' : 'Video'
      const baseDirectories = allPathsToSearch.map((path) => `${path}/PNUT Downloader/${subDir}`)
      const playlistSubDir = item.playlistTitle ? customSanitize(item.playlistTitle) : null
      const directories = playlistSubDir
        ? [...baseDirectories.map((d) => `${d}/${playlistSubDir}`), ...baseDirectories]
        : baseDirectories

      const normalizedTitle = normalizeForMatch(item.filename || item.title)
      let filePath = null
      let sourceDir = null

      for (const dir of directories) {
        try {
          await window.api.createDirectory(dir)
          const files = await window.api.readDirectory(dir)

          filePath = files.find((file) => {
            const fileName = file.toLowerCase()
            if (fileName.endsWith('.part')) return false
            const titlePart = fileName.split('.').slice(0, -1).join('.').trim()
            const hasValidExtension = possibleExtensions.some((ext) => fileName.endsWith(`.${ext}`))
            const normalizedFileTitle = normalizeForMatch(titlePart)
            const isExact = normalizedFileTitle === normalizedTitle
            const isPartial = normalizedFileTitle && normalizedTitle && (normalizedFileTitle.includes(normalizedTitle) || normalizedTitle.includes(normalizedFileTitle))
            return hasValidExtension && (isExact || isPartial)
          })

          if (filePath) {
            filePath = `${dir}/${filePath}`
            sourceDir = dir
            break
          }
        } catch (dirError) {
          console.error(`Error reading directory ${dir}:`, dirError)
        }
      }

      if (!filePath) {
        alert('File not found. Cannot move to folder.')
        setOpenDropdown(null)
        return
      }

      // Let user select destination folder
      const selectedFolder = await window.api.selectFolder()
      if (!selectedFolder) {
        // User cancelled the folder selection
        setOpenDropdown(null)
        return
      }

      // Move the file to selected folder
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
      const destinationPath = `${selectedFolder}/${fileName}`

      // Check if file already exists in destination
      try {
        await window.api.accessFile(destinationPath)
        const overwrite = confirm(`File "${fileName}" already exists in the destination folder. Do you want to overwrite it?`)
        if (!overwrite) {
          setOpenDropdown(null)
          return
        }
      } catch (error) {
        // File doesn't exist in destination, which is good
      }

      // Move the file using IPC
      const result = await window.api.moveFile(filePath, destinationPath)
      
      if (result.success) {
        alert(`File successfully moved to: ${selectedFolder}`)
        // Update the download item's saveTo path if needed
        const downloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
        const updatedDownloads = downloads.map(d => {
          if (d.id === item.id) {
            return { ...d, saveTo: selectedFolder }
          }
          return d
        })
        localStorage.setItem('downloadList', JSON.stringify(updatedDownloads))
        
        // Trigger a refresh of the download list
        window.dispatchEvent(new Event('storage', {
          key: 'downloadList',
          newValue: JSON.stringify(updatedDownloads)
        }))
      } else {
        alert(`Failed to move file: ${result.error}`)
      }
    } catch (error) {
      console.error('Error moving file to folder:', error)
      alert('Failed to move file to folder. Please check the console for details.')
    }
    setOpenDropdown(null)
  }

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.url)
      // Show visual feedback
      const originalTitle = item.title
      alert(`URL copied to clipboard: ${item.url}`)
    } catch (error) {
      console.error('Failed to copy URL:', error)
      alert('Failed to copy URL to clipboard')
    }
    handleCopyUrl(item)
    setOpenDropdown(null)
  }

  
  const handleShowInFinder = async (item) => {
    try {
      // Get the actual file path (similar to handleThumbnailClick logic)
      const videoExtensions = ['mp4', 'webm', 'mkv', 'avi']
      const audioExtensions = ['mp3', 'flac', 'wav', 'aac']
      const possibleExtensions = item.downloadType === 'audio' ? audioExtensions : videoExtensions

      const customSanitize = (str) => {
        if (!str) return 'Unknown'
        return str
          .replace(/[<>:"/\\|?*]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[^a-zA-Z0-9._-]/g, ' ')
          .replace(/^[.-]+|[.-]+$/g, ' ')
          .substring(0, 200)
      }

      const normalizeForMatch = (value) => {
        if (!value) return ''
        return value
          .toString()
          .normalize('NFD')
          .toLowerCase()
          .replace(/[''‛‹›""「」『』【】〔〕]/g, "'")
          .replace(/["""„""«»‹›]/g, '"')
          .replace(/[\s\u2000-\u200F\u2028-\u202F\u205F\u3000]+/g, ' ')
          .trim()
          .replace(/[_\-\s]+\d+[pP](\.[a-z0-9]+)?$/i, '')
          .replace(/[_\-\s]+\d+[kK]$/i, '')
          .replace(/\.[a-z0-9]{2,5}$/i, '')
          .replace(/[\|\:\/\\]/g, '_')
          .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u20D0-\u20FF]/g, '')
          .replace(/[^\p{L}\p{N}._\-\s'"']/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      let allPathsToSearch = []
      if (item.saveTo && typeof item.saveTo === 'string') {
        try {
          await window.api.readDirectory(item.saveTo)
          allPathsToSearch.push(item.saveTo)
        } catch (err) {
          console.warn(`saveTo path not accessible: ${item.saveTo}`, err)
        }
      }

      const fallbackFolders = [await window.api.getPath('downloads'), await window.api.getPath('desktop')]
      fallbackFolders.forEach((path) => {
        if (!allPathsToSearch.includes(path)) allPathsToSearch.push(path)
      })

      const subDir = item.downloadType === 'audio' ? 'Audio' : 'Video'
      const baseDirectories = allPathsToSearch.map((path) => `${path}/PNUT Downloader/${subDir}`)
      const playlistSubDir = item.playlistTitle ? customSanitize(item.playlistTitle) : null
      const directories = playlistSubDir
        ? [...baseDirectories.map((d) => `${d}/${playlistSubDir}`), ...baseDirectories]
        : baseDirectories

      const normalizedTitle = normalizeForMatch(item.filename || item.title)
      let filePath = null

      for (const dir of directories) {
        try {
          await window.api.createDirectory(dir)
          const files = await window.api.readDirectory(dir)

          filePath = files.find((file) => {
            const fileName = file.toLowerCase()
            if (fileName.endsWith('.part')) return false
            const titlePart = fileName.split('.').slice(0, -1).join('.').trim()
            const hasValidExtension = possibleExtensions.some((ext) => fileName.endsWith(`.${ext}`))
            const normalizedFileTitle = normalizeForMatch(titlePart)
            const isExact = normalizedFileTitle === normalizedTitle
            const isPartial = normalizedFileTitle && normalizedTitle && (normalizedFileTitle.includes(normalizedTitle) || normalizedTitle.includes(normalizedFileTitle))
            return hasValidExtension && (isExact || isPartial)
          })

          if (filePath) {
            filePath = `${dir}/${filePath}`
            break
          }
        } catch (dirError) {
          console.error(`Error reading directory ${dir}:`, dirError)
        }
      }

      if (filePath) {
        // Show the file in system file explorer
        if (window.api.showFileInFolder) {
          await window.api.showFileInFolder(filePath)
        } else {
          // Fallback: open the containing folder
          const folderPath = filePath.substring(0, filePath.lastIndexOf('/'))
          if (window.api.openPath) {
            await window.api.openPath(folderPath)
          } else {
            const encodedPath = encodeURI(folderPath.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/%/g, '%25')
            const folderUrl = `file:///${encodedPath}`
            await window.api.openExternal(folderUrl)
          }
        }
      } else {
        // Fallback to opening the download folder if file not found
        handleOpenFolder(item)
      }
    } catch (error) {
      console.error('Error showing file in finder:', error)
      alert('Failed to show file in finder. Please check the console for details.')
    }
    setOpenDropdown(null)
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
  // re-read list when lastUpdated changes to reflect background updates
  const filteredList = (downloadListData)
    .filter((item) => {
      const isPlaylist =
        item.url.includes('playlist') || item.url.includes('&list=') || item.url.includes('?list=');
      if (selectedItem === 'All Files' || selectedItem === 'All File') return true;
      if (selectedItem === 'Playlist') return isPlaylist;
      if (selectedItem === 'Video') return item.format === 'mp4' && !isPlaylist;
      if (selectedItem === 'Audio') return ['mp3', 'flac', 'wav', 'aac'].includes(item.format);
      return false;
    })
    .sort((a, b) => {
      // Sort by download date (newest first) for All Files
      if (selectedItem === 'All Files' || selectedItem === 'All File') {
        return new Date(b.downloadDate || 0) - new Date(a.downloadDate || 0);
      }
      // If filtering by Audio, sort by format; otherwise, sort by URL for Playlists or keep original order
      if (selectedItem === 'Audio') {
        const audioFormats = ['mp3', 'flac', 'wav', 'aac']; // Define order of formats
        return audioFormats.indexOf(a.format) - audioFormats.indexOf(b.format);
      }
      if (selectedItem === 'Playlist') return a.url.localeCompare(b.url);
      if (selectedItem === 'Video') {
        // Sort videos by download date (newest first)
        return new Date(b.downloadDate || 0) - new Date(a.downloadDate || 0);
      }
      return 0; // No sorting for other cases
    })
  // .filter((item, index, self) => index === self.findIndex((t) => t.url === item.url));

  // Apply search filter
  const searchFilteredList = searchQuery
    ? filteredList.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : filteredList

  const calculateRemainingTime = (duration, progress) => {
    const totalSeconds = convertISODurationToSeconds(duration)
    const remainingSeconds = (totalSeconds * (100 - progress)) / 100
    return remainingSeconds
  }

  const handleOpenFolderClick = (item) => handleOpenFolder(item)
  const handleThumbnailClickWrapped = (item) => handleThumbnailClick(item)


  // Function to clean title by removing unwanted suffixes
  const cleanTitle = (title) => {
    if (!title) return title
    
    // Normalize Unicode for better international character handling
    return title
      .normalize('NFD') // Decompose characters for better Unicode handling
      // Remove common quality and format suffixes (case-insensitive)
      .replace(/[_\-\s]+\d+[pP](\.[a-zA-Z0-9]+)?$/g, '') // Remove _720p.f140, _1080p.f137, etc.
      .replace(/[_\-\s]+\d+[kK]$/g, '') // Remove _320K, _128K, etc.
      .replace(/[_\-\s]+\d+[xX]$/g, '') // Remove _1920x1080, etc.
      // Remove various file extension patterns
      .replace(/[_\-\s]+\.[a-zA-Z0-9]{2,5}$/g, '') // Remove ._mp4, ._webm, etc.
      // Remove common technical suffixes
      .replace(/[_\-\s]+(HD|4K|8K|240p|360p|480p|720p|1080p|1440p|2160p)$/gi, '')
      .replace(/[_\-\s]+(60fps|30fps|24fps)$/gi, '')
      .replace(/[_\-\s]+(h264|h265|vp9|av1)$/gi, '')
      // Remove underscore and dash suffixes
      .replace(/[_\-\s]+\w+$/g, '') // Remove other underscore/dash suffixes
      // Remove combining diacritical marks while preserving base letters
      .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u20D0-\u20FF]/g, '')
      // Normalize various punctuation and separators across languages
      .replace(/[''‛‹›""「」『』【】〔〕]/g, "'") // Normalize apostrophes
      .replace(/["""„""«»‹›]/g, '"') // Normalize quotes
      .replace(/[\|\:\/\\]/g, '_') // Normalize separators
      // Replace multiple whitespace characters (including Unicode spaces) with single space
      .replace(/[\s\u2000-\u200F\u2028-\u202F\u205F\u3000]+/g, ' ')
      // Remove unwanted characters but keep international letters, numbers, and common punctuation
      .replace(/[^\p{L}\p{N}._\-\s'"']/gu, ' ')
      // Final cleanup
      .replace(/\s+/g, ' ') // Normalize whitespace again
      .replace(/^[._\-\s]+|[._\-\s]+$/g, '') // Remove leading/trailing punctuation
      .trim()
  }

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
    <div className="container-fluid p-0" style={{ padding: '30px 20px 20px 20px' }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingTop: '20px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          margin: 0
        }}>
          Recent downloaded
        </h2>
      </div>

      {/* Search Bar */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #ddd',
        borderRadius: '25px',
        padding: '8px 15px',
        backgroundColor: '#f9f9f9',
        marginTop: '40px'
      }}>
        <FaSearch style={{ color: '#999', marginRight: '10px' }} />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={handleSearchChange}
          style={{
            border: 'none',
            outline: 'none',
            flexGrow: 1,
            backgroundColor: 'transparent',
            fontSize: '16px',
            color: '#333'
          }}
        />
      </div>

      {/* Total and Select Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <span style={{ fontSize: '14px', color: '#666' }}>
          Total: {searchFilteredList?.length || 0}
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isSelectMode && (
            <>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  background: 'white',
                  color: '#333',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {(() => {
                  const currentList = searchQuery
                    ? filteredList.filter(item =>
                      item.title.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    : filteredList
                  return selectedItems.size === currentList.length && currentList.length > 0 ? (
                    <>
                      <FaCheckSquare /> Deselect All
                    </>
                  ) : (
                    <>
                      <FaSquare /> Select All
                    </>
                  )
                })()}
              </button>
              {selectedItems.size > 0 && (
                <button
                  onClick={handleDeleteSelectedItems}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #dc3545',
                    borderRadius: '5px',
                    background: '#dc3545',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <FaTrash /> Delete Selected ({selectedItems.size})
                </button>
              )}
            </>
          )}
          <button
            onClick={handleSelectModeToggle}
            style={{
              padding: '6px 12px',
              border: isSelectMode ? '1px solid #0ea5e9' : '1px solid #ddd',
              borderRadius: '5px',
              background: isSelectMode ? '#0ea5e9' : 'white',
              color: isSelectMode ? 'white' : '#333',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {isSelectMode ? 'Cancel' : 'Select'}
          </button>
        </div>
      </div>

      {/* Download List - Card Layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 250px)',
        overflowY: 'auto',
        paddingRight: '15px',
        paddingLeft: '5px',
        paddingBottom: '20px',
        overflowX: 'hidden'
      }}>
        {searchFilteredList?.length > 0 ? (
          [...new Set(searchFilteredList.map((item) => item.id))].map((uniqueId, index) => {
            const item = searchFilteredList.find((i) => i.id === uniqueId);

            const progress = progressMap.get(item.id)?.progress || 0;
            const speed = progressMap.get(item.id)?.speed || 'Unknown';
            const fileSize = progressMap.get(item.id)?.fileSize || 'Unknown';
            const eta = progressMap.get(item.id)?.eta || 'Unknown';
            const remainingTime = calculateRemainingTime(item.duration, progress);
            const formattedRemainingTime = formatTime(remainingTime);
            const duration = formatTime(convertISODurationToSeconds(item.duration));
                      {console.log("item.statusitem.status111",item.status)}

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '20px',
                  background: activeDownloads?.has(item.id) ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : selectedItems.has(item.id) ? '#e3f2fd' : 'white',
                  borderRadius: '10px',
                  border: activeDownloads?.has(item.id) ? '2px solid #0ea5e9' : selectedItems.has(item.id) ? '2px solid #2196f3' : '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  boxShadow: activeDownloads?.has(item.id) ? '0 4px 12px rgba(14, 165, 233, 0.15)' : selectedItems.has(item.id) ? '0 4px 12px rgba(33, 150, 243, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = activeDownloads?.has(item.id)
                    ? '0 6px 16px rgba(14, 165, 233, 0.25)'
                    : '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = activeDownloads?.has(item.id)
                    ? '0 4px 12px rgba(14, 165, 233, 0.15)'
                    : '0 1px 3px rgba(0,0,0,0.05)';
                }}
              >
                {/* Active Download Indicator */}
                {activeDownloads?.has(item.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#0ea5e9',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: 'pulse 2s infinite'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      background: 'white',
                      borderRadius: '50%',
                      animation: 'blink 1.5s infinite'
                    }}></div>
                    ACTIVE
                  </div>
                )}
                {/* Checkbox for select mode */}
                {isSelectMode && (
                  <div
                    onClick={() => handleItemSelect(item.id)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '24px',
                      height: '24px'
                    }}
                  >
                    {selectedItems.has(item.id) ? (
                      <FaCheckSquare style={{ fontSize: '20px', color: '#2196f3' }} />
                    ) : (
                      <FaSquare style={{ fontSize: '20px', color: '#999' }} />
                    )}
                  </div>
                )}
                {/* Number */}
                {!isSelectMode && (
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#666',
                    minWidth: '30px'
                  }}>
                    {index + 1}.
                  </span>
                )}

                {/* Thumbnail with Duration Overlay */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting' ? (
                    <div style={{ position: 'relative' }}>
                      <Skeleton width={120} height={70} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '12px',
                        color: '#666',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        {item.status === 'Fetching Info...' ? 'Loading...' : 'Queued'}
                      </div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const thumbnailUrl = getThumbnailUrl(item)
                        if (thumbnailUrl) {
                          return (
                            <>
                              <img
                                src={thumbnailUrl}
                                alt={item.title}
                                style={{
                                  width: '120px',
                                  height: '70px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: item.isCompleted ? 'pointer' : 'default'
                                }}
                                onClick={() => item.isCompleted && handleThumbnailClick(item)}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex'
                                  }
                                }}
                              />
                              <div style={{
                                width: '120px',
                                height: '70px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '8px',
                                display: 'none',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                flexDirection: 'column',
                                gap: '4px'
                              }}>
                                <FaVideo style={{ fontSize: '20px', color: '#ffffff' }} />
                                <span style={{
                                  fontSize: '8px',
                                  color: '#ffffff',
                                  fontWeight: '600',
                                  textAlign: 'center'
                                }}>
                                  Failed
                                </span>
                              </div>
                            </>
                          )
                        }
                        return (
                          <div style={{
                            width: '120px',
                            height: '70px',
                            background: 'linear-gradient(135deg, #e0e7ff 0%, #cfd9ff 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <FaVideo style={{ fontSize: '20px', color: '#6366f1' }} />
                            <span style={{
                              fontSize: '8px',
                              color: '#6366f1',
                              fontWeight: '600',
                              textAlign: 'center'
                            }}>
                              No thumbnail
                            </span>
                          </div>
                        )
                      })()}
                      {duration && (
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {duration}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Content Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  {/* Title */}
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#333',
                    margin: 0,
                    lineHeight: '1.4',
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting' ? (
                      <Skeleton width={300} />
                    ) : (
                      cleanTitle(item.title || item.filename) || 'Untitled'
                    )}
                  </h3>

                  {/* Status, Format, Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Status Badge */}
                    {item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting' ? (
                      <Skeleton width={70} height={22} />
                    ) : item.isPlaylist ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.isPlaylistCompleted && (
                          <FaCheckCircle style={{ color: '#28a745', fontSize: '12px' }} />
                        )}
                        <span style={{
                          background: item.isPlaylistCompleted ? '#d4edda' : '#fff3cd',
                          color: item.isPlaylistCompleted ? '#155724' : '#856404',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {item.isPlaylistCompleted ? 'Done' : `${item.currentItem || 0}/${item.totalItems || 0} videos`}
                        </span>
                      </div>
                    ) : item.isCompleted || item.status === 'Completed' ? (
                      <div style={{
                        background: '#d4edda',
                        color: '#155724',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <FaCheckCircle style={{ fontSize: '12px' }} />
                        Done
                      </div>
                    ) : item.status === 'Failed' ? (
                      <div style={{
                        background: '#f8d7da',
                        color: '#721c24',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <FaTimesCircle style={{ fontSize: '12px' }} />
                        Failed
                      </div>
                    ) : (
                      <div style={{
                        background: '#d1ecf1',
                        color: '#0c5460',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                      {console.log("item.status",item.status)}
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
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'uppercase'
                      }}>
                        {item.format}
                      </span>
                    )}

                    {/* Date */}
                    <span style={{
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      {getFormattedDate(item)}
                    </span>
                      {console.log("item.statusitem.status",item.title)}

                    {/* Progress Bar for Downloading */}
                    {!item.isCompleted && item.status !== 'Completed' && item.status === 'Downloading' && progress > 0 && (
                      <div style={{ width: '100%', marginTop: '4px' }}>
                        <ProgressBar
                          now={progress || 0}
                          style={{ height: '5px' }}
                        />
                        {/* Download Speed Info */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginTop: '6px',
                          fontSize: '11px',
                          color: '#666'
                        }}>
                          <span>Speed: {speed}</span>
                          <span>Size: {fileSize}</span>
                          <span>ETA: {eta}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {!isSelectMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleOpenFolderClick(item)}
                      title="Open folder"
                      style={{
                        background: 'transparent',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        padding: '6px 10px',
                        color: '#666',
                        fontSize: '14px'
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
                          fontSize: '16px',
                          padding: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaEllipsisV />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="dropdown-menu">
                        <Dropdown.Item
                          onClick={() => {
                            setOpenDropdown(null)
                            if (typeof onRetry === 'function') onRetry(item.id)
                          }}
                        >
                          Retry Download <FaRedoAlt className="me-2" />
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            handleAddToFolder(item);
                          }}
                        >
                          Add to Folder <FaFolderOpen className="me-2" />
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            handleCopy(item);
                          }}
                        >
                          Copy Url <FaCopy className="me-2" />
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            handleShowInFinder(item);
                          }}
                        >
                          Show in Finder <FaExternalLinkAlt className="me-2" />
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            handleDelete(item);
                          }}
                        >
                          Delete <FaTrash className="me-2" />
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                )}
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
