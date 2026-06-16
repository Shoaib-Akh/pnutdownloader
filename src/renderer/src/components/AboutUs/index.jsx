import { useEffect, useState } from 'react'
import Logo from '../../assets/Images/logoB.png'
import UpdateNotification from '../UpdateNotification' // adjust path if needed
import '../common.css'
import {
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaExclamationTriangle,
  FaFacebook,
  FaFileContract,
  FaHeart,
  FaReddit,
  FaRocket,
  FaShieldAlt,
  FaSyncAlt,
  FaUsers,
} from 'react-icons/fa'
import { getUserStats } from '../../utils/firestoreService'

const BUSY_DEPENDENCY_STATUSES = new Set(['checking', 'downloading', 'downloaded', 'extracting', 'verifying', 'updating'])
const DEFAULT_DEPENDENCY_MESSAGE = 'Run repair if downloads fail, audio is missing, or video processing stops.'
const READY_DEPENDENCY_MESSAGE = 'Download repair is ready.'

const sanitizeDependencyMessage = (message = '') =>
  String(message)
    .replace(/yt-dlp/gi, 'download engine')
    .replace(/ffmpeg/gi, 'media processor')

const getFriendlyDependencyName = (tool) => {
  if (tool === 'ffmpeg') return 'media processor'
  if (tool === 'yt-dlp') return 'download engine'
  return 'repair tools'
}

const getFriendlyStatusLabel = (status, isBusy, hasError) => {
  if (hasError) return 'Needs attention'
  if (isBusy) return 'Repairing'
  if (status === 'ready') return 'Ready'
  return 'Ready'
}

const formatBytes = (bytes) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function AboutUs() {
  const [appVersion, setAppVersion] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [userStats, setUserStats] = useState({ totalDownloads: 0, errorCount: 0 })
  const [dependencyStatus, setDependencyStatus] = useState({
    message: DEFAULT_DEPENDENCY_MESSAGE,
    isBusy: false,
    ready: false,
  })

  const applyDependencyStatus = (status = {}) => {
    setDependencyStatus((previousStatus) => ({
      ...previousStatus,
      ...status,
      isBusy: Boolean(status.isBusy || BUSY_DEPENDENCY_STATUSES.has(status.status)),
      error: status.error ? sanitizeDependencyMessage(status.error) : status.error,
      dependencies: {
        ...(previousStatus.dependencies || {}),
        ...(status.dependencies || {}),
      },
      message: sanitizeDependencyMessage(status.message || (status.ready ? READY_DEPENDENCY_MESSAGE : DEFAULT_DEPENDENCY_MESSAGE)),
    }))
  }

  useEffect(() => {
    let removeDependencyProgressListener = null

    if (window.api) {
      window.api.getAppVersion().then((version) => {
        setAppVersion(version)
      })

      window.api.checkForUpdates()

      window.api.onUpdateAvailable((info) => {
        setUpdateAvailable(true)
        setUpdateInfo(info)
      })

      window.api.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true)
        setUpdateInfo(info)
      })

      window.api.onUpdateDownloadedProgress((progress) => {
        setDownloadProgress(progress.percent)
      })

      // Fetch user stats
      getUserStats().then((stats) => {
        if (stats) {
          setUserStats({
            totalDownloads: stats.totalDownloads || 0,
            errorCount: stats.errorCount || 0
          })
        }
      })

      if (window.api.getDependencyStatus) {
        window.api.getDependencyStatus().then((status) => {
          if (status) {
            applyDependencyStatus(status)
          }
        }).catch(() => {})
      }

      if (window.api.onDependencyProgress) {
        removeDependencyProgressListener = window.api.onDependencyProgress((status) => {
          applyDependencyStatus(status)
        })
      }
    }

    return () => {
      if (typeof removeDependencyProgressListener === 'function') {
        removeDependencyProgressListener()
      }
    }
  }, [])

  const handleInstallUpdate = () => {
    if (window.api) {
      window.api.installUpdate()
      setUpdateAvailable(false)
      setUpdateDownloaded(false)
      setUpdateInfo(null)
    }
  }

  const refreshDependencyStatus = async () => {
    if (!window.api?.checkDependencies) return

    const status = await window.api.checkDependencies()
    applyDependencyStatus({
      ...(status?.dependencyStatus || {}),
      ready: Boolean(status?.ready),
      isBusy: Boolean(status?.isBusy || status?.dependencyStatus?.isBusy),
      dependencies: {
        ffmpeg: Boolean(status?.ffmpeg),
        ytdlp: Boolean(status?.ytdlp),
        ...(status?.dependencyStatus?.dependencies || {}),
      },
      error: status?.error || status?.dependencyStatus?.error || null,
      message:
        status?.dependencyStatus?.message ||
        (status?.ready ? READY_DEPENDENCY_MESSAGE : status?.error || 'Dependency check finished.'),
    })
  }

  const runDependencyRepairStep = async (tool) => {
    if (!window.api) return

    const updater = tool === 'ffmpeg' ? window.api.updateFfmpeg : window.api.updateYtdlp
    if (typeof updater !== 'function') return

    const toolName = getFriendlyDependencyName(tool)
    applyDependencyStatus({
      status: 'checking',
      tool,
      action: 'manual-update',
      message: `Updating the ${toolName}. Keep PNUT Downloader open.`,
      isBusy: true,
      ready: false,
      error: null,
    })

    try {
      const result = await updater()
      if (!result?.success) {
        throw new Error(result?.error || result?.message || `${toolName} update failed`)
      }
      await refreshDependencyStatus()
    } catch (error) {
      applyDependencyStatus({
        status: 'failed',
        tool,
        action: 'manual-update',
        message: `The ${toolName} update failed. Check your internet connection, then try again.`,
        isBusy: false,
        ready: false,
        error: sanitizeDependencyMessage(error.message),
      })
      throw error
    }
  }

  const handleRepairDownloads = async () => {
    if (!window.api) return

    applyDependencyStatus({
      status: 'checking',
      tool: 'dependencies',
      action: 'repair',
      message: 'Repairing download support. Keep PNUT Downloader open.',
      isBusy: true,
      ready: false,
      error: null,
      percent: null,
    })

    try {
      await runDependencyRepairStep('yt-dlp')
      await runDependencyRepairStep('ffmpeg')
      await refreshDependencyStatus()
      applyDependencyStatus({
        status: 'ready',
        tool: 'dependencies',
        action: 'repair',
        message: 'Repair completed. Try your download again.',
        isBusy: false,
        ready: true,
        error: null,
        percent: 100,
      })
    } catch (error) {
      applyDependencyStatus({
        status: 'failed',
        tool: 'dependencies',
        action: 'repair',
        message: 'Repair did not finish. Check your internet connection, then try again.',
        isBusy: false,
        ready: false,
        error: sanitizeDependencyMessage(error.message),
      })
    }
  }

  const dependencyPercent = Number(dependencyStatus.percent)
  const hasDependencyPercent = Number.isFinite(dependencyPercent)
  const hasDependencyError = Boolean(dependencyStatus.error || dependencyStatus.status === 'failed')
  const dependencyBusy = Boolean(dependencyStatus.isBusy)
  const dependencyStatusLabel = getFriendlyStatusLabel(dependencyStatus.status, dependencyBusy, hasDependencyError)
  const showDependencyBytes =
    Number.isFinite(Number(dependencyStatus.downloadedBytes)) && Number.isFinite(Number(dependencyStatus.totalBytes)) && Number(dependencyStatus.totalBytes) > 0

  return (
    <section
      className="py-2 pe-4 d-flex flex-column about-us-section"
      style={{
        width: '100%',
        minHeight: '100vh',
        maxHeight: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Show update pop-up if update is available */}
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

      <div className="text-center mb-3">
        <div className="mb-3 mt-2 pt-1">
          <img src={Logo} alt="PNUT Downloader Logo" style={{ height: '50px', marginBottom: '10px' }} />
        </div>
        <h1 className="display-4 fw-bold text-dark mb-2" style={{ fontSize: 22, color: 'var(--pnut-text)' }}>
          About PNUT
        </h1>
        <h4 className="lead text-muted col-md-10 mx-auto" style={{ fontSize: 15, lineHeight: 1.4 }}>
          PNUT Downloader helps you save videos, music, and playlists from supported sites.
        </h4>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-12">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '15px', background: 'var(--pnut-surface)' }}>
            <div className="card-body p-3 d-flex justify-content-around align-items-center">
              <div className="text-center">
                <h3 className="h6 text-muted mb-1 text-uppercase fw-bold">Total Downloads</h3>
                <div className="h2 fw-bold" style={{ color: 'var(--pnut-brand)' }}>{userStats.totalDownloads}</div>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--pnut-border)' }}></div>
              <div className="text-center">
                <h3 className="h6 text-muted mb-1 text-uppercase fw-bold">Download Errors</h3>
                <div className="h2 fw-bold" style={{ color: 'var(--pnut-danger)' }}>{userStats.errorCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-3">
        <div className="col-md-6 mt-2">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '15px', transition: 'transform 0.3s ease', }}>
            <div className="card-body p-3">
              <div className="mb-2">
                <FaRocket style={{ fontSize: '1.5rem', color: 'var(--pnut-brand)' }} />
              </div>
              <h2 className="h5 fw-semibold text-dark mb-2">Mission</h2>
              <p className="text-muted small" style={{ lineHeight: 1.6 }}>
                Make downloading media simple, fast, and clear without hiding important settings.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 mt-2">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '15px', transition: 'transform 0.3s ease', background: 'var(--pnut-surface-raised)' }}>
            <div className="card-body p-3">
              <div className="mb-2">
                <FaUsers style={{ fontSize: '1.5rem', color: 'var(--pnut-brand)' }} />
              </div>
              <h2 className="h5 fw-semibold text-dark mb-2">Built for</h2>
              <p className="text-muted small" style={{ lineHeight: 1.6 }}>
                Creators, students, and everyday users who need a reliable desktop downloader.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-3">
        <div className="col-md-12">
          <div
            className="card border-0 shadow-sm"
            style={{
              borderRadius: '8px',
              background: 'var(--pnut-surface)',
              border: '1px solid var(--pnut-border)',
              overflow: 'hidden',
            }}
          >
            <div className="card-body p-3" style={{ background: 'linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.08), transparent 58%)' }}>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div style={{ minWidth: 240, flex: 1 }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    {hasDependencyError ? (
                      <FaExclamationTriangle style={{ color: 'var(--pnut-danger)' }} />
                    ) : dependencyBusy ? (
                      <FaSyncAlt style={{ color: 'var(--pnut-brand)' }} />
                    ) : (
                      <FaCheckCircle style={{ color: 'var(--pnut-success)' }} />
                    )}
                    <h2 className="h5 fw-semibold text-dark mb-0">Repair Downloads</h2>
                  </div>
                  <p className="text-muted small mb-2" style={{ lineHeight: 1.5, maxWidth: 560 }}>
                    Run this once if downloads fail, audio is missing, or video processing stops.
                  </p>
                  <p
                    className="small mb-0"
                    style={{
                      color: hasDependencyError ? 'var(--pnut-danger)' : 'var(--pnut-muted)',
                      lineHeight: 1.5,
                      fontWeight: hasDependencyError ? 700 : 500,
                    }}
                  >
                    {dependencyStatus.message}
                    {hasDependencyError && dependencyStatus.error ? ` Error: ${dependencyStatus.error}` : ''}
                  </p>
                </div>

                <div className="d-flex flex-column align-items-stretch gap-2" style={{ minWidth: 210 }}>
                  <button
                    className="btn px-3"
                    type="button"
                    disabled={dependencyBusy}
                    onClick={handleRepairDownloads}
                    style={{
                      minHeight: 42,
                      background: 'var(--pnut-button-bg)',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 800,
                      borderRadius: '8px',
                      color: 'var(--pnut-button-text)',
                      boxShadow: 'var(--pnut-shadow-sm)',
                      opacity: dependencyBusy ? 0.65 : 1,
                    }}
                  >
                    {dependencyBusy ? <FaSyncAlt className="me-2" /> : <FaDownload className="me-2" />}
                    {dependencyBusy ? 'Repairing...' : 'Repair Downloads'}
                  </button>
                  <span className="small text-center" style={{ color: 'var(--pnut-muted)', fontSize: 11 }}>
                    Keep the app open until repair finishes.
                  </span>
                </div>
              </div>

             
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 row align-items-start">
        <div className="col-md-6 d-flex flex-column justify-content-center align-items-center">
          <h2 className="h5 fw-semibold text-dark mt-2" style={{ fontSize: 18, color: 'var(--pnut-text)' }}>
            Community
          </h2>
          <p className="text-muted mb-2 small">Join the community and stay updated.</p>
          <h3 className="mb-2" style={{ fontSize: 14, color: 'var(--pnut-brand)' }}>
            Current Version: <b>{appVersion}</b>
          </h3>

          <div className="d-flex flex-column gap-2 mb-3 align-items-center">
            <button
              className="btn px-3"
              style={{ background: 'var(--pnut-button-bg)', border: 'none', fontSize: 13, width: 160, borderRadius: '8px', boxShadow: 'var(--pnut-shadow-sm)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'var(--pnut-button-text)' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--pnut-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--pnut-shadow-sm)';
              }}
              onClick={() => window.api && window.api.checkForUpdates()}
            >
              Check for Update
            </button>

            <button
              className="btn px-3"
              style={{ background: '#ff4500', border: 'none', fontSize: 13, width: 220, borderRadius: '8px', boxShadow: '0 4px 12px rgba(255, 69, 0, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(255, 69, 0, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 69, 0, 0.25)';
              }}
              type="button"
              aria-label="Join our Reddit community"
              onClick={() => {
                if (window.api?.openExternal) {
                  window.api.trackEvent('Join our Reddit community')
                  window.api.openExternal('https://www.reddit.com/r/PNutDownloader/s/DEDPXcvWgS');
                } else {
                  window.open('https://www.reddit.com/r/PNutDownloader/s/DEDPXcvWgS', '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <FaReddit className="me-2" />
              Join Our Reddit Community
            </button>

            <button
              className="btn px-3"
              style={{ background: '#1877f2', border: 'none', fontSize: 13, width: 220, borderRadius: '8px', boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(24, 119, 242, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.25)';
              }}
              type="button"
              aria-label="Visit our Facebook page"
              onClick={() => {
                if (window.api?.openExternal) {
                  window.api.trackEvent('Visit Facebook page')
                  window.api.openExternal('https://www.facebook.com/PNUTDownloader');
                } else {
                  window.open('https://www.facebook.com/PNUTDownloader', '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <FaFacebook className="me-2" />
              Follow on Facebook
            </button>
          </div>
        </div>

        <div className="col-md-6 d-flex flex-column justify-content-center align-items-center" style={{ cursor: 'default' }}>
          <h3 className="mb-2" style={{ fontSize: 16, fontWeight: '600', color: 'var(--pnut-text)' }}>Quick Links</h3>
          <div className="d-flex flex-column gap-2">
            <button
              onClick={() => {
                if (window.api) {
                  window.api.trackEvent('feedback_button_clicked')
                  window.api.openExternal(
                    'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform?edit_requested=true'
                  )
                }
              }}
              className="btn px-3"
              style={{ background: 'var(--pnut-button-bg)', border: 'none', fontSize: 13, width: 160, borderRadius: '8px', boxShadow: 'var(--pnut-shadow-sm)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'var(--pnut-button-text)' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--pnut-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--pnut-shadow-sm)';
              }}
            >
              <FaEnvelope className="me-2" />
              Contact us
            </button>
            <button
              className="btn px-3"
              style={{ background: 'var(--pnut-surface)', border: '1px solid var(--pnut-border)', fontSize: 13, width: 200, borderRadius: '8px', boxShadow: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'var(--pnut-text)', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--pnut-shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
              onClick={() => {
                if (window.api) {
                  window.api.openExternal(
                    'https://pnutdownloader.com/privacy-policy/'
                  )
                }
              }}
            >
              <FaShieldAlt className="me-2" />
              Privacy Policy
            </button>
            <button
              className="btn px-3"
              style={{ background: 'var(--pnut-surface)', border: '1px solid var(--pnut-border)', fontSize: 13, width: 200, borderRadius: '8px', boxShadow: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'var(--pnut-text)', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--pnut-shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
              onClick={() => {
                if (window.api) {
                  window.api.openExternal(
                    'https://pnutdownloader.com/terms-of-services/'
                  )
                }
              }}
            >
              <FaFileContract className="me-2" />
              Terms and conditions
            </button>
          </div>
        </div>
      </div>

      {/* Copyright notice pushed to the bottom */}
      <div className="text-center mt-3 mb-2">
        <div className="mb-1">
          <p className="mb-1" style={{ fontSize: 12, color: 'var(--pnut-muted)' }}>
            Made with <FaHeart style={{ color: 'var(--pnut-danger)' }} /> by the PNUT Team
          </p>
        </div>
        <p style={{ fontSize: 11, color: 'var(--pnut-muted)', margin: 0 }}>
          Copyright 2025 PNUT Downloader. All Rights Reserved.
        </p>
      </div>
    </section>
  )
}

export default AboutUs
