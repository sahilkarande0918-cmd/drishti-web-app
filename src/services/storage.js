const PROFILE_KEY = 'drishti.profile'
const SETTINGS_KEY = 'drishti.settings'
const ALERTS_KEY = 'drishti.sosAlerts'
const EMAILS_KEY = 'drishti.guardianEmails'

const defaultSettings = {
  speech_rate: 1,
  voice_enabled: true,
}

export function createId() {
  return crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveProfile(profile) {
  const nextProfile = {
    id: profile.id ?? createId(),
    name: profile.name,
    email: profile.email ?? '',
    guardian: {
      id: profile.guardian?.id ?? createId(),
      name: profile.guardian?.name ?? '',
      email: profile.guardian?.email ?? '',
      phone: profile.guardian?.phone ?? '',
    },
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile))
  return nextProfile
}

export function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY)
  return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
}

export function saveSettings(settings) {
  const nextSettings = { ...defaultSettings, ...settings }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings))
  return nextSettings
}

export function saveLocalAlert(alert) {
  const raw = localStorage.getItem(ALERTS_KEY)
  const alerts = raw ? JSON.parse(raw) : []
  const savedAlert = {
    id: createId(),
    created_at: new Date().toISOString(),
    ...alert,
  }
  localStorage.setItem(ALERTS_KEY, JSON.stringify([savedAlert, ...alerts]))
  return savedAlert
}

export function saveGuardianEmail(email) {
  const raw = localStorage.getItem(EMAILS_KEY)
  const emails = raw ? JSON.parse(raw) : []
  const savedEmail = {
    id: createId(),
    created_at: new Date().toISOString(),
    status: 'sent_prototype',
    ...email,
  }
  localStorage.setItem(EMAILS_KEY, JSON.stringify([savedEmail, ...emails]))
  return savedEmail
}
