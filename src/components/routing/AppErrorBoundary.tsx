import React from "react";

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Unhandled application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-secondary px-6 text-center">
          <div className="max-w-xl rounded-xl border border-accent/60 bg-white p-8">
            <h1 className="text-3xl font-serif text-primary">Something went wrong.</h1>
            <p className="mt-3 text-sm text-accent-dark">
              Please refresh the page. If this keeps happening, return to the home page and try again.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-full border border-primary px-6 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-secondary"
              >
                Refresh page
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-medium text-secondary transition-colors hover:bg-accent-dark"
              >
                Back to home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
