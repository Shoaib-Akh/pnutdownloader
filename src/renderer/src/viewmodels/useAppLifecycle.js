import { useCallback, useEffect, useRef, useState } from 'react'

const BUSY_DEPENDENCY_STATUSES = new Set([
  'checking',
  'downloading',
  'downloaded',
  'extracting',
  'verifying',
  'updating'
])

const buildDependencyStatusFromCheck = (status) => {
  const dependencyStatus = status?.dependencyStatus || {}

  const deps = {
    ffmpeg: Boolean(status?.ffmpeg),
    ytdlp: Boolean(status?.ytdlp),
    ...(dependencyStatus.dependencies || {})
  }

  const ready =
    Boolean(status?.ready) || Boolean(dependencyStatus?.ready) || (deps.ffmpeg && deps.ytdlp)

  return {
    ...dependencyStatus,
    ready,
    // if ready, not busy
    isBusy: Boolean(status?.isBusy || dependencyStatus?.isBusy) && !ready,
    dependencies: deps,
    ffmpegSize: status?.ffmpegSize,
    ytdlpSize: status?.ytdlpSize,
    error: status?.error || dependencyStatus.error || null,
    message:
      dependencyStatus.message ||
      (ready ? 'All download dependencies are ready.' : status?.error || 'Preparing necessary tools for downloads...')
  }
}

