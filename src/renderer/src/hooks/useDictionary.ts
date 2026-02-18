import { useState, useEffect, useCallback } from 'react'
import type { DictionaryEntry } from '../types'

export function useDictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const data = await window.annaAPI.getDictionaryEntries()
    setEntries(data)
  }, [])

  useEffect(() => { load() }, [load])

  const addEntry = useCallback(async (phrase: string, replacement: string) => {
    await window.annaAPI.addDictionaryEntry(phrase, replacement)
    await load()
  }, [load])

  const updateEntry = useCallback(async (id: string, phrase: string, replacement: string) => {
    await window.annaAPI.updateDictionaryEntry(id, phrase, replacement)
    await load()
  }, [load])

  const deleteEntry = useCallback(async (id: string) => {
    await window.annaAPI.deleteDictionaryEntry(id)
    await load()
  }, [load])

  const filtered = search
    ? entries.filter((e) =>
        e.phrase.toLowerCase().includes(search.toLowerCase()) ||
        e.replacement.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  return { entries: filtered, search, setSearch, addEntry, updateEntry, deleteEntry }
}
