import { useEffect, useState, useCallback } from 'react'
import { detectPlatform, isYouTubePlatform } from '../components/platformUtils'

const DOWNLOAD_STORAGE_KEY = 'downloadList'

const isProtectedCDN = (url) => {
  if (!url) return false
  return (
    url.includes('instagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('scontent.') ||
    url.includes('twimg.com') ||
    url.includes('hdslb.com')
  )
}

const readDownloads = () => JSON.parse(localStorage.getItem(DOWNLOAD_STORAGE_KEY) || '[]')
const writeDownloads = (list) => localStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(list))

const useDownloadListVM = () => {
  const [proxiedThumbnails, setProxiedThumbnails] = useState({})
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [downloadListData, setDownloadListData] = useState(readDownloads())

  // Listen for progress events to refresh thumbnails and force rerender
  useEffect(() => {
    const handleDownloadProgress = (progressData) => {
      if (progressData.thumbnail && progressData.downloadId) {
        const list = readDownloads()
        const updated = list.map((item) =>
          item.id === progressData.downloadId ? { ...item, thumbnail: progressData.thumbnail } : item
        )
        writeDownloads(updated)
        setDownloadListData(updated)
        setLastUpdated(Date.now())
      }
    }

    // Listen for localStorage changes from other components (e.g., useDownloadManager)
    const handleStorageChange = (e) => {
      if (e.key === DOWNLOAD_STORAGE_KEY && e.newValue) {
        try {
          const updatedList = JSON.parse(e.newValue)
          setDownloadListData(updatedList)
          setLastUpdated(Date.now())
        } catch (err) {
          console.error('Error parsing download list from storage:', err)
        }
      }
    }

    // Listen for custom events from useDownloadManager for same-tab updates
    const handleDownloadListUpdated = (e) => {
      if (e.detail) {
        setDownloadListData(e.detail)
        setLastUpdated(Date.now())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('downloadListUpdated', handleDownloadListUpdated)

    if (window.api?.onDownloadProgress) {
      window.api.onDownloadProgress(handleDownloadProgress)
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('downloadListUpdated', handleDownloadListUpdated)
      if (window.api?.removeListener) {
        window.api.removeListener('download-progress')
      }
    }
  }, [])

  const getProxiedThumbnail = useCallback(
    async (thumbnailUrl, platform) => {
      if (!thumbnailUrl) return null
      if (isYouTubePlatform(platform)) return thumbnailUrl

      if (!window.api?.proxyImage) {
        if (isProtectedCDN(thumbnailUrl)) return null
        return thumbnailUrl
      }

      if (proxiedThumbnails[thumbnailUrl]) {
        return proxiedThumbnails[thumbnailUrl] === 'FAILED' ? null : proxiedThumbnails[thumbnailUrl]
      }

      setProxiedThumbnails((prev) => ({ ...prev, [thumbnailUrl]: 'LOADING' }))
      try {
        const proxiedUrl = await window.api.proxyImage(thumbnailUrl)
        setProxiedThumbnails((prev) => ({ ...prev, [thumbnailUrl]: proxiedUrl }))
        return proxiedUrl
      } catch (error) {
        const isExpected =
          error.message?.includes('403') ||
          error.message?.includes('Forbidden') ||
          error.message?.includes('Failed to proxy image')
        if (!isExpected) console.warn('Error proxying thumbnail:', error.message || error)
        setProxiedThumbnails((prev) => ({ ...prev, [thumbnailUrl]: 'FAILED' }))
        return null
      }
    },
    [proxiedThumbnails]
  )

  const getThumbnailUrl = useCallback(
    (item) => {
      if (!item?.thumbnail) return null
      const platform = detectPlatform(item.url)
      const cached = proxiedThumbnails[item.thumbnail]

      if (isYouTubePlatform(platform)) return item.thumbnail

      if (isProtectedCDN(item.thumbnail)) {
        if (!cached || cached === 'FAILED' || cached === 'LOADING') return null
        return cached.startsWith('data:') ? cached : null
      }

      if (cached === 'FAILED' || cached === 'LOADING') return null
      return cached || item.thumbnail
    },
    [proxiedThumbnails]
  )

  // Proxy thumbnails eagerly for current list
  useEffect(() => {
    downloadListData.forEach((item) => {
      if (!item?.thumbnail) return
      const platform = detectPlatform(item.url)
      if (isYouTubePlatform(platform)) return
      if (!proxiedThumbnails[item.thumbnail]) {
        getProxiedThumbnail(item.thumbnail, platform).catch(() => {})
      }
    })
  }, [downloadListData, getProxiedThumbnail, proxiedThumbnails])

  // Refresh local list when notified
  useEffect(() => {
    setDownloadListData(readDownloads())
  }, [lastUpdated])

  const handleDeleteAll = useCallback(() => {
    const stored = readDownloads()
    stored.forEach((item) => window.api?.pauseDownload?.(item.id))
    writeDownloads([])
    setDownloadListData([])
    setLastUpdated(Date.now())
  }, [])

  const handleDeleteItem = useCallback((item) => {
    const stored = readDownloads()
    const updated = stored.filter((d) => d.id !== item.id)
    writeDownloads(updated)
    setDownloadListData(updated)
    window.api?.pauseDownload?.(item.id)
    setLastUpdated(Date.now())
  }, [])

  const handleDeleteSelected = useCallback((selectedIds) => {
    if (!selectedIds?.size) return
    const stored = readDownloads()
    const updated = stored.filter((item) => !selectedIds.has(item.id))
    writeDownloads(updated)
    setDownloadListData(updated)
    selectedIds.forEach((id) => window.api?.pauseDownload?.(id))
    setLastUpdated(Date.now())
  }, [])

  const handleCopyUrl = useCallback((item) => {
    navigator.clipboard.writeText(item.url).catch((err) => console.error('Failed to copy URL:', err))
  }, [])

  const handleOpenFolder = useCallback(async (item) => {
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

      const fallbackFolders = [await window.api.getPath('downloads'), await window.api.getPath('desktop')]
      fallbackFolders.forEach((path) => {
        if (!allPathsToSearch.includes(path)) allPathsToSearch.push(path)
      })

      const subDir = item.downloadType === 'audio' ? 'Audio' : 'Video'
      const directories = allPathsToSearch.map((path) => `${path}/PNUT Downloader/${subDir}`)

      for (const dir of directories) {
        try {
          await window.api.createDirectory(dir)
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
  }, [])

  const handleThumbnailClick = useCallback(async (item) => {
    window.api?.trackEvent?.('play', { playUrl: item.url })
    if (!item.isCompleted || item.status !== 'Completed') return

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

    try {
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
        try {
          await window.api.accessFile(filePath)
        } catch (accessError) {
          alert(`Cannot access file: ${filePath}. It may have been moved or deleted.`)
          return
        }

        try {
          if (window.api.openPath) {
            await window.api.openPath(filePath)
          } else {
            const encodedPath = encodeURI(filePath.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/%/g, '%25')
            const fileUrl = `file:///${encodedPath}`
            await window.api.openExternal(fileUrl)
          }
        } catch (openError) {
          alert(`Failed to open file: ${openError.message}. Path: ${filePath}`)
        }
      } else {
        for (const dir of directories) {
          try {
            await window.api.createDirectory(dir)
            if (window.api.openPath) {
              await window.api.openPath(dir)
            } else {
              const encodedPath = encodeURI(dir.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/%/g, '%25')
              const folderUrl = `file:///${encodedPath}`
              await window.api.openExternal(folderUrl)
            }
            break
          } catch (openDirError) {
            console.warn('Failed to open folder fallback:', openDirError)
          }
        }

        alert('File not found. Folder opened so you can locate it manually. It may have been renamed, moved, or saved in a playlist folder.')
      }
    } catch (error) {
      console.error('Error in handleThumbnailClick:', error)
      alert('Failed to process file. Please check the console for details.')
    }
  }, [])

  return {
    getThumbnailUrl,
    handleDeleteAll,
    handleDeleteItem,
    handleDeleteSelected,
    handleCopyUrl,
    handleOpenFolder,
    handleThumbnailClick,
    lastUpdated,
    downloadListData,
  }
}

export default useDownloadListVM
