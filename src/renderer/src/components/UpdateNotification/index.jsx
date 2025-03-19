import React from 'react';

function UpdateNotification({ updateInfo, onInstall, isDownloaded,setUpdateAvailable }) {
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
            {/* <button 
              type="button" 
              className="btn-close" 
              aria-label="Close"
              // disabled // Remove this if you want to allow closing
           
           onClick={()=>setUpdateAvailable(false)}
           ></button> */}
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
                <p className="text-muted mb-4">
                  Enhancements and new features are waiting. Download now for 
                  the best experience.
                </p>
                
              </>
            )}
          </div>

          <div className="modal-footer border-top-0 justify-content-center">
            {!isDownloaded ? (
              <button 
                className=" btn btn-primary btn-lg px-5 rounded-pill fw-medium"
                style={{backgroundColor:"#BB4F28"}}
                onClick={() => window.api.downloadUpdate()}
              >
                Download Now
              </button>
            ) : (
              <button 
                className="btn btn-success btn-lg px-5 rounded-pill fw-medium"
                onClick={onInstall}
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