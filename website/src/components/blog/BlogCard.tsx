'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { fadeInUp } from '@/lib/animations'
import { urlFor } from '@/lib/sanity/image'
import type { Post } from '@/lib/sanity/types'

export function BlogCard({ post }: { post: Post }) {
  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(800).height(450).quality(80).url()
    : null

  const category = post.categories?.[0]

  return (
    <motion.article variants={fadeInUp}>
      <Link
        href={`/blog/${post.slug.current}`}
        className="group block rounded-2xl overflow-hidden bg-surface-raised shadow-soft transition-shadow duration-300 hover:shadow-float"
      >
        {/* Image */}
        {imageUrl && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={imageUrl}
              alt={post.mainImage?.alt || post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {category && (
            <span className="text-[0.7rem] uppercase tracking-[0.12em] font-semibold text-primary">
              {category.title}
            </span>
          )}

          <h2 className="text-xl md:text-2xl font-semibold text-ink leading-snug mt-2 line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-sm text-ink-muted mt-2 line-clamp-1 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  )
}
