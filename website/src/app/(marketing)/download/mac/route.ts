import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GITHUB_OWNER = 'Choquer-agency'
const GITHUB_REPO = 'ANNA'

export async function GET() {
  try {
    // Fetch the latest release from GitHub API
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Could not fetch release' },
        { status: 502 }
      )
    }

    const release = await res.json()

    // Find the DMG asset (prefer arm64)
    const dmgAsset = release.assets?.find(
      (a: { name: string }) =>
        a.name.endsWith('.dmg') && !a.name.includes('blockmap')
    )

    if (!dmgAsset) {
      return NextResponse.json(
        { error: 'No DMG found in latest release' },
        { status: 404 }
      )
    }

    // For private repos, generate a temporary download URL
    const assetRes = await fetch(dmgAsset.url, {
      headers: {
        Accept: 'application/octet-stream',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      redirect: 'manual',
    })

    const downloadUrl = assetRes.headers.get('location')

    if (downloadUrl) {
      return NextResponse.redirect(downloadUrl)
    }

    // Fallback: redirect to the release page
    return NextResponse.redirect(release.html_url)
  } catch {
    return NextResponse.redirect(
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
    )
  }
}
