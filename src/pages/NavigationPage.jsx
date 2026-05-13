import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, LocateFixed, Navigation2, Route, Square, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/Button'
import Card from '../components/Card'
import MapView from '../components/MapView'
import PageHeader from '../components/PageHeader'
import {
  getCurrentPosition, getFallbackPosition, getWalkingRoute,
  reverseGeocode, searchDestination, watchPosition, stopWatching, haversineDistance,
} from '../services/geoService'
import { useToast } from '../contexts/ToastContext'
import { useVoice } from '../contexts/VoiceContext'

/* ── female voice helper ──────────────────────────────────── */
function getFemaleVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const tests = [
    v => v.name.includes('Zira'), v => v.name.includes('Susan'),
    v => v.name.includes('Samantha'), v => v.name.includes('Karen'),
    v => v.name.includes('Google') && v.name.includes('Female'),
    v => v.lang.startsWith('en') && !['David', 'Mark', 'James', 'Male'].some(m => v.name.includes(m)),
  ]
  for (const t of tests) { const v = voices.find(t); if (v) return v }
  return voices.find(v => v.lang.startsWith('en')) || null
}

function speakNav(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  u.pitch = 1.1
  const v = getFemaleVoice()
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

export default function NavigationPage() {
  const [params] = useSearchParams()
  const [position, setPosition] = useState(getFallbackPosition())
  const [livePosition, setLivePosition] = useState(null)
  const [destinationText, setDestinationText] = useState(
    params.get('destination') === 'college' ? 'MIT Academy of Engineering Pune' : ''
  )
  const [destination, setDestination] = useState(null)
  const [route, setRoute] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(false)
  const [isLiveNav, setIsLiveNav] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [distToNext, setDistToNext] = useState(null)
  const [distToDest, setDistToDest] = useState(null)
  const [arrived, setArrived] = useState(false)

  const initializedRef = useRef(false)
  const watchIdRef = useRef(null)
  const stepsRef = useRef([])
  const currentStepRef = useRef(0)
  const announcedRef = useRef(new Set())
  const arrivedRef = useRef(false)
  const { notify } = useToast()
  const { speak, setOrbState } = useVoice()

  /* ── process each GPS update ────────────────────────────── */
  const processLivePosition = useCallback((pos) => {
    const allSteps = stepsRef.current
    if (!allSteps.length || arrivedRef.current) return

    const idx = currentStepRef.current

    // Check distance to destination
    const lastStep = allSteps[allSteps.length - 1]
    if (lastStep?.maneuverLat != null) {
      const dDest = haversineDistance(pos.latitude, pos.longitude, lastStep.maneuverLat, lastStep.maneuverLon)
      setDistToDest(Math.round(dDest))
      if (dDest < 12 && !arrivedRef.current) {
        arrivedRef.current = true
        setArrived(true)
        speakNav('You have arrived at your destination. Great job!')
        return
      }
    }

    // Check upcoming steps
    for (let i = idx; i < allSteps.length; i++) {
      const step = allSteps[i]
      if (!step.maneuverLat || step.reached) continue

      const dist = haversineDistance(pos.latitude, pos.longitude, step.maneuverLat, step.maneuverLon)

      if (i === idx) {
        setDistToNext(Math.round(dist))
      }

      // Announce 5-10 meters early
      if (dist <= step.announceDistance && !announcedRef.current.has(i)) {
        announcedRef.current.add(i)
        speakNav(step.instruction)
        setCurrentStepIndex(i)
      }

      // Mark as reached when within 5 meters
      if (dist < 5) {
        step.reached = true
        // Move to next step
        if (i === currentStepRef.current && i < allSteps.length - 1) {
          currentStepRef.current = i + 1
          setCurrentStepIndex(i + 1)
          // Pre-announce next step if close
          const nextStep = allSteps[i + 1]
          if (nextStep && !announcedRef.current.has(i + 1)) {
            const nextDist = haversineDistance(pos.latitude, pos.longitude, nextStep.maneuverLat, nextStep.maneuverLon)
            if (nextDist <= 15) {
              setDistToNext(Math.round(nextDist))
            }
          }
        }
      }
    }
  }, [])

  /* ── start live GPS tracking + guidance ─────────────────── */
  const startLiveNavigation = useCallback(() => {
    if (watchIdRef.current != null) stopWatching(watchIdRef.current)
    setIsLiveNav(true)

    const wid = watchPosition(
      (pos) => {
        setLivePosition(pos)
        processLivePosition(pos)
      },
      (err) => {
        notify('GPS error: ' + (err.message || 'Location unavailable'), 'error')
      },
    )
    watchIdRef.current = wid
    speakNav('Live navigation started. I will guide you at every turn.')
  }, [notify, processLivePosition])

  /* ── stop live navigation ───────────────────────────────── */
  const stopLiveNavigation = useCallback(() => {
    if (watchIdRef.current != null) {
      stopWatching(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsLiveNav(false)
    setLivePosition(null)
    speakNav('Navigation stopped.')
    notify('Live navigation stopped.', 'info')
  }, [notify])

  /* ── build route and optionally start live nav ──────────── */
  const buildRouteAndGo = useCallback(async (destText) => {
    setLoading(true)
    setOrbState('processing')
    try {
      const currentPos = await getCurrentPosition().catch(() => position)
      setPosition(currentPos)
      const target = await searchDestination(destText || destinationText, currentPos)
      const routeData = await getWalkingRoute(currentPos, target)

      setDestination(target)
      setRoute(routeData.coordinates)
      setSteps(routeData.steps)
      stepsRef.current = routeData.steps
      currentStepRef.current = 0
      setCurrentStepIndex(0)
      announcedRef.current = new Set()
      arrivedRef.current = false
      setArrived(false)

      const km = (routeData.distance / 1000).toFixed(1)
      const minutes = Math.max(1, Math.round(routeData.duration / 60))
      const firstStep = routeData.steps[0]?.instruction || 'Walk straight ahead.'

      speakNav(`Route ready. ${km} kilometers, about ${minutes} minutes. ${firstStep}`)
      notify('Route generated. Starting live navigation.', 'success')

      // Auto-start live nav
      startLiveNavigation()
    } catch (error) {
      notify(error.message || 'Unable to create route.', 'error')
      speakNav(error.message || 'Unable to create route.')
    } finally {
      setLoading(false)
      setOrbState('idle')
    }
  }, [destinationText, notify, position, setOrbState, startLiveNavigation])

  /* ── where am I ─────────────────────────────────────────── */
  const whereAmI = useCallback(async () => {
    setLoading(true)
    setOrbState('processing')
    try {
      const coords = await getCurrentPosition()
      setPosition(coords)
      const address = await reverseGeocode(coords)
      speak(`You are currently near ${address}.`)
    } catch (error) {
      notify(error.message, 'error')
      speak(error.message)
    } finally {
      setLoading(false)
      setOrbState('idle')
    }
  }, [notify, setOrbState, speak])

  /* ── regular route build (form submit) ──────────────────── */
  const buildRoute = useCallback(async (event) => {
    event?.preventDefault()
    await buildRouteAndGo()
  }, [buildRouteAndGo])

  // Get initial position
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    getCurrentPosition()
      .then((coords) => setPosition(coords))
      .catch(() => notify('Using demo Pune location.', 'info'))
  }, [notify])

  // Listen for guide-me event from voice context
  useEffect(() => {
    function handleGuideMe(e) {
      const dest = e.detail?.destination
      if (dest) {
        setDestinationText(dest)
        // Auto-start route + live nav
        buildRouteAndGo(dest)
      }
    }
    window.addEventListener('drishti:guide-me', handleGuideMe)
    return () => window.removeEventListener('drishti:guide-me', handleGuideMe)
  }, [position, buildRouteAndGo])

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) stopWatching(watchIdRef.current)
      window.speechSynthesis?.cancel()
    }
  }, [])

  const activeStep = steps[currentStepIndex]
  const nextStep = steps[currentStepIndex + 1]

  return (
    <div>
      <PageHeader
        eyebrow="Navigation"
        title={isLiveNav ? '🧭 Live Navigation' : 'Navigation'}
        description={isLiveNav
          ? 'Following GPS. Announcing turns 5-10m early.'
          : 'Say "Guide me to [place]" for live navigation.'}
      />

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <MapView
            position={position}
            livePosition={livePosition}
            destination={destination}
            route={route}
            isLive={isLiveNav}
            turnPoints={steps.filter(s => s.type === 'turn' || s.type === 'roundabout')}
          />
        </Card>

        <div className="grid gap-6">
          {/* Live nav status panel */}
          {isLiveNav && (
            <Card>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {arrived ? (
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20"
                        style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}
                      >
                        <MapPin className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                      </motion.div>
                      <h2 className="mt-3 text-2xl font-black text-white sm:mt-4 sm:text-3xl">You've Arrived! 🎉</h2>
                      <p className="mt-1 text-base text-slate-300 sm:mt-2 sm:text-lg">{destination?.name}</p>
                    </div>
                  ) : (
                    <>
                      {/* Current instruction */}
                      <div className="flex items-start gap-3">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                        >
                          <Navigation2 className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                        </motion.div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200 sm:text-sm">Now</p>
                          <p className="text-base font-black text-white sm:text-xl">{activeStep?.instruction || 'Calculating...'}</p>
                        </div>
                      </div>

                      {/* Distance info */}
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-center sm:p-3">
                          <p className="text-xs font-bold text-slate-400 sm:text-sm">To next turn</p>
                          <p className="mt-0.5 text-xl font-black text-white sm:mt-1 sm:text-2xl">
                            {distToNext != null ? `${distToNext}m` : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-center sm:p-3">
                          <p className="text-xs font-bold text-slate-400 sm:text-sm">To destination</p>
                          <p className="mt-0.5 text-xl font-black text-white sm:mt-1 sm:text-2xl">
                            {distToDest != null ? (distToDest > 999 ? `${(distToDest / 1000).toFixed(1)}km` : `${distToDest}m`) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Next instruction preview */}
                      {nextStep && (
                        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 sm:mt-4 sm:p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Then</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-200 sm:mt-1 sm:text-base">{nextStep.instruction}</p>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <Button
                type="button"
                variant="ghost"
                className="mt-4 w-full"
                onClick={stopLiveNavigation}
              >
                <Square className="h-5 w-5" aria-hidden="true" />
                Stop Navigation
              </Button>
            </Card>
          )}

          {/* Controls */}
          <Card>
            <Button type="button" onClick={whereAmI} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-5 w-5" aria-hidden="true" />}
              Where Am I?
            </Button>
            <form onSubmit={buildRoute} className="mt-5 grid gap-3">
              <label className="grid gap-2 text-lg font-bold">
                Destination
                <input value={destinationText} onChange={(event) => setDestinationText(event.target.value)} required className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-4 text-white" placeholder='Say "Guide me to [place]"' />
              </label>
              <Button type="submit" disabled={loading}>
                <Route className="h-5 w-5" aria-hidden="true" />
                {isLiveNav ? 'Reroute' : 'Start Navigation'}
              </Button>
            </form>
          </Card>

          {/* All steps */}
          <Card>
            <h2 className="text-2xl font-black">Turn-by-turn instructions</h2>
            <ol className="mt-4 grid gap-3">
              {(steps.length ? steps : [{ instruction: 'Enter a destination or say "Guide me to [place]".', type: 'info' }]).map((step, index) => (
                <li
                  key={`${step.instruction}-${index}`}
                  className="rounded-lg border p-4 text-lg leading-7 transition-all duration-300"
                  style={{
                    borderColor: index === currentStepIndex && isLiveNav ? '#22d3ee' : 'rgba(14,116,144,0.18)',
                    background: step.reached ? 'rgba(167, 243, 208, 0.15)'
                      : index === currentStepIndex && isLiveNav ? 'rgba(34, 211, 238, 0.1)'
                      : 'rgba(255,255,255,0.72)',
                    color: step.reached ? '#5b7188' : '#102033',
                    textDecoration: step.reached ? 'line-through' : 'none',
                  }}
                >
                  {step.instruction}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
