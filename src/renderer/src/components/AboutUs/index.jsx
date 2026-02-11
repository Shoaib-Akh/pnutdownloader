import React, { useEffect, useState } from 'react'
import Logo from '../../assets/Images/logoB.png'
import UpdateNotification from '../UpdateNotification' // adjust path if needed
import '../common.css'
import { FaRocket, FaUsers, FaHeart, FaEnvelope, FaShieldAlt, FaFileContract, FaReddit, FaFacebook, FaTrash } from 'react-icons/fa'
import { clearLegacyDownloads, getUserStats } from '../../utils/firestoreService'

function AboutUs() {
  const [appVersion, setAppVersion] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [userStats, setUserStats] = useState({ totalDownloads: 0, errorCount: 0 })

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

      // Fetch user stats
      getUserStats().then((stats) => {
        if (stats) {
          setUserStats({
            totalDownloads: stats.totalDownloads || 0,
            errorCount: stats.errorCount || 0
          })
        }
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

  const handleCleanupLegacyData = async () => {
    if (confirm('Are you sure you want to clear ALL legacy download data from Firestore? This cannot be undone.')) {
      await clearLegacyDownloads()
      alert('Legacy data cleanup triggered. Check console for results.')
    }
  }

  return (
    <section
      className="py-2 pe-4 d-flex flex-column about-us-section justify-content-md-between justify-content-lg-evenly"
      style={{
        width: '100%',
        height: '100vh',
        // height: '85vh',
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

      <div className="text-center mb-4">
        <div className="mb-4 mt-5 pt-3">
          <img src={Logo} alt="PNUT Downloader Logo" style={{ height: '80px', marginBottom: '20px' }} />
        </div>
        <h1 className="display-4 fw-bold text-dark mb-3" style={{ fontSize: 28, background: 'linear-gradient(135deg, #BB4F28 0%, #d9775c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          About PNUT Downloader
        </h1>
        <h4 className="lead text-muted col-md-8 mx-auto mt-3" style={{ fontSize: 18, lineHeight: 1.6 }}>
          We're passionate about making media downloading simple, fast, and reliable for everyone.
          Join thousands of users who trust PNUT Downloader for their media needs.
        </h4>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-12">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '15px', background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)' }}>
            <div className="card-body p-4 d-flex justify-content-around align-items-center">
              <div className="text-center">
                <h3 className="h6 text-muted mb-1 text-uppercase fw-bold">Total Downloads</h3>
                <div className="h2 fw-bold" style={{ color: '#BB4F28' }}>{userStats.totalDownloads}</div>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>
              <div className="text-center">
                <h3 className="h6 text-muted mb-1 text-uppercase fw-bold">Download Errors</h3>
                <div className="h2 fw-bold" style={{ color: '#dc3545' }}>{userStats.errorCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6 mt-lg-5">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '15px', transition: 'transform 0.3s ease', }}>
            <div className="card-body p-4">
              <div className="mb-3">
                <FaRocket style={{ fontSize: '2rem', color: '#BB4F28' }} />
              </div>
              <h2 className="h4 fw-semibold text-dark mb-3">Our Mission</h2>
              <p className="text-muted" style={{ lineHeight: 1.7 }}>
                At PNUT Downloader, we strive to empower users by providing a seamless experience
                to access and manage audio, video, and playlist content. Our goal is to simplify
                the downloading process while ensuring quality and reliability.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 mt-lg-5">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '15px', transition: 'transform 0.3s ease', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
            <div className="card-body p-4">
              <div className="mb-3">
                <FaUsers style={{ fontSize: '2rem', color: '#BB4F28' }} />
              </div>
              <h2 className="h4 fw-semibold text-dark mb-3">Who We Are</h2>
              <p className="text-muted" style={{ lineHeight: 1.7 }}>
                We are a dedicated team of developers and designers committed to creating
                innovative tools for media enthusiasts. Our focus is on user satisfaction and
                cutting-edge technology.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-lg-4 mt-1 row align-items-center">
        <div className="col-md-6 d-flex flex-column justify-content-center align-items-center">
          <h2 className="h4 fw-semibold text-dark mt-lg-4 mt-2" style={{ fontSize: 20, background: 'linear-gradient(135deg, #BB4F28 0%, #d9775c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Connect With Us
          </h2>
          <p className="text-muted mb-3">Join our community and stay updated!</p>
          <h3 className="mb-3" style={{ fontSize: 16, color: '#BB4F28' }}>
            Current Version: <b>{appVersion}</b>
          </h3>

          <div className="d-flex flex-column gap-2 mb-3 align-items-center">
            <button
              className="btn px-3"
              style={{ background: 'linear-gradient(135deg, #BB4F28 0%, #d9775c 100%)', border: 'none', fontSize: 15, width: 180, borderRadius: '10px', boxShadow: '0 4px 12px rgba(187, 79, 40, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(187, 79, 40, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(187, 79, 40, 0.25)';
              }}
              onClick={() => window.api && window.api.checkForUpdates()}
            >
              Check for Update
            </button>

            <button
              className="btn px-3"
              style={{ background: '#ff4500', border: 'none', fontSize: 15, width: 250, borderRadius: '10px', boxShadow: '0 4px 12px rgba(255, 69, 0, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(255, 69, 0, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 69, 0, 0.25)';
              }}
              type="button"
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
              <FaReddit className="me-2" />
              Join Our Reddit Community
            </button>

            <button
              className="btn px-3"
              style={{ background: '#1877f2', border: 'none', fontSize: 15, width: 250, borderRadius: '10px', boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(24, 119, 242, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.25)';
              }}
              type="button"
              aria-label="Visit our Facebook page"
              onClick={() => {
                if (window.api?.openExternal) {
                  window.api.trackEvent('Visit Facebook page')
                  window.api.openExternal('https://www.facebook.com/PNUTDownloader');
                } else {
                  window.open('https://www.facebook.com/PNUTDownloader', '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <FaFacebook className="me-2" />
              Follow on Facebook
            </button>

            <button
              className="btn px-3 mt-3"
              style={{ background: '#dc3545', border: 'none', fontSize: 13, width: 250, borderRadius: '10px', boxShadow: '0 4px 12px rgba(220, 53, 69, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.25)';
              }}
              onClick={handleCleanupLegacyData}
            >
              <FaTrash className="me-2" />
              Cleanup Legacy DB Data
            </button>
          </div>
        </div>

        <div className="col-md-6 d-flex flex-column justify-content-center align-items-center" style={{ cursor: 'default' }}>
          <h3 className="mb-3" style={{ fontSize: 18, fontWeight: '600', background: 'linear-gradient(135deg, #BB4F28 0%, #d9775c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Quick Links</h3>
          <div className="d-flex flex-column gap-2 ">
            <button
              onClick={() => {
                if (window.api) {
                  window.api.trackEvent('feedback_button_clicked')
                  window.api.openExternal(
                    'https://docs.google.com/forms/d/1cvpfj-usDCY49YtLWxYZJTMz-sOPDHUdYRwfDJco2UY/viewform?edit_requested=true'
                  )
                }
              }}
              className="btn px-3"
              style={{ background: 'linear-gradient(135deg, #BB4F28 0%, #d9775c 100%)', border: 'none', fontSize: 15, width: 180, borderRadius: '10px', boxShadow: '0 4px 12px rgba(187, 79, 40, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(187, 79, 40, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(187, 79, 40, 0.25)';
              }}
            >
              <FaEnvelope className="me-2" />
              Contact Us
            </button>
            <button
              className="btn px-3"
              style={{ background: 'linear-gradient(135deg, #6c757d 0%, #868e96 100%)', border: 'none', fontSize: 15, width: 220, borderRadius: '10px', boxShadow: '0 4px 12px rgba(108, 117, 125, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.25)';
              }}
              onClick={() => {
                if (window.api) {
                  window.api.openExternal(
                    'https://pnutdownloader.com/privacy-policy/'
                  )
                }
              }}
            >
              <FaShieldAlt className="me-2" />
              Privacy Policy
            </button>
            <button
              className="btn px-3"
              style={{ background: 'linear-gradient(135deg, #6c757d 0%, #868e96 100%)', border: 'none', fontSize: 15, width: 220, borderRadius: '10px', boxShadow: '0 4px 12px rgba(108, 117, 125, 0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.25)';
              }}
              onClick={() => {
                if (window.api) {
                  window.api.openExternal(
                    'https://pnutdownloader.com/terms-of-services/'
                  )
                }
              }}
            >
              <FaFileContract className="me-2" />
              Terms and Conditions
            </button>
          </div>
        </div>
      </div>

      {/* Copyright notice pushed to the bottom */}
      <div className="text-center mt-4 mb-3">
        <div className="mb-2">
          <p className="mb-1" style={{ fontSize: 14, color: '#6c757d' }}>
            Made with <FaHeart style={{ color: '#e74c3c' }} /> by the PNUT Team
          </p>
        </div>
        <p style={{ fontSize: 12, color: '#6c757d', margin: 0 }}>
          Copyright 2025 PNUT Downloader. All Rights Reserved.
        </p>
      </div>
    </section>
  )
}

export default AboutUs
