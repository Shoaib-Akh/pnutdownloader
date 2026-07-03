import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaCheckCircle, FaEllipsisV, FaTrash, FaTimesCircle, FaFolderOpen, FaVideo, FaCopy, FaExternalLinkAlt, FaSearch, FaCheckSquare, FaSquare, FaRedoAlt } from 'react-icons/fa'
import { ProgressBar, Modal } from 'react-bootstrap'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import '../common.css'
import { convertISODurationToSeconds, formatTime } from '../convertISODurationToSeconds'
import MediaThumbnail from './MediaThumbnail'
import useDownloadListVM from '../../viewmodels/useDownloadListVM'
import './ActiveDownloadAnimations.css'

function DownloadActionsMenu({
  item,
  dropdownKey,
  isOpen,
  setOpenDropdown,
  menuClassName,
  onMove,
  onRetry,
  onCopy,
  onShowInFolder,
  onDelete,
}) {
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0, visibility: 'hidden' })

  const updatePosition = () => {
    const button = buttonRef.current
    if (!button) return

    const buttonRect = button.getBoundingClientRect()
    const menuWidth = menuRef.current?.offsetWidth || 220
    const menuHeight = menuRef.current?.offsetHeight || 244
    const padding = 12
    const gap = 8
    const openUp = buttonRect.bottom + gap + menuHeight > window.innerHeight - padding
    const top = openUp
      ? Math.max(padding, buttonRect.top - menuHeight - gap)
      : Math.min(buttonRect.bottom + gap, window.innerHeight - menuHeight - padding)
    const left = Math.min(
      Math.max(padding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - padding
    )

    setPosition({ top, left, visibility: 'visible' })
  }

  useLayoutEffect(() => {
    if (!isOpen) return

    setPosition((current) => ({ ...current, visibility: 'hidden' }))
    updatePosition()
    const frame = window.requestAnimationFrame(updatePosition)
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const close = () => setOpenDropdown(null)
    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      close()
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [isOpen, setOpenDropdown])

  const toggleMenu = () => {
    setOpenDropdown(isOpen ? null : dropdownKey)
  }

  const menu = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className={`dropdown-menu show download-row__dropdown-menu ${menuClassName || ''}`.trim()}
          role="menu"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            visibility: position.visibility,
          }}
        >
          <button type="button" className="dropdown-item" role="menuitem" onClick={onMove}>
            Move to folder <FaFolderOpen className="me-2" />
          </button>
          <button type="button" className="dropdown-item" role="menuitem" onClick={onRetry}>
            Retry <FaRedoAlt className="me-2" />
          </button>
          <button type="button" className="dropdown-item" role="menuitem" onClick={onCopy}>
            Copy link <FaCopy className="me-2" />
          </button>
          <button type="button" className="dropdown-item" role="menuitem" onClick={onShowInFolder}>
            Show in folder <FaExternalLinkAlt className="me-2" />
          </button>
          <button type="button" className="dropdown-item" role="menuitem" onClick={onDelete}>
            Delete <FaTrash className="me-2" />
          </button>
        </div>,
        document.body
      )
    : null

  return (
    <div className="dropdown">
      <button
        ref={buttonRef}
        type="button"
        className="download-row__menu-button"
        aria-label={`Actions for ${item?.title || 'download'}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <FaEllipsisV />
      </button>
      {menu}
    </div>
  )
}

function DownloadList({ selectedItem, progressMap, bitrate, downloadType, onRetry, activeDownloads }) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [pendingCallback, setPendingCallback] = useState(null)

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
      <div className={className}>
        <button
          type="button"
          className="btn pnut-button pnut-button--icon download-row__folder-button"
          onClick={() => handleOpenFolderClick(item)}
          title={folderTitle}
        >
          <FaFolderOpen />
        </button>
        <DownloadActionsMenu
          item={item}
          dropdownKey={dropdownKey}
          isOpen={openDropdown === dropdownKey}
          setOpenDropdown={setOpenDropdown}
          menuClassName={menuClassName}
          onMove={() => {
            setOpenDropdown(null)
            handleAddToFolder(item)
          }}
          onRetry={() => {
            setOpenDropdown(null)
            setConfirmMessage('Are you sure you want to retry this download?')
            setPendingCallback(() => typeof onRetryClick === 'function' ? onRetryClick : () => typeof onRetry === 'function' ? () => onRetry(item.id) : null)
            setShowConfirmModal(true)
          }}
          onCopy={() => {
            setOpenDropdown(null)
            handleCopy(item)
          }}
          onShowInFolder={() => {
            setOpenDropdown(null)
            handleShowInFinder(item)
          }}
          onDelete={() => {
            setOpenDropdown(null)
            setConfirmMessage('Are you sure you want to delete this download?')
            setPendingCallback(() => typeof onDeleteClick === 'function' ? onDeleteClick : () => handleDelete(item))
            setShowConfirmModal(true)
          }}
        />
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
  const isActiveDownloadItem = (item) =>
    Boolean(
      activeDownloads?.has(item?.id) ||
      item?.status === 'Downloading' ||
      item?.status === 'Fetching Info...' ||
      item?.status === 'Fetching Info'
    )

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
      const activeRank = Number(isActiveDownloadItem(b)) - Number(isActiveDownloadItem(a))
      if (activeRank !== 0) return activeRank

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
    <div className="download-library container-fluid p-0">
      {/* Header Section */}
      <div className="download-library__header">
        {/* <div>
          <p className="pnut-eyebrow">{screenMeta.eyebrow}</p>
          <h2>
            {screenMeta.title}
          </h2>
          <p className="download-library__subtitle">{screenMeta.subtitle}</p>
        </div> */}
      </div>

      {/* Search Bar */}
      <div className="download-library__search">
        <FaSearch className="download-library__search-icon" />
        <input
          type="text"
          placeholder="Search downloads"
          value={searchQuery}
          onChange={handleSearchChange}
          className="download-library__search-input"
        />
      </div>

      {/* Total and Select Button */}
      <div className="download-library__toolbar">
        <span className="download-library__count">
          {displayedDownloadCount} item{displayedDownloadCount === 1 ? '' : 's'}
        </span>
        <div className="download-library__actions">
          {isSelectMode && (
            <>
              <button
                onClick={handleSelectAll}
                className="pnut-button download-library__action-button"
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
                  className="pnut-button pnut-button--danger download-library__action-button"
                >
                  <FaTrash /> Delete Selected ({selectedItems.size})
                </button>
              )}
            </>
          )}
          <button
            onClick={handleSelectModeToggle}
            className={`pnut-button download-library__action-button${isSelectMode ? ' download-library__action-button--active' : ''}`}
          >
            {isSelectMode ? 'Cancel' : 'Select'}
          </button>
        </div>
      </div>

      {/* Download List - Card Layout */}
      <div className="download-library__list">
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
                    <ProgressBar
                      now={playlist.percent}
                      className="playlist-progress-card__progress"
                      aria-label={`${Math.round(playlist.percent)} percent complete`}
                    />
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
              >
                {/* Active Download Indicator */}
                {activeDownloads?.has(item.id) && (
                  <div className="download-row__active-badge">
                    <div className="download-row__active-dot"></div>
                    Active
                  </div>
                )}
                {/* Checkbox for select mode */}
                {isSelectMode && (
                  <div
                    className="download-row__select-toggle"
                    onClick={() => handleItemSelect(item.id)}
                  >
                    {selectedItems.has(item.id) ? (
                      <FaCheckSquare className="download-row__select-icon download-row__select-icon--selected" />
                    ) : (
                      <FaSquare className="download-row__select-icon" />
                    )}
                  </div>
                )}
                {/* Number */}
                {!isSelectMode && (
                  <span className="download-row__index">
                    {index + 1}
                  </span>
                )}

                {/* Thumbnail with Duration Overlay */}
                <div className="download-row__thumbnail">
                  {!item.thumbnail && (item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting') ? (
                    <div className="download-row__thumbnail-skeleton">
                      <Skeleton width={120} height={70} />
                      <div className="download-row__thumbnail-status">
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
                                className={`download-row__thumbnail-image${item.isCompleted ? ' download-row__thumbnail-image--clickable' : ''}`}
                                onClick={() => item.isCompleted && handleThumbnailClick(item)}
                                onError={(e) => {
                                  e.currentTarget.classList.add('download-row__thumbnail-image--hidden')
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.add('download-row__thumbnail-fallback--visible')
                                  }
                                }}
                              />
                              <div className="download-row__thumbnail-fallback download-row__thumbnail-fallback--error" title={item.title || 'Video'}>
                                <FaVideo className="download-row__thumbnail-fallback-icon" />
                                <span className="download-row__thumbnail-fallback-title">
                                  {item.title || 'Video'}
                                </span>
                              </div>
                            </>
                          )
                        }
                        return (
                          <div className="download-row__thumbnail-fallback download-row__thumbnail-fallback--placeholder" title={item.title || 'Video'}>
                            <FaVideo className="download-row__thumbnail-fallback-icon" />
                            <span className="download-row__thumbnail-fallback-title">
                              {item.title || 'Video'}
                            </span>
                          </div>
                        )
                      })()}
                      {duration && (
                        <div className="download-row__duration">
                          {duration}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Content Section */}
                <div className="download-row__content">
                  {/* Title */}
                  <h3 className="download-row__title">
                    {!item.title && (item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting') ? (
                      <Skeleton width={300} />
                    ) : (
                      cleanTitle(item.title || item.filename) || 'Untitled'
                    )}
                  </h3>

                  {/* Status, Format, Date */}
                  <div className="download-row__meta">
                    {/* Status Badge */}
                    {!item.title && (item.status === 'Fetching Info...' || item.status === 'Queued' || item.status === 'Waiting') ? (
                      <Skeleton width={70} height={22} />
                    ) : item.isPlaylist ? (
                      <div className="download-row__playlist-status">
                        {item.isPlaylistCompleted && (
                          <FaCheckCircle className="download-row__status-icon download-row__status-icon--success" />
                        )}
                        <span className={`download-row__status-badge ${item.isPlaylistCompleted ? 'download-row__status-badge--success' : 'download-row__status-badge--warning'}`}>
                          {item.isPlaylistCompleted ? 'Done' : `${item.currentItem || 0}/${item.totalItems || 0} videos`}
                        </span>
                      </div>
                    ) : item.isCompleted || item.status === 'Completed' ? (
                      <div className="download-row__status-badge download-row__status-badge--success">
                        <FaCheckCircle className="download-row__status-icon" />
                        Done
                      </div>
                    ) : item.status === 'Failed' ? (
                      <div className="download-row__status-badge download-row__status-badge--danger">
                        <FaTimesCircle className="download-row__status-icon" />
                        Failed
                      </div>
                    ) : (
                      <div className="download-row__status-badge download-row__status-badge--info">
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

                    {/* Format Tag */}
                    {!item.isPlaylist && item.format && (
                      <span className="download-row__format">
                        {item.format}
                      </span>
                    )}

                    {/* Date */}
                    <span className="download-row__date">
                      {getFormattedDate(item)}
                    </span>
                    {/* Progress Bar for Downloading */}
                    {!item.isCompleted && item.status !== 'Completed' && item.status === 'Downloading' && progress > 0 && (
                      <div className="download-row__progress">
                        <ProgressBar
                          now={progress || 0}
                          className="download-row__progress-bar"
                        />
                        {/* Download Speed Info */}
                        <div className="download-row__progress-info">
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
          <div className="download-library__empty">
{searchQuery ? 'No matches found.' : screenMeta.empty}
           </div>
         )}
      </div>

      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
        className="pnut-modal download-confirm-modal"
      >
        <Modal.Header className="custom-modal-header">
          <Modal.Title className="custom-modal-title">
            Confirm Action
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="custom-modal-body">
          <p className="modal-message">{confirmMessage}</p>
        </Modal.Body>
        <Modal.Footer className="custom-modal-footer">
          <button
            type="button"
            className="pnut-button download-confirm-modal__button"
            onClick={() => setShowConfirmModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pnut-button pnut-button--danger download-confirm-modal__button"
            onClick={() => {
              setShowConfirmModal(false)
              if (pendingCallback) {
                pendingCallback()
              }
            }}
          >
            Confirm
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default DownloadList
