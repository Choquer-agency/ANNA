import { useState, useEffect, useCallback } from 'react'
import type { StyleProfile } from '../types'

export function useStyleProfiles() {
  const [profiles, setProfiles] = useState<StyleProfile[]>([])

  const load = useCallback(async () => {
    const data = await window.annaAPI.getStyleProfiles()
    setProfiles(data)
  }, [])

  useEffect(() => { load() }, [load])

  const addProfile = useCallback(async (name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean) => {
    await window.annaAPI.addStyleProfile(name, appPattern, promptAddendum, isDefault)
    await load()
  }, [load])

  const updateProfile = useCallback(async (id: string, name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean) => {
    await window.annaAPI.updateStyleProfile(id, name, appPattern, promptAddendum, isDefault)
    await load()
  }, [load])

  const deleteProfile = useCallback(async (id: string) => {
    await window.annaAPI.deleteStyleProfile(id)
    await load()
  }, [load])

  return { profiles, addProfile, updateProfile, deleteProfile }
}
