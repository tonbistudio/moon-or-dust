import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} catch (err) {
  // If React fails to mount (e.g. import error, polyfill missing),
  // show a visible error instead of a blank screen
  console.error('[Moon or Dust] Fatal startup error:', err)
  rootElement.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#fff;font-family:system-ui,sans-serif;padding:20px;text-align:center;">
      <h1 style="font-size:24px;margin-bottom:12px;">Failed to load</h1>
      <p style="color:#888;margin-bottom:16px;max-width:500px;">${err instanceof Error ? err.message : 'Unknown error'}</p>
      <button onclick="window.location.reload()" style="padding:10px 24px;background:#7c3aed;border:none;border-radius:8px;color:#fff;font-size:14px;cursor:pointer;">
        Reload
      </button>
    </div>
  `
}

// Catch unhandled errors that escape React's error boundary
window.addEventListener('error', (event) => {
  console.error('[Moon or Dust] Unhandled error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Moon or Dust] Unhandled promise rejection:', event.reason)
})
