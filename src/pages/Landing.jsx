import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Brain, MapPinned, Mic, ShieldAlert, Sparkles } from 'lucide-react'
import Card from '../components/Card'
import VoiceOrb from '../components/VoiceOrb'

const features = [
  { icon: Mic, title: 'Voice-first control', text: 'Hands-free commands for location, scene description, text reading, and help.' },
  { icon: Brain, title: 'Gemini vision', text: 'Image understanding tuned for obstacles, hazards, signs, people, and surroundings.' },
  { icon: ShieldAlert, title: 'Emergency SOS', text: 'Browser GPS, guardian profile, alert storage, and instant spoken feedback.' },
  { icon: MapPinned, title: 'Accessible routing', text: 'OpenStreetMap and OSRM walking routes for realistic navigation demos.' },
]

export default function Landing() {
  return (
    <div className="ambient-bg min-h-screen text-white">
      <section
        className="relative min-h-[88vh] overflow-hidden"
        style={{
          background:
            'linear-gradient(120deg, rgba(255,255,255,.92), rgba(238,251,255,.84) 48%, rgba(228,255,246,.74))',
        }}
      >
        <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
          <Link to="/" className="text-xl font-black sm:text-2xl">Drishti</Link>
          <nav className="flex gap-2 sm:gap-3">
            <Link to="/onboarding" className="rounded-lg border border-cyan-700/20 bg-white/70 px-3 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-cyan-50 sm:px-4 sm:py-3">
              Start Demo
            </Link>
          </nav>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-4 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-700/20 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              Accessibility MVP
            </p>
            <h1 className="mt-5 text-3xl font-black leading-[1.08] text-white sm:mt-7 sm:text-5xl lg:text-6xl xl:text-7xl">
              Drishti - AI Vision Assistance for the Blind
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:mt-6 sm:text-xl sm:leading-9">
              Voice-powered safety, navigation, and AI assistance designed for visually impaired users.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                to="/onboarding"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Launch Prototype
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-cyan-700/20 bg-white/80 px-5 py-3 text-base font-bold text-slate-50 shadow-sm transition hover:bg-cyan-50"
              >
                Skip to Dashboard
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="glass rounded-lg p-4 sm:p-6"
          >
            <VoiceOrb state="listening" />
            <div className="mt-4 rounded-lg bg-slate-950/75 p-4 sm:mt-6 sm:p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">Live command</p>
              <p className="mt-2 text-xl font-black sm:mt-3 sm:text-2xl">&quot;Describe surroundings&quot;</p>
              <p className="mt-2 text-sm leading-6 text-slate-300 sm:mt-3 sm:text-base sm:leading-7">
                Path ahead is clear. A glass door is six meters forward. One person is passing on your right.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <Icon className="h-7 w-7 text-cyan-200 sm:h-8 sm:w-8" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-black sm:mt-5 sm:text-xl">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300 sm:mt-3 sm:text-base sm:leading-7">{feature.text}</p>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
