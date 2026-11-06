import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/pwa/registerServiceWorker'

// Register Progressive Web App Service Worker
registerServiceWorker().catch(() => {
  // Service Worker initialization gracefully handled
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
