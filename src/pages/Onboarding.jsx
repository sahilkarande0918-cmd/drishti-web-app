import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mic, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../components/Card'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'

/* ── config ───────────────────────────────────────────────── */
const xaiApiKey = import.meta.env.VITE_XAI_API_KEY
const xaiChatModel = import.meta.env.VITE_XAI_CHAT_MODEL || 'grok-4.3'

const STEPS = [
  { key: 'name', prompt: 'Welcome to Drishti. Let\'s set you up. Please speak your name.', label: 'Your Name', field: 'name', isEmail: false },
  { key: 'email', prompt: 'Now, please speak your email address slowly. For example, say sahil at gmail dot com.', label: 'Your Email', field: 'email', isEmail: true },
  { key: 'guardianName', prompt: 'Next, please speak your guardian\'s name.', label: 'Guardian Name', field: 'guardianName', isEmail: false },
  { key: 'guardianEmail', prompt: 'Finally, speak your guardian\'s email address.', label: 'Guardian Email', field: 'guardianEmail', isEmail: true },
]

/* ── Grok API helper ──────────────────────────────────────── */
async function callGrok(systemPrompt, userMessage) {
  if (!xaiApiKey) return null
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: xaiChatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        temperature: 0.15,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch { return null }
}

/* ── AI: interpret spoken email into real email ───────────── */
async function interpretEmail(spokenText) {
  const system = `You are an email address interpreter. The user spoke an email address out loud and speech recognition captured it as text.
Convert the spoken text into a valid email address.

Common patterns:
- "sahil at gmail dot com" → sahil@gmail.com  
- "sahil underscore k at yahoo dot com" → sahil_k@yahoo.com
- "john 123 at outlook dot com" → john123@outlook.com
- "sahilkarande0918 at gmail.com" → sahilkarande0918@gmail.com
- Numbers may be spoken as words: "nine one eight" → 918

Rules:
- Remove ALL spaces from the email
- "at" or "at the rate" → @
- "dot" → .
- Convert spoken numbers to digits
- If it already looks like an email, clean it up
- Return ONLY the email address, nothing else. No quotes, no explanation.`

  const result = await callGrok(system, `Spoken text: "${spokenText}"`)
  if (result && result.includes('@')) return result.trim().toLowerCase()

  // Fallback: basic sanitization
  return spokenText
    .toLowerCase()
    .replace(/\s+at\s+the\s+rate\s+/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s+dot\s+/gi, '.')
    .replace(/\s+underscore\s+/gi, '_')
    .replace(/\s+hyphen\s+/gi, '-')
    .replace(/\s+dash\s+/gi, '-')
    .replace(/\s/g, '')
    .replace(/,/g, '')
}

/* ── AI: check if user confirmed yes/no ──────────────────── */
async function interpretConfirmation(spokenText) {
  const system = `The user was asked to confirm something (yes/no question). Determine their intent from their speech.
Return ONLY one word: "yes", "no", or "unclear". Nothing else.

Examples:
- "yes" → yes
- "yeah" → yes  
- "yep" → yes
- "that's correct" → yes
- "sure" → yes
- "ok" → yes
- "okay" → yes
- "right" → yes
- "no" → no
- "nope" → no
- "wrong" → no
- "not right" → no
- "again" → no
- "repeat" → no`

  const result = await callGrok(system, `User said: "${spokenText}"`)
  if (result) {
    const clean = result.toLowerCase().trim()
    if (clean.includes('yes')) return 'yes'
    if (clean.includes('no')) return 'no'
  }

  // Fallback
  const lower = spokenText.toLowerCase()
  const yesWords = ['yes', 'yeah', 'yep', 'yup', 'sure', 'correct', 'right', 'ok', 'okay', 'confirm', 'fine', 'good']
  const noWords = ['no', 'nope', 'nah', 'wrong', 'incorrect', 'again', 'repeat', 'redo']
  if (yesWords.some(w => lower.includes(w))) return 'yes'
  if (noWords.some(w => lower.includes(w))) return 'no'
  return 'unclear'
}

/* ── female voice ─────────────────────────────────────────── */
function getFemaleVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const tests = [
    v => v.name.includes('Zira'), v => v.name.includes('Susan'),
    v => v.name.includes('Samantha'), v => v.name.includes('Karen'),
    v => v.name.includes('Google') && v.name.includes('Female'),
    v => v.name.includes('Google UK English Female'),
    v => v.lang.startsWith('en') && !['David', 'Mark', 'James', 'Male'].some(m => v.name.includes(m)),
  ]
  for (const test of tests) { const v = voices.find(test); if (v) return v }
  return voices.find(v => v.lang.startsWith('en')) || null
}

/* ══════════════════════════════════════════════════════════ */
/*  COMPONENT — uses refs for ALL mutable logic, no circular deps */
/* ══════════════════════════════════════════════════════════ */

