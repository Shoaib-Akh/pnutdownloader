import React, { Component } from 'react'

/**
 * ErrorBoundary - Catches React component errors and displays fallback UI
 * Prevents entire app from crashing due to component-level errors
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Track error event if available
    if (window.api?.trackEvent) {
      try {
        window.api.trackEvent('react_error', {
          error: error?.message || String(error),
          componentStack: errorInfo?.componentStack || ''
        })
      } catch (e) {
        console.warn('Failed to track error event:', e)
      }
    }
    
    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong', fallbackMessage = 'An error occurred while rendering this component.' } = this.props

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            padding: '20px',
            backgroundColor: 'var(--pnut-danger-soft)',
            border: '1px solid var(--pnut-danger)',
            borderRadius: '8px',
            margin: '10px',
            fontFamily: 'var(--font-body)'
          }}
        >
          <div
            style={{
              fontSize: '24px',
              marginBottom: '10px',
              color: 'var(--pnut-danger)'
            }}
          >
            ⚠️
          </div>
          <h3
            style={{
              fontSize: '18px',
              color: 'var(--pnut-text)',
              marginBottom: '8px'
            }}
          >
            {fallbackTitle}
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--pnut-muted)',
              marginBottom: '16px',
              textAlign: 'center'
            }}
          >
            {fallbackMessage}
          </p>
          
          {/* Error details for debugging (only in development) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                width: '100%',
                maxWidth: '400px',
                marginBottom: '16px',
                padding: '10px',
                backgroundColor: 'var(--pnut-surface)',
                border: '1px solid var(--pnut-border)',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                overflow: 'auto'
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details
              </summary>
              <pre
                style={{
                  marginTop: '10px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <pre
                  style={{
                    marginTop: '10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--pnut-brand)'
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--pnut-button-bg)',
                color: 'var(--pnut-button-text)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--pnut-success)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

/**
 * Higher-Order Component wrapper for functional components
 * Usage: withErrorBoundary(YourComponent, { fallbackTitle: 'Error' })
 */
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

/**
 * Hook for functional components to trigger error boundary
 * Usage: const triggerError = useErrorBoundary()
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState(null)

  const triggerError = React.useCallback((error) => {
    setError(error)
    // This will cause the ErrorBoundary to catch it
    throw error
  }, [])

  return { error, triggerError }
}
