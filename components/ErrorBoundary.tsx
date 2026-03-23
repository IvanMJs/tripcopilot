"use client";
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
  eventId?: string;
}

const FEEDBACK_URL =
  "mailto:support@tripcopilot.app?subject=Bug%20Report&body=Describe%20the%20issue%20here...";

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Conditionally report to Sentry if available at runtime
    import("@sentry/nextjs")
      .then((Sentry) => {
        const eventId = Sentry.captureException(error, {
          extra: { componentStack: info.componentStack },
        });
        this.setState({ eventId: String(eventId) });
      })
      .catch(() => {
        // Sentry not configured — silent failure is acceptable
      });
  }

  private handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-red-800/50 bg-red-950/30 p-8 text-center">
          <div className="mb-3 text-3xl">✈️</div>
          <p className="mb-1 text-base font-semibold text-red-300">
            TripCopilot encontró un problema
          </p>
          <p className="mb-1 text-sm text-gray-400">
            Something went wrong. Please retry or report the issue.
          </p>
          {this.state.error?.message && (
            <p className="mb-4 max-w-sm truncate rounded bg-red-900/30 px-2 py-1 font-mono text-xs text-red-400">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 active:scale-95"
            >
              Reintentar / Retry
            </button>
            <a
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-400 hover:text-white"
            >
              Reportar problema
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
