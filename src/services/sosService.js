import { getCurrentPosition } from './geoService'
import { sendGuardianEmail } from './emailService'
import { saveSosAlert } from './supabaseClient'

export async function activateGuardianAlert(profile) {
  const coords = await getCurrentPosition()
  const mapsLink = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
  const result = await saveSosAlert({
    user_id: profile?.id,
    latitude: coords.latitude,
    longitude: coords.longitude,
  })

  let emailResult = null
  if (profile?.guardian?.email) {
    emailResult = await sendGuardianEmail(
      profile,
      `Emergency alert activated from Drishti.\n\nLocation: ${coords.latitude}, ${coords.longitude}\nMap: ${mapsLink}\n\nPlease contact me immediately.`,
      {
        emergency: true,
        subject: `Emergency SOS from ${profile?.name || 'Drishti user'}`,
      },
    )
  }

  return {
    ...result,
    alert: {
      ...result.alert,
      latitude: coords.latitude,
      longitude: coords.longitude,
      mapsLink,
      email: emailResult?.email || null,
    },
  }
}
