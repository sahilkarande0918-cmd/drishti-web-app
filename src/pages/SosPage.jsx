import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MapPin, ShieldAlert, X } from 'lucide-react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { useVoice } from '../contexts/VoiceContext'
import { activateGuardianAlert } from '../services/sosService'

export default function SosPage() {
  const { profile } = useProfile()
  const { notify } = useToast()
  const { speak, setOrbState } = useVoice()
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)

  async function activateSos() {
    setLoading(true)
    setOrbState('emergency')
    try {
      const result = await activateGuardianAlert(profile)
      setAlert(result.alert)
      const message = result.alert.email
        ? 'Emergency SOS email sent to your guardian with your location.'
        : 'Emergency alert saved, but no guardian email is configured.'
      speak(message)
      notify(result.alert.email ? 'Emergency guardian email sent.' : 'SOS saved. Guardian email missing.', result.alert.email ? 'success' : 'error')
    } catch (error) {
      notify(error.message || 'Unable to activate SOS.', 'error')
      speak(error.message || 'Unable to activate SOS.')
      setOrbState('idle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Emergency"
        title="SOS safety system"
        description="Speak SOS and Drishti sends a GPS-backed emergency guardian message immediately."
      />

      <Card className="text-center">
        <p className="text-base font-semibold text-slate-300 sm:text-lg">Guardian</p>
        <p className="mt-1 text-2xl font-black text-white sm:mt-2 sm:text-3xl">{profile?.guardian?.name || 'Demo Guardian'}</p>
        <p className="mt-1 text-sm text-slate-300 sm:text-base">{profile?.guardian?.email || 'guardian@example.com'}</p>
        <button
          type="button"
          onClick={activateSos}
          disabled={loading}
          className="mx-auto mt-8 flex h-40 w-40 items-center justify-center rounded-full bg-red-600 text-4xl font-black text-white shadow-[0_0_60px_rgba(220,38,38,.55)] transition hover:bg-red-500 disabled:opacity-70 sm:mt-10 sm:h-56 sm:w-56 sm:text-5xl sm:shadow-[0_0_80px_rgba(220,38,38,.55)]"
          aria-label="Activate emergency SOS"
        >
          {loading ? <Loader2 className="h-12 w-12 animate-spin sm:h-16 sm:w-16" aria-hidden="true" /> : 'SOS'}
        </button>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
          This prototype requests browser location and stores an automatic guardian message in the emergency outbox.
        </p>
      </Card>

      <AnimatePresence>
        {alert && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="w-full max-w-xl rounded-lg border border-red-400/40 bg-red-950 p-4 text-white shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <ShieldAlert className="h-8 w-8 text-red-200 sm:h-10 sm:w-10" aria-hidden="true" />
                <button type="button" onClick={() => { setAlert(null); setOrbState('idle') }} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close SOS confirmation">
                  <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                </button>
              </div>
              <h2 className="mt-3 text-2xl font-black sm:mt-5 sm:text-3xl">Emergency alert activated</h2>
              <p className="mt-2 text-base leading-7 text-red-50 sm:mt-3 sm:text-lg sm:leading-8">
                The SOS alert was saved and an emergency guardian message was sent in the prototype outbox.
              </p>
              <a href={alert.mapsLink} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-black text-red-950 sm:mt-5 sm:gap-3 sm:px-4 sm:py-4 sm:text-base">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                Open Google Maps location
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
