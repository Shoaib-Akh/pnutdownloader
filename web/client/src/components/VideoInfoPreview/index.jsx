import React from 'react'
import { FaEye, FaUser, FaClock, FaCalendar } from 'react-icons/fa'
import './VideoInfoPreview.css'

const VideoInfoPreview = ({ videoInfo, loading }) => {
  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown duration'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatViewCount = (count) => {
    if (!count) return 'No views'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`
    }
    return `${count} views`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return 'Unknown date'
    }
  }

  if (loading) {
    return (
      <div className="video-info-loading">
        <div className="video-info-skeleton">
          <div className="skeleton-thumbnail"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-meta"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!videoInfo) {
    return null
  }

  return (
    <div className="video-info-preview">
      <div className="video-info-header">
        {videoInfo.thumbnail && (
          <div className="video-thumbnail">
            <img 
              src={videoInfo.thumbnail} 
              alt={videoInfo.title}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        )}
        
        <div className="video-info-content">
          <h3 className="video-title">{videoInfo.title}</h3>
          
          <div className="video-meta">
            {videoInfo.uploader && (
              <div className="meta-item">
                <FaUser className="meta-icon" />
                <span>{videoInfo.uploader}</span>
              </div>
            )}
            
            {videoInfo.view_count && (
              <div className="meta-item">
                <FaEye className="meta-icon" />
                <span>{formatViewCount(videoInfo.view_count)}</span>
              </div>
            )}
            
            {videoInfo.duration && (
              <div className="meta-item">
                <FaClock className="meta-icon" />
                <span>{formatDuration(videoInfo.duration)}</span>
              </div>
            )}
            
            {videoInfo.upload_date && (
              <div className="meta-item">
                <FaCalendar className="meta-icon" />
                <span>{formatDate(videoInfo.upload_date)}</span>
              </div>
            )}
          </div>
          
          {videoInfo.description && (
            <div className="video-description">
              <p>{videoInfo.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoInfoPreview
