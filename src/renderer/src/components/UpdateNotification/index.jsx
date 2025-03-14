import { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.electron.update.available((_event, info) => setUpdateInfo(info));
    window.electron.update.downloaded((_event, info) => setUpdateInfo(info));
    window.electron.update.error((_event, err) => setError(err.message));
    window.electron.update.check();
  }, []);

  const handleInstall = () => {
    window.electron.update.install();
  };

  return (
    <Modal show={!!updateInfo || !!error}>
      <Modal.Header>
        <Modal.Title>Application Update</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <p className="text-danger">Update error: {error}</p>
        )}
        {updateInfo?.version && (
          <p>New version {updateInfo.version} available!</p>
        )}
        {updateInfo?.downloaded && (
          <p>Update downloaded. Ready to install!</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleInstall}>
          Install Update
        </Button>
      </Modal.Footer>
    </Modal>
  );
}