export const allPostsQuery = `*[
  _type == "post"
  && defined(slug.current)
] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  mainImage,
  publishedAt,
  author->{ name, slug, image },
  categories[]->{ title, slug }
}`

export const postBySlugQuery = `*[
  _type == "post"
  && slug.current == $slug
][0] {
  _id,
  title,
  slug,
  excerpt,
  mainImage,
  body,
  publishedAt,
  author->{ name, slug, image, bio, role },
  categories[]->{ title, slug },
  "seo": {
    "metaTitle": seo.metaTitle,
    "metaDescription": seo.metaDescription,
    "ogImage": seo.ogImage
  }
}`

export const postSlugsQuery = `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`

export const allCategoriesQuery = `*[_type == "category"] | order(title asc) {
  _id,
  title,
  slug
}`
