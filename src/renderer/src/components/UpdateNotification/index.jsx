import React from 'react';

function UpdateNotification({ updateInfo, onInstall, isDownloaded, setUpdateAvailable, downloadProgress }) {
  console.log("downloadProgress", downloadProgress);
  console.log("updateInfo", updateInfo);

  // Loader component
  const DownloadLoader = () => (
    <div className="loader-container my-4">
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="mt-3 text-muted">
        Downloading: {Math.round(downloadProgress)}%
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
              <span role="img" aria-label="Update" className="me-2">🔄</span>
              Application Update
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
                <p className="lead mb-3 text-dark fw-semibold">Update Ready to Install!</p>
                <p className="text-muted mb-0">
                  The new version has been downloaded and is ready to use. 
                  Please restart to complete the installation.
                </p>
              </>
            ) : (
              <>
                <p className="lead mb-3 text-dark fw-semibold">New Version Available</p>
                {downloadProgress > 0 ? (
                  <DownloadLoader />
                ) : (
                  <p className="text-muted mb-4">
                    Enhancements and new features are waiting. Download now for 
                    the best experience.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="modal-footer border-top-0 justify-content-center">
            {!isDownloaded && (
              downloadProgress === 0 && (
                <button 
                  className="btn btn-primary btn-lg px-5 rounded-pill fw-medium"
                  style={{backgroundColor:"#BB4F28"}}
                  onClick={() => window.api.downloadUpdate()}
                >
                  Download Now
                </button>
              )
            )}
            {isDownloaded && (
              <button 
                className="btn btn-success btn-lg px-5 rounded-pill fw-medium"
                onClick={onInstall}
                style={{backgroundColor:"green"}}
              >
                Install & Restart
                <span role="img" aria-label="Rocket" className="ms-2">🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;