import { motion } from 'framer-motion'
import { Mic, Radio } from 'lucide-react'

const stateStyles = {
  idle: {
    label: 'Idle',
    color: 'from-slate-500 to-slate-300',
    ring: 'rgba(148, 163, 184, 0.34)',
  },
  listening: {
    label: 'Listening',
    color: 'from-sky-500 to-cyan-200',
    ring: 'rgba(56, 189, 248, 0.44)',
  },
  processing: {
    label: 'Processing',
    color: 'from-emerald-500 to-lime-200',
    ring: 'rgba(52, 211, 153, 0.44)',
  },
  emergency: {
    label: 'Emergency',
    color: 'from-red-600 to-orange-200',
    ring: 'rgba(248, 113, 113, 0.54)',
  },
}

export default function VoiceOrb({ state = 'idle', onClick, size = 'large' }) {
  const style = stateStyles[state] ?? stateStyles.idle
  const dimensions = size === 'large' ? 'h-44 w-44' : 'h-28 w-28'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative mx-auto flex ${dimensions} items-center justify-center rounded-full`}
      aria-label={`Voice assistant ${style.label}. Tap to speak.`}
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: style.ring }}
        animate={{ scale: state === 'idle' ? [1, 1.04, 1] : [1, 1.22, 1], opacity: [0.55, 0.18, 0.55] }}
        transition={{ duration: state === 'idle' ? 2.4 : 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className={`relative flex h-[78%] w-[78%] items-center justify-center rounded-full bg-gradient-to-br ${style.color} text-slate-950 shadow-2xl`}
        animate={{ y: state === 'idle' ? [0, -4, 0] : [0, -8, 0] }}
        transition={{ duration: state === 'idle' ? 3 : 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {state === 'listening' ? <Radio className="h-12 w-12" aria-hidden="true" /> : <Mic className="h-12 w-12" aria-hidden="true" />}
      </motion.span>
    </button>
  )
}
