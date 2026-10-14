import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el punto de inicio de Oficia.');

createRoot(root).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // La PWA sigue disponible en línea aunque el navegador no admita service workers.
    });
  }, { once: true });
}
