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
  const extractVideoId = (url) => {
    // Handle full YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID)
    const fullUrlMatch = url.match(/[?&]v=([^&]+)/);
    if (fullUrlMatch) return fullUrlMatch[1];
  
    // Handle shortened YouTube URL (https://youtu.be/VIDEO_ID)
    const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortUrlMatch) return shortUrlMatch[1];
  
    // Handle embedded YouTube URL (https://www.youtube.com/embed/VIDEO_ID)
    const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
    if (embedUrlMatch) return embedUrlMatch[1];
  
    // If no match, return null
    return null;
  };
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
      // Read text from clipboard
      const clipboardText = await navigator.clipboard.readText();

      // Check if the clipboard text is a valid URL
      if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
        // Extract video ID from the URL
        const videoId = extractVideoId(clipboardText);

        if (!videoId) {
          alert('The URL does not contain a valid video ID.');
          return;
        }

        // Retrieve stored downloads from localStorage
        let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];

        // Check if the video ID already exists in the download list
        const existingDownload = storedDownloads.some((item) => extractVideoId(item.url) === videoId);

        if (existingDownload) {
          // Show a warning message if the video ID already exists
          if (!window.alertShown) {
            window.api.showMessageBox({
              type: 'warning',
              title: 'Duplicate Download',
              message: 'This video is already in the download list.',
            });
            window.alertShown = true;
            setTimeout(() => (window.alertShown = false), 1000); // Reset the flag after 1 second
          }
          return; // Exit the function if the video ID already exists
        }

        // If the video ID does not exist, set the URL as the pastLinkUrl
        setPastLinkUrl(clipboardText);
      } else {
        // Show an alert if the clipboard content is not a valid URL
        alert('Copied content is not a valid URL.');
      }
    } catch (error) {
      console.error('Failed to read clipboard: ', error);
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
