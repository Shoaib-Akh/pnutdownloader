import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button } from 'react-bootstrap'
import '../common.css'

function PlaylistSelectionModal({ isOpen, onClose, onConfirm, playlist, isLoading = false }) {
  const items = playlist?.videos || []

  const [selectedIds, setSelectedIds] = useState(() => new Set())

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set())
    }
  }, [isOpen, items])

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
      return new Set(items.map((v) => v.videoId).filter(Boolean))
    })
  }

  const handleConfirm = () => {
    const selected = items.filter((v) => v.videoId && selectedIds.has(v.videoId))
    if (onConfirm) onConfirm(selected)
  }

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
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
          Choose playlist items
        </Modal.Title>
        <button
          type="button"
          className="custom-close-button"
          onClick={onClose}
          aria-label="Close"
          disabled={isLoading}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body className="custom-modal-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>{playlist?.playlistTitle || playlist?.title || 'Playlist'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--pnut-muted)' }}>{`Select all (${selectedCount}/${totalCount})`}</div>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={isLoading || totalCount === 0} />
          </div>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--pnut-border)', borderRadius: 8 }}>
          {items.map((v) => {
            const checked = !!v.videoId && selectedIds.has(v.videoId)
            return (
              <div
                key={v.videoId || v.position || v.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--pnut-border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => v.videoId && toggleOne(v.videoId)}
                  disabled={isLoading || !v.videoId}
                />

                <div style={{ width: 52, height: 38, flex: '0 0 auto', borderRadius: 6, overflow: 'hidden', background: 'var(--pnut-surface-raised)' }}>
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.title || 'Untitled'}
                  </div>
                </div>
              </div>
            )
          })}

          {items.length === 0 ? (
            <div style={{ padding: 14, color: 'var(--pnut-muted)' }}>No videos found in this playlist.</div>
          ) : null}
        </div>
      </Modal.Body>

      <Modal.Footer className="custom-modal-footer">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading || selectedIds.size === 0} className="custom-login-button">
          Download selected
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default PlaylistSelectionModal
