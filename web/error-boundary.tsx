import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/** Keep a render failure from turning the entire single-page app into a blank screen. */
export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ProSeU application rendering error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
          <h1 className="text-xl font-semibold">ProSeU could not finish loading</h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            A page component encountered an error. Your account permissions have not been changed.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Reload ProSeU
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
