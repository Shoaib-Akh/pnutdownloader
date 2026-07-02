import { useEffect, useRef, useState } from 'react'

const MAX_LOGS = 300
const DEBUG_MODE_STORAGE_KEY = 'pnut_debug_mode'

const readDebugMode = () => {
  try {
    return localStorage.getItem(DEBUG_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const normalizeLog = (value) => ({
  timestamp: value?.timestamp || new Date().toISOString(),
  level: value?.level || 'info',
  source: value?.source || 'app',
  message: value?.message ? String(value.message) : '(empty log message)',
  details: value?.details ? String(value.details) : '',
  downloadId: value?.downloadId || null,
})

const formatLog = (log) => {
  const id = log.downloadId ? ` [${log.downloadId}]` : ''
  const details = log.details ? `\n${log.details}` : ''
  return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}]${id} ${log.message}${details}`
}

const DebugLogPanel = () => {
  const [logs, setLogs] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(readDebugMode)
  const logsEndRef = useRef(null)
  const debugModeRef = useRef(isDebugMode)
  const errorCount = logs.filter((log) => log.level === 'error').length

  useEffect(() => {
    debugModeRef.current = isDebugMode
    try {
      localStorage.setItem(DEBUG_MODE_STORAGE_KEY, isDebugMode ? 'true' : 'false')
    } catch {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }, [isDebugMode])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.shiftKey || !(event.ctrlKey || event.metaKey)) return
      if (event.key?.toLowerCase() !== 'd') return

      event.preventDefault()
      setIsDebugMode(true)
      setIsVisible((current) => !current)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!window.api?.onDebugLog) return undefined

    const unsubscribe = window.api.onDebugLog((value) => {
      const log = normalizeLog(value)
      setLogs((previous) => [...previous, log].slice(-MAX_LOGS))
      if (log.level === 'error' && debugModeRef.current) {
        setIsVisible(true)
      }
    })

    return typeof unsubscribe === 'function' ? unsubscribe : undefined
  }, [])

  useEffect(() => {
    if (isVisible) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isVisible, logs])

  const copyLogs = async () => {
    const text = logs.map(formatLog).join('\n')

    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Could not copy debug logs:', error)
    }
  }

  const clearLogs = () => setLogs([])

  const toggleDebugMode = () => {
    setIsDebugMode((current) => !current)
  }

  const buttonStyle = {
    background: '#2f3437',
    color: '#fff',
    border: '1px solid #50585d',
    borderRadius: '4px',
    padding: '5px 9px',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2,
  }

  if (!isVisible) {
    if (!isDebugMode) return null

    return (
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        style={{
          ...buttonStyle,
          position: 'fixed',
          right: '16px',
          bottom: '16px',
          background: errorCount > 0 ? '#8f1f1f' : '#2f3437',
          zIndex: 9999,
        }}
        title="Open debug logs"
      >
        Logs ({logs.length})
      </button>
    )
  }

  return (
    <section
      aria-label="Download debug logs"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        width: 'min(760px, calc(100vw - 32px))',
        height: 'min(520px, calc(100vh - 32px))',
        background: '#151719',
        color: '#dfe7eb',
        border: '1px solid #4b555b',
        borderRadius: '8px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.45)',
        padding: '12px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontSize: '12px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
        <div>
          <strong style={{ color: '#fff' }}>Download debug logs</strong>
          <div style={{ color: '#aab4ba', marginTop: '3px' }}>
            {isDebugMode ? 'Debug mode is on. Ctrl+Shift+D toggles this panel.' : 'Debug mode is off.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={toggleDebugMode} style={buttonStyle}>
            {isDebugMode ? 'Debug on' : 'Debug off'}
          </button>
          <button type="button" onClick={copyLogs} disabled={logs.length === 0} style={buttonStyle}>
            Copy
          </button>
          <button type="button" onClick={clearLogs} style={buttonStyle}>
            Clear
          </button>
          <button type="button" onClick={() => setIsVisible(false)} style={buttonStyle}>
            Close
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #30373b', paddingTop: '8px' }}>
        {logs.length === 0 && (
          <div style={{ color: '#9ca8ae' }}>
            Start a download to collect diagnostic output.
          </div>
        )}
        {logs.map((log, index) => {
          const color = log.level === 'error' ? '#ff8b8b' : log.level === 'warn' ? '#ffd37a' : '#d7e3fc'
          return (
            <div
              key={`${log.timestamp}-${index}`}
              style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #262c30' }}
            >
              <div style={{ color }}>
                <span style={{ color: '#8bb8ff' }}>[{log.timestamp}]</span>{' '}
                <span style={{ color: '#8ce99a' }}>[{log.source}]</span>{' '}
                {log.downloadId && <span style={{ color: '#aab4ba' }}>[{log.downloadId}] </span>}
                <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{log.message}</span>
              </div>
              {log.details && (
                <pre style={{ margin: '5px 0 0', color: '#c4ced4', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {log.details}
                </pre>
              )}
            </div>
          )
        })}
        <div ref={logsEndRef} />
      </div>
    </section>
  )
}

export default DebugLogPanel
