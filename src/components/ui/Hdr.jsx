import { useState } from 'react';

export default function Hdr({ sub, children }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[var(--color-accent-faint)] uppercase tracking-[0.15em] font-medium">{sub}</div>
        <button
          onClick={copyLink}
          className="text-[11px] text-[var(--svg-text-faint)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors flex items-center gap-1"
          aria-label="Copy link to this module"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 11V3.5C3 2.67 3.67 2 4.5 2H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span>Share</span>
            </>
          )}
        </button>
      </div>
      <div className="text-[28px] sm:text-[32px] font-semibold text-[var(--color-text-primary)] mt-1 leading-tight tracking-tight">{children}</div>
    </div>
  );
}
