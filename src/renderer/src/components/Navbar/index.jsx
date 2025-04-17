import React from 'react'
import { FaPaste, FaCog, FaUser } from 'react-icons/fa'
import Logo from '../../assets/Images/logo.png'
import '../common.css'
import CustomDropdown from '../CustomDropdown'
import { extractYotubePastLink } from '../commonFunction'

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
  const bitrateOptions = ['320K','256K','192K','128K', '96K', ,'64K', ]

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

 
  let downloadListData = [];
  try {
    downloadListData = JSON.parse(localStorage.getItem('downloadList')) || [];
  } catch (e) {
    console.error("Failed to parse downloadList from localStorage:", e);
  }
  
  return (
    <nav className=" p-3 " style={{backgroundColor:"white"}}>
      <div className="d-flex align-items-center justify-content-between flex-grow-1 " >
        {/* Left Side - Logo */}
        <div href="#" style={{ cursor: "default",width:"17%", }} className= "logo-div">
          <img src={Logo} alt="PNUT Logo" className='logo' />
        </div>
  
        {/* Center Section - Options */}
        <div
          className="d-flex align-items-center justify-content-between flex-grow-1  bg-body"
          style={{ padding: 10,borderRadius:5 ,

            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)"

          }}
        >
          <div className="d-flex" style={{ gap: 2 }}>
            {/* Paste Link Button */}
            <button
              className="btn btn-danger d-flex align-items-center  px-3"
              style={{ background: '#BB4F28', fontSize: 15 }}
              onClick={async () => {
                try {
                  const clipboardText = await navigator.clipboard.readText();
                  if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
                    const videoId = extractYotubePastLink(clipboardText);
                    if (!videoId) {
                      alert('The URL does not contain a valid video or playlist ');
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
                label="Quailty"
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