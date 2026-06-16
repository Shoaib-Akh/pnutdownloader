import PropTypes from 'prop-types'
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaSyncAlt,
  FaTools
} from 'react-icons/fa'
import './DependencyLoader.css'

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

const getDependencyState = (dependencyStatus, tool) => {
  if (dependencyStatus?.tool === tool && dependencyStatus?.isBusy) return 'working'
  if (dependencyStatus?.tool === tool && dependencyStatus?.status === 'failed') return 'failed'
  if (dependencyStatus?.dependencies?.[tool === 'yt-dlp' ? 'ytdlp' : tool]) return 'ready'
  if (dependencyStatus?.ready) return 'ready'
  return 'pending'
}

const DependencyLoader = ({
  dependencyStatus,
  progressText,
  onUpdateYtdlp,
  onUpdateFfmpeg,
  onRetry
}) => {
  const status = dependencyStatus || {}
  const percent = Number(status.percent)
  const hasPercent = Number.isFinite(percent)
  const isBusy = status.isBusy !== false && status.status !== 'failed'
  const isFailed = status.status === 'failed'
  const message = progressText || status.message || 'Preparing download dependencies...'
  const totalBytes = Number(status.totalBytes)
  const downloadedBytes = Number(status.downloadedBytes)
  const speedBps = Number(status.speedBps)
  const showByteProgress =
    Number.isFinite(totalBytes) && totalBytes > 0 && Number.isFinite(downloadedBytes)
  const showSpeed = Number.isFinite(speedBps) && speedBps > 0

  const dependencyItems = [
    {
      key: 'yt-dlp',
      title: 'Video Downloader',
      subtitle: 'Used to download videos from various platforms'
    },
    {
      key: 'ffmpeg',
      title: 'Media Processor',
      subtitle: 'Converts and merges downloaded media files'
    }
  ]

  return (
    <div className="dependency-loader" role="status" aria-live="polite">
      <div className="dependency-loader__panel">
        <div className="dependency-loader__header">
          <div
            className={`dependency-loader__icon${isBusy ? ' dependency-loader__icon--busy' : ''}`}
            aria-hidden="true"
          >
            {isFailed ? <FaExclamationTriangle /> : isBusy ? <FaSyncAlt /> : <FaCheckCircle />}
          </div>
          <div>
            <p className="dependency-loader__eyebrow">
              {isFailed ? 'Dependency attention needed' : 'Dependency setup'}
            </p>
            <h1>{isFailed ? 'Setup needs your help' : 'Preparing PNUT Downloader'}</h1>
          </div>
        </div>

        {/* <p className="dependency-loader__message">{message}</p> */}
        <p className="dependency-loader__stay-open">
          Please keep PNUT Downloader open while dependencies are being checked, downloaded, or
          updated.
        </p>

        <div className="dependency-loader__progress">
          {/* <div className="dependency-loader__progress-top">
            <span>{status.status ? status.status.replace('-', ' ') : 'working'}</span>
            <strong>{hasPercent ? `${Math.round(percent)}%` : 'Dependencies'}</strong>
          </div> */}
          <div className="dependency-loader__bar" aria-hidden="true">
            <div
              className={`dependency-loader__bar-fill${hasPercent ? '' : ' dependency-loader__bar-fill--indeterminate'}`}
              style={hasPercent ? { width: `${Math.min(Math.max(percent, 0), 100)}%` } : undefined}
            />
          </div>
          {(showByteProgress || showSpeed) && (
            <div className="dependency-loader__meta">
              {showByteProgress && (
                <span>
                  {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                </span>
              )}
              {showSpeed && <span>{formatBytes(speedBps)}/s</span>}
            </div>
          )}
        </div>

        {/* <div className="dependency-loader__grid">
          {dependencyItems.map((item) => {
            const itemState = getDependencyState(status, item.key)
            return (
              <div
                className={`dependency-loader__item dependency-loader__item--${itemState}`}
                key={item.key}
              >
                <div className="dependency-loader__item-icon" aria-hidden="true">
                  {itemState === 'ready' ? (
                    <FaCheckCircle />
                  ) : itemState === 'failed' ? (
                    <FaExclamationTriangle />
                  ) : (
                    <FaTools />
                  )}
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {itemState === 'ready'
                      ? 'Ready'
                      : itemState === 'working'
                        ? 'Working'
                        : item.subtitle}
                  </span>
                </div>
              </div>
            )
          })}
        </div> */}

        {/* <div className="dependency-loader__actions">
          <button
            type="button"
            onClick={onUpdateYtdlp}
            disabled={isBusy}
            className="dependency-loader__button"
          >
            <FaDownload aria-hidden="true" />
            Update Video Downloader
          </button>
          <button
            type="button"
            onClick={onUpdateFfmpeg}
            disabled={isBusy}
            className="dependency-loader__button"
          >
            <FaDownload aria-hidden="true" />
            Update Media Processor
          </button>
          <button
            type="button"
            onClick={onRetry}
            disabled={isBusy}
            className="dependency-loader__button dependency-loader__button--secondary"
          >
            <FaSyncAlt aria-hidden="true" />
            Check Again
          </button>
        </div> */}
      </div>
    </div>
  )
}

DependencyLoader.propTypes = {
  dependencyStatus: PropTypes.shape({
    action: PropTypes.string,
    dependencies: PropTypes.shape({
      ffmpeg: PropTypes.bool,
      ytdlp: PropTypes.bool
    }),
    downloadedBytes: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    error: PropTypes.string,
    isBusy: PropTypes.bool,
    message: PropTypes.string,
    percent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ready: PropTypes.bool,
    speedBps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    status: PropTypes.string,
    tool: PropTypes.string,
    totalBytes: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }),
  onRetry: PropTypes.func,
  onUpdateFfmpeg: PropTypes.func,
  onUpdateYtdlp: PropTypes.func,
  progressText: PropTypes.string
}

DependencyLoader.defaultProps = {
  dependencyStatus: null,
  onRetry: undefined,
  onUpdateFfmpeg: undefined,
  onUpdateYtdlp: undefined,
  progressText: ''
}

export default DependencyLoader
