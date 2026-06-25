import React, { useEffect, useState } from 'react'
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

  const asText = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return fallback
  }

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
        asText(item.title || item.filename).toLowerCase().includes(searchQuery.toLowerCase())
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
            return { ...d, saveTo: selectedFolder, filePath: destinationPath }
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
      await handleOpenFolder(item)
    } catch (error) {
      console.error('Error showing file in finder:', error)
      alert(error?.message || 'Failed to show the download in its folder.')
    }
    setOpenDropdown(null)
  }

  const handleDeletePlaylist = (playlist) => {
    const playlistItems = playlist?.items || []
    if (playlistItems.length === 0) return

    if (playlistItems.length === 1) {
      handleDelete(playlistItems[0])
    } else {
      deleteSelected(new Set(playlistItems.map((item) => item.id)))
    }

    setOpenDropdown(null)
  }

  const renderDownloadActions = (
    item,
    {
      dropdownKey = item?.id,
      className = 'download-row__actions',
      folderTitle = 'Show in folder',
      menuClassName = '',
      onDeleteClick,
      onRetryClick,
    } = {}
  ) => {
    if (!item) return null

    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          type="button"
          className="btn pnut-button pnut-button--icon"
          onClick={() => handleOpenFolderClick(item)}
          title={folderTitle}
          style={{
            background: 'transparent',
            border: '1px solid var(--pnut-border)',
            borderRadius: '5px',
            padding: '6px 10px',
            color: 'var(--pnut-text-soft)',
            fontSize: '14px'
          }}
        >
          <FaFolderOpen />
        </button>
        <Dropdown
          show={openDropdown === dropdownKey}
          onToggle={(isOpen) => setOpenDropdown(isOpen ? dropdownKey : null)}
        >
          <Dropdown.Toggle
            as="button"
            className="download-row__menu-button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pnut-text-soft)',
              fontSize: '16px',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <FaEllipsisV />
          </Dropdown.Toggle>
          <Dropdown.Menu align="end" className={`dropdown-menu ${menuClassName}`.trim()}>
            <Dropdown.Item
              onClick={() => {
                setOpenDropdown(null)
                if (typeof onRetryClick === 'function') {
                  onRetryClick()
                } else if (typeof onRetry === 'function') {
                  onRetry(item.id)
                }
              }}
            >
              Retry <FaRedoAlt className="me-2" />
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                handleAddToFolder(item)
              }}
            >
              Move to folder <FaFolderOpen className="me-2" />
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                handleCopy(item)
              }}
            >
              Copy link <FaCopy className="me-2" />
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                handleShowInFinder(item)
              }}
            >
              Show in folder <FaExternalLinkAlt className="me-2" />
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                if (typeof onDeleteClick === 'function') {
                  onDeleteClick()
                } else {
                  handleDelete(item)
                }
                setOpenDropdown(null)
              }}
            >
              Delete <FaTrash className="me-2" />
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    )
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
      const itemUrl = asText(item.url)
      const itemFormat = asText(item.format).toLowerCase()
      const isPlaylist =
        Boolean(item.playlistTitle || item.playlistBatchId || item.isPlaylist) ||
        itemUrl.includes('playlist') ||
        itemUrl.includes('&list=') ||
        itemUrl.includes('?list=');
      if (selectedItem === 'All Files' || selectedItem === 'All File') return true;
      if (selectedItem === 'Playlist') return isPlaylist;
      if (selectedItem === 'Video') return itemFormat === 'mp4' && !isPlaylist;
      if (selectedItem === 'Audio') return ['mp3', 'flac', 'wav', 'aac'].includes(itemFormat);
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
      if (selectedItem === 'Playlist') return asText(a.url).localeCompare(asText(b.url));
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
      asText(item.title || item.filename).toLowerCase().includes(searchQuery.toLowerCase())
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
    const titleText = asText(title)
    if (!titleText) return titleText
    
    // Normalize Unicode for better international character handling
    return titleText
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

  const playlistGroups = new Map()
  filteredList.forEach((item) => {
    const itemUrl = asText(item.url)
    const isPlaylistRecord = Boolean(
      item.playlistTitle ||
      item.playlistBatchId ||
      item.isPlaylist ||
      itemUrl.includes('/playlist') ||
      itemUrl.includes('&list=') ||
      itemUrl.includes('?list=')
    )
    if (!isPlaylistRecord) return
    const groupKey = item.playlistBatchId || (item.playlistTitle
      ? `legacy:${item.playlistTitle}`
      : `direct:${item.id}`)
    if (!playlistGroups.has(groupKey)) {
      playlistGroups.set(groupKey, {
        id: groupKey,
        title: item.playlistTitle || 'YouTube playlist',
        items: [],
      })
    }
    playlistGroups.get(groupKey).items.push(item)
  })

  const playlistSummaries = [...playlistGroups.values()]
    .map((group) => {
      const completedItems = group.items.filter(
        (item) => item.isCompleted || item.status === 'Completed'
      )
      const failedItems = group.items.filter(
        (item) => item.isFailed || item.status === 'Failed'
      )
      const downloadingItem = group.items.find(
        (item) => item.status === 'Downloading' || item.status === 'Fetching Info...'
      )
      const nextItem = group.items.find(
        (item) => item.status === 'Queued' || item.status === 'Waiting'
      )
      const displayItem = downloadingItem || nextItem || completedItems.at(-1) || group.items[0]
      const directPlaylistItem = group.items.length === 1 && group.items[0].isPlaylist
        ? group.items[0]
        : null
      const declaredTotal = Math.max(...group.items.map((item) => Number(item.playlistTotal) || 0))
      const reportedTotal = Number(directPlaylistItem?.totalItems) || 0
      const total = Math.max(group.items.length, declaredTotal, reportedTotal)
      const directPlaylistComplete = Boolean(
        directPlaylistItem && (
          directPlaylistItem.isCompleted ||
          directPlaylistItem.isPlaylistCompleted ||
          directPlaylistItem.status === 'Completed'
        )
      )
      const completed = directPlaylistItem
        ? directPlaylistComplete
          ? total
          : Math.max((Number(directPlaylistItem.currentItem) || 1) - 1, 0)
        : completedItems.length
      const failed = failedItems.length
      const remaining = Math.max(total - completed, 0)
      const currentVideoNumber = directPlaylistItem
        ? Number(directPlaylistItem.currentItem) || Math.min(completed + 1, total)
        : downloadingItem || nextItem
          ? Number((downloadingItem || nextItem).playlistIndex) || Math.min(completed + 1, total)
          : total
      const currentItemProgress = downloadingItem
        ? Number(progressMap.get(downloadingItem.id)?.progress) || Number(downloadingItem.progress) || 0
        : 0
      const percent = total > 0
        ? Math.min(100, ((completed + currentItemProgress / 100) / total) * 100)
        : 0
      const isComplete = total > 0 && completed === total

      return {
        ...group,
        completed,
        failed,
        remaining,
        total,
        percent,
        currentVideoNumber,
        displayItem,
        failedItem: failedItems[0] || null,
        downloadingItem,
        nextItem,
        isComplete,
        thumbnailUrl: displayItem ? getThumbnailUrl(displayItem) : null,
      }
    })
    .filter((group) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        asText(group.title).toLowerCase().includes(query) ||
        group.items.some((item) => asText(item.title || item.filename).toLowerCase().includes(query))
      )
    })

  const playlistSummaryDebugState = JSON.stringify(
    playlistSummaries.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      completed: playlist.completed,
      remaining: playlist.remaining,
      total: playlist.total,
      currentVideo: playlist.currentVideoNumber,
      currentTitle: playlist.displayItem?.title || null,
      thumbnail: playlist.thumbnailUrl || null,
      percent: Math.round(playlist.percent),
    }))
  )

  useEffect(() => {
    const summaries = JSON.parse(playlistSummaryDebugState)
    if (summaries.length > 0) {
      console.log('[PlaylistProgress] Library summary updated', summaries)
    }
  }, [playlistSummaryDebugState])

  const summarizedPlaylistItemIds = new Set(
    playlistSummaries.flatMap((playlist) => playlist.items.map((item) => item.id))
  )
  const displayedPlaylistSummaries = isSelectMode ? [] : playlistSummaries
  const visibleDownloadItems = isSelectMode
    ? searchFilteredList
    : searchFilteredList.filter((item) => !summarizedPlaylistItemIds.has(item.id))
  const displayedDownloadCount = displayedPlaylistSummaries.length + new Set(
    visibleDownloadItems.map((item) => item.id)
  ).size

  const screenMeta = {
    'All Files': {
      title: 'Library',
      eyebrow: 'All downloads',
      subtitle: 'Track every video, music file, playlist, and active download in one place.',
      empty: 'Your downloads will show here.',
    },
    'All File': {
      title: 'Library',
      eyebrow: 'All downloads',
      subtitle: 'Track every video, music file, playlist, and active download in one place.',
      empty: 'Your downloads will show here.',
    },
    Video: {
      title: 'Videos',
      eyebrow: 'Video files',
      subtitle: 'Browse downloaded videos and active video downloads.',
      empty: 'No videos yet. Download one from a link or Explore.',
    },
    Audio: {
      title: 'Music',
      eyebrow: 'Audio files',
      subtitle: 'Browse downloaded audio and music files.',
      empty: 'No music yet. Switch Type to Audio and download a link.',
    },
    Playlist: {
      title: 'Playlists',
      eyebrow: 'Playlist downloads',
      subtitle: 'Track playlist groups and multi-video downloads.',
      empty: 'No playlists yet. Paste a playlist link to choose videos.',
    },
  }[selectedItem] || {
    title: selectedItem || 'Library',
    eyebrow: 'Downloads',
    subtitle: 'Search, manage, and open your downloads.',
    empty: 'Your downloads will show here.',
  }

  return (
    <div className="download-library container-fluid p-0" style={{ padding: '30px 20px 20px 20px' }}>
      {/* Header Section */}
      <div className="download-library__header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingTop: '20px'
      }}>
        <div>
          <p className="pnut-eyebrow">{screenMeta.eyebrow}</p>
          <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'var(--pnut-text)',
          margin: 0
        }}>
            {screenMeta.title}
          </h2>
          <p className="download-library__subtitle">{screenMeta.subtitle}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="download-library__search" style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--pnut-border)',
        borderRadius: '25px',
        padding: '8px 15px',
        backgroundColor: 'var(--pnut-surface)',
        marginTop: '40px'
      }}>
        <FaSearch style={{ color: 'var(--pnut-muted)', marginRight: '10px' }} />
        <input
          type="text"
          placeholder="Search downloads"
          value={searchQuery}
          onChange={handleSearchChange}
          className="download-library__search-input"
          style={{
            border: 'none',
            outline: 'none',
            flexGrow: 1,
            backgroundColor: 'transparent',
            fontSize: '16px',
            color: 'var(--pnut-text)'
          }}
        />
      </div>

      {/* Total and Select Button */}
      <div className="download-library__toolbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <span className="download-library__count" style={{ fontSize: '14px', color: 'var(--pnut-muted)' }}>
          {displayedDownloadCount} item{displayedDownloadCount === 1 ? '' : 's'}
        </span>
        <div className="download-library__actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isSelectMode && (
            <>
              <button
                onClick={handleSelectAll}
                className="pnut-button"
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--pnut-border)',
                  borderRadius: '5px',
                  background: 'white',
                  color: 'var(--pnut-text)',
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
                      asText(item.title || item.filename).toLowerCase().includes(searchQuery.toLowerCase())
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
                  className="pnut-button pnut-button--danger"
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--pnut-danger)',
                    borderRadius: '5px',
                    background: 'var(--pnut-danger)',
                    color: '#ffffff',
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
            className="pnut-button"
            style={{
              padding: '6px 12px',
              border: isSelectMode ? '1px solid var(--pnut-button-bg)' : '1px solid var(--pnut-border)',
              borderRadius: '5px',
              background: isSelectMode ? 'var(--pnut-button-bg)' : 'var(--pnut-surface)',
              color: isSelectMode ? 'var(--pnut-button-text)' : 'var(--pnut-text)',
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
      <div className="download-library__list" style={{
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
          <>
            {displayedPlaylistSummaries.map((playlist) => {
              const playlistActionItem = playlist.failedItem || playlist.displayItem || playlist.items[0]

              return (
                <section
                  key={playlist.id}
                  className={`playlist-progress-card${playlist.isComplete ? ' playlist-progress-card--complete' : ''}`}
                  aria-label={`${playlist.title} playlist download progress`}
                >
                <div className="playlist-progress-card__header">
                  <div>
                    <span className="playlist-progress-card__eyebrow">Playlist download</span>
                    <h3>{playlist.title || 'Untitled playlist'}</h3>
                  </div>
                  <div className="playlist-progress-card__actions">
                    <span className={`playlist-progress-card__state${playlist.isComplete ? ' is-complete' : ''}`}>
                      {playlist.isComplete ? (
                        <>
                          <FaCheckCircle /> Complete
                        </>
                      ) : playlist.downloadingItem ? (
                        'Downloading now'
                      ) : playlist.nextItem ? (
                        'Waiting to start'
                      ) : playlist.failed > 0 ? (
                        'Needs attention'
                      ) : (
                        'Preparing'
                      )}
                    </span>
                    {renderDownloadActions(playlistActionItem, {
                      dropdownKey: `playlist:${playlist.id}`,
                      className: 'download-row__actions playlist-progress-card__item-actions',
                      folderTitle: 'Show playlist in folder',
                      menuClassName: 'playlist-progress-card__menu',
                      onDeleteClick: () => handleDeletePlaylist(playlist),
                      onRetryClick: () => {
                        if (playlistActionItem && typeof onRetry === 'function') {
                          onRetry(playlistActionItem.id)
                        }
                      },
                    })}
                  </div>
                </div>

                <div className="playlist-progress-card__body">
                  <div className="playlist-progress-card__thumbnail">
                    {playlist.thumbnailUrl ? (
                      <img
                        src={playlist.thumbnailUrl}
                        alt={playlist.displayItem?.title || playlist.title}
                      />
                    ) : (
                      <FaVideo aria-hidden="true" />
                    )}
                    {!playlist.isComplete && playlist.displayItem && (
                      <span>
                        {playlist.downloadingItem ? 'Now' : 'Next'}
                      </span>
                    )}
                  </div>

                  <div className="playlist-progress-card__details">
                    <div className="playlist-progress-card__current-label">
                      {playlist.isComplete
                        ? 'Playlist finished'
                        : `Video ${playlist.currentVideoNumber} of ${playlist.total}`}
                    </div>
                    <div className="playlist-progress-card__current-title">
                      {playlist.displayItem?.title || 'Preparing playlist video…'}
                    </div>
                    <div className="playlist-progress-card__summary">
                      {playlist.completed} of {playlist.total} downloaded · {playlist.remaining} remaining
                      {playlist.failed > 0 ? ` · ${playlist.failed} failed` : ''}
                    </div>
                    <div
                      className="playlist-progress-card__track"
                      role="progressbar"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={Math.round(playlist.percent)}
                      aria-label={`${Math.round(playlist.percent)} percent complete`}
                    >
                      <div
                        className="playlist-progress-card__fill"
                        style={{ width: `${playlist.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="playlist-progress-card__counts">
                    <div>
                      <strong>{playlist.completed}</strong>
                      <span>Downloaded</span>
                    </div>
                    <div>
                      <strong>{playlist.remaining}</strong>
                      <span>Remaining</span>
                    </div>
                    <div>
                      <strong>{playlist.total}</strong>
                      <span>Total</span>
                    </div>
                  </div>
                </div>
                </section>
              )
            })}

            {[...new Set(visibleDownloadItems.map((item) => item.id))].map((uniqueId, index) => {
            const item = visibleDownloadItems.find((i) => i.id === uniqueId);
            const progress = progressMap.get(item.id)?.progress || item.progress || 0;
            const speed = progressMap.get(item.id)?.speed || 'Unknown';
            const fileSize = progressMap.get(item.id)?.fileSize || 'Unknown';
            const eta = progressMap.get(item.id)?.eta || 'Unknown';
            const remainingTime = calculateRemainingTime(item.duration, progress);
            const formattedRemainingTime = formatTime(remainingTime);
            const duration = formatTime(convertISODurationToSeconds(item.duration));
            return (
              <div
                key={item.id}
                className={`download-row ${activeDownloads?.has(item.id) ? 'download-row--active' : ''} ${selectedItems.has(item.id) ? 'download-row--selected' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '20px',
                  background: activeDownloads?.has(item.id)
                    ? 'linear-gradient(135deg, var(--pnut-info-soft) 0%, var(--pnut-surface) 100%)'
                    : selectedItems.has(item.id)
                      ? 'linear-gradient(135deg, var(--pnut-brand-soft) 0%, var(--pnut-surface) 100%)'
                      : 'var(--pnut-surface)',
                  borderRadius: '10px',
                  border: activeDownloads?.has(item.id) || selectedItems.has(item.id)
                    ? '2px solid var(--pnut-brand-border-strong)'
                    : '1px solid var(--pnut-border)',
                  transition: 'all 0.3s ease',
                  boxShadow: activeDownloads?.has(item.id) || selectedItems.has(item.id) ? 'var(--pnut-shadow-sm)' : 'none',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--pnut-shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = activeDownloads?.has(item.id) || selectedItems.has(item.id) ? 'var(--pnut-shadow-sm)' : 'none';
                }}
              >
                {/* Active Download Indicator */}
                {activeDownloads?.has(item.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'var(--pnut-brand-fill)',
                    color: '#09090B',
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
                      background: '#09090B',
                      borderRadius: '50%',
                      animation: 'blink 1.5s infinite'
                    }}></div>
                    Active
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
                      <FaCheckSquare style={{ fontSize: '20px', color: 'var(--pnut-brand)' }} />
                    ) : (
                      <FaSquare style={{ fontSize: '20px', color: 'var(--pnut-muted)' }} />
                    )}
                  </div>
                )}
                {/* Number */}
                {!isSelectMode && (
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--pnut-muted)',
                    minWidth: '30px'
                  }}>
                    {index + 1}
                  </span>
                )}

                {/* Thumbnail with Duration Overlay */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {!item.thumbnail && (item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting') ? (
                    <div style={{ position: 'relative' }}>
                      <Skeleton width={120} height={70} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '12px',
                        color: 'var(--pnut-muted)',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        {item.status === 'Fetching Info...' ? 'Getting info' : 'In queue'}
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
                                background: 'linear-gradient(135deg, var(--pnut-brand) 0%, var(--pnut-brand-fill) 100%)',
                                borderRadius: '8px',
                                display: 'none',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                flexDirection: 'column',
                                gap: '4px'
                              }} title={item.title || 'Video'}>
                                <FaVideo style={{ fontSize: '20px', color: '#ffffff' }} />
                                <span style={{
                                  fontSize: '8px',
                                  color: '#ffffff',
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  width: '108px',
                                  lineHeight: '10px',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}>
                                  {item.title || 'Video'}
                                </span>
                              </div>
                            </>
                          )
                        }
                        return (
                          <div style={{
                            width: '120px',
                            height: '70px',
                            background: 'linear-gradient(135deg, var(--pnut-brand-soft) 0%, var(--pnut-surface-raised) 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            flexDirection: 'column',
                            gap: '4px'
                          }} title={item.title || 'Video'}>
                            <FaVideo style={{ fontSize: '20px', color: 'var(--pnut-brand)' }} />
                            <span style={{
                              fontSize: '8px',
                              color: 'var(--pnut-brand)',
                              fontWeight: '600',
                              textAlign: 'center',
                              width: '108px',
                              lineHeight: '10px',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {item.title || 'Video'}
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
                <div className="download-row__content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  {/* Title */}
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--pnut-text)',
                    margin: 0,
                    lineHeight: '1.4',
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {!item.title && (item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting') ? (
                      <Skeleton width={300} />
                    ) : (
                      cleanTitle(item.title || item.filename) || 'Untitled'
                    )}
                  </h3>

                  {/* Status, Format, Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Status Badge */}
                    {!item.title && (item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting') ? (
                      <Skeleton width={70} height={22} />
                    ) : item.isPlaylist ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.isPlaylistCompleted && (
                          <FaCheckCircle style={{ color: 'var(--pnut-success)', fontSize: '12px' }} />
                        )}
                        <span style={{
                          background: item.isPlaylistCompleted ? 'var(--pnut-success-soft)' : 'var(--pnut-warning-soft)',
                          color: item.isPlaylistCompleted ? 'var(--pnut-success)' : 'var(--pnut-warning)',
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
                        background: 'var(--pnut-success-soft)',
                        color: 'var(--pnut-success)',
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
                        background: 'var(--pnut-danger-soft)',
                        color: 'var(--pnut-danger)',
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
                        background: 'var(--pnut-info-soft)',
                        color: 'var(--pnut-info)',
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
                        ) : item.status === 'Queued' ? (
                          'In queue'
                        ) : item.status === 'Fetching Info...' ? (
                          'Getting info'
                        ) : (
                          item.status
                        )}
                      </div>
                    )}

                    {item.status === 'Failed' && item.lastError && (
                      <div
                        title={item.errorDetails || item.lastError}
                        style={{
                          width: '100%',
                          color: 'var(--pnut-danger)',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {item.lastError}
                        {item.errorExitCode !== null && item.errorExitCode !== undefined
                          ? ` (exit code ${item.errorExitCode})`
                          : ''}
                        {item.errorDetails && item.errorDetails !== item.lastError && (
                       
                        console.log("errro",item.lastError, item.errorDetails)
                      
                        )}
                      </div>
                    )}

                    {/* Format Tag */}
                    {!item.isPlaylist && item.format && (
                      <span style={{
                        background: 'var(--pnut-surface-raised)',
                        color: 'var(--pnut-text-soft)',
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
                      color: 'var(--pnut-muted)'
                    }}>
                      {getFormattedDate(item)}
                    </span>
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
                          color: 'var(--pnut-muted)'
                        }}>
                          <span>Size: {fileSize}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {!isSelectMode && renderDownloadActions(item)}
              </div>
            );
            })}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--pnut-muted)'
          }}>
            {searchQuery ? 'No matches found.' : screenMeta.empty}
          </div>
        )}
      </div>
    </div>
  )
}

export default DownloadList
