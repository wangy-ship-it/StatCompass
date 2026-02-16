import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const MQ = window.matchMedia('(prefers-color-scheme: dark)');

function getInitial() {
  const stored = localStorage.getItem('sc-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return MQ.matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitial);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  // Follow system changes when user hasn't explicitly chosen
  useEffect(() => {
    const onChange = (e) => {
      if (!localStorage.getItem('sc-theme')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    MQ.addEventListener('change', onChange);
    return () => MQ.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sc-theme', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
