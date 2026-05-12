import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Upload, Video, X } from 'lucide-react'
import Button from './Button'
import { useToast } from '../contexts/ToastContext'
import { useObjectUrl } from '../hooks/useObjectUrl'

export default function ImageCapture({ imageFile, setImageFile }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const { notify } = useToast()
  const previewUrl = useObjectUrl(imageFile)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch {
      notify('Camera permission was denied. You can still upload an image.', 'error')
    }
  }, [notify])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }, [])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      setImageFile(new File([blob], `drishti-capture-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      notify('Camera frame captured.', 'success')
    }, 'image/jpeg')
  }, [notify, setImageFile])

  useEffect(() => {
    function handleCameraCommand(event) {
      const action = event.detail?.action
      if (action === 'open') startCamera()
      if (action === 'capture') captureFrame()
      if (action === 'close' || action === 'stop') {
        stopCamera()
        notify('Camera stopped.', 'info')
      }
    }

    window.addEventListener('drishti:camera-command', handleCameraCommand)
    return () => window.removeEventListener('drishti:camera-command', handleCameraCommand)
  }, [captureFrame, startCamera, stopCamera, notify])

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
        {previewUrl ? (
          <img src={previewUrl} alt="Selected scene preview" className="h-80 w-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="h-80 w-full bg-slate-950 object-cover" />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-700">
          <Upload className="h-5 w-5" aria-hidden="true" />
          Upload Image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <Button type="button" variant="secondary" onClick={cameraActive ? captureFrame : startCamera}>
          {cameraActive ? <Camera className="h-5 w-5" aria-hidden="true" /> : <Video className="h-5 w-5" aria-hidden="true" />}
          {cameraActive ? 'Capture Frame' : 'Start Camera'}
        </Button>
      </div>

      {(cameraActive || imageFile) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            stopCamera()
            setImageFile(null)
          }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
          Clear Camera or Image
        </Button>
      )}
    </div>
  )
}