export default function Onboarding() {
  const navigate = useNavigate()
  const { saveProfile } = useProfile()
  const { notify } = useToast()

  // ── UI state (for rendering) ──
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState({ name: '', email: '', guardianName: '', guardianEmail: '' })
  const [phase, setPhase] = useState('idle') // idle | speaking | listening | thinking | saving
  const [started, setStarted] = useState(false)
  const [lastHeard, setLastHeard] = useState('')
  const [statusText, setStatusText] = useState('')

  // ── Refs (source of truth for callbacks) ──
  const stepRef = useRef(0)
  const formRef = useRef({ name: '', email: '', guardianName: '', guardianEmail: '' })
  const waitingConfirmRef = useRef(false)
  const mountedRef = useRef(true)
  const recRef = useRef(null)
  const voiceRef = useRef(null)

  // ── Load female voice ──
  useEffect(() => {
    const load = () => { voiceRef.current = getFemaleVoice() }
    load()
    window.speechSynthesis?.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load)
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      try { recRef.current?.abort?.() } catch { /* */ }
      window.speechSynthesis?.cancel()
    }
  }, [])

  /* ── TTS ─────────────────────────────────────────────────── */
  function speakText(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !mountedRef.current) { resolve(); return }
      window.speechSynthesis.cancel()
      setPhase('speaking')
      setStatusText('🔊 Speaking...')
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = 0.92
      u.pitch = 1.1
      if (voiceRef.current) u.voice = voiceRef.current
      u.onend = () => { if (mountedRef.current) { setStatusText(''); setPhase('idle') } resolve() }
      u.onerror = () => { if (mountedRef.current) { setStatusText(''); setPhase('idle') } resolve() }
      window.speechSynthesis.speak(u)
    })
  }

  /* ── Listen for one utterance ────────────────────────────── */
  function listenForSpeech() {
    return new Promise((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) { notify('Speech not supported. Use Chrome.', 'error'); resolve(''); return }

      try { recRef.current?.abort?.() } catch { /* */ }

      // Delay to let mic release from TTS
      setTimeout(() => {
        if (!mountedRef.current) { resolve(''); return }

        const rec = new SR()
        rec.lang = 'en-IN'
        rec.interimResults = true
        rec.continuous = false
        recRef.current = rec
        let finalText = ''
        let resolved = false

        const done = (text) => {
          if (resolved) return
          resolved = true
          recRef.current = null
          if (mountedRef.current) { setPhase('idle'); setStatusText('') }
          resolve(text)
        }

        rec.onstart = () => {
          if (mountedRef.current) { setPhase('listening'); setStatusText('🎤 Listening...') }
        }

        rec.onresult = (e) => {
          const txt = Array.from(e.results).map(r => r[0].transcript).join(' ')
          if (mountedRef.current) setLastHeard(txt)
          if (e.results[e.results.length - 1].isFinal) {
            finalText = txt.trim()
            try { rec.stop() } catch { /* */ }
          }
        }

        rec.onerror = (e) => {
          if (e.error === 'no-speech' || e.error === 'aborted') {
            done('') // Will trigger retry in the flow
          } else {
            if (mountedRef.current) notify('Microphone error. Check permissions.', 'error')
            done('')
          }
        }

        rec.onend = () => { done(finalText) }

        try { rec.start() } catch { done('') }
      }, 350)
    })
  }

  /* ── main onboarding flow (sequential, async) ───────────── */
  async function runOnboardingFlow() {
    for (let i = 0; i < STEPS.length; i++) {
      if (!mountedRef.current) return
      const s = STEPS[i]
      stepRef.current = i
      setStepIndex(i)
      waitingConfirmRef.current = false

      // Speak the prompt
      await speakText(s.prompt)

      // Keep trying until we get a confirmed value
      let confirmed = false
      while (!confirmed && mountedRef.current) {
        waitingConfirmRef.current = false

        // Listen for value
        let value = ''
        while (!value && mountedRef.current) {
          value = await listenForSpeech()
        }
        if (!mountedRef.current) return

        // If it's an email, use AI to interpret
        if (s.isEmail) {
          setPhase('thinking')
          setStatusText('🧠 Interpreting email...')
          value = await interpretEmail(value)
          if (mountedRef.current) setPhase('idle')
        }

        // Store the value
        formRef.current = { ...formRef.current, [s.field]: value }
        setForm({ ...formRef.current })
        waitingConfirmRef.current = true

        // Read back and ask for confirmation
        const readback = s.isEmail
          ? `I heard ${value.split('').join(' ')}. Is that correct?`
          : `I heard ${value}. Is that correct? Say yes or no.`
        await speakText(readback)

        // Listen for yes/no
        let answer = ''
        while (!answer && mountedRef.current) {
          answer = await listenForSpeech()
        }
        if (!mountedRef.current) return

        // Use AI to determine yes/no
        setPhase('thinking')
        setStatusText('🧠 Processing...')
        const intent = await interpretConfirmation(answer)
        if (mountedRef.current) setPhase('idle')

        if (intent === 'yes') {
          confirmed = true
          if (i < STEPS.length - 1) {
            await speakText(`Got it!`)
          }
        } else if (intent === 'no') {
          await speakText(`No problem. Let's try again. ${s.prompt}`)
        } else {
          await speakText('I didn\'t catch that. Let me ask again. ' + s.prompt)
        }
      }
    }

    // All steps done — save
    if (!mountedRef.current) return
    setPhase('saving')
    setStatusText('💾 Saving your profile...')
    const f = formRef.current
    try {
      await saveProfile({
        name: f.name,
        email: f.email,
        guardian: { name: f.guardianName, email: f.guardianEmail },
      })
      notify('Profile saved!', 'success')
      await speakText(`Perfect, ${f.name}! Your profile is saved. Drishti is ready. Taking you to the dashboard.`)
      if (mountedRef.current) navigate('/dashboard')
    } catch (err) {
      notify(err.message || 'Save failed.', 'error')
      await speakText('I could not save your profile. Please try again.')
    }
  }

  /* ── start button ───────────────────────────────────────── */
  function handleStart() {
    setStarted(true)
    runOnboardingFlow()
  }

  /* ── render ─────────────────────────────────────────────── */
  const currentStep = STEPS[stepIndex]

  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
      <Card className="w-full max-w-3xl">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 sm:h-14 sm:w-14">
            <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 sm:text-sm">Voice Onboarding</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:mt-2 sm:text-4xl">Set up Drishti</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300 sm:mt-3 sm:text-lg sm:leading-8">
              {started
                ? 'Speak clearly. I\'ll confirm each step.'
                : 'Tap below to begin voice setup.'}
            </p>
          </div>
        </div>

        {!started ? (
          <button
            type="button"
            onClick={handleStart}
            className="mx-auto mt-8 flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-full text-slate-950 shadow-xl transition hover:scale-105 sm:mt-10 sm:h-40 sm:w-40 sm:gap-3"
            style={{ background: 'linear-gradient(135deg, #67e8f9, #a7f3d0)' }}
          >
            <Mic className="h-10 w-10 sm:h-14 sm:w-14" />
            <span className="text-base font-black sm:text-lg">Tap to Start</span>
          </button>
        ) : (
          <div className="mt-6 sm:mt-8">
            {/* Progress bar */}
            <div className="mb-5 flex gap-1.5 sm:mb-8 sm:gap-2">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className="h-2 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background: i < stepIndex ? 'linear-gradient(135deg, #67e8f9, #a7f3d0)'
                      : i === stepIndex ? '#22d3ee'
                      : 'rgba(14, 116, 144, 0.18)',
                  }}
                />
              ))}
            </div>

            {/* Current step */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="rounded-lg border p-4 sm:p-6"
                style={{ borderColor: 'rgba(14, 116, 144, 0.2)', background: 'rgba(255,255,255,0.72)' }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] sm:text-sm" style={{ color: '#087c8f' }}>
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900 sm:mt-3 sm:text-2xl">{currentStep?.label}</h2>

                {/* Animated orb */}
                <div className="mt-4 flex justify-center sm:mt-6">
                  <motion.div
                    className="flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
                    style={{
                      background: phase === 'listening'
                        ? 'linear-gradient(135deg, #38bdf8, #22d3ee)'
                        : phase === 'thinking'
                          ? 'linear-gradient(135deg, #a78bfa, #818cf8)'
                          : phase === 'speaking'
                            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                            : phase === 'saving'
                              ? 'linear-gradient(135deg, #34d399, #10b981)'
                              : 'linear-gradient(135deg, #67e8f9, #a7f3d0)',
                    }}
                    animate={{ scale: phase === 'listening' ? [1, 1.15, 1] : phase === 'thinking' ? [1, 1.08, 1] : [1, 1.04, 1] }}
                    transition={{ duration: phase === 'listening' ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {(phase === 'thinking' || phase === 'saving') ? (
                      <Loader2 className="h-8 w-8 animate-spin text-white sm:h-10 sm:w-10" />
                    ) : (
                      <Mic className="h-8 w-8 text-slate-900 sm:h-10 sm:w-10" />
                    )}
                  </motion.div>
                </div>

                <p className="mt-3 text-center text-base font-semibold text-slate-700 sm:mt-4 sm:text-lg">
                  {statusText || (phase === 'listening' ? '🎤 Listening...' : phase === 'speaking' ? '🔊 Speaking...' : phase === 'saving' ? '💾 Saving...' : '⏳ Waiting...')}
                </p>

                {lastHeard && (
                  <div className="mt-3 rounded-lg p-3 sm:mt-4 sm:p-4" style={{ background: 'rgba(14, 116, 144, 0.08)' }}>
                    <p className="text-xs font-bold sm:text-sm" style={{ color: '#5b7188' }}>I heard:</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-xl">{lastHeard}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Summary of filled fields */}
            <div className="mt-4 grid gap-2 sm:mt-6 sm:gap-3">
              {STEPS.map((s, i) => {
                const val = form[s.field]
                if (!val || i > stepIndex) return null
                return (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5 sm:p-3"
                    style={{
                      borderColor: 'rgba(14, 116, 144, 0.15)',
                      background: i < stepIndex ? 'rgba(167, 243, 208, 0.15)' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <span className="text-xs font-bold sm:text-sm" style={{ color: '#5b7188' }}>{s.label}</span>
                    <span className="truncate text-sm font-black text-slate-900 sm:text-base">{val}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
