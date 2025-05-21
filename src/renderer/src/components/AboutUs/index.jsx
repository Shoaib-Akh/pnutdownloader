import React, { useEffect, useState } from 'react'
import Logo from '../../assets/Images/logoB.png'
import UpdateNotification from '../UpdateNotification' // adjust path if needed
import '../common.css'

function AboutUs() {
  const [appVersion, setAppVersion] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    if (window.api) {
      window.api.getAppVersion().then((version) => {
        setAppVersion(version)
      })

      window.api.checkForUpdates()

      window.api.onUpdateAvailable((info) => {
        setUpdateAvailable(true)
        setUpdateInfo(info)
      })

      window.api.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true)
        setUpdateInfo(info)
      })

      window.api.onUpdateDownloadedProgress((progress) => {
        setDownloadProgress(progress.percent)
      })
    }
  }, [])

  const handleInstallUpdate = () => {
    if (window.api) {
      window.api.installUpdate()
      setUpdateAvailable(false)
      setUpdateDownloaded(false)
      setUpdateInfo(null)
    }
  }

  return (
    <section
className="py-2 pe-4 d-flex flex-column about-us-section justify-content-md-between justify-content-lg-evenly"
      style={{
        width: '100%',
        height: '85vh',
        // Ensure the section takes full height and uses Flexbox
        display: 'flex',
        flexDirection: 'column',
        
      }}
    >
      {/* Show update pop-up if update is available */}
      {updateAvailable && (
        <UpdateNotification
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isDownloaded={updateDownloaded}
          downloadProgress={downloadProgress}
        />
      )}

      <div>
        <div className="text-center mb-3">
          <h1 className="display-4 fw-bold text-dark mb-3" style={{ fontSize: 20 }}>
            About PNUT Downloader
          </h1>
          <h4 className="lead text-muted col-md-8 mx-auto mt-3" style={{ fontSize: 16 }}>
            We're passionate about making media downloading simple, fast, and reliable for everyone.
          </h4>
        </div>

        <div className="row g-4">
          <div className="col-md-6 mt-lg-5">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-2 p-lg-3 ">
                <h2 className="h4 fw-semibold text-dark mb-lg-3 mb-1">Our Mission</h2>
                <p className="text-muted">
                  At PNUT Downloader, we strive to empower users by providing a seamless experience
                  to access and manage audio, video, and playlist content. Our goal is to simplify
                  the downloading process while ensuring quality and reliability.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6 mt-lg-5">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-2 p-lg-3 ">
                <h2 className="h4 fw-semibold text-dark mb-3">Who We Are</h2>
                <p className="text-muted">
                  We are a dedicated team of developers and designers committed to creating
                  innovative tools for media enthusiasts. Our focus is on user satisfaction and
                  cutting-edge technology.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-lg-4 mt-1 row text-center justify-content-between">
        <div className="col-md-6 d-flex flex-column justify-content-center ">
          <h2 className="h4 fw-semibold text-dark mt-lg-4 mt-2" style={{ fontSize: 20 }}>
            Get in Touch
          </h2>
          <p className="text-muted mb-2">Have questions or need support? We're here to help!</p>
          <h3>
            Current Version:<b> {appVersion} </b>
          </h3>
          <div>
            <button
              className="btn btn-danger px-3 mt-lg-3 mt-2"
              style={{ background: '#BB4F28', fontSize: 15, width: 180 }}
              onClick={() => window.api && window.api.checkForUpdates()}
            >
              Check for Update
            </button>
                <div>

             <button
  className="btn btn-danger px-3 mt-lg-3 mt-2"
  type="button"
  style={{ background: '#BB4F28', fontSize: 15, width: 250 }}
  aria-label="Join our Reddit community"
  onClick={() => {
    if (window.api?.openExternal) {
        window.api.trackEvent('Join our Reddit community')
      window.api.openExternal('https://www.reddit.com/r/PNutDownloader/s/DEDPXcvWgS');
    } else {
      window.open('https://www.reddit.com/r/PNutDownloader/s/DEDPXcvWgS', '_blank', 'noopener,noreferrer');
    }
  }}
>
  Join Our Reddit Community
</button>
                </div>

          </div>
        </div>

        <div className="col-md-6  d-flex flex-column justify-content-center" style={{ cursor: 'default' }}>
          <div>
            <button
              onClick={() => {
                if (window.api) {
                       window.api.trackEvent('feedback_button_clicked')
                  window.api.openExternal(
                    'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform?edit_requested=true'
                  )
                }
              }}
              className="btn btn-danger px-3 mt-lg-2 mt-2"
              style={{ background: '#BB4F28', fontSize: 15, width: 180 }}
            >
              Contact Us
            </button>
          </div>
          <div>
            <button
              className="btn btn-danger px-3 mt-lg-2 mt-2"
              style={{ background: '#BB4F28', fontSize: 15, width: 180 }}
              onClick={() => {
                if (window.api) {
                  window.api.openExternal(
                    'https://pnutdownloader.com/privacy-policy/'
                  )
                }
              }}
            >
              Privacy Policy
            </button>
          </div>
          <div>
            <button
              className="btn btn-danger px-3 mt-lg-2 mt-2"
              style={{ background: '#BB4F28', fontSize: 15, width: 180 }}
              onClick={() => {
                if (window.api) {
                  window.api.openExternal(
                    'https://pnutdownloader.com/terms-of-services/'
                  )
                }
              }}
            >
              Terms and Conditions
            </button>
          </div>
        </div>
      </div>

      {/* Copyright notice pushed to the bottom */}
      <div className="text-center mt-2">
        <p>Copyright 2025 PNUT Downloader. All Rights Reserved.</p>
      </div>
    </section>
  )
}

export default AboutUs
