import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Frontend runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-gradient-to-br from-stone-100 via-white to-rose-50 px-6">
          <div className="max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl shadow-stone-200/50">
            <h1 className="text-2xl font-semibold text-rose-900">AI-CMS hit an unexpected frontend error</h1>
            <p className="mt-3 text-sm leading-6 text-rose-800">
              Reload the page and review the browser console. This frontend uses guarded empty, loading, and error states, but runtime issues can still surface when backend contracts change unexpectedly.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
