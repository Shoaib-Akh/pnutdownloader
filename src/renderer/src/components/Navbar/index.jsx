import React, { useState, useEffect } from 'react';
import { FaPaste, FaDownload } from 'react-icons/fa';
import Logo from '../../assets/Images/logo.png';
import '../common.css';
import './Navbar.css';
import CustomDropdown from '../CustomDropdown';
import { extractYotubePastLink, isDuplicateDownload } from '../commonFunction';

function Navbar({ setPastLinkUrl, setFormat, format, setQuality, setBitrate, setSaveTo, saveTo, bitrate, quality, setDownloadType, downloadType, onDownloadClick }) {
  const [urlInput, setUrlInput] = useState('');
  const formatOptions = {
    Video: ['MP4', 'AVI', 'MKV'],
    Audio: ['MP3', 'FLAC', 'WAV', 'AAC'],
  };

  const bitrateOptions = ['320K', '256K', '192K', '128K', '96K', '64K'];
  const saveToOptions = ['Downloads', 'Desktop', 'Custom'];

  const qualityOptions = [
    { value: '2160p', label: '2160p', badge: '4K' },
    { value: '1440p', label: '1440p', badge: 'HD' },
    { value: '1080p', label: '1080p', badge: 'HD' },
    { value: '720p', label: '720p' },
    { value: '480p', label: '480p' },
    { value: '360p', label: '360p' },
    { value: '240p', label: '240p' },
    { value: '144p', label: '144p' },
  ];

  const getQualityDisplay = (qualityValue) => {
    const option = qualityOptions.find(opt => opt.value === qualityValue);
    return option ? option.label : qualityValue;
  } 

  const getLocalStorageValue = (key, defaultValue) => {
    try {
      const savedState = JSON.parse(localStorage.getItem('navbarState')) || {};
      return savedState[key] !== undefined ? savedState[key] : defaultValue;
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
      return defaultValue;
    }
  };

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
  useEffect(() => {
    if (!setDownloadType || !setFormat || !setQuality || !setBitrate || !setSaveTo) {
      return; // Don't run if required props are missing
    }
    
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    if (downloadType && formatOptions[downloadType]) {
      const currentFormat = getLocalStorageValue('format', formatOptions[downloadType][0]);
      if (!formatOptions[downloadType].includes(currentFormat)) {
        setFormat(formatOptions[downloadType][0]);
        saveToLocalStorage('format', formatOptions[downloadType][0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadType]);

  useEffect(() => {
    if (downloadType !== 'Audio') {
      if (bitrate !== null) {
        setBitrate(null);
        saveToLocalStorage('bitrate', null);
      }
    } else if (!bitrate) {
      setBitrate(bitrateOptions[3]);
      saveToLocalStorage('bitrate', bitrateOptions[3]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadType, bitrate]);

  const handleDownloadTypeChange = (value) => {
    setDownloadType(value);
    saveToLocalStorage('downloadType', value);
  };

  const handleFormatChange = (value) => {
    setFormat(value);
    saveToLocalStorage('format', value);
  };

  const handleQualityChange = (value) => {
    const pureQuality = value.split(' ')[0]; 
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

  const renderQualityOption = (option) => (
    <div className="d-flex align-items-center">
      <span>{option.label}</span>
      {option.badge && (
        <span className="navbar-quality-badge">
          {option.badge}
        </span>
      )}
    </div>
  );

  const checkDuplicateAndWarn = (url) => {
    const list = JSON.parse(localStorage.getItem('downloadList') || '[]');
    const isDuplicate = isDuplicateDownload(list, url, format, quality, saveTo, downloadType, bitrate);
    if (!isDuplicate) return false;
    if (window.api?.showMessageBox) {
      window.api.showMessageBox({
        type: 'warning',
        title: 'Duplicate Download',
        message:
          'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.',
      });
    } else {
      alert(
        'This URL with the same format, quality, save location, and download type is already in the list. Change format, quality, or save location to download again.',
      );
    }
    return true;
  };

  const handlePasteClick = async () => {
    try {
      if (window.api && window.api.trackEvent) {
        window.api.trackEvent('Paste');
      }
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.startsWith('http://') || clipboardText.startsWith('https://')) {
        setUrlInput(clipboardText);
        const videoId = extractYotubePastLink(clipboardText);
        if (!videoId) {
          alert('The URL does not contain a valid video or playlist');
          return;
        }

        if (checkDuplicateAndWarn(clipboardText)) return;

        if (window.api && window.api.showVideoUrlNotification) {
          try {
            await window.api.showVideoUrlNotification(clipboardText);
          } catch (notifError) {
            console.warn('Failed to show notification:', notifError);
          }
        }

        if (setPastLinkUrl) {
          setPastLinkUrl(clipboardText);
        }
      } else {
        alert('Copied content is not a valid URL.');
      }
    } catch (error) {
      console.error('Failed to read clipboard: ', error);
    }
  };

  const handleInputChange = (e) => {
    setUrlInput(e.target.value);
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && urlInput) {
      if (urlInput.startsWith('http://') || urlInput.startsWith('https://')) {
        if (checkDuplicateAndWarn(urlInput)) return;
        setPastLinkUrl(urlInput);
      }
    }
  };

  const handleDownloadButtonClick = () => {
    if (urlInput && (urlInput.startsWith('http://') || urlInput.startsWith('https://'))) {
      if (checkDuplicateAndWarn(urlInput)) return;
      setPastLinkUrl(urlInput);
    } else if (onDownloadClick) {
      onDownloadClick();
    }
  };

  return (
    <nav className="navbar-modern">
      {/* Logo on Left */}
     

      {/* Input Group in Center */}
      <div className="navbar-input-group">
        {/* Paste Button */}
        <button 
          className="navbar-paste-btn"
          onClick={handlePasteClick}
        >
          <FaPaste /> <span>Paste</span>
        </button>

        {/* Input Field */}
        <input
          type="text"
          className="navbar-input"
          value={urlInput}
          onChange={handleInputChange}
          onKeyPress={handleInputKeyPress}
          placeholder="Paste the video URL and choose the format to convert"
        />

        {/* Download Button */}
        <button
          className="navbar-download-btn"
          onClick={handleDownloadButtonClick}
        >
          <FaDownload /> <span>Download</span>
        </button>
      </div>

      {/* Secondary Controls on Right */}
      <div className="navbar-controls">
        <CustomDropdown
          label="Download"
          options={Object.keys(formatOptions)}
          selected={downloadType}
          onSelect={handleDownloadTypeChange}
        />

        <CustomDropdown
          label="Format"
          options={formatOptions[downloadType] || []}
          selected={format}
          onSelect={handleFormatChange}
        />

        {downloadType === 'Video' && (
          <CustomDropdown
            label="Quality"
            options={qualityOptions}
            selected={quality}
            onSelect={handleQualityChange}
            renderOption={renderQualityOption}
            renderSelected={(value) => {
              const option = qualityOptions.find(opt => opt.value === value);
              return renderQualityOption(option || { value, label: value });
            }}
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

        <CustomDropdown
          label="Save To"
          options={saveToOptions}
          selected={getSaveToDisplay()}
          onSelect={handleSaveToSelect}
        />
      </div>
    </nav>
  );
}

export default Navbar;