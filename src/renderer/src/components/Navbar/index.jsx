import React from 'react'
import { FaPaste, FaCog, FaUser } from 'react-icons/fa'
import Logo from '../../assets/Images/logo.png'
import '../common.css'
import CustomDropdown from '../CustomDropdown'

function Navbar({
  saveTo,
  setSaveTo,
  setQuality,
  setFormat,
  quality,
  format,
  setDownloadType,
  downloadType,
  setPastLinkUrl
}) {
  // Format options based on download type
  const formatOptions = {
    Video: ['MP4', 'AVI', 'MKV'],
    Audio: ['MP3', 'FLAC', 'WAV'],
    Subtitles: ['SRT']
  }

  // Ensure format is always in sync with the selected download type
  React.useEffect(() => {
    if (downloadType && formatOptions[downloadType]) {
      setFormat(formatOptions[downloadType][0]) // Set the first format option as default
    }
  }, [downloadType, setFormat])

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light justify-content-between p-4"
      style={{ gap: 70 }}
    >
      {/* Left Side - Logo */}
      <a className="navbar-brand d-flex align-items-center" href="#" style={{ cursor: "default" }}>
        <img src={Logo} alt="PNUT Logo" className="me-2" width={150} />
      </a>

      {/* Center Section - Options */}
      <div
        className="d-flex flex-grow-1 justify-content-center shadow-sm bg-body "
        style={{ padding: 10 }}
      >
        <div className="d-flex flex-grow-1 " style={{ gap: 10 }}>
          {/* Paste Link Button */}
          <button
            className="btn btn-danger d-flex align-items-center me-3"
            style={{ background: '#BB4F28' }}
            onClick={async () => {
              try {
                const clipboardText = await navigator.clipboard.readText()
                if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
                  setPastLinkUrl(clipboardText)
                } else {
                  alert('Copied content is not a valid URL.')
                }
              } catch (error) {
                console.error('Failed to read clipboard: ', error)
              }
            }}
          >
            <FaPaste className="me-2" /> Paste Link
          </button>

          {/* Dropdown for Download Type */}
          <CustomDropdown
            label="Download"
            options={Object.keys(formatOptions)}
            selected={downloadType}
            onSelect={(value) => {
              setDownloadType(value)
            }}
          />

          {/* Quality Dropdown (Not applicable for Audio and Subtitles) */}
          {downloadType === 'Video' && (
            <CustomDropdown
              label="Quality"
              options={['1080p', '720p', '480p', '360p', '240p']}
              selected={quality}
              onSelect={setQuality}
            />
          )}

          {/* Format Dropdown - Based on Download Type */}
          {formatOptions[downloadType] && (
            <CustomDropdown
              label="Format"
              options={formatOptions[downloadType]}
              selected={format}
              onSelect={setFormat}
            />
          )}

          {/* Dropdown for Save Location */}
          <CustomDropdown
            label="Save To"
            options={['Downloads', 'Desktop']}
            selected={saveTo}
            onSelect={setSaveTo}
          />
        </div>

        {/* Right Side - Settings & Profile Icons */}
        <div className="d-flex align-items-center">
          <FaCog className="fs-5 me-3 cursor-pointer" title="Settings" />
          <FaUser className="fs-5 cursor-pointer" title="Profile" />
        </div>
      </div>
    </nav>
  )
}

export default Navbar
