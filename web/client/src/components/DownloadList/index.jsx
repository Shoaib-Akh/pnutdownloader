import React, { useState, useEffect } from 'react'
import { FaDownload, FaPause, FaPlay, FaTrash, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa'
import { Button, ProgressBar } from 'react-bootstrap'
import MediaThumbnail from './MediaThumbnail'
import '../common.css'
import { downloadAPI } from '../../services/api'

function DownloadList({ downloads, progressMap, onPause, onResume, onCancel }) {
  const [expandedItems, setExpandedItems] = useState(new Set())

  const toggleExpanded = (downloadId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(downloadId)) {
        newSet.delete(downloadId)
      } else {
        newSet.add(downloadId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'downloading':
        return <FaSpinner className="spinning" />
      case 'completed':
        return <FaCheck style={{ color: '#28a745' }} />
      case 'paused':
        return <FaPause style={{ color: '#ffc107' }} />
      case 'error':
        return <FaTimes style={{ color: '#dc3545' }} />
      case 'cancelled':
        return <FaTimes style={{ color: '#6c757d' }} />
      default:
        return <FaDownload />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading':
        return '#007bff'
      case 'completed':
        return '#28a745'
      case 'paused':
        return '#ffc107'
      case 'error':
        return '#dc3545'
      case 'cancelled':
        return '#6c757d'
      default:
        return '#6c757d'
    }
  }

  const formatSpeed = (speed) => {
    if (!speed) return '0 B/s'
    return speed
  }

  const formatETA = (eta) => {
    if (!eta) return '--'
    return eta
  }

  const handleDownloadFile = (download) => {
    // Create download link for completed file
    if (download.status === 'completed' && download.outputPath) {
      const filename = download.outputPath.split('/').pop()
      window.open(`/api/downloads/${filename}`, '_blank')
    }
  }

  return (
    <div className="download-list">
      <h3>Active Downloads</h3>
      {downloads.length === 0 ? (
        <div className="empty-downloads">
          <p>No active downloads</p>
        </div>
      ) : (
        <div className="downloads-container">
          {downloads.map((download) => {
            const progress = progressMap[download.id] || {}
            const isExpanded = expandedItems.has(download.id)
            
            return (
              <div key={download.id} className="download-item">
                <div className="download-header">
                  <div className="download-info">
                    <div className="download-title">
                      <MediaThumbnail 
                        thumbnail={download.thumbnail} 
                        title={download.title}
                        size="small"
                      />
                      <div className="download-details">
                        <h4>{download.title}</h4>
                        <div className="download-meta">
                          <span className="download-platform">{download.platform || 'Unknown'}</span>
                          <span className="download-format">{download.selectedFormat || 'MP4'}</span>
                          <span className="download-quality">{download.selectedQuality || '1080p'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="download-status">
                      <div className="status-icon">
                        {getStatusIcon(progress.status)}
                      </div>
                      <div className="status-text" style={{ color: getStatusColor(progress.status) }}>
                        {progress.status || 'starting'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="download-progress">
                    <ProgressBar 
                      now={progress.progress || 0} 
                      variant={progress.status === 'error' ? 'danger' : 'primary'}
                      style={{ height: '8px' }}
                    />
                    <div className="progress-details">
                      <span>{Math.round(progress.progress || 0)}%</span>
                      {progress.speed && (
                        <span className="progress-speed">{formatSpeed(progress.speed)}</span>
                      )}
                      {progress.eta && (
                        <span className="progress-eta">ETA: {formatETA(progress.eta)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="download-actions">
                    {progress.status === 'downloading' && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => onPause && onPause(download.id)}
                        title="Pause"
                      >
                        <FaPause />
                      </Button>
                    )}
                    
                    {progress.status === 'paused' && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => onResume && onResume(download.id)}
                        title="Resume"
                      >
                        <FaPlay />
                      </Button>
                    )}
                    
                    {(progress.status === 'downloading' || progress.status === 'paused') && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => onCancel && onCancel(download.id)}
                        title="Cancel"
                      >
                        <FaTrash />
                      </Button>
                    )}
                    
                    {progress.status === 'completed' && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleDownloadFile(download)}
                        title="Download File"
                      >
                        <FaDownload />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => toggleExpanded(download.id)}
                      title="Details"
                    >
                      {isExpanded ? '−' : '+'}
                    </Button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="download-details-expanded">
                    <div className="detail-row">
                      <span className="detail-label">URL:</span>
                      <span className="detail-value">{download.url}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Save Location:</span>
                      <span className="detail-value">{download.saveTo || 'Downloads'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Audio Only:</span>
                      <span className="detail-value">{download.isAudioOnly ? 'Yes' : 'No'}</span>
                    </div>
                    {download.bitrate && (
                      <div className="detail-row">
                        <span className="detail-label">Bitrate:</span>
                        <span className="detail-value">{download.bitrate}</span>
                      </div>
                    )}
                    {progress.error && (
                      <div className="detail-row error">
                        <span className="detail-label">Error:</span>
                        <span className="detail-value">{progress.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DownloadList
