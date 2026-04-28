import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button } from 'react-bootstrap'
import '../common.css'

function PlaylistSelectionModal({ show, onHide, playlistData, onDownload, loading = false }) {
  const items = playlistData || []

  const [selectedIds, setSelectedIds] = useState(() => new Set())

  useEffect(() => {
    if (show) {
      setSelectedIds(new Set())
    }
  }, [show, items])

  const selectedCount = selectedIds.size
  const totalCount = items.length

  const allSelected = useMemo(() => {
    if (totalCount === 0) return false
    return selectedCount === totalCount
  }, [selectedCount, totalCount])

  const toggleOne = (videoId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(videoId)) next.delete(videoId)
      else next.add(videoId)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === totalCount) return new Set()
      return new Set(items.map((v) => v.id || v.videoId).filter(Boolean))
    })
  }

  const handleDownload = () => {
    const selected = items.filter((v) => (v.id || v.videoId) && selectedIds.has(v.id || v.videoId))
    if (onDownload) onDownload(selected)
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      keyboard={false}
      aria-labelledby="playlist-selection-modal-title"
      role="dialog"
      size="lg"
      animation={true}
    >
      <Modal.Header className="custom-modal-header">
        <Modal.Title id="playlist-selection-modal-title" className="custom-modal-title">
          Playlist Selection
        </Modal.Title>
        <button
          type="button"
          className="custom-close-button"
          onClick={onHide}
          aria-label="Close"
          disabled={loading}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body className="custom-modal-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>Playlist Videos ({totalCount})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#666' }}>{`Select All (${selectedCount}/${totalCount})`}</div>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={loading || totalCount === 0} />
          </div>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          {items.map((v) => {
            const videoId = v.id || v.videoId
            const checked = !!videoId && selectedIds.has(videoId)
            return (
              <div
                key={videoId || v.position || v.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderBottom: '1px solid #f2f2f2',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => videoId && toggleOne(videoId)}
                  disabled={loading || !videoId}
                />

                <div style={{ width: 52, height: 38, flex: '0 0 auto', borderRadius: 6, overflow: 'hidden', background: '#f3f3f3' }}>
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.title || 'Untitled'}
                  </div>
                  {v.duration && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {v.duration}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {items.length === 0 ? (
            <div style={{ padding: 14, color: '#666' }}>No videos found in this playlist.</div>
          ) : null}
        </div>
      </Modal.Body>

      <Modal.Footer className="custom-modal-footer">
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleDownload} disabled={loading || selectedIds.size === 0} className="custom-login-button">
          Download {selectedCount > 0 ? `(${selectedCount})` : ''}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default PlaylistSelectionModal
