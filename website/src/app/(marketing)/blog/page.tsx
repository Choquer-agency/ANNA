import type { Metadata } from 'next'
import { client } from '@/lib/sanity/client'
import { allPostsQuery } from '@/lib/sanity/queries'
import { BlogGrid } from '@/components/blog/BlogGrid'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Post } from '@/lib/sanity/types'

export const metadata: Metadata = {
  title: 'Blog — Anna',
  description: 'Thoughts on voice, productivity, and building Anna — the AI dictation app for macOS.',
}

export const revalidate = 3600

export default async function BlogPage() {
  const posts = await client.fetch<Post[]>(allPostsQuery, {}, { next: { revalidate: 3600 } })

  return (
    <section className="pt-[clamp(8rem,15vh,12rem)] pb-[clamp(4rem,8vw,8rem)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <FadeIn className="mb-12">
          <h1 className="hero-heading text-ink max-w-[900px]">
            Thoughts on voice, productivity, and building Anna.
          </h1>
        </FadeIn>

        <FadeIn delay={0.15}>
          <BlogGrid posts={posts} />
        </FadeIn>
      </div>
    </section>
  )
}
