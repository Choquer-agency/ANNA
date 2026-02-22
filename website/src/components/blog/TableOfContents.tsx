'use client'

import { useState, useEffect } from 'react'

interface TocItem {
  text: string
  id: string
}

export function TableOfContents({ headings }: { headings: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is intersecting (visible)
        const visible = entries.find((e) => e.isIntersecting)
        if (visible?.target.id) {
          setActiveId(visible.target.id)
        }
      },
      {
        rootMargin: '-128px 0px -60% 0px',
        threshold: 0,
      }
    )

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav className="hidden lg:block">
      <p className="text-xs uppercase tracking-[0.15em] text-ink-faint font-semibold mb-5">
        In this article
      </p>
      <ul className="space-y-1">
        {headings.map(({ text, id }) => {
          const isActive = activeId === id
          return (
            <li key={id}>
              <button
                onClick={() => {
                  const el = document.getElementById(id)
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`
                  w-full text-left text-sm py-1.5 pl-4 border-l-2 transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-border'
                  }
                `}
              >
                {text}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
