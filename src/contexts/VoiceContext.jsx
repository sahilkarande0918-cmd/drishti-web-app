/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from './ProfileContext'
import { useToast } from './ToastContext'
import { askVoiceAssistant, planAgentAction } from '../services/geminiClient'
import { sendGuardianEmail } from '../services/emailService'
import { activateGuardianAlert } from '../services/sosService'

const VoiceContext = createContext(null)

/* ── helpers ───────────────────────────────────────────────── */

function normalizeCommand(text, pendingEmail) {
  const n = text.toLowerCase().trim()
  if (pendingEmail) return 'email_guardian_send'
  if (n.includes('stop camera') || n.includes('close camera') || n.includes('turn off camera')) return 'close_camera'
  if (n.includes('open camera') || n.includes('start camera')) return 'open_camera'
  if (n.includes('take photo') || n.includes('capture photo') || n.includes('capture image')) return 'capture_photo'
  if (n.includes('ai vision') || n.includes('vision page')) return 'open_vision'
  if (n.includes('settings')) return 'open_settings'
  if (n.includes('where am i') || n.includes('where i am')) return 'where'
  if (n.includes('guide me') || n.includes('guide me to') || n.includes('take me to') || n.includes('navigate to') || n.includes('directions to')) return 'guide_me'
  if (n.includes('stop navigation') || n.includes('stop guiding')) return 'stop_navigation'
  if (n.includes('navigate') || n.includes('navigation')) return 'navigate'
  if (n.includes('analyze surrounding') || n.includes('describe surrounding') || n.includes('what is in front of me')) return 'analyze_surrounding'
  if (n.includes('describe')) return 'describe'
  if (n.includes('read text') || n.includes('read sign')) return 'read'
  if (n.includes('help')) return 'help'
  if (n.includes('stop') || n.includes('shut up') || n.includes('quiet') || n.includes('cancel')) return 'stop'
  if (
    n.includes('emergency') ||
    n.includes('sos') ||
    n.includes('email my guardian') ||
    n.includes('mail my guardian') ||
    n.includes('notify my guardian') ||
    n.includes('send email to my guardian')
  ) return (n.includes('emergency') || n.includes('sos')) ? 'emergency' : 'email_guardian_start'
  if (n.includes('send email') || n.includes('send a mail') || n.includes('send mail') || n.includes('send a email') || n.includes('send an email')) return 'email_guardian_start'
  return 'assistant'
}

