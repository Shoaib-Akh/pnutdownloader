import React, { useState } from "react";
import { FaPaste, FaCog, FaUser } from "react-icons/fa";
import Logo from "../../assets/Images/logo.png";
import "../common.css";
import CustomDropdown from "../CustomDropdown";

function Navbar({ saveTo, setSaveTo, setQuality, setFormat, quality, format,setDownloadType ,downloadType}) {
  

  // Format options based on download type
  const formatOptions = {
    Video: ["MP4", "AVI", "MKV"],
    Audio: ["MP3", "FLAC", "WAV"],
    Subtitles: ["SRT"],
  };

  const [selectedFormat, setSelectedFormat] = useState(formatOptions[downloadType][0]);

  // Handle download type selection
  const handleDownloadTypeChange = (value) => {
    setDownloadType(value);
    const newFormat = formatOptions[value][0];
    setSelectedFormat(newFormat);
    setFormat(newFormat);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light justify-content-between p-4" style={{gap:70}}>
      {/* Left Side - Logo */}
      <a className="navbar-brand d-flex align-items-center" href="#" style={{cursor:"pointer"}}>
        <img src={Logo} alt="PNUT Logo" className="me-2" width={150} />
      </a>

      {/* Center Section - Options */}
      <div className="d-flex flex-grow-1 justify-content-center shadow-sm  bg-body " style={{padding:10}}>
        <div className="d-flex flex-grow-1 " style={{gap:10}}>
          {/* Paste Link Button */}
          <button className="btn btn-danger d-flex align-items-center me-3" style={{ background: "#BB4F28" }}>
            <FaPaste className="me-2" /> Paste Link
          </button>

          {/* Dropdown for Download Type */}
          <CustomDropdown
            label="Download"
            options={Object.keys(formatOptions)}
            selected={downloadType}
            onSelect={handleDownloadTypeChange}
          />

          {/* Quality Dropdown (Not applicable for Audio and Subtitles) */}
          {downloadType === "Video" && (
            <CustomDropdown
              label="Quality"
              options={["1080p", "720p", "480p", "360p", "240p"]}
              selected={quality}
              onSelect={setQuality}
            />
          )}

          {/* Format Dropdown - Based on Download Type */}
          {formatOptions[downloadType] && (
            <CustomDropdown
              label="Format"
              options={formatOptions[downloadType]}
            
              selected={selectedFormat} // Now properly updates when `downloadType` changes
              onSelect={(value) => {
                setSelectedFormat(value);
                setFormat(value);
              }}
            />
          )}

          {/* Dropdown for Save Location */}
          <CustomDropdown
            label="Save To"
            options={["Downloads", "Desktop", "Custom Location..."]}
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
  );
}

export default Navbar;
