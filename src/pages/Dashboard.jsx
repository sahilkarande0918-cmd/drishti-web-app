import { useEffect, useRef } from 'react'
import { Camera, MapPinned, Settings, ShieldAlert } from 'lucide-react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useProfile } from '../contexts/ProfileContext'
import { useVoice } from '../contexts/VoiceContext'

const actions = [
  { to: '/vision', icon: Camera, title: 'AI Vision', text: 'Describe scenes and read signs.', voice: '"Open camera"' },
  { to: '/navigation', icon: MapPinned, title: 'Navigation', text: 'Live GPS turn-by-turn guidance.', voice: '"Guide me to..."' },
  { to: '/sos', icon: ShieldAlert, title: 'Emergency SOS', text: 'Instant guardian alert with GPS.', voice: '"SOS"' },
  { to: '/settings', icon: Settings, title: 'Settings', text: 'Voice and guardian settings.', voice: '"Open settings"' },
]

export default function Dashboard() {
  const { profile } = useProfile()
  const { speak, startListening } = useVoice()
  const autoStartedRef = useRef(false)

  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    const name = profile?.name || ''
    const greeting = name
      ? `Welcome back, ${name}. I'm Drishti, your AI assistant. I'm listening. What would you like to do?`
      : `Welcome to Drishti. I'm your AI assistant. I'm listening. What would you like to do?`

    const timer = window.setTimeout(() => {
      speak(greeting, {
        onend: () => { startListening() },
      })
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome${profile?.name ? `, ${profile.name}` : ''}`}
        description="Speak naturally — ask questions, send emails, navigate, or say SOS."
      />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.to} className="h-full">
              <Icon className="h-7 w-7 text-cyan-200 sm:h-9 sm:w-9" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-black text-white sm:mt-5 sm:text-2xl">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300 sm:mt-3 sm:text-base sm:leading-7">{action.text}</p>
              <p className="mt-3 rounded-lg bg-cyan-300 px-4 py-2.5 text-center text-sm font-bold text-slate-950 sm:mt-5 sm:px-5 sm:py-3 sm:text-base">
                Say: {action.voice}
              </p>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4 sm:mt-6">
        <h2 className="text-xl font-black sm:text-2xl">Guardian status</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300 sm:mt-3 sm:text-lg sm:leading-8">
          {profile?.guardian?.name
            ? `${profile.guardian.name} (${profile.guardian.email || 'no email'}) is your emergency guardian.`
            : 'No guardian yet. Complete onboarding or update settings.'}
        </p>
      </Card>

      <Card className="mt-4 sm:mt-6">
        <h2 className="text-xl font-black sm:text-2xl">Voice commands</h2>
        <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
          {[
            '"Send email" — message your guardian',
            '"SOS" — emergency email with GPS',
            '"Open camera" — activate webcam',
            '"Stop camera" — close webcam',
            '"Guide me to [place]" — live navigation',
            '"Describe scene" — AI describes camera',
            '"Where am I" — speaks your location',
            '"Help" — list all commands',
          ].map((cmd) => (
            <p key={cmd} className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-xs leading-5 text-slate-100 sm:p-3 sm:text-sm sm:leading-6">
              {cmd}
            </p>
          ))}
        </div>
      </Card>
    </div>
  )
}
