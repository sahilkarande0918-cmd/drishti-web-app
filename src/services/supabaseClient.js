import { createClient } from '@supabase/supabase-js'
import { createId, saveLocalAlert, saveProfile as saveLocalProfile, saveSettings as saveLocalSettings } from './storage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function upsertDemoProfile(profile) {
  const localProfile = saveLocalProfile(profile)

  if (!supabase) {
    return { profile: localProfile, mode: 'demo' }
  }

  const userPayload = {
    id: localProfile.id,
    name: localProfile.name,
    email: localProfile.email,
  }
  const guardianPayload = {
    id: localProfile.guardian.id,
    user_id: localProfile.id,
    name: localProfile.guardian.name,
    email: localProfile.guardian.email,
    phone: localProfile.guardian.phone,
  }

  const { error: userError } = await supabase.from('users').upsert(userPayload)
  if (userError) throw userError

  const { error: guardianError } = await supabase.from('guardians').upsert(guardianPayload)
  if (guardianError) throw guardianError

  return { profile: localProfile, mode: 'supabase' }
}

export async function saveUserSettings(userId, settings) {
  const saved = saveLocalSettings(settings)

  if (!supabase || !userId) {
    return { settings: saved, mode: 'demo' }
  }

  const { error } = await supabase.from('user_settings').upsert({
    id: settings.id ?? createId(),
    user_id: userId,
    speech_rate: saved.speech_rate,
    voice_enabled: saved.voice_enabled,
  })

  if (error) throw error
  return { settings: saved, mode: 'supabase' }
}

export async function saveSosAlert(alert) {
  const localAlert = saveLocalAlert(alert)

  if (!supabase) {
    return { alert: localAlert, mode: 'demo' }
  }

  const { data, error } = await supabase
    .from('sos_alerts')
    .insert({
      user_id: alert.user_id ?? null,
      latitude: alert.latitude,
      longitude: alert.longitude,
    })
    .select()
    .single()

  if (error) throw error
  return { alert: data, mode: 'supabase' }
}
