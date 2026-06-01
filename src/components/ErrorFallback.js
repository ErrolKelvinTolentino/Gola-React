import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorFallback({
  error,
  errorInfo,
  onRetry,
  componentName = 'component'
}) {
  return (
    <div
      style={{
        padding: '28px',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '16px',
        display: 'grid',
        gap: '12px',
        textAlign: 'center'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <AlertTriangle size={28} color="#ef4444" />
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
        {componentName} failed to load
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        {error?.message || 'An unexpected error occurred'}
      </div>

      {errorInfo?.componentStack && (
        <details
          style={{
            textAlign: 'left',
            padding: '10px 12px',
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: '10px'
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--muted)'
            }}
          >
            Technical details
          </summary>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              margin: '10px 0 0',
              fontSize: '0.78rem',
              color: 'var(--muted)'
            }}
          >
            {errorInfo.componentStack}
          </pre>
        </details>
      )}

      {onRetry && (
        <button
          type="button"
          className="primary-btn"
          onClick={onRetry}
          style={{
            justifySelf: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px'
          }}
        >
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </div>
  );
}
