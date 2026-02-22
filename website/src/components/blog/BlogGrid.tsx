'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainerSlow } from '@/lib/animations'
import { CategoryFilter } from './CategoryFilter'
import { BlogCard } from './BlogCard'
import type { Post } from '@/lib/sanity/types'

const DEFAULT_CATEGORIES = ['All', 'Product', 'Productivity', 'Guides']

export function BlogGrid({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState('All')

  const filtered =
    active === 'All'
      ? posts
      : posts.filter((post) =>
          post.categories?.some(
            (cat) => cat.title.toLowerCase() === active.toLowerCase()
          )
        )

  return (
    <div>
      {/* Category pills */}
      <div className="mb-12">
        <CategoryFilter
          categories={DEFAULT_CATEGORIES}
          active={active}
          onChange={setActive}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-ink-muted text-lg">No posts in this category yet.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            variants={staggerContainerSlow}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filtered.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
