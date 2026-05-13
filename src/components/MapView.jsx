import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'

const userIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#38bdf8;border:4px solid white;box-shadow:0 0 0 8px rgba(56,189,248,.25)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const liveIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:28px;height:28px;border-radius:9999px;background:#3b82f6;border:4px solid white;box-shadow:0 0 0 10px rgba(59,130,246,.35),0 0 20px rgba(59,130,246,.2)">
    <span style="display:block;width:8px;height:8px;margin:6px auto 0;border-radius:9999px;background:white"></span>
  </span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const destinationIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#34d399;border:4px solid white;box-shadow:0 0 0 8px rgba(52,211,153,.25)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const turnIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#f59e0b;border:3px solid white;box-shadow:0 0 0 4px rgba(245,158,11,.3)"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

/* ── smooth follow for live mode ──────────────────────────── */
function LiveFollow({ center, isLive }) {
  const map = useMap()
  const firstRef = useRef(true)

  useEffect(() => {
    if (!isLive) return
    if (firstRef.current) {
      map.setView(center, 17, { animate: false })
      firstRef.current = false
    } else {
      map.panTo(center, { animate: true, duration: 0.5 })
    }
  }, [center, isLive, map])

  return null
}

function Recenter({ center, route, isLive }) {
  const map = useMap()
  useEffect(() => {
    if (isLive) return // LiveFollow handles this
    if (route?.length) {
      map.fitBounds(route, { padding: [38, 38] })
    } else {
      map.setView(center, 15)
    }
  }, [center, map, route, isLive])
  return null
}

export default function MapView({ position, isFallback, livePosition, destination, route, isLive, turnPoints }) {
  const center = isLive && livePosition
    ? [livePosition.latitude, livePosition.longitude]
    : [position.latitude, position.longitude]

  return (
    <div className="relative">
      {isFallback && !isLive && (
        <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
          ⚠️ Using fallback location. Enable GPS for accuracy.
        </div>
      )}
      <MapContainer center={center} zoom={isLive ? 17 : 15} scrollWheelZoom className="min-h-[420px] rounded-xl overflow-hidden border border-slate-700">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} route={route} isLive={isLive} />
      {isLive && <LiveFollow center={center} isLive={isLive} />}

      {/* User position */}
      <Marker position={center} icon={isLive ? liveIcon : userIcon}>
        <Popup>{isLive ? 'Your live position' : 'You are here'}</Popup>
      </Marker>

      {/* Destination */}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
          <Popup>{destination.name}</Popup>
        </Marker>
      )}

      {/* Turn points */}
      {turnPoints?.map((tp, i) => (
        tp.maneuverLat && (
          <Marker key={i} position={[tp.maneuverLat, tp.maneuverLon]} icon={turnIcon}>
            <Popup>{tp.instruction}</Popup>
          </Marker>
        )
      ))}

      {/* Route line */}
      {route?.length > 0 && <Polyline positions={route} color="#22d3ee" weight={6} opacity={0.88} />}
    </MapContainer>
    </div>
  )
}
