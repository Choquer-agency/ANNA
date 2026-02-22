'use client'

import { motion } from 'framer-motion'

interface CategoryFilterProps {
  categories: string[]
  active: string
  onChange: (category: string) => void
}

export function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((cat) => {
        const isActive = cat === active
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`
              relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer
              ${isActive
                ? 'bg-ink text-white'
                : 'bg-transparent text-ink-muted border border-border hover:text-ink hover:border-border-strong'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 bg-ink rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{cat}</span>
          </button>
        )
      })}
    </div>
  )
}
