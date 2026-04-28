import React from 'react'
import { Modal, Button } from 'react-bootstrap'
import '../common.css'

function AboutUs({ show, onHide }) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      keyboard={false}
      size="lg"
    >
      <Modal.Header className="custom-modal-header">
        <Modal.Title className="custom-modal-title">
          About PNUT Downloader
        </Modal.Title>
        <button
          type="button"
          className="custom-close-button"
          onClick={onHide}
          aria-label="Close"
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body className="custom-modal-body">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: 'var(--accent-color)', marginBottom: '20px' }}>
            PNUT Downloader
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Your favorite video downloader - now available on the web!
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>
            Features
          </h4>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>Download from multiple platforms (YouTube, TikTok, Facebook, Instagram, and more)</li>
            <li>Multiple format support (MP4, WebM, MP3, WAV, AVI, MOV)</li>
            <li>High-quality video downloads up to 8K</li>
            <li>Audio extraction with various bitrate options</li>
            <li>Playlist download support</li>
            <li>Real-time download progress</li>
            <li>Dark and light theme support</li>
            <li>Responsive design for all devices</li>
          </ul>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>
            Supported Platforms
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '14px' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              YouTube
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              TikTok
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              Facebook
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              Instagram
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              Twitter/X
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              Twitch
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              Dailymotion
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              SoundCloud
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
              Bilibili
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>
            Version Information
          </h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Web Version: 1.0.0<br />
            Based on PNUTDownloader Desktop Application
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>
            Open Source
          </h4>
          <p style={{ color: 'var(--text-secondary)' }}>
            This project is open source and available on GitHub. 
            Contributions are welcome!
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer className="custom-modal-footer">
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AboutUs