/* ── extract destination from guide me command ─────────────── */
function extractDestination(text) {
  const n = text.toLowerCase().trim()
  const patterns = [
    /guide me to (.+)/i,
    /take me to (.+)/i,
    /navigate to (.+)/i,
    /directions to (.+)/i,
    /guide me (.+)/i,
  ]
  for (const p of patterns) {
    const match = n.match(p)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

/* ── female voice selector ─────────────────────────────────── */
function getFemaleVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const priorities = [
    (v) => v.name.toLowerCase().includes('zira'),
    (v) => v.name.toLowerCase().includes('susan'),
    (v) => v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('female'),
    (v) => v.name.toLowerCase().includes('samantha'),
    (v) => v.name.toLowerCase().includes('karen'),
    (v) => v.name.toLowerCase().includes('moira'),
    (v) => v.name.toLowerCase().includes('google uk english female'),
    (v) => v.name.toLowerCase().includes('google us english'),
    (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'),
    (v) => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('mark') && !v.name.toLowerCase().includes('james'),
  ]
  for (const test of priorities) {
    const found = voices.find(test)
    if (found) return found
  }
  return voices.find((v) => v.lang.startsWith('en')) || null
}

/* ── provider ──────────────────────────────────────────────── */

export function VoiceProvider({ children }) {
  const recognitionRef = useRef(null)
  const autoRestartRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const femaleVoiceRef = useRef(null)
  const navigate = useNavigate()
  const { profile, settings } = useProfile()
  const { notify } = useToast()

  const [transcript, setTranscript] = useState('Tap the mic or say something to begin.')
  const [orbState, setOrbState] = useState('idle')
  const [isListening, setIsListening] = useState(false)
  const [lastAnswer, setLastAnswer] = useState('')
  const [pendingEmail, setPendingEmail] = useState(false)
  const [conversationLog, setConversationLog] = useState([])
  const startListeningInternalRef = useRef(null)

  /* ── load female voice on mount ─────────────────────────── */
  useEffect(() => {
    function loadVoices() { femaleVoiceRef.current = getFemaleVoice() }
    loadVoices()
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices)
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices)
  }, [])

  /* ── push to conversation log ────────────────────────────── */
  const pushLog = useCallback((role, text) => {
    setConversationLog((prev) => [...prev.slice(-9), { role, text, ts: Date.now() }])
  }, [])

  /* ── speak with interrupt support ───────────────────────── */
  const speak = useCallback(
    (text, options = {}) => {
      setTranscript(text)
      setLastAnswer(text)
      pushLog('drishti', text)
      if (settings.voice_enabled === false || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      isSpeakingRef.current = true
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = Number(settings.speech_rate ?? 0.95)
      utterance.pitch = 1.1
      if (femaleVoiceRef.current) utterance.voice = femaleVoiceRef.current
      Object.assign(utterance, options)
      utterance.onend = () => {
        isSpeakingRef.current = false
        // Auto-restart listening after speaking if flag is set
        if (autoRestartRef.current) {
          window.setTimeout(() => {
            if (autoRestartRef.current && !recognitionRef.current) {
              startListeningInternalRef.current?.()
            }
          }, 300)
        }
      }
      utterance.onerror = () => { isSpeakingRef.current = false }
      window.speechSynthesis.speak(utterance)
    },
    [settings.speech_rate, settings.voice_enabled, pushLog],
  )

  /* ── stop everything ────────────────────────────────────── */
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    isSpeakingRef.current = false
    autoRestartRef.current = false
    recognitionRef.current?.abort?.()
    recognitionRef.current = null
    setIsListening(false)
    setOrbState('idle')
  }, [])

  /* ── emergency ──────────────────────────────────────────── */
  const triggerEmergency = useCallback(async () => {
    setOrbState('emergency')
    navigate('/sos')
    try {
      speak('Emergency alert activated. Getting your location and sending an email to your guardian now.')
      const result = await activateGuardianAlert(profile)
      const message = result.alert.email
        ? 'Emergency SOS email sent to your guardian with your current location.'
        : 'Emergency alert saved, but no guardian email is configured. Add guardian email in settings.'
      notify(result.alert.email ? 'Emergency guardian email sent.' : 'SOS saved. Guardian email missing.', result.alert.email ? 'success' : 'error')
      speak(message)
    } catch (error) {
      const message = error.message || 'Unable to activate emergency alert.'
      notify(message, 'error')
      speak(message)
    } finally {
      setOrbState('idle')
    }
  }, [navigate, notify, profile, speak])

  /* ── send message to guardian ────────────────────────────── */
  const sendMessageToGuardian = useCallback(async (message) => {
    setOrbState('processing')
    try {
      const result = await sendGuardianEmail(profile, message)
      setPendingEmail(false)
      const mode = result.mode === 'emailjs' ? 'sent' : 'saved locally'
      notify(`Message ${mode} to ${result.email.to}.`, 'success')
      speak(`Done. Your message has been ${mode} to your guardian.`)
    } catch (error) {
      const answer = error.message || 'I could not send the guardian message.'
      notify(answer, 'error')
      speak(answer)
    } finally {
      setOrbState('idle')
    }
  }, [notify, profile, speak])

  /* ── execute an AI-planned action ───────────────────────── */
  const executeAction = useCallback(async (actionPlan, originalText) => {
    const action = actionPlan?.action || 'answer'
    const extractedMessage = actionPlan?.message?.trim()

    if (action === 'open_camera') {
      navigate('/vision?mode=scene')
      speak(actionPlan.spokenResponse || 'Opening camera.')
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('drishti:camera-command', { detail: { action: 'open' } }))
      }, 350)
    } else if (action === 'close_camera' || action === 'stop_camera') {
      speak(actionPlan.spokenResponse || 'Closing camera.')
      window.dispatchEvent(new CustomEvent('drishti:camera-command', { detail: { action: 'close' } }))
    } else if (action === 'capture_photo') {
      navigate('/vision?mode=scene')
      speak(actionPlan.spokenResponse || 'Capturing photo.')
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('drishti:camera-command', { detail: { action: 'capture' } }))
      }, 350)
    } else if (action === 'describe_scene') {
      navigate('/vision?mode=scene')
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('drishti:vision-command', { detail: { mode: 'scene' } }))
      }, 350)
    } else if (action === 'analyze_surrounding') {
      navigate('/vision?mode=scene')
      speak(actionPlan.spokenResponse || 'Analyzing your surroundings now. Please hold your device steady.')
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('drishti:analyze-surrounding'))
      }, 500)
    } else if (action === 'read_text') {
      navigate('/vision?mode=text')
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('drishti:vision-command', { detail: { mode: 'text' } }))
      }, 350)
    } else if (action === 'guide_me') {
      const dest = actionPlan.destination || actionPlan.message || ''
      navigate('/navigation')
      speak(actionPlan.spokenResponse || `Starting navigation to ${dest || 'your destination'}.`)
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('drishti:guide-me', { detail: { destination: dest } }))
      }, 500)
    } else if (action === 'open_navigation' || action === 'where_am_i') {
      navigate('/navigation')
      speak(actionPlan.spokenResponse || 'Opening navigation.')
    } else if (action === 'sos') {
      await triggerEmergency()
    } else if (action === 'email_guardian_start') {
      setPendingEmail(true)
      speak(actionPlan.spokenResponse || 'Sure. What message should I send to your guardian? Speak your message now.')
    } else if (action === 'email_guardian_send') {
      await sendMessageToGuardian(extractedMessage || originalText)
    } else if (action === 'open_settings') {
      navigate('/settings')
      speak(actionPlan.spokenResponse || 'Opening settings.')
    } else if (action === 'stop') {
      stopSpeaking()
    } else {
      const answer = actionPlan?.spokenResponse || (await askVoiceAssistant(originalText, {
        profileName: profile?.name,
        guardianEmail: profile?.guardian?.email,
      })).text
      speak(answer)
    }
  }, [navigate, profile?.guardian?.email, profile?.name, sendMessageToGuardian, speak, stopSpeaking, triggerEmergency])

  /* ── handle a final transcript ──────────────────────────── */
  const handleCommand = useCallback(
    async (text) => {
      pushLog('user', text)
      const command = normalizeCommand(text, pendingEmail)

      if (command === 'stop') {
        stopSpeaking()
        return
      }

      setOrbState(command === 'emergency' ? 'emergency' : 'processing')

      if (command === 'open_camera') {
        await executeAction({ action: 'open_camera', spokenResponse: 'Opening camera now.' }, text)
      } else if (command === 'close_camera') {
        await executeAction({ action: 'close_camera', spokenResponse: 'Stopping camera now.' }, text)
      } else if (command === 'capture_photo') {
        await executeAction({ action: 'capture_photo', spokenResponse: 'Capturing photo now.' }, text)
      } else if (command === 'open_vision') {
        navigate('/vision?mode=scene')
        speak('AI vision is open. Say open camera, capture photo, describe scene, or read text.')
      } else if (command === 'open_settings') {
        await executeAction({ action: 'open_settings', spokenResponse: 'Opening settings.' }, text)
      } else if (command === 'where') {
        speak('Opening location assistant.')
        navigate('/navigation')
      } else if (command === 'guide_me') {
        const dest = extractDestination(text)
        if (dest) {
          speak(`Starting live navigation to ${dest}.`)
          navigate('/navigation')
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('drishti:guide-me', { detail: { destination: dest } }))
          }, 500)
        } else {
          speak('Where would you like to go? Say guide me to followed by your destination.')
        }
      } else if (command === 'stop_navigation') {
        speak('Stopping navigation.')
        window.dispatchEvent(new CustomEvent('drishti:stop-navigation'))
      } else if (command === 'navigate') {
        speak('Navigation opened. Say guide me to followed by your destination.')
        navigate('/navigation')
      } else if (command === 'describe') {
        speak('AI vision opened. Capture or upload a scene, then say describe this scene.')
        navigate('/vision?mode=scene')
        window.dispatchEvent(new CustomEvent('drishti:vision-command', { detail: { mode: 'scene' } }))
      } else if (command === 'analyze_surrounding') {
        speak('Analyzing your surroundings now. Please hold your device steady.')
        navigate('/vision?mode=scene')
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('drishti:analyze-surrounding'))
        }, 500)
      } else if (command === 'read') {
        speak('Text reader opened. Capture or upload an image, then say read this text.')
        navigate('/vision?mode=text')
        window.dispatchEvent(new CustomEvent('drishti:vision-command', { detail: { mode: 'text' } }))
      } else if (command === 'help') {
        speak('You can ask me anything. Say send email to send a message, say SOS for emergency, open camera or stop camera, describe surroundings, read text, navigate, or just ask me a question.')
      } else if (command === 'emergency') {
        await triggerEmergency()
      } else if (command === 'email_guardian_start') {
        await executeAction({ action: 'email_guardian_start' }, text)
      } else if (command === 'email_guardian_send') {
        await executeAction({ action: 'email_guardian_send', message: text }, text)
      } else {
        // Fall through to AI planner
        try {
          const actionPlan = await planAgentAction(text, {
            profileName: profile?.name,
            guardianEmail: profile?.guardian?.email,
            pendingEmail,
          })
          await executeAction(actionPlan, text)
        } catch {
          speak('I could not reach the AI assistant. Please try again.')
        }
      }
      if (command !== 'emergency') setOrbState('idle')
    },
    [executeAction, navigate, pendingEmail, profile, pushLog, speak, stopSpeaking, triggerEmergency],
  )

  /* ── internal start listening (no state toggle) ─────────── */
  const startListeningInternal = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    // Interrupt TTS if speaking
    if (isSpeakingRef.current) {
      window.speechSynthesis?.cancel()
      isSpeakingRef.current = false
    }

    // Abort any existing recognition
    try { recognitionRef.current?.abort?.() } catch { /* ignore */ }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      setOrbState('listening')
    }

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
      setTranscript(text)

      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop()
        recognitionRef.current = null
        handleCommand(text)
      }
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      recognitionRef.current = null
      // 'no-speech' and 'aborted' are not real errors — auto-restart
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (autoRestartRef.current) {
          window.setTimeout(() => startListeningInternalRef.current?.(), 500)
        } else {
          setOrbState('idle')
        }
        return
      }
      setOrbState('idle')
      notify('Microphone permission was denied or speech could not be detected.', 'error')
      speak('I could not hear you. Please check microphone permission and try again.')
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      // Auto-restart if flag is set and we're not currently processing
      if (autoRestartRef.current && orbState !== 'processing') {
        window.setTimeout(() => {
          if (autoRestartRef.current && !recognitionRef.current && !isSpeakingRef.current) {
            startListeningInternalRef.current?.()
          }
        }, 600)
      } else if (orbState === 'listening') {
        setOrbState('idle')
      }
    }

    recognition.start()
  }, [handleCommand, notify, speak, orbState])

  useEffect(() => {
    startListeningInternalRef.current = startListeningInternal
  }, [startListeningInternal])

  /* ── public: start listening (enables auto-restart loop) ── */
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      notify('Speech recognition is not supported in this browser. Try Chrome or Edge.', 'error')
      speak('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }
    autoRestartRef.current = true
    startListeningInternal()
  }, [notify, speak, startListeningInternal])

  /* ── clean up on unmount ────────────────────────────────── */
  useEffect(() => {
    return () => {
      autoRestartRef.current = false
      try { recognitionRef.current?.abort?.() } catch { /* ignore */ }
      window.speechSynthesis?.cancel()
    }
  }, [])

  const value = useMemo(
    () => ({
      transcript, lastAnswer, orbState, isListening, pendingEmail, conversationLog,
      setOrbState, speak, startListening, stopSpeaking, triggerEmergency, pushLog,
    }),
    [transcript, lastAnswer, orbState, isListening, pendingEmail, conversationLog,
      speak, startListening, stopSpeaking, triggerEmergency, pushLog],
  )

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoice() {
  const context = useContext(VoiceContext)
  if (!context) throw new Error('useVoice must be used within VoiceProvider')
  return context
}
