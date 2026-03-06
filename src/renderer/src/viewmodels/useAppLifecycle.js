import { useCallback, useEffect, useRef, useState } from 'react'

const useAppLifecycle = ({ onDetectedUrlDownload } = {}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [dependencyProgressText, setDependencyProgressText] = useState('')
  const dependencyLastProgressAtRef = useRef(0)
  const [urlDetectionModalOpen, setUrlDetectionModalOpen] = useState(false)
  const [detectedUrl, setDetectedUrl] = useState('')
  const [isUrlDownloading, setIsUrlDownloading] = useState(false)

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

        if (window.api.onDownloadProgress) {
          try {
            window.api.onDownloadProgress((progressData) => {
              try {
                dependencyLastProgressAtRef.current = Date.now()
                const downloadedBytes = Number(progressData?.downloadedBytes || 0)
                const totalBytes = progressData?.totalBytes ? Number(progressData.totalBytes) : null
                const speedBps = progressData?.speedBps ? Number(progressData.speedBps) : null

                const formatBytes = (bytes) => {
                  if (!Number.isFinite(bytes)) return '0 B'
                  const units = ['B', 'KB', 'MB', 'GB', 'TB']
                  let v = bytes
                  let i = 0
                  while (v >= 1024 && i < units.length - 1) {
                    v /= 1024
                    i++
                  }
                  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
                }

                const speedStr = speedBps && Number.isFinite(speedBps) ? `${formatBytes(speedBps)}/s` : ''
                if (totalBytes && Number.isFinite(totalBytes) && totalBytes > 0) {
                  const pct = Math.min((downloadedBytes / totalBytes) * 100, 100)
                  setDependencyProgressText(
                    `Downloading dependencies: ${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)} (${pct.toFixed(
                      1
                    )}%)${speedStr ? ` @ ${speedStr}` : ''}`
                  )
                } else {
                  setDependencyProgressText(
                    `Downloading dependencies: ${formatBytes(downloadedBytes)}${speedStr ? ` @ ${speedStr}` : ''}`
                  )
                }
              } catch (err) {
                setDependencyProgressText('Downloading dependencies...')
              }
            })
          } catch {
            // ignore
          }
        }

        const checkDependencies = async () => {
          try {
            const status = await window.api.checkDependencies()
            if (status.ready) {
              const now = Date.now()
              const lastProgressAt = dependencyLastProgressAtRef.current
              const hasRecentProgress = lastProgressAt && now - lastProgressAt < 3000

              if (hasRecentProgress) {
                setTimeout(checkDependencies, 2000)
              } else {
                setIsLoading(false)
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
          console.warn('onVideoUrlDetected is not available. Please restart the app for URL detection to work.')
        }
      } catch (error) {
        console.error('App initialization error:', error)
        setIsLoading(false)
      }
    }

    initializeApp()

    return () => {
      if (window.api && typeof window.api.removeVideoUrlDetectedListener === 'function') {
        window.api.removeVideoUrlDetectedListener()
      }
    }
  }, [])

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
    urlDetectionModalOpen,
    detectedUrl,
    isUrlDownloading,
    handleUrlDetectionClose,
    handleUrlDetectionDownload,
    setUrlDetectionModalOpen,
    setDetectedUrl,
  }
}

export default useAppLifecycle
