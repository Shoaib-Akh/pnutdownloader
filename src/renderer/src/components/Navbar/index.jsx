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
  setPastLinkUrl,
  setBitrate, // New prop for setting bitrate
  bitrate // New prop for current bitrate
}) {
  // Format options based on download type
  const formatOptions = {
    Video: ['MP4', 'AVI', 'MKV'],
    Audio: ['MP3', 'FLAC', 'WAV', 'AAC', ],
    // Subtitles: ['SRT']
  }

  // Bitrate options for audio
  const bitrateOptions = ['320K','256K','192k','128k', '96k', ,'64k', ]

  // Ensure format is always in sync with the selected download type
  React.useEffect(() => {
    if (downloadType && formatOptions[downloadType]) {
      setFormat(formatOptions[downloadType][0]) // Set the first format option as default
    }
  }, [downloadType, setFormat])

  // Ensure bitrate is reset when switching away from Audio
  React.useEffect(() => {
    if (downloadType !== 'Audio') {
      setBitrate(null) // Reset bitrate when not downloading audio
    } else if (!bitrate) {
      setBitrate(bitrateOptions[3]) // Set default bitrate (64k) for audio
    }
  }, [downloadType, setBitrate, bitrate, bitrateOptions])

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
  let downloadListData = [];
  try {
    downloadListData = JSON.parse(localStorage.getItem('downloadList')) || [];
  } catch (e) {
    console.error("Failed to parse downloadList from localStorage:", e);
  }
  console.log("downloadListData", downloadListData);
  
  return (
    <nav className="navbar navbar-expand-lg navbar-light p-3">
      <div className="d-flex align-items-center w-100">
        {/* Left Side - Logo */}
        <div href="#" style={{ cursor: "default",width:"17% ", }} className= "logo-div">
          <img src={Logo} alt="PNUT Logo" className='logo' />
        </div>
  
        {/* Center Section - Options */}
        <div
          className="d-flex align-items-center justify-content-between flex-grow-1 shadow-sm bg-body"
          style={{ padding: 10,borderRadius:5 }}
        >
          <div className="d-flex" style={{ gap: 2 }}>
            {/* Paste Link Button */}
            <button
              className="btn btn-danger d-flex align-items-center me-2"
              style={{ background: '#BB4F28', fontSize: 16 }}
              onClick={async () => {
                try {
                  const clipboardText = await navigator.clipboard.readText();
                  if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
                    const videoId = extractVideoId(clipboardText);
                    if (!videoId) {
                      alert('The URL does not contain a valid video ID.');
                      return;
                    }
                    let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
                    const existingDownload = storedDownloads.some((item) => extractVideoId(item.url) === videoId);
                    if (existingDownload) {
                      if (!window.alertShown) {
                        window.api.showMessageBox({
                          type: 'warning',
                          title: 'Duplicate Download',
                          message: 'This video is already in the download list.',
                        });
                        window.alertShown = true;
                        setTimeout(() => (window.alertShown = false), 1000);
                      }
                      return;
                    }
                    setPastLinkUrl(clipboardText);
                  } else {
                    alert('Copied content is not a valid URL.');
                  }
                } catch (error) {
                  console.error('Failed to read clipboard: ', error);
                }
              }}
            >
              <FaPaste className="me-2" /> Paste
            </button>
  
            {/* Dropdown for Download Type */}
            <CustomDropdown
              label="Download"
              options={Object.keys(formatOptions)}
              selected={downloadType}
              onSelect={(value) => setDownloadType(value)}
            />
  
            {/* Quality Dropdown for Video */}
            {downloadType === 'Video' && (
              <CustomDropdown
                label="Quality"
                options={['1080p', '720p', '480p', '360p', '240p']}
                selected={quality}
                onSelect={setQuality}
              />
            )}
  
            {/* Bitrate Dropdown for Audio */}
            {downloadType === 'Audio' && (
              <CustomDropdown
                label="Audio Quailty"
                options={bitrateOptions}
                selected={bitrate}
                onSelect={setBitrate}
              />
            )}
  
            {/* Format Dropdown */}
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
          {/* <div className="d-flex align-items-center">
            <FaCog className="fs-5 me-3 cursor-pointer" title="Settings" />
            <FaUser className="fs-5 cursor-pointer" title="Profile" />
          </div> */}
        </div>
      </div>
    </nav>
  )
}

export default Navbar