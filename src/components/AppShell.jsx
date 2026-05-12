import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ChevronUp, LifeBuoy, Mic, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import MicCommandCenter from './MicCommandCenter'
import { useVoice } from '../contexts/VoiceContext'

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isListening, startListening, orbState } = useVoice()

  return (
    <div className="app-bg min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <NavLink to="/dashboard" className="flex items-center gap-2 sm:gap-3" aria-label="Drishti dashboard">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 sm:h-12 sm:w-12">
              <LifeBuoy className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-normal text-white sm:text-2xl">Drishti</span>
              <span className="hidden text-sm font-semibold text-cyan-200 sm:block">AI accessibility assistant</span>
            </span>
          </NavLink>
          <p className="hidden text-right text-sm font-bold text-slate-400 sm:block">Voice-first mode</p>

          {/* Mobile mic quick button */}
          <button
            type="button"
            onClick={startListening}
            className="flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            style={{
              background: isListening
                ? 'linear-gradient(135deg, #38bdf8, #22d3ee)'
                : 'linear-gradient(135deg, #67e8f9, #a7f3d0)',
            }}
            aria-label="Start listening"
          >
            <Mic className="h-5 w-5 text-slate-900" />
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 has-mobile-bar">
        <div className="min-w-0">
          <Outlet />
        </div>
        {/* Desktop sidebar */}
        <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <MicCommandCenter />
        </aside>
      </main>

      {/* ── Mobile floating bottom bar ──────────────────────── */}
      <div className="lg:hidden">
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t"
              style={{
                borderColor: 'rgba(14, 116, 144, 0.14)',
                background: 'rgba(246, 251, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#087c8f' }}>Voice Assistant</p>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: 'rgba(14, 116, 144, 0.08)' }}
                  aria-label="Close voice panel"
                >
                  <X className="h-5 w-5" style={{ color: '#5b7188' }} />
                </button>
              </div>
              <div className="px-4 pb-4">
                <MicCommandCenter />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed bottom bar */}
        {!mobileOpen && (
          <div className="mobile-mic-bar flex items-center gap-3">
            <button
              type="button"
              onClick={startListening}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950"
              style={{ background: 'linear-gradient(135deg, #67e8f9, #a7f3d0)' }}
            >
              <motion.div
                animate={orbState === 'listening' ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Mic className="h-5 w-5" />
              </motion.div>
              {isListening ? 'Listening...' : 'Speak to Drishti'}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'rgba(14, 116, 144, 0.18)',
                background: 'rgba(255,255,255,0.8)',
              }}
              aria-label="Open voice panel"
            >
              <ChevronUp className="h-5 w-5" style={{ color: '#5b7188' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
