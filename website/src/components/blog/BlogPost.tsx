'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { PortableTextRenderer, extractHeadings } from './PortableTextRenderer'
import { TableOfContents } from './TableOfContents'
import { ShareButtons } from './ShareButtons'
import { urlFor } from '@/lib/sanity/image'
import type { Post } from '@/lib/sanity/types'

export function BlogPost({ post }: { post: Post }) {
  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(1000).quality(85).url()
    : null

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const headings = Array.isArray(post.body) ? extractHeadings(post.body) : []

  return (
    <article className="pt-[clamp(8rem,15vh,12rem)] pb-[clamp(4rem,8vw,8rem)]">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        {/* Back link */}
        <FadeIn>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>
        </FadeIn>

        {/* Hero: title+meta left, image right */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.7fr] gap-10 lg:gap-16 items-center mb-16">
            {/* Left: title + meta */}
            <div>
              {/* Categories */}
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories.map((cat) => (
                    <span
                      key={cat.slug.current}
                      className="text-[0.7rem] uppercase tracking-[0.12em] font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-full"
                    >
                      {cat.title}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="heading-lg text-ink mb-6">
                {post.title}
              </h1>

              {/* Author + Date */}
              <div className="flex items-center gap-4">
                {post.author?.image && (
                  <Image
                    src={urlFor(post.author.image).width(96).height(96).url()}
                    alt={post.author.name}
                    width={44}
                    height={44}
                    className="rounded-full"
                  />
                )}
                <div>
                  {post.author && (
                    <p className="text-sm font-semibold text-ink">{post.author.name}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    {post.author?.role && <span>{post.author.role}</span>}
                    {post.author?.role && date && <span>&middot;</span>}
                    {date && <time>{date}</time>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: hero image */}
            {imageUrl && (
              <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={post.mainImage?.alt || post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 480px"
                />
              </div>
            )}
          </div>
        </FadeIn>

        {/* Divider */}
        <div className="border-t border-border mb-12" />

        {/* Two-column body: article left, ToC right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-16">
          {/* Article body */}
          <FadeIn delay={0.2}>
            <div className="prose-blog min-w-0">
              {Array.isArray(post.body) && <PortableTextRenderer value={post.body} />}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-border">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to all posts
              </Link>
            </div>
          </FadeIn>

          {/* Sticky ToC sidebar */}
          <div className="sticky top-32 self-start space-y-10">
            <TableOfContents headings={headings} />
            <ShareButtons title={post.title} slug={post.slug.current} />
          </div>
        </div>
      </div>
    </article>
  )
}
