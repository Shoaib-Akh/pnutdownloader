import React from 'react'

const MediaThumbnail = ({ thumbnail, title, size = 'medium' }) => {
  const sizeStyles = {
    small: { width: '40px', height: '30px' },
    medium: { width: '80px', height: '60px' },
    large: { width: '120px', height: '90px' }
  }

  const style = {
    ...sizeStyles[size],
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }

  if (thumbnail) {
    return (
      <div style={style}>
        <img
          src={thumbnail}
          alt={title || 'Thumbnail'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>
    )
  }

  return (
    <div style={style}>
      <div style={{
        color: '#666',
        fontSize: size === 'small' ? '12px' : '14px',
        textAlign: 'center'
      }}>
        No Image
      </div>
    </div>
  )
}

export default MediaThumbnail
