import React from 'react';
import ErrorFallback from './ErrorFallback';

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
            componentName={this.props.componentName}
          />
        );
      }
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          componentName={this.props.componentName}
        />
      );
    }
    return this.props.children;
  }
}
