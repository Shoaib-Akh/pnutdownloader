import React, { useState } from 'react'
import Navbar from './components/Navbar'
import BottomSection from './components/BottomSection'
import Sidebar from './components/Sidebar'

function App() {
  const [downloadType, setDownloadType] = useState('Video')
  const [quality, setQuality] = useState('1080p')
  const [format, setFormat] = useState('')
  const [saveTo, setSaveTo] = useState('Downloads')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState('')
  const [download, setDownload] = useState(false)
  const [showWebView, setShowWebView] = useState(false)
   const [downloadListOpen, setDownloadListOpen] = useState(false);
   const [pastLinkUrl, setPastLinkUrl] = useState("");

  return (
    <div className=" vh-100">
      {/* Sidebar Component */}

      {/* Main Content with Navbar */}

      <Navbar
        downloadType={downloadType}
        setDownloadType={setDownloadType}
        quality={quality}
        setQuality={setQuality}
        format={format}
        setFormat={setFormat}
        saveTo={saveTo}
        setSaveTo={setSaveTo}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setPastLinkUrl={setPastLinkUrl}
      />
      <div
        className=""
        style={{
          marginLeft: isSidebarOpen ? '200px' : '60px',
          transition: 'margin-left 0.3s ease-in-out'
        }}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          setSelectedItem={setSelectedItem}
          selectedItem={selectedItem}
          setDownload={setDownload}
          download={download}
          setShowWebView={setShowWebView}
          showWebView={showWebView}
          setDownloadListOpen={setDownloadListOpen}
        />

        <BottomSection
          downloadType={downloadType}
          quality={quality}
          format={format}
          saveTo={saveTo}
          selectedItem={selectedItem}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarOpen={isSidebarOpen}
          setSelectedItem={setSelectedItem}
          setDownload={setDownload}
          download={download}
          setShowWebView={setShowWebView}
          showWebView={showWebView}
          downloadListOpen={downloadListOpen}
          setDownloadListOpen={setDownloadListOpen}
          pastLinkUrl={pastLinkUrl}
        />
      </div>
    </div>
  )
}

export default App
