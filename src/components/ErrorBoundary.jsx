import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // Optionally: send to error tracking service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.FallbackComponent) {
        return (
          <this.props.FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
          />
        );
      }
      return (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--line)'
        }}>
          <h3 style={{ color: '#ef4444' }}>Something went wrong</h3>
          <p style={{ color: 'var(--muted)', margin: '12px 0' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button className="primary-btn" onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
