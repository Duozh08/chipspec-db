import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { CompareProvider } from './context/CompareContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <CompareProvider>
        <App />
      </CompareProvider>
    </HashRouter>
  </StrictMode>,
);
