import { useState, useEffect, useCallback } from 'react'
import type { Note } from '../types'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await window.annaAPI.getNotes()
    setNotes(data)
  }, [])

  useEffect(() => { load() }, [load])

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  const createNote = useCallback(async () => {
    const note = await window.annaAPI.createNote()
    await load()
    setActiveNoteId(note.id)
    return note
  }, [load])

  const updateNote = useCallback(async (id: string, data: { title?: string; content?: string }) => {
    await window.annaAPI.updateNote(id, data)
    await load()
  }, [load])

  const deleteNote = useCallback(async (id: string) => {
    await window.annaAPI.deleteNote(id)
    if (activeNoteId === id) setActiveNoteId(null)
    await load()
  }, [load, activeNoteId])

  return {
    notes,
    activeNote,
    activeNoteId,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    reload: load
  }
}
