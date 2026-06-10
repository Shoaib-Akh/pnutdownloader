import React, { useState, useEffect } from 'react';

function UpdateNotification({ updateInfo, onInstall, isDownloaded, setUpdateAvailable, downloadProgress }) {
  console.log("downloadProgress", downloadProgress);
  console.log("updateInfo", updateInfo);
  const [isDownloading, setIsDownloading] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  // Test progress simulation
  useEffect(() => {
    if (isDownloading && !downloadProgress) {
      const interval = setInterval(() => {
        setTestProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isDownloading, downloadProgress]);

  const displayProgress = downloadProgress || testProgress;

  // Loader component
  const DownloadLoader = () => (
    <div className="loader-container my-4">
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="mt-3 text-muted">
        Downloading: {Math.round(displayProgress)}%
      </div>
      <div className="mt-2">
        <div className="progress" style={{ height: '8px' }}>
          <div 
            className="progress-bar" 
            role="progressbar" 
            style={{ 
              width: `${displayProgress}%`,
              backgroundColor: '#BB4F28'
            }}
          ></div>
        </div>
      </div>
      <style jsx>{`
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .spinner-border {
          animation: spin 1s linear infinite;
          border: 0.25em solid #BB4F28;
          border-right-color: transparent;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const handleDownload = () => {
    setIsDownloading(true);
    window.api.downloadUpdate();
    // Test progress manually
    setTimeout(() => {
      console.log('Testing progress manually');
      // This will help us see if UI is working
    }, 2000);
  };

  return (
    <div 
      className="modal fade show" 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      data-bs-backdrop="static" 
      data-bs-keyboard="false"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-bottom-0">
            <h5 className="modal-title w-100 text-center fs-4">
              App update
            </h5>
          </div>

          <div className="modal-body text-center py-4">
            <div className="mb-3">
              <span className="badge bg-primary rounded-pill fs-6">
                v{updateInfo?.version}
              </span>
            </div>

            {isDownloaded ? (
              <>
                <p className="lead mb-3 text-dark fw-semibold">Update downloaded</p>
                <p className="text-muted mb-0">
                  Restart the app to install the new version.
                </p>
              </>
            ) : (
              <>
                <p className="lead mb-3 text-dark fw-semibold">New version available</p>
                {isDownloading ? (
                  <DownloadLoader />
                ) : (
                  <p className="text-muted mb-4">
                    A new version is ready to download.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="modal-footer border-top-0 justify-content-center">
            {!isDownloaded && (
              !isDownloading && (
                <button 
                  className="btn btn-primary btn-lg px-5 rounded-pill fw-medium"
                  style={{backgroundColor:"#BB4F28"}}
                  onClick={handleDownload}
                >
                  Download update
                </button>
              )
            )}
            {isDownloaded && (
              <button 
                className="btn btn-success btn-lg px-5 rounded-pill fw-medium"
                onClick={onInstall}
                style={{backgroundColor:"green"}}
              >
                Install and restart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
