import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { ProfileProvider } from './contexts/ProfileContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { VoiceProvider } from './contexts/VoiceContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ProfileProvider>
          <VoiceProvider>
            <App />
          </VoiceProvider>
        </ProfileProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
