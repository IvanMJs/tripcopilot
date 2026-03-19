"use client";
import React from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-center">
          <p className="text-red-400 text-sm font-medium mb-2">⚠️ Algo salió mal / Something went wrong</p>
          <p className="text-gray-500 text-xs">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Reintentar / Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
