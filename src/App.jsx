import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import NavigationPage from './pages/NavigationPage'
import Onboarding from './pages/Onboarding'
import Settings from './pages/Settings'
import SosPage from './pages/SosPage'
import VisionPage from './pages/VisionPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vision" element={<VisionPage />} />
        <Route path="/navigation" element={<NavigationPage />} />
        <Route path="/sos" element={<SosPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
