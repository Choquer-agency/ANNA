import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-sanity-secret')

  if (secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Revalidate the blog listing
    revalidatePath('/blog')

    // Revalidate the specific post if slug is available
    if (body?.slug?.current) {
      revalidatePath(`/blog/${body.slug.current}`)
    }

    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
  }
}
