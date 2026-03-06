"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary] ${this.props.fallbackTitle ?? "Panel"}:`,
      error,
      info,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-surface p-8">
          <div className="h-10 w-10 rounded-full bg-severity-critical/10 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-severity-critical"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-widest text-severity-critical">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </p>
          <p className="max-w-xs text-center text-xs text-text-muted">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-1 rounded border border-border-subtle bg-elevated px-4 py-1.5 text-xs text-text-secondary transition-colors hover:bg-overlay hover:text-text-primary"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
