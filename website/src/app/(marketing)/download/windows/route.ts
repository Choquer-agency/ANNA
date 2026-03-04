import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GITHUB_OWNER = 'Choquer-agency'
const GITHUB_REPO = 'ANNA'

export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
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

    // Find the Windows installer (.exe, not blockmap)
    const exeAsset = (release.assets || []).find(
      (a: { name: string }) =>
        a.name.endsWith('.exe') && !a.name.includes('blockmap')
    )

    if (!exeAsset) {
      return NextResponse.json(
        { error: 'No Windows installer found in latest release' },
        { status: 404 }
      )
    }

    // Get the download redirect URL
    const assetRes = await fetch(exeAsset.url, {
      headers: {
        Accept: 'application/octet-stream',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
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
