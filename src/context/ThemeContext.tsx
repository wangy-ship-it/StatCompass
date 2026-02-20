import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MQ = window.matchMedia('(prefers-color-scheme: dark)');

function getInitial(): ThemeMode {
  const stored = localStorage.getItem('sc-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return MQ.matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('sc-theme')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    MQ.addEventListener('change', onChange);
    return () => MQ.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    setMode((m) => {
      const next: ThemeMode = m === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sc-theme', next);
      return next;
    });
  };

  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
