import React,{useState} from "react";

import { FaPaste, FaCog, FaUser,} from "react-icons/fa";
import Logo from "../../assets/Images/logo.png"
import "../common.css"
import CustomDropdown from "../CustomDropdown";

function Navbar({ downloadType, setDownloadType, quality, setQuality, format, setFormat, saveTo, setSaveTo }) {
  
  return (
    <nav className="navbar navbar-expand-lg navbar-light  justify-content-between  p-2">
      {/* Left Side - Logo */}
      <a className="navbar-brand d-flex align-items-center" href="#">
        <img
          src={Logo}
          alt="PNUT Logo"
          className="me-2"
          width={150}
        />
  
      </a>

      {/* Center Section - Options */}
      <div className=" d-flex flex-grow-1 justify-content-center shadow-sm p-3  bg-body rounded" style={{}}>

      <div className="d-flex flex-grow-1 justify-content-around  ">
        <button className="btn btn-danger d-flex align-items-center me-3" style={{background:"#BB4F28"}}>
          <FaPaste className="me-2" /> Paste Link
        </button>
        <CustomDropdown
        label="Download"
        options={["Video", "Audio", "Subtitles", "Audio Tracks"]}
        defaultSelected="Video"
        onSelect={setDownloadType} // Capture selected value
      />

      {/* Dropdown for Quality */}
      <CustomDropdown
        label="Quality"
        options={["Best", "Medium", "Low"]}
        defaultSelected="Best"
        onSelect={setQuality}
      />

      {/* Dropdown for Format */}
      <CustomDropdown
        label="Format"
        options={["MP4", "MP3"]}
        defaultSelected="MP4"
        onSelect={setFormat}
      />  
     <CustomDropdown
        label="Save To"
        options={["Downloads", "Desktop", "Custom Location..."]}
        defaultSelected="Downloads"
        onSelect={setSaveTo}
      />
      </div>

      {/* Right Side - Settings & Profile */}
      <div className="d-flex align-items-center">
        <FaCog className="fs-5 me-3 cursor-pointer" />
        <FaUser className="fs-5 cursor-pointer" />
      </div>
      </div>

    </nav>
  );
}

export default Navbar;
