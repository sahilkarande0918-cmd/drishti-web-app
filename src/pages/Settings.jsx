import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { useVoice } from '../contexts/VoiceContext'

export default function Settings() {
  const { profile, settings, saveProfile, updateSettings } = useProfile()
  const { notify } = useToast()
  const { speak } = useVoice()
  const [guardian, setGuardian] = useState({
    name: profile?.guardian?.name || '',
    email: profile?.guardian?.email || '',
    phone: profile?.guardian?.phone || '',
  })

  async function saveGuardian(event) {
    event.preventDefault()
    try {
      await saveProfile({
        name: profile?.name || 'Demo User',
        email: profile?.email || '',
        guardian,
      })
      notify('Guardian updated.', 'success')
      speak('Guardian information has been updated.')
    } catch (error) {
      notify(error.message || 'Unable to update guardian.', 'error')
    }
  }

  async function updateSpeech(nextSettings) {
    try {
      await updateSettings(nextSettings)
      notify('Voice settings saved.', 'success')
    } catch (error) {
      notify(error.message || 'Unable to save settings.', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Voice and guardian controls"
        description="Tune speech feedback for demos and manage the safety contact used by SOS."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-black">Speech feedback</h2>
          <label className="mt-6 grid gap-3 text-lg font-bold">
            Speech speed: {settings.speech_rate}
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.1"
              value={settings.speech_rate}
              onChange={(event) => updateSpeech({ speech_rate: Number(event.target.value) })}
              className="w-full accent-cyan-300"
            />
          </label>
          <label className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-lg font-bold">
            Voice feedback
            <input
              type="checkbox"
              checked={settings.voice_enabled}
              onChange={(event) => updateSpeech({ voice_enabled: event.target.checked })}
              className="h-7 w-7 accent-cyan-300"
            />
          </label>
          <Button type="button" className="mt-6 w-full" onClick={() => speak('Drishti voice feedback is working clearly.')}>
            <Volume2 className="h-5 w-5" aria-hidden="true" />
            Test Voice
          </Button>
        </Card>

        <Card>
          <h2 className="text-2xl font-black">Guardian information</h2>
          <form onSubmit={saveGuardian} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-lg font-bold">
              Guardian name
              <input required value={guardian.name} onChange={(event) => setGuardian((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-4 text-white" />
            </label>
            <label className="grid gap-2 text-lg font-bold">
              Guardian email
              <input required type="text" inputMode="email" pattern="[^@\s]+@[^@\s]+\.[^@\s]+" value={guardian.email} onChange={(event) => setGuardian((current) => ({ ...current, email: event.target.value }))} className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-4 text-white" />
            </label>
            <label className="grid gap-2 text-lg font-bold">
              Guardian phone
              <input value={guardian.phone} onChange={(event) => setGuardian((current) => ({ ...current, phone: event.target.value }))} className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-4 text-white" />
            </label>
            <Button type="submit">Save Guardian</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
