import React, { useState, useEffect, useRef } from 'react';
import { IPC_EVENTS } from '../../../../shared/ipcChannels';

const DebugLogPanel = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const handleDebugLog = (logData) => {
      setLogs(prev => [...prev, logData].slice(-100));
    };

    if (window.api?.onDebugLog) {
      window.api.onDebugLog(handleDebugLog);
    }

    return () => {
      if (window.api?.removeListener) {
        window.api.removeListener(IPC_EVENTS.DEBUG_LOG);
      }
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 9999
        }}
        title="Show debug logs"
      >
        Debug Logs ({logs.length})
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      height: '300px',
      background: '#1a1a1a',
      color: '#ddd',
      border: '1px solid #444',
      borderRadius: '6px',
      padding: '10px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      fontSize: '11px',
      fontFamily: 'monospace'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #444', paddingBottom: '6px' }}>
        <strong style={{ color: '#fff' }}>Debug Logs ({logs.length})</strong>
        <div>
          <button
            onClick={() => setLogs([])}
            style={{
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              padding: '2px 8px',
              cursor: 'pointer',
              marginRight: '6px',
              fontSize: '10px'
            }}
            title="Clear logs"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
            title="Hide logs"
          >
            Close
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {logs.map((log, index) => (
          <div
            key={index}
            style={{
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            <span style={{ color: log.level === 'error' ? '#ff6b6b' : log.level === 'warn' ? '#ffd93d' : '#4dabf7' }}>
              [{log.timestamp}]
            </span>
            <span style={{ color: '#8ce99a' }}> [{log.source}]</span>
            <span style={{ color: log.level === 'error' ? '#ff6b6b' : log.level === 'warn' ? '#ffd93d' : '#fff' }}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default DebugLogPanel;