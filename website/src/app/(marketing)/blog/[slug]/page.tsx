import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/lib/sanity/client'
import { postBySlugQuery, postSlugsQuery } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'
import { BlogPost } from '@/components/blog/BlogPost'
import type { Post } from '@/lib/sanity/types'

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await client.fetch<{ slug: string }[]>(postSlugsQuery)
  return slugs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await client.fetch<Post | null>(postBySlugQuery, { slug })
  if (!post) return {}

  const title = post.seo?.metaTitle || post.title
  const description = post.seo?.metaDescription || post.excerpt || ''
  const ogImage = post.seo?.ogImage || post.mainImage

  return {
    title: `${title} — Anna`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author.name] : [],
      images: ogImage
        ? [{ url: urlFor(ogImage).width(1200).height(630).url(), width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await client.fetch<Post | null>(postBySlugQuery, { slug })

  if (!post) notFound()

  return <BlogPost post={post} />
}
