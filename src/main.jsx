import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { PresentProvider } from './context/PresentContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PresentProvider>
        <App />
      </PresentProvider>
    </ThemeProvider>
  </React.StrictMode>
);
