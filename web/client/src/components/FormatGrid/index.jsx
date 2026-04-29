import React from 'react'
import { FaDownload, FaFileVideo, FaFileAudio, FaStar, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import './FormatGrid.css'

const FormatGrid = ({ formats, onFormatDownload, loading }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getQualityLabel = (format) => {
    // Use custom quality label if available
    if (format.qualityLabel) {
      return format.qualityLabel
    }
    // Fallback to original logic
    if (format.height) {
      return `${format.height}p${format.fps ? `@${format.fps}fps` : ''}`
    }
    return format.abr ? `${format.abr}kbps` : 'Audio'
  }

  const getFormatIcon = (format) => {
    return format.height ? FaFileVideo : FaFileAudio
  }

  const getCodecInfo = (format) => {
    const codecInfo = []
    
    if (format.video_codec_info) {
      codecInfo.push({
        type: 'video',
        name: format.video_codec_info.name,
        quality: format.video_codec_info.quality,
        compatibility: format.video_codec_info.compatibility
      })
    }
    
    if (format.audio_codec_info) {
      codecInfo.push({
        type: 'audio',
        name: format.audio_codec_info.name,
        quality: format.audio_codec_info.quality,
        compatibility: format.audio_codec_info.compatibility
      })
    }
    
    return codecInfo
  }

  const getQualityStars = (score) => {
    const stars = []
    const fullStars = Math.floor(score / 20)
    const hasHalfStar = (score % 20) >= 10
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="star-full" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStar key={i} className="star-half" />)
      } else {
        stars.push(<FaStar key={i} className="star-empty" />)
      }
    }
    
    return stars
  }

  const getCompatibilityIcon = (format) => {
    if (format.isExactMatch) {
      return <FaCheckCircle className="compatibility-perfect" title="Exact Quality Match" />
    }
    if (format.isFallback) {
      return <FaExclamationTriangle className="compatibility-fallback" title="Using Closest Available Quality" />
    }
    if (format.ffmpeg_supported) {
      return <FaCheckCircle className="compatibility-good" title="FFmpeg Compatible" />
    }
    return <FaExclamationTriangle className="compatibility-warning" title="Limited Compatibility" />
  }

  if (loading) {
    return (
      <div className="format-grid-loading">
        <div className="loading-spinner"></div>
        <p>Loading available formats...</p>
      </div>
    )
  }

  if (!formats || formats.length === 0) {
    return (
      <div className="format-grid-empty">
        <p>No formats available for this video</p>
      </div>
    )
  }

  return (
    <div className="format-grid">
      <h3 className="format-grid-title">Available Formats</h3>
      <div className="format-grid-container">
        {formats.map((format, index) => {
          const Icon = getFormatIcon(format)
          const qualityLabel = getQualityLabel(format)
          const fileSize = formatFileSize(format.filesize)
          const codecInfo = getCodecInfo(format)
          const qualityStars = getQualityStars(format.quality_score || 0)
          
          return (
            <div
              key={`${format.format_id}-${index}`}
              className="format-card enhanced"
              onClick={() => onFormatDownload(format)}
            >
              <div className="format-card-header">
                <Icon className="format-icon" />
                <span className="format-extension">{format.ext?.toUpperCase()}</span>
                {getCompatibilityIcon(format)}
              </div>
              
              <div className="format-card-body">
                <div className="format-quality">{qualityLabel}</div>
                
                {/* Quality Score */}
                <div className="format-quality-score">
                  <div className="stars">
                    {qualityStars}
                  </div>
                  <span className="score-text">{format.quality_score || 0}/100</span>
                </div>
                
                {/* Codec Information */}
                <div className="format-codecs">
                  {codecInfo.map((codec, idx) => (
                    <div key={idx} className={`codec-info ${codec.type}`}>
                      <span className="codec-name">{codec.name}</span>
                      <span className="codec-quality">{codec.quality}</span>
                    </div>
                  ))}
                </div>
                
                {/* Technical Details */}
                <div className="format-details">
                  <span className="format-filesize">{fileSize}</span>
                  <span className="format-stream-type">{format.stream_type}</span>
                  {format.hdr && (
                    <span className="format-hdr">HDR</span>
                  )}
                  {format.dynamic_range && (
                    <span className="format-dynamic-range">{format.dynamic_range}</span>
                  )}
                </div>
                
                {/* Recommended Usage */}
                {format.recommended_for && format.recommended_for.length > 0 && (
                  <div className="format-recommendations">
                    {format.recommended_for.slice(0, 2).map((rec, idx) => (
                      <span key={idx} className="recommendation-tag">{rec}</span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="format-card-footer">
                <FaDownload className="download-icon" />
                <span>Download</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FormatGrid
