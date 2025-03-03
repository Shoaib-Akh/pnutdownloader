import React, { useState } from 'react';
import { FaEllipsisV, FaPlay, FaPause, FaTrash, FaRegClock, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';
import { ProgressBar } from 'react-bootstrap';
import '../common.css';

const DownloadList = () => {
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const toggleDropdown = (id) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  const files = [
    { id: 1, duration: '02:06', quality: '720p', status: '60%', action: 'Details' },
    { id: 2, duration: '02:06', quality: '1080p', status: '10%', action: '' },
    { id: 3, duration: '02:06', quality: '720p', status: 'Completed', action: '' },
    { id: 4, duration: '02:06', quality: '720p', status: '100%', action: '' },
    { id: 5, duration: '02:06', quality: '720p', status: 'Canceled', action: '' },
    { id: 6, duration: '02:06', quality: '720p', status: '40%', action: '' },
    { id: 7, duration: '02:06', quality: '720p', status: '40%', action: '' },
    { id: 8, duration: '02:06', quality: '720p', status: '40%', action: '' },
  

  ];

  const getStatusDisplay = (status) => {
    if (status === 'Completed') {
      return <><FaCheckCircle className="text-success" /> Completed</>;
    }
    if (status === 'Canceled') {
      return <><FaTimesCircle className="text-danger" /> Canceled</>;
    }
    if (status.includes('%')) {
      const percentage = parseInt(status);
      return (
        <div className="d-flex align-items-center gap-2">
          <FaRegClock className="text-primary" />
          <ProgressBar now={percentage} className="flex-grow-1" style={{height:4}} />
        </div>
      );
    }
    return status;
  };

  return (
    <div className="container-fluid p-0">
      <div className="table-container">
        <table className="file-table">
          <thead>
            <tr>
              <th className="header-cell">Files</th>
              <th className="header-cell">DURATION</th>
              <th className="header-cell">Quality</th>
              <th className="header-cell">Status</th>
              <th className="header-cell">Action</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="data-row">
                <td className="data-cell">#{file.id}</td>
                <td className="data-cell">{file.duration}</td>
                <td className="data-cell">{file.quality}</td>
                <td className="data-cell status-cell">
                  {getStatusDisplay(file.status)}
                </td>
                <td className="data-cell action-cell">
                  <div className="dropdown">
                    <button
                      className="three-dots-btn"
                      onClick={() => toggleDropdown(file.id)}
                    >
                      <FaEllipsisV />
                    </button>
                    {dropdownOpen === file.id && (
                      <div className="dropdown-menu show">
                        <button className="dropdown-item">
                          <FaPlay className="me-2" /> Play
                        </button>
                        <button className="dropdown-item">
                          <FaPause className="me-2" /> Pause
                        </button>
                        <button className="dropdown-item">
                          <FaTrash className="me-2" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DownloadList;