import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { CompareProvider } from './context/CompareContext';
import { RecognizeProvider } from './context/RecognizeContext';

// PWA：注册 Service Worker（生产环境；base 路径兼容 GitHub Pages 子路径部署）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.warn('[pwa] SW 注册失败', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <CompareProvider>
        <RecognizeProvider>
          <App />
        </RecognizeProvider>
      </CompareProvider>
    </HashRouter>
  </StrictMode>,
);
