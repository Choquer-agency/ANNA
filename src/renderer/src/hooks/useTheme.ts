import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    window.annaAPI.getSetting('theme').then((saved) => {
      const t: Theme = saved === 'dark' ? 'dark' : 'light'
      setTheme(t)
      document.documentElement.classList.toggle('dark', t === 'dark')
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      window.annaAPI.setSetting('theme', next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
