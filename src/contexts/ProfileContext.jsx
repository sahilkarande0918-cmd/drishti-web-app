/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { loadProfile, loadSettings } from '../services/storage'
import { saveUserSettings, upsertDemoProfile } from '../services/supabaseClient'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [settings, setSettings] = useState(() => loadSettings())

  const saveProfile = useCallback(async (nextProfile) => {
    const result = await upsertDemoProfile({ ...profile, ...nextProfile })
    setProfile(result.profile)
    return result
  }, [profile])

  const updateSettings = useCallback(async (nextSettings) => {
    const merged = { ...settings, ...nextSettings }
    const result = await saveUserSettings(profile?.id, merged)
    setSettings(result.settings)
    return result
  }, [profile?.id, settings])

  const value = useMemo(
    () => ({ profile, settings, saveProfile, updateSettings, setProfile, setSettings }),
    [profile, saveProfile, settings, updateSettings],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error('useProfile must be used within ProfileProvider')
  return context
}
