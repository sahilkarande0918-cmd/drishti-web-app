import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, FileText, Loader2 } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import ImageCapture from '../components/ImageCapture'
import PageHeader from '../components/PageHeader'
import { describeScene, readVisibleText, describeSurroundingsMulti } from '../services/geminiClient'
import { useToast } from '../contexts/ToastContext'
import { useVoice } from '../contexts/VoiceContext'

export default function VisionPage() {
  const [params] = useSearchParams()
  const initialMode = params.get('mode') === 'text' ? 'text' : 'scene'
  const [mode, setMode] = useState(initialMode)
  const [imageFile, setImageFile] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const autoAnalyzeRef = useRef(false)
  const capturedFilesRef = useRef([])
  const { notify } = useToast()
  const { speak, setOrbState } = useVoice()

  const handleSetImageFile = useCallback((file) => {
    if (autoAnalyzeRef.current && file) {
      capturedFilesRef.current.push(file)
    } else {
      setImageFile(file)
    }
  }, [])

  const runVision = useCallback(async (nextMode = mode, file = imageFile) => {
    if (!file) return
    setLoading(true)
    setOrbState('processing')
    try {
      const response = nextMode === 'scene' ? await describeScene(file) : await readVisibleText(file)
      setResult(response.text)
      speak(response.text)
      notify('AI response generated.', 'success')
    } catch (error) {
      notify(error.message || 'AI vision failed.', 'error')
      speak(error.message || 'AI vision failed.')
    } finally {
      setLoading(false)
      setOrbState('idle')
      autoAnalyzeRef.current = false
    }
  }, [imageFile, mode, notify, setOrbState, speak])

  useEffect(() => {
    function handleVisionCommand(event) {
      const nextMode = event.detail?.mode || mode
      setMode(nextMode)
      runVision(nextMode)
    }

    async function handleAnalyzeSurrounding() {
      setMode('scene')
      setResult('Initializing camera...')
      setOrbState('processing')
      autoAnalyzeRef.current = true
      capturedFilesRef.current = []
      
      // 1. Open camera
      window.dispatchEvent(new CustomEvent('drishti:camera-command', { detail: { action: 'open' } }))
      
      // 2. Wait for camera to warm up
      await new Promise(r => setTimeout(r, 2200))
      
      speak('Starting 8 second scan. Please move your device slowly to capture the surroundings.')
      setResult('Scanning surroundings...')

      // 3. Capture multiple frames over ~8 seconds
      for (let i = 0; i < 4; i++) {
        window.dispatchEvent(new CustomEvent('drishti:camera-command', { detail: { action: 'capture' } }))
        await new Promise(r => setTimeout(r, 2000))
      }
      
      // 4. Run multi-image analysis
      window.dispatchEvent(new CustomEvent('drishti:camera-command', { detail: { action: 'close' } }))
      if (capturedFilesRef.current.length > 0) {
        setImageFile(capturedFilesRef.current[capturedFilesRef.current.length - 1])
      }
      
      setLoading(true)
      setOrbState('processing')
      setResult('Analyzing full scan...')
      speak('Scan complete. Analyzing your surroundings now.')
      
      try {
        const response = await describeSurroundingsMulti(capturedFilesRef.current)
        setResult(response.text)
        speak(response.text)
        notify('Multi-scan analysis complete.', 'success')
      } catch (error) {
        notify(error.message || 'Multi-scan analysis failed.', 'error')
        speak(error.message || 'I could not analyze the full scan.')
      } finally {
        setLoading(false)
        setOrbState('idle')
        autoAnalyzeRef.current = false
      }
    }

    window.addEventListener('drishti:vision-command', handleVisionCommand)
    window.addEventListener('drishti:analyze-surrounding', handleAnalyzeSurrounding)
    return () => {
      window.removeEventListener('drishti:vision-command', handleVisionCommand)
      window.removeEventListener('drishti:analyze-surrounding', handleAnalyzeSurrounding)
    }
  }, [mode, notify, runVision, speak, setOrbState])


  return (
    <div>
      <PageHeader
        eyebrow="AI Vision"
        title="Describe scenes and read signs"
        description="Upload an image or capture from webcam. Drishti will explain the scene or read visible text aloud."
      />

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <Card>
          <ImageCapture imageFile={imageFile} setImageFile={handleSetImageFile} />
        </Card>
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant={mode === 'scene' ? 'primary' : 'secondary'} onClick={() => setMode('scene')}>
              <Eye className="h-5 w-5" aria-hidden="true" />
              Scene
            </Button>
            <Button type="button" variant={mode === 'text' ? 'primary' : 'secondary'} onClick={() => setMode('text')}>
              <FileText className="h-5 w-5" aria-hidden="true" />
              Text Reader
            </Button>
          </div>

          <Button type="button" className="mt-4 w-full sm:mt-5" onClick={() => runVision()} disabled={loading || !imageFile}>
            {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {mode === 'scene' ? 'Describe Scene' : 'Read Text'}
          </Button>

          <div className="mt-4 min-h-40 rounded-lg border border-slate-700 bg-slate-950/75 p-4 sm:mt-6 sm:min-h-64 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 sm:text-sm">AI response</p>
            <p className="mt-3 text-base font-semibold leading-7 text-white sm:mt-4 sm:text-xl sm:leading-9">
              {result || 'The spoken result will appear here after analysis.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
