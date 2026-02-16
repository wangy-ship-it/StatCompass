import { createContext, useContext, useState, useEffect } from 'react';

const PresentContext = createContext();

function getInitial() {
  // Check URL search param first (separate from hash-based routing)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('present') === '1') return true;
  // Then check localStorage
  return localStorage.getItem('sc-present') === '1';
}

export function PresentProvider({ children }) {
  const [presenting, setPresenting] = useState(getInitial);

  useEffect(() => {
    localStorage.setItem('sc-present', presenting ? '1' : '0');
  }, [presenting]);

  const toggle = () => setPresenting((p) => !p);

  return (
    <PresentContext.Provider value={{ presenting, toggle }}>
      {children}
    </PresentContext.Provider>
  );
}

export function usePresent() {
  return useContext(PresentContext);
}
