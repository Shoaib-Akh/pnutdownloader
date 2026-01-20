import React, { useState, useEffect } from 'react'
import { FaCheckCircle, FaRegClock, FaEllipsisV, FaTrash, FaTimesCircle, FaFolderOpen, FaTh, FaVideo, FaCopy, FaShare, FaExternalLinkAlt, FaSearch, FaCheckSquare, FaSquare } from 'react-icons/fa'
import { ProgressBar, Dropdown } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'
import { convertISODurationToSeconds, formatTime } from '../convertISODurationToSeconds'
import MediaThumbnail from './MediaThumbnail'
import { detectPlatform, isYouTubePlatform } from '../platformUtils'
import './ActiveDownloadAnimations.css'

function DownloadList({ selectedItem, progressMap, videoInfo ,bitrate,downloadType,downloadListOpen,onRetry,activeDownloads }) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [proxiedThumbnails, setProxiedThumbnails] = useState({})
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState(new Set())

  // Listen for download progress events to capture thumbnail data
  useEffect(() => {
    const handleDownloadProgress = (progressData) => {
      if (progressData.thumbnail && progressData.downloadId) {
        // Update the download list item with thumbnail data
        const downloadListData = JSON.parse(localStorage.getItem('downloadList')) || []
        const updatedList = downloadListData.map((item) => {
          if (item.id === progressData.downloadId) {
            return { ...item, thumbnail: progressData.thumbnail }
          }
          return item
        })
        localStorage.setItem('downloadList', JSON.stringify(updatedList))
        
        // Force re-render by updating a small state change
        setSearchQuery(prev => prev)
      }
    }

    // Register the event listener
    if (window.api && window.api.onDownloadProgress) {
      window.api.onDownloadProgress(handleDownloadProgress)
    }

    // Cleanup
    return () => {
      if (window.api && window.api.removeListener) {
        window.api.removeListener('download-progress')
      }
    }
  }, [])

  // Helper function to check if URL is from protected CDN (needs proxying)
  const isProtectedCDN = (url) => {
    if (!url) return false
    return url.includes('instagram.com') || 
           url.includes('fbcdn.net') || 
           url.includes('scontent.') ||
           url.includes('twimg.com') ||
           url.includes('hdslb.com')
  }

  // Function to get proxied thumbnail URL
  const getProxiedThumbnail = async (thumbnailUrl, platform) => {
    // Don't proxy YouTube images (they work fine)
    if (isYouTubePlatform(platform)) {
      return thumbnailUrl
    }

    // Check if API is available
    if (!window.api || !window.api.proxyImage) {
      // For protected CDN images, return null to prevent direct loading
      if (isProtectedCDN(thumbnailUrl)) {
        console.warn('proxyImage API not available, cannot load protected CDN image')
        return null
      }
      // For other platforms, use original URL
      return thumbnailUrl
    }

    // Check if we already cached this proxied thumbnail
    if (proxiedThumbnails[thumbnailUrl]) {
      return proxiedThumbnails[thumbnailUrl]
    }

    // Mark as loading to prevent multiple simultaneous requests
    setProxiedThumbnails(prev => ({
      ...prev,
      [thumbnailUrl]: 'LOADING'
    }))

    try {
      const proxiedUrl = await window.api.proxyImage(thumbnailUrl)
      setProxiedThumbnails(prev => ({
        ...prev,
        [thumbnailUrl]: proxiedUrl
      }))
      return proxiedUrl
    } catch (error) {
      // Suppress console errors for 403/Forbidden errors as they're expected for protected CDN images
      // The fallback UI will handle these cases gracefully
      const isExpectedError = error.message?.includes('403') || 
                              error.message?.includes('Forbidden') ||
                              error.message?.includes('Failed to proxy image');
      
      if (!isExpectedError) {
        console.warn('Error proxying thumbnail:', error.message || error);
      }
      
      // Mark as failed to prevent repeated attempts
      setProxiedThumbnails(prev => ({
        ...prev,
        [thumbnailUrl]: 'FAILED'
      }))
      return null // Return null to trigger fallback UI
    }
  }

  // Function to get correct thumbnail URL for an item
  const getThumbnailUrl = (item) => {
    if (!item.thumbnail) return null
    
    const platform = detectPlatform(item.url)
    const isYouTube = isYouTubePlatform(platform)
    
    if (isYouTube) {
      return item.thumbnail
    }
    
    const cachedResult = proxiedThumbnails[item.thumbnail]
    
    // For protected CDN images, never return original URL
    // Only return proxied version or null (to show placeholder)
    if (isProtectedCDN(item.thumbnail)) {
      if (cachedResult === 'FAILED' || cachedResult === 'LOADING' || !cachedResult) {
        return null // Show fallback UI if proxying failed, loading, or not started
      }
      // Only return if we have a proxied result (data URL)
      // Don't return original URL to prevent CORS errors
      return cachedResult.startsWith('data:') ? cachedResult : null
    }
    
    // For other platforms, return proxied version if available, otherwise original
    if (cachedResult === 'FAILED' || cachedResult === 'LOADING') {
      return null // Show fallback UI if proxying failed or is loading
    }
    
    return cachedResult || item.thumbnail
  }

  // Function to trigger thumbnail proxying for an item
  const proxyThumbnailIfNeeded = async (item) => {
    if (!item.thumbnail) return
    
    const platform = detectPlatform(item.url)
    const isYouTube = isYouTubePlatform(platform)
    
    // For protected CDN images, always proxy (don't wait for completion)
    // For other non-YouTube, also proxy
    if (!isYouTube && !proxiedThumbnails[item.thumbnail] && window.api && window.api.proxyImage) {
      // Trigger proxying but don't wait - it will update state when done
      getProxiedThumbnail(item.thumbnail, platform).catch(() => {
        // Error already handled in getProxiedThumbnail
      })
    }
  }

  // Proxy thumbnails for items that need it
  useEffect(() => {
    const downloadListData = JSON.parse(localStorage.getItem('downloadList')) || []
    
    // Proxy thumbnails for all items with thumbnails, not just completed ones
    downloadListData.forEach(item => {
      if (item.thumbnail) {
        proxyThumbnailIfNeeded(item)
      }
    })
  }, [])

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
  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return
    
    const storedDownloads = JSON.parse(localStorage.getItem('downloadList') || '[]')
    const updatedList = storedDownloads.filter((item) => !selectedItems.has(item.id))
    localStorage.setItem('downloadList', JSON.stringify(updatedList))
    
    // Pause all selected downloads
    selectedItems.forEach(id => {
      window.api.pauseDownload(id)
    })
    
    // Clear selections and exit select mode
    setSelectedItems(new Set())
    setIsSelectMode(false)
  }

  // New handler functions for context menu
  const handleAddToFolder = (item) => {
    // TODO: Implement add to folder functionality
    console.log('Add to folder:', item.title)
    setOpenDropdown(null)
  }

  const handleCopyUrl = (item) => {
    navigator.clipboard.writeText(item.url)
      .then(() => {
        alert('URL copied to clipboard!')
      })
      .catch((err) => {
        console.error('Failed to copy URL:', err)
      })
    setOpenDropdown(null)
  }

  const handleShowInFinder = (item) => {
    // Show file in Finder/Explorer
    if (window.api && window.api.showItemInFolder) {
      const normalizedTitle = item.title.replace(/\|/g, '｜').trim()
      const filePath = `${item.savePath || `${require('os').homedir()}/Downloads/pnutdownloader`}/${normalizedTitle}.${item.format || 'mp4'}`
      window.api.showItemInFolder(filePath)
    } else {
      alert('Show in Finder not available')
    }
    setOpenDropdown(null)
  }

  const handleShare = (item) => {
    // TODO: Implement share functionality
    console.log('Share:', item.title)
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
  let downloadListData = JSON.parse(localStorage.getItem('downloadList')) || [];
  console.log('downloadListData', downloadListData)
  const filteredList = (downloadListData )
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
          Total: {filteredList?.length || 0}
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
                  onClick={handleDeleteSelected}
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
        height: 'calc(100vh - 200px)',
        overflowY: 'auto',
        paddingRight: '15px',
        paddingLeft: '5px',
        overflowX: 'hidden'
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
                        const platform = detectPlatform(item.url)
                        const isYouTube = isYouTubePlatform(platform)
                        const thumbnailUrl = getThumbnailUrl(item)
                        
                        // Show thumbnail if available
                        // Never show protected CDN URLs directly - only proxied versions
                        if (thumbnailUrl && (!isProtectedCDN(item.thumbnail) || thumbnailUrl.startsWith('data:'))) {
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
                                  // Fallback to placeholder if image fails to load
                                  e.target.style.display = 'none'
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex'
                                  }
                                }}
                              />
                              {/* Hidden fallback placeholder for failed images */}
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
                        } else {
                          // Show placeholder for content without thumbnails
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
                        }
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
                      item.title || 'Untitled'
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
                    ) : item.isCompleted ? (
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

                    {/* Progress Bar for Downloading */}
                    {!item.isCompleted && item.status === 'Downloading' && progress > 0 && (
                      <div style={{ width: '100%', marginTop: '4px' }}>
                        <ProgressBar
                          now={progress || 0}
                          style={{ height: '5px' }}
                        />
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
                      onClick={() => handleOpenFolder(item)}
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
                            handleAddToFolder(item);
                          }}
                        >
                          Add to Folder <FaFolderOpen className="me-2" />
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            handleCopyUrl(item);
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
                        <Dropdown.Item
                          onClick={() => {
                            handleShare(item);
                          }}
                        >
                          Share <FaShare className="me-2" />
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
