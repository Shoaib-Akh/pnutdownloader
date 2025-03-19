import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function UpdateNotification({ updateInfo, onInstall, isDownloaded }) {
  return (
    <Modal show={true} onHide={() => {}} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Update Available</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isDownloaded ? (
          <p>A new version ({updateInfo?.version}) has been downloaded. Restart the app to install the update.</p>
        ) : (
          <p>A new version ({updateInfo?.version}) is available. Click below to download.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        {!isDownloaded ? (
          <Button variant="primary" onClick={() => window.api.downloadUpdate()}>
            Download Update
          </Button>
        ) : (
          <Button variant="success" onClick={onInstall}>
            Install & Restart
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default UpdateNotification;
