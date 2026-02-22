import type { PortableTextBlock } from '@portabletext/types'

export interface SanityImage {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
  caption?: string
  hotspot?: { x: number; y: number; height: number; width: number }
  crop?: { top: number; bottom: number; left: number; right: number }
}

export interface Author {
  name: string
  slug: { current: string }
  image?: SanityImage
  bio?: PortableTextBlock[]
  role?: string
}

export interface Category {
  title: string
  slug: { current: string }
  description?: string
}

export interface Post {
  _id: string
  title: string
  slug: { current: string }
  excerpt?: string
  mainImage?: SanityImage
  body: PortableTextBlock[]
  publishedAt: string
  author?: Author
  categories?: Category[]
  seo?: {
    metaTitle?: string
    metaDescription?: string
    ogImage?: SanityImage
  }
}
