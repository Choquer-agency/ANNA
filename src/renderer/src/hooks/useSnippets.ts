import { useState, useEffect, useCallback } from 'react'
import type { Snippet } from '../types'

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([])

  const load = useCallback(async () => {
    const data = await window.annaAPI.getSnippets()
    setSnippets(data)
  }, [])

  useEffect(() => { load() }, [load])

  const addSnippet = useCallback(async (trigger: string, expansion: string) => {
    await window.annaAPI.addSnippet(trigger, expansion)
    await load()
  }, [load])

  const updateSnippet = useCallback(async (id: string, trigger: string, expansion: string) => {
    await window.annaAPI.updateSnippet(id, trigger, expansion)
    await load()
  }, [load])

  const deleteSnippet = useCallback(async (id: string) => {
    await window.annaAPI.deleteSnippet(id)
    await load()
  }, [load])

  return { snippets, addSnippet, updateSnippet, deleteSnippet }
}
