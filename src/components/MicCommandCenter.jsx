import { Mic, Square, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import Card from './Card'
import VoiceOrb from './VoiceOrb'
import { useVoice } from '../contexts/VoiceContext'

export default function MicCommandCenter() {
  const { transcript, orbState, isListening, startListening, stopSpeaking, conversationLog } = useVoice()

  const recentLogs = conversationLog.slice(-6)

  return (
    <Card className="text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">AI voice assistant</p>

      {/* Status indicator */}
      <motion.p
        className="mt-2 text-xs font-bold uppercase tracking-widest"
        style={{
          color: orbState === 'listening' ? '#0891b2' :
                 orbState === 'processing' ? '#059669' :
                 orbState === 'emergency' ? '#dc2626' : '#64748b',
        }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: orbState === 'idle' ? 3 : 1.2, repeat: Infinity }}
      >
        {orbState === 'listening' ? '● LISTENING'
          : orbState === 'processing' ? '● THINKING...'
          : orbState === 'emergency' ? '● EMERGENCY'
          : '○ READY'}
      </motion.p>

      <div className="mt-4">
        <VoiceOrb state={orbState} onClick={startListening} />
      </div>
      <button
        type="button"
        onClick={startListening}
        className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-cyan-300 px-5 py-3 text-lg font-black text-slate-950 transition hover:bg-cyan-200"
      >
        <Mic className="h-6 w-6" aria-hidden="true" />
        {isListening ? 'Listening...' : 'Speak to Drishti'}
      </button>
      <button
        type="button"
        onClick={stopSpeaking}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-cyan-700/20 bg-white/75 px-5 py-3 text-base font-black text-slate-950 transition hover:bg-cyan-50"
      >
        <Square className="h-5 w-5" aria-hidden="true" />
        Stop / Interrupt
      </button>

      {/* Current transcript */}
      <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-left">
        <p className="text-sm font-bold text-slate-400">Current</p>
        <p className="mt-2 text-lg font-semibold leading-7 text-white">{transcript}</p>
      </div>

      {/* Conversation log */}
      {recentLogs.length > 0 && (
        <div className="mt-4 text-left">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Conversation</p>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {recentLogs.map((log) => (
              <div
                key={log.ts}
                className="rounded-lg px-3 py-2 text-sm leading-6"
                style={{
                  background: log.role === 'user'
                    ? 'rgba(14, 165, 233, 0.08)'
                    : 'rgba(16, 185, 129, 0.08)',
                  borderLeft: log.role === 'user'
                    ? '3px solid #0ea5e9'
                    : '3px solid #10b981',
                }}
              >
                <span className="text-xs font-bold uppercase" style={{ color: log.role === 'user' ? '#0284c7' : '#059669' }}>
                  {log.role === 'user' ? 'You' : 'Drishti'}
                </span>
                <p className="mt-0.5 font-medium text-slate-800">{log.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm leading-6 text-slate-300">
        Speak naturally. I can answer questions, send emails, open the camera, describe scenes, navigate, or help in emergencies.
      </p>
    </Card>
  )
}