const useAppLifecycle = ({ onDetectedUrlDownload } = {}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [dependencyProgressText, setDependencyProgressText] = useState('')
  const [dependencyStatus, setDependencyStatus] = useState({
    status: 'checking',
    tool: 'dependencies',
    action: 'startup',
    message: 'Preparing necessary tools for downloads...',
    isBusy: true,
    ready: false
  })
  const hideDependencyLoaderTimeoutRef = useRef(null)
  const [urlDetectionModalOpen, setUrlDetectionModalOpen] = useState(false)
  const [detectedUrl, setDetectedUrl] = useState('')
  const [isUrlDownloading, setIsUrlDownloading] = useState(false)

  const clearHideDependencyLoaderTimeout = useCallback(() => {
    if (hideDependencyLoaderTimeoutRef.current) {
      clearTimeout(hideDependencyLoaderTimeoutRef.current)
      hideDependencyLoaderTimeoutRef.current = null
    }
  }, [])

  const applyDependencyStatus = useCallback(
    (nextStatus = {}) => {
      const normalizedStatus = {
        ...nextStatus,
        // initial busy calculation based on status or explicit flag
        isBusy: Boolean(nextStatus.isBusy || BUSY_DEPENDENCY_STATUSES.has(nextStatus.status))
      }

      // If dependencies indicate both tools are present, consider ready
      if (normalizedStatus.dependencies && normalizedStatus.dependencies.ffmpeg && normalizedStatus.dependencies.ytdlp) {
        normalizedStatus.ready = true
        normalizedStatus.isBusy = false
      }

      setDependencyStatus((previousStatus) => ({
        ...previousStatus,
        ...normalizedStatus,
        dependencies: {
          ...(previousStatus.dependencies || {}),
          ...(normalizedStatus.dependencies || {})
        }
      }))

      if (normalizedStatus.message) {
        setDependencyProgressText(normalizedStatus.message)
      }

      if (normalizedStatus.isBusy && normalizedStatus.status !== 'ready') {
        clearHideDependencyLoaderTimeout()
        setIsLoading(true)
        return
      }

      if (normalizedStatus.status === 'failed' || normalizedStatus.error) {
        clearHideDependencyLoaderTimeout()
        setIsLoading(true)
        return
      }

      if (normalizedStatus.ready || normalizedStatus.status === 'ready') {
        clearHideDependencyLoaderTimeout()
        hideDependencyLoaderTimeoutRef.current = setTimeout(() => {
          setIsLoading(false)
        }, 700)
      }
    },
    [clearHideDependencyLoaderTimeout]
  )

  const refreshDependencyCheck = useCallback(async () => {
    if (!window.api?.checkDependencies) return null

    const status = await window.api.checkDependencies()
    const normalizedStatus = buildDependencyStatusFromCheck(status)
    applyDependencyStatus(normalizedStatus)
    return status
  }, [applyDependencyStatus])

  const runManualDependencyUpdate = useCallback(
    async (tool) => {
      if (!window.api) return

      const updater = tool === 'ffmpeg' ? window.api.updateFfmpeg : window.api.updateYtdlp
      if (typeof updater !== 'function') return

      applyDependencyStatus({
        status: 'checking',
        tool,
        action: 'manual-update',
        message: 'Preparing tool update...',
        isBusy: true,
        ready: false,
        error: null
      })

      try {
        const result = await updater()
        if (!result?.success) {
          throw new Error(result?.error || result?.message || 'Tool update failed')
        }

        await refreshDependencyCheck()
      } catch (error) {
        applyDependencyStatus({
          status: 'failed',
          tool,
          action: 'manual-update',
          message: `Tool update failed: ${error.message}`,
          isBusy: false,
          ready: false,
          error: error.message
        })
      }
    },
    [applyDependencyStatus, refreshDependencyCheck]
  )

  useEffect(() => {
    const initializeApp = async () => {
      try {
        let retries = 0
        const maxRetries = 10
        while (!window.api && retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          retries++
        }

        if (!window.api) {
          setIsLoading(false)
          return
        }

        if (window.api.getDependencyStatus) {
          try {
            const currentDependencyStatus = await window.api.getDependencyStatus()
            if (currentDependencyStatus) {
              applyDependencyStatus(currentDependencyStatus)
            }
          } catch {
            // ignore
          }
        }

        let removeDependencyProgressListener = null
        if (window.api.onDependencyProgress) {
          try {
            removeDependencyProgressListener = window.api.onDependencyProgress((status) => {
              applyDependencyStatus(status)
            })
          } catch {
            // ignore
          }
        }

        const checkDependencies = async () => {
          try {
            const status = await refreshDependencyCheck()
            if (!status) return
            if (status.ready) {
              if (status.isBusy) {
                setTimeout(checkDependencies, 2000)
              }
            } else {
              setTimeout(checkDependencies, 20000)
            }
          } catch (error) {
            console.error('Dependency check error:', error)
            setTimeout(checkDependencies, 5000)
          }
        }
        checkDependencies()

        if (window.api.checkForUpdates) {
          window.api.checkForUpdates()
        }

        if (window.api.onUpdateAvailable) {
          window.api.onUpdateAvailable((info) => {
            setUpdateAvailable(true)
            setUpdateInfo(info)
          })
        }

        if (window.api.onUpdateDownloaded) {
          window.api.onUpdateDownloaded((info) => {
            setUpdateDownloaded(true)
            setUpdateInfo(info)
          })
        }

        if (window.api.onUpdateDownloadedProgress) {
          window.api.onUpdateDownloadedProgress((progress) => {
            setDownloadProgress(progress.percent)
          })
        }

        if (window.api.onUpdateError) {
          window.api.onUpdateError((err) => {
            console.error('Update error:', err)
          })
        }

        if (window.api.onVideoUrlDetected && typeof window.api.onVideoUrlDetected === 'function') {
          window.api.onVideoUrlDetected((url) => {
            setDetectedUrl(url)
            setUrlDetectionModalOpen(true)
          })
        } else {
          console.warn(
            'onVideoUrlDetected is not available. Please restart the app for URL detection to work.'
          )
        }

        return () => {
          if (typeof removeDependencyProgressListener === 'function') {
            removeDependencyProgressListener()
          }
        }
      } catch (error) {
        console.error('App initialization error:', error)
        setIsLoading(false)
      }
    }

    const cleanupPromise = initializeApp()

    return () => {
      clearHideDependencyLoaderTimeout()
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup()
        }
      })
      if (window.api && typeof window.api.removeVideoUrlDetectedListener === 'function') {
        window.api.removeVideoUrlDetectedListener()
      }
    }
  }, [applyDependencyStatus, clearHideDependencyLoaderTimeout, refreshDependencyCheck])

  const handleInstallUpdate = useCallback(() => {
    if (!window.api) return
    try {
      window.api.trackEvent('update_install_clicked', { version: updateInfo?.version })
      window.api.installUpdate()
      setUpdateAvailable(false)
      setUpdateDownloaded(false)
      setUpdateInfo(null)
    } catch (error) {
      console.error('Failed to track update_install_clicked:', error)
    }
  }, [updateInfo])

  const handleUrlDetectionClose = useCallback(() => {
    setUrlDetectionModalOpen(false)
    setDetectedUrl('')
    setIsUrlDownloading(false)
  }, [])

  const handleUrlDetectionDownload = useCallback(async () => {
    if (!detectedUrl || !window.api) return
    setIsUrlDownloading(true)
    try {
      if (onDetectedUrlDownload) {
        onDetectedUrlDownload(detectedUrl)
      }
      setUrlDetectionModalOpen(false)
    } catch (error) {
      console.error('Error handling URL detection download:', error)
    } finally {
      setIsUrlDownloading(false)
    }
  }, [detectedUrl, onDetectedUrlDownload])

  return {
    updateAvailable,
    updateInfo,
    updateDownloaded,
    downloadProgress,
    handleInstallUpdate,
    isLoading,
    dependencyProgressText,
    dependencyStatus,
    handleManualYtdlpUpdate: () => runManualDependencyUpdate('yt-dlp'),
    handleManualFfmpegUpdate: () => runManualDependencyUpdate('ffmpeg'),
    handleDependencyRetry: refreshDependencyCheck,
    urlDetectionModalOpen,
    detectedUrl,
    isUrlDownloading,
    handleUrlDetectionClose,
    handleUrlDetectionDownload,
    setUrlDetectionModalOpen,
    setDetectedUrl
  }
}

export default useAppLifecycle
