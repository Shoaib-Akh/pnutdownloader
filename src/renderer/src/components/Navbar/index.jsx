import React from 'react';
import { FaPaste } from 'react-icons/fa';
import Logo from '../../assets/Images/logo.png';
import '../common.css';
import CustomDropdown from '../CustomDropdown';
import { extractYotubePastLink } from '../commonFunction';

function Navbar({ setPastLinkUrl, setFormat, format, setQuality, setBitrate, setSaveTo, saveTo, bitrate, quality, setDownloadType, downloadType }) {
  const formatOptions = {
    Video: ['MP4', 'AVI', 'MKV'],
    Audio: ['MP3', 'FLAC', 'WAV', 'AAC'],
  };

  const bitrateOptions = ['320K', '256K', '192K', '128K', '96K', '64K'];
  const saveToOptions = ['Downloads', 'Desktop', 'Custom'];

  // Map quality state to dropdown option (e.g., "1080p" -> "1080p (HD)")
  const getQualityDisplay = (qualityValue) => {
    const qualityMap = {
      '2160p': '2160p (4K)',
      '1440p': '1440p (HD)',
      '1080p': '1080p (HD)',
      '720p': '720p',
      '480p': '480p',
      '360p': '360p',
      '240p': '240p',
      '144p': '144p',
    };
    return qualityMap[qualityValue] || qualityValue; // Fallback to qualityValue if not found
  };

  // Get value from localStorage or return default
  const getLocalStorageValue = (key, defaultValue) => {
    try {
      const savedState = JSON.parse(localStorage.getItem('navbarState')) || {};
      return savedState[key] !== undefined ? savedState[key] : defaultValue;
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
      return defaultValue;
    }
  };

  // Save value to localStorage without triggering re-render
  const saveToLocalStorage = (key, value) => {
    try {
      const currentState = JSON.parse(localStorage.getItem('navbarState')) || {};
      const newState = { ...currentState, [key]: value };
      localStorage.setItem('navbarState', JSON.stringify(newState));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  // Initialize localStorage with default values on first render
  React.useEffect(() => {
    const navbarState = JSON.parse(localStorage.getItem('navbarState'));
    if (!navbarState) {
      const defaultState = {
        downloadType: 'Video',
        format: formatOptions['Video'][0],
        quality: '1080p',
        bitrate: '128K',
        saveTo: 'Downloads',
      };
      localStorage.setItem('navbarState', JSON.stringify(defaultState));
      setDownloadType(defaultState.downloadType);
      setFormat(defaultState.format);
      setQuality(defaultState.quality);
      setBitrate(defaultState.bitrate);
      setSaveTo(defaultState.saveTo);
    } else {
      setDownloadType(getLocalStorageValue('downloadType', 'Video'));
      setFormat(getLocalStorageValue('format', formatOptions['Video'][0]));
      setQuality(getLocalStorageValue('quality', '1080p'));
      setBitrate(getLocalStorageValue('bitrate', '128K'));
      setSaveTo(getLocalStorageValue('saveTo', 'Downloads'));
    }
  }, []); // Empty dependency array to run only once on mount

  // Ensure format is valid when downloadType changes
  React.useEffect(() => {
    if (downloadType && formatOptions[downloadType]) {
      const currentFormat = getLocalStorageValue('format', formatOptions[downloadType][0]);
      if (!formatOptions[downloadType].includes(currentFormat)) {
        setFormat(formatOptions[downloadType][0]);
        saveToLocalStorage('format', formatOptions[downloadType][0]);
      }
    }
  }, [downloadType, formatOptions]);

  // Ensure bitrate is reset when switching away from Audio
  React.useEffect(() => {
    if (downloadType !== 'Audio') {
      if (bitrate !== null) {
        setBitrate(null);
        saveToLocalStorage('bitrate', null);
      }
    } else if (!bitrate) {
      setBitrate(bitrateOptions[3]);
      saveToLocalStorage('bitrate', bitrateOptions[3]);
    }
  }, [downloadType, bitrate, bitrateOptions]);

  // Handle dropdown changes
  const handleDownloadTypeChange = (value) => {
    setDownloadType(value);
    saveToLocalStorage('downloadType', value);
  };

  const handleFormatChange = (value) => {
    setFormat(value);
    saveToLocalStorage('format', value);
  };

  const handleQualityChange = (value) => {
    const pureQuality = value.split(' ')[0]; // Extract resolution (e.g., "1440p")
    setQuality(pureQuality);
    saveToLocalStorage('quality', pureQuality);
  };

  const handleBitrateChange = (value) => {
    setBitrate(value);
    saveToLocalStorage('bitrate', value);
  };

  const handleSaveToSelect = async (value) => {
    if (value === 'Custom') {
      try {
        const folderPath = await window.api.selectFolder();
        if (folderPath) {
          setSaveTo(folderPath);
          saveToLocalStorage('saveTo', folderPath);
        } else {
          setSaveTo('Downloads');
          saveToLocalStorage('saveTo', 'Downloads');
        }
      } catch (error) {
        console.error('Failed to select folder:', error);
        alert('Failed to select a folder. Defaulting to Downloads.');
        setSaveTo('Downloads');
        saveToLocalStorage('saveTo', 'Downloads');
      }
    } else {
      setSaveTo(value);
      saveToLocalStorage('saveTo', value);
    }
  };

  const getSaveToDisplay = () => {
    if (saveToOptions.includes(saveTo)) {
      return saveTo;
    }
    const folderName = saveTo.split(/[\\/]/).pop() || 'Custom';
    return folderName;
  };

  return (
    <nav className="p-3" style={{ backgroundColor: 'white' }}>
      <div className="d-flex align-items-center justify-content-between flex-grow-1">
        <div href="#" style={{ cursor: 'default', width: '17%' }} className="logo-div">
          <img src={Logo} alt="PNUT Logo" className="logo" />
        </div>

        <div
          className="d-flex align-items-center justify-content-between flex-grow-1 bg-body"
          style={{
            padding: 10,
            borderRadius: 5,
            boxShadow: 'rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px',
          }}
        >
          <div className="d-flex" style={{ gap: 2 }}>
            <button
              className="btn btn-danger d-flex align-items-center px-3"
              style={{ background: '#BB4F28', fontSize: 15 }}
              onClick={async () => {
                try {
                  const clipboardText = await navigator.clipboard.readText();
                  if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
                    const videoId = extractYotubePastLink(clipboardText);
                    if (!videoId) {
                      alert('The URL does not contain a valid video or playlist');
                      return;
                    }
                    let storedDownloads = JSON.parse(localStorage.getItem('downloadList')) || [];
                    const existingDownload = storedDownloads.some(
                      (item) => extractYotubePastLink(item.url) === videoId
                    );
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

            <CustomDropdown
              label="Download"
              options={Object.keys(formatOptions)}
              selected={downloadType}
              onSelect={handleDownloadTypeChange}
            />

            {downloadType === 'Video' && (
              <CustomDropdown
                label="Quality"
                options={['2160p (4K)', '1440p (HD)', '1080p (HD)', '720p', '480p', '360p', '240p', '144p']}
                selected={getQualityDisplay(quality)} // Use display value for dropdown
                onSelect={handleQualityChange}
              />
            )}

            {downloadType === 'Audio' && (
              <CustomDropdown
                label="Quality"
                options={bitrateOptions}
                selected={bitrate}
                onSelect={handleBitrateChange}
              />
            )}

            {formatOptions[downloadType] && (
              <CustomDropdown
                label="Format"
                options={formatOptions[downloadType]}
                selected={format}
                onSelect={handleFormatChange}
              />
            )}

            <CustomDropdown
              label="Save To"
              options={saveToOptions}
              selected={getSaveToDisplay()}
              onSelect={handleSaveToSelect}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;