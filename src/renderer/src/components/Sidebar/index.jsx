import React, { useState } from 'react'
import { FaFolderOpen, FaMusic, FaVideo, FaList, FaBars } from 'react-icons/fa'
import { IoMdDownload } from 'react-icons/io'
import { GiSquirrel } from 'react-icons/gi'
import squirrel from '../../assets/Images/squirrel.png'
function Sidebar({
  isOpen,
  setIsOpen,
  selectedItem,
  setSelectedItem,
  download,
  setDownload,
  setShowWebView,
  setDownloadListOpen
}) {
  const menuItems = [
    { icon: IoMdDownload, label: 'Recent Download' },
    { icon: FaMusic, label: 'Audio' },
    { icon: FaVideo, label: 'Video' },
    { icon: FaList, label: 'Playlist' }
  ]

  return (
    <div
      className={`sidebar ${isOpen ? 'expanded' : 'collapsed'}`}
      style={{
        width: isOpen ? '250px' : '80px',
        transition: 'width 0.3s ease-in-out',
        backgroundColor: '#f8f9fa',
        color: '#333',
        height: '80%',
        position: 'fixed',
        left: 0,

        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '20px',
        // boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
        zIndex: 1000
      }}
    >
      {/* Menu Button for Collapsed Mode */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#BB4F28',
            border: 'none',
            color: 'white',
            padding: '10px',
            cursor: 'pointer',
            borderRadius: '5px',
            width: '90%',
            marginBottom: '10px'
          }}
        >
          <FaBars />
        </button>
      )}

      {/* Toggle Button */}

      {/* Recent Download Section */}
      {/* <div style={{ width: "90%", textAlign: "left", marginBottom: "10px" }}>
        <h6 style={{ fontSize: "14px", color: "#BB4F28" }}>
          <IoMdDownload style={{ marginRight: "5px" }} /> Recent Download
        </h6>
      </div> */}

      {/* Sidebar Menu */}
      <div style={{ width: '90%' }}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => {
              setSelectedItem(item.label)
              setDownload(false)
              setShowWebView(false)
              setDownloadListOpen(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '18px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '10px',
              // backgroundColor: selectedItem === item.label ? "#BB4F28" : "#fff", // 🔥 Selected item background
              color: selectedItem === item.label ? 'black' : '#A0AEC0', // 🔥 Selected text color
              fontSize: 16,
              fontWeight: '600',
              border: selectedItem === item.label ? '1px solid #BB4F28' : '1px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                backgroundColor: selectedItem === item.label ? '#BB4F28' : '#fff', // 🔥 Icon background
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                // padding: '5px',
                height: 30,
                width: 30,
                // fontSize: '20px',
                color: selectedItem === item.label ? '#fff' : '#BB4F28' // 🔥 Icon color logic
              }}
            >
              <item.icon
                style={{
                  fontSize: '10px'
                  // 🔥 Icon color logic
                }}
              />
            </div>

            {isOpen && <span>{item.label}</span>}
          </div>
        ))}
      </div>

      {/* Buy Me Nuts Button */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          width: '90%',
          textAlign: 'center'
        }}
      >
        {isOpen && (
          <>
            <img
              src={squirrel}
              alt="PNUT Logo"
              className="me-2"
              style={{ width: '50px', marginBottom: '10px' }}
            />

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '10px',
                backgroundColor: '#BB4F28',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <GiSquirrel style={{ marginRight: '8px' }} /> Buy Me Nuts
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Sidebar
