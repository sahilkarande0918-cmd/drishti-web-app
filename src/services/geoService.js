const fallbackPosition = {
  latitude: 18.6202,
  longitude: 73.9126,
}

/* ── one-shot position ────────────────────────────────────── */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => reject(new Error('Location permission was denied. Enable browser location access to use this feature.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  })
}

export function getFallbackPosition() {
  return fallbackPosition
}

/* ── continuous GPS watch ─────────────────────────────────── */
export function watchPosition(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation not supported.'))
    return null
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      })
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
  )

  return watchId
}

export function stopWatching(watchId) {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
  }
}

/* ── haversine distance (meters) ──────────────────────────── */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ── bearing between two points (degrees) ─────────────────── */
export function bearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/* ── reverse geocode ──────────────────────────────────────── */
export async function reverseGeocode({ latitude, longitude }) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', latitude)
  url.searchParams.set('lon', longitude)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to reverse geocode current location.')
  const data = await response.json()
  return data.display_name || 'your current location'
}

/* ── search destination ───────────────────────────────────── */
export async function searchDestination(query, currentPosition) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', query)
  if (currentPosition) {
    url.searchParams.set(
      'viewbox',
      `${currentPosition.longitude - 0.2},${currentPosition.latitude + 0.2},${currentPosition.longitude + 0.2},${currentPosition.latitude - 0.2}`,
    )
    url.searchParams.set('bounded', '0')
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error('Destination search failed.')
  const results = await response.json()
  if (!results.length) throw new Error('No destination found. Try a clearer place name.')

  return {
    name: results[0].display_name,
    latitude: Number(results[0].lat),
    longitude: Number(results[0].lon),
  }
}

/* ── walking route with detailed step maneuver coordinates ── */
export async function getWalkingRoute(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/foot/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Walking route service is unavailable.')
  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) throw new Error('No walking route found.')

  // Extract detailed steps with maneuver coordinates
  const detailedSteps = route.legs?.[0]?.steps?.map((step) => {
    const maneuver = step.maneuver || {}
    const modifier = maneuver.modifier || ''
    const type = maneuver.type || 'depart'
    const road = step.name || ''

    // Build natural instruction
    let instruction
    if (type === 'depart') {
      instruction = road ? `Start walking on ${road}.` : 'Start walking straight ahead.'
    } else if (type === 'arrive') {
      instruction = 'You have arrived at your destination.'
    } else if (type === 'turn') {
      instruction = `Turn ${modifier}${road ? ` onto ${road}` : ''}.`
    } else if (type === 'new name' || type === 'continue') {
      instruction = `Continue${road ? ` on ${road}` : ' straight'} for ${Math.round(step.distance)} meters.`
    } else if (type === 'roundabout' || type === 'rotary') {
      instruction = `At the roundabout, take exit${road ? ` onto ${road}` : ''}.`
    } else {
      instruction = `${type}${modifier ? ' ' + modifier : ''}${road ? ' on ' + road : ''} for ${Math.round(step.distance)} meters.`
    }

    return {
      instruction,
      distance: step.distance,
      duration: step.duration,
      type,
      modifier,
      road,
      // Maneuver point — where the turn happens
      maneuverLat: maneuver.location?.[1] ?? null,
      maneuverLon: maneuver.location?.[0] ?? null,
      // Announce early — 8 meters before
      announceDistance: 8,
      announced: false,
      reached: false,
    }
  }) || []

  return {
    distance: route.distance,
    duration: route.duration,
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
    steps: detailedSteps,
    // Simplified spoken steps for backward compat
    spokenSteps: detailedSteps.slice(0, 5).map((s) => s.instruction),
  }
}
