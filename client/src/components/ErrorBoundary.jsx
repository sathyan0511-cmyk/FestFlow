import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FestFlow ErrorBoundary caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-campus-error-subtle text-campus-error border border-campus-error/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink-primary">Unable to load this section</h2>
          <p className="text-sm text-ink-muted mt-1.5 max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading this page.'}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={this.resetError}
              className="btn-accent"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <Link
              to="/"
              onClick={this.resetError}
              className="btn-secondary"
            >
              <Home className="w-4 h-4" /> Return to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
