import React from 'react'
import { FaDownload, FaList, FaCog, FaMoon, FaSun, FaCookie } from 'react-icons/fa'
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap'

const Navbar = ({ 
  downloadListOpen, 
  setDownloadListOpen, 
  theme, 
  toggleTheme,
  downloadType,
  setDownloadType,
  quality,
  setQuality,
  format,
  setFormat,
  bitrate,
  setBitrate,
  saveTo,
  setSaveTo
}) => {
  
  const openCookieExtractor = () => {
    window.open('/cookies/extract', '_blank', 'width=800,height=700');
  }
  return (
    <BootstrapNavbar bg="light" expand="lg" className="custom-navbar">
      <Container fluid>
        <BootstrapNavbar.Brand href="#" className="d-flex align-items-center">
          <FaDownload className="me-2" style={{ color: '#ff6b6b' }} />
          <span style={{ fontWeight: 'bold', color: '#ff6b6b' }}>PNUT Downloader</span>
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              href="#" 
              active={!downloadListOpen}
              onClick={() => setDownloadListOpen(false)}
            >
              Home
            </Nav.Link>
            <Nav.Link 
              href="#" 
              active={downloadListOpen}
              onClick={() => setDownloadListOpen(true)}
            >
              <FaList className="me-1" />
              Downloads
            </Nav.Link>
          </Nav>

          <Nav className="align-items-center">
            {/* Download Type */}
            <div className="nav-control-group me-3">
              <label className="nav-label">Type:</label>
              <select 
                value={downloadType} 
                onChange={(e) => setDownloadType(e.target.value)}
                className="nav-select"
              >
                <option value="Video">Video</option>
                <option value="Audio">Audio</option>
              </select>
            </div>

            {/* Quality */}
            {downloadType === 'Video' && (
              <div className="nav-control-group me-3">
                <label className="nav-label">Quality:</label>
                <select 
                  value={quality} 
                  onChange={(e) => setQuality(e.target.value)}
                  className="nav-select"
                >
                  <option value="4320p">8K</option>
                  <option value="2160p">4K</option>
                  <option value="1440p">1440p</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>
            )}

            {/* Format */}
            <div className="nav-control-group me-3">
              <label className="nav-label">Format:</label>
              <select 
                value={format} 
                onChange={(e) => setFormat(e.target.value)}
                className="nav-select"
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                {downloadType === 'Video' && <option value="avi">AVI</option>}
                {downloadType === 'Video' && <option value="mov">MOV</option>}
              </select>
            </div>

            {/* Bitrate for Audio */}
            {downloadType === 'Audio' && (
              <div className="nav-control-group me-3">
                <label className="nav-label">Bitrate:</label>
                <select 
                  value={bitrate} 
                  onChange={(e) => setBitrate(e.target.value)}
                  className="nav-select"
                >
                  <option value="64k">64k</option>
                  <option value="128k">128k</option>
                  <option value="192k">192k</option>
                  <option value="256k">256k</option>
                  <option value="320k">320k</option>
                </select>
              </div>
            )}

            {/* Cookie Extractor */}
            <Button
              variant="outline-warning"
              size="sm"
              onClick={openCookieExtractor}
              className="me-3"
              title="Extract YouTube cookies for high-quality downloads"
            >
              <FaCookie />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={toggleTheme}
              className="me-3"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <FaMoon /> : <FaSun />}
            </Button>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  )
}

export default Navbar
