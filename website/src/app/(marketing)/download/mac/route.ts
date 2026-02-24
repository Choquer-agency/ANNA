import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GITHUB_OWNER = 'Choquer-agency'
const GITHUB_REPO = 'ANNA'

export async function GET(request: NextRequest) {
  try {
    // Determine architecture: query param override > User-Agent detection
    const archParam = request.nextUrl.searchParams.get('arch')
    let wantsArm64: boolean

    if (archParam === 'x64') {
      wantsArm64 = false
    } else if (archParam === 'arm64') {
      wantsArm64 = true
    } else {
      // Auto-detect from User-Agent
      const ua = request.headers.get('user-agent') || ''
      wantsArm64 = !ua.includes('Intel Mac OS X')
    }

    // Fetch the latest release from GitHub API
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

    // Find the correct DMG for the architecture
    // arm64 DMGs have "arm64" in the filename, x64 DMGs do not
    const dmgAssets = (release.assets || []).filter(
      (a: { name: string }) =>
        a.name.endsWith('.dmg') && !a.name.includes('blockmap')
    )

    let dmgAsset = dmgAssets.find((a: { name: string }) =>
      wantsArm64 ? a.name.includes('arm64') : !a.name.includes('arm64')
    )

    // Fallback: use any available DMG if preferred arch isn't found
    if (!dmgAsset && dmgAssets.length > 0) {
      dmgAsset = dmgAssets[0]
    }

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
