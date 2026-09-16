// Last-line-of-defence error boundary mounted at the router root. A render
// failure inside one route shouldn't blank the whole app — we degrade to a
// readable message and a reload button, and ship the failure to GlitchTip
// so the team sees the error before the user has to report it.

import * as Sentry from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Forward to GlitchTip with the React component-stack as extra
    // context, so the issue page shows where in the tree the error
    // originated. The SDK is a no-op when ``VITE_SENTRY_DSN`` is
    // unset — safe to call unconditionally.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
    // eslint-disable-next-line no-console -- intentional dev fallback
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
        <div className="max-w-[480px] text-center">
          <div className="mb-3 font-mono text-[12px] uppercase tracking-[2px] text-warn">
            · something broke ·
          </div>
          <h1 className="font-serif text-[28px]">
            A page in this reading surface failed to render.
          </h1>
          <p className="mt-3 font-serif italic text-ink-soft">
            {this.state.error.message || "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 cursor-pointer border border-rule bg-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1.6px] text-ink-soft"
          >
            reload
          </button>
        </div>
      </div>
    );
  }
}
