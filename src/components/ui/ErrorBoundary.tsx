import { Component, type ReactNode } from 'react';
import { colors } from '../../styles/theme';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--fill-red)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4m0 4h.01" stroke={colors.red} strokeWidth="2" strokeLinecap="round" />
            <path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke={colors.red}
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
        <div className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-2">
          This module failed to render
        </div>
        <div className="text-[13px] text-[var(--svg-text-faint)] mb-6 max-w-[360px] leading-relaxed">
          {this.state.error?.message || 'An unexpected error occurred.'}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors"
          style={{
            background: 'var(--fill-indigo)',
            color: colors.indigo,
            border: '1px solid var(--border-indigo)',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
