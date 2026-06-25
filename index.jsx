import { useEffect, useRef, useState } from 'react'

const MAX_LOGS = 250

const normalizeLog = (value) => ({
  timestamp: value?.timestamp || new Date().toISOString(),
  level: value?.level || 'info',
  source: value?.source || 'app',
  message: value?.message ? String(value.message) : '(empty log message)',
  details: value?.details ? String(value.details) : '',
  downloadId: value?.downloadId || null,
})

const DebugLogPanel = () => {
  const [logs, setLogs] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const logsEndRef = useRef(null)
  const errorCount = logs.filter((log) => log.level === 'error').length
console.log("errorCount",errorCount);


  useEffect(() => {
    if (!window.api?.onDebugLog) return undefined

    const unsubscribe = window.api.onDebugLog((value) => {
      const log = normalizeLog(value)
      setLogs((previous) => [...previous, log].slice(-MAX_LOGS))
      if (log.level === 'error') setIsVisible(true)
    })

    return typeof unsubscribe === 'function' ? unsubscribe : undefined
  }, [])

  useEffect(() => {
    if (isVisible) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isVisible, logs])

  const copyLogs = async () => {
    const text = logs
      .map((log) => {
        const id = log.downloadId ? ` [${log.downloadId}]` : ''
        const details = log.details ? `\n${log.details}` : ''
        return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}]${id} ${log.message}${details}`
      })
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Could not copy debug logs:', error)
    }
  }

  const buttonStyle = {
    background: '#3b3b3b',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '11px',
  }

  if (!isVisible) {
    return (
      // <button
      //   type="button"
      //   onClick={() => setIsVisible(true)}
      //   style={{
      //     ...buttonStyle,
      //     position: 'fixed',
      //     bottom: '20px',
      //     right: '20px',
      //     padding: '8px 12px',
      //     background: errorCount > 0 ? '#a61b1b' : '#333',
      //     zIndex: 9999,
      //   }}
      //   title="Show production download logs"
      // >
      //   Download logs ({logs.length}){errorCount > 0 ? ` • ${errorCount} errors` : ''}
      // </button>
      <></>
    )
  }

  return (
    // <section
    //   aria-label="Download debug logs"
    //   style={{
    //     position: 'fixed',
    //     bottom: '20px',
    //     right: '20px',
    //     width: 'min(680px, calc(100vw - 40px))',
    //     height: 'min(440px, calc(100vh - 40px))',
    //     background: '#151515',
    //     color: '#ddd',
    //     border: '1px solid #555',
    //     borderRadius: '8px',
    //     boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
    //     padding: '12px',
    //     zIndex: 9999,
    //     display: 'flex',
    //     flexDirection: 'column',
    //     fontSize: '12px',
    //     fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    //   }}
    // >
    //   <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
    //     <div>
    //       <strong style={{ color: '#fff' }}>Production download logs</strong>
    //       <div style={{ color: '#aaa', marginTop: '2px' }}>
    //         Raw yt-dlp output is shown here. The panel opens automatically on an error.
    //       </div>
    //     </div>
    //     <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
    //       <button type="button" onClick={copyLogs} disabled={logs.length === 0} style={buttonStyle}>Copy</button>
    //       <button type="button" onClick={() => setLogs([])} style={buttonStyle}>Clear</button>
    //       <button type="button" onClick={() => setIsVisible(false)} style={buttonStyle}>Close</button>
    //     </div>
    //   </header>

    //   <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #333', paddingTop: '8px' }}>
    //     {logs.length === 0 && <div style={{ color: '#999' }}>Start a download to collect diagnostic output.</div>}
    //     {logs.map((log, index) => {
    //       const color = log.level === 'error' ? '#ff7474' : log.level === 'warn' ? '#ffd166' : '#d7e3fc'
    //       return (
    //         <div
    //           key={`${log.timestamp}-${index}`}
    //           style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #292929' }}
    //         >
    //           <div style={{ color }}>
    //             <span style={{ color: '#8bb8ff' }}>[{log.timestamp}]</span>{' '}
    //             <span style={{ color: '#8ce99a' }}>[{log.source}]</span>{' '}
    //             {log.downloadId && <span style={{ color: '#aaa' }}>[{log.downloadId}] </span>}
    //             <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{log.message}</span>
    //           </div>
    //           {log.details && (
    //             <pre style={{ margin: '5px 0 0', color: '#bbb', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
    //               {log.details}
    //             </pre>
    //           )}
    //         </div>
    //       )
    //     })}
    //     <div ref={logsEndRef} />
    //   </div>
    // </section>
    <></>
  )
}

export default DebugLogPanel
