import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Daftarkan service worker agar PetCare ERP bisa di-install sebagai PWA
// (Add to Home Screen) dan tetap bisa dibuka saat koneksi klinik tidak stabil.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Gagal mendaftarkan service worker:', err);
    });
  });
}
