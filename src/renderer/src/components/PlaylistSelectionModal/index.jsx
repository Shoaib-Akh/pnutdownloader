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
      className="pnut-modal playlist-selection-modal"
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

      <Modal.Body className="custom-modal-body playlist-selection-modal__body">
        <div className="playlist-selection-modal__top">
          <div className="playlist-selection-modal__playlist-title">
            {playlist?.playlistTitle || playlist?.title || 'Playlist'}
          </div>
          <div className="playlist-selection-modal__select-all">
            <span>{`Select all (${selectedCount}/${totalCount})`}</span>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={isLoading || totalCount === 0}
            />
          </div>
        </div>

        <div className="playlist-selection-modal__list">
          {items.map((v) => {
            const checked = !!v.videoId && selectedIds.has(v.videoId)
            return (
              <div
                key={v.videoId || v.position || v.title}
                className="playlist-selection-modal__item"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => v.videoId && toggleOne(v.videoId)}
                  disabled={isLoading || !v.videoId}
                />

                <div className="playlist-selection-modal__thumb">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" />
                  ) : null}
                </div>

                <div className="playlist-selection-modal__item-title">
                  {v.title || 'Untitled'}
                </div>
              </div>
            )
          })}

          {items.length === 0 ? (
            <div className="playlist-selection-modal__empty">No videos found in this playlist.</div>
          ) : null}
        </div>
      </Modal.Body>

      <Modal.Footer className="custom-modal-footer">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
          className="custom-cancel-button"
        >
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
