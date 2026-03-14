"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";

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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          role="alert"
          className="glass-panel glow-error flex flex-col items-center justify-center gap-4 rounded-xl p-8"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -12, 12, -6, 6, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-severity-critical/10"
          >
            <svg
              className="h-6 w-6 text-severity-critical"
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
          </motion.div>
          <p className="text-xs font-semibold uppercase tracking-widest text-severity-critical">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </p>
          <p className="max-w-xs text-center text-xs text-text-muted">
            {this.state.error?.message ?? "An unexpected error occurred. Try reloading this panel."}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-1 rounded-lg border border-border-subtle bg-elevated px-5 py-2 text-xs text-text-secondary transition-colors hover:bg-overlay hover:text-text-primary hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            Reload Panel
          </motion.button>
        </motion.div>
      );
    }

    return this.props.children;
  }
}