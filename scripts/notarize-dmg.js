const path = require('path')
const { execSync } = require('child_process')

exports.default = async function afterAllArtifactBuild(buildResult) {
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping artifact notarization — missing APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID')
    return []
  }

  const artifacts = (buildResult.artifactPaths || []).filter(
    (p) => p.endsWith('.dmg') || p.endsWith('.zip')
  )

  for (const artifactPath of artifacts) {
    const name = path.basename(artifactPath)
    const ext = path.extname(artifactPath)

    console.log(`Notarizing ${name}...`)
    execSync(
      `xcrun notarytool submit "${artifactPath}" --apple-id "${appleId}" --password "${appleIdPassword}" --team-id "${teamId}" --wait`,
      { stdio: 'inherit', timeout: 600000 }
    )
    console.log(`Notarization complete for ${name}`)

    // Staple the ticket to DMGs (ZIP files cannot be stapled)
    if (ext === '.dmg') {
      console.log(`Stapling ${name}...`)
      execSync(`xcrun stapler staple "${artifactPath}"`, { stdio: 'inherit' })
      console.log(`Stapling complete for ${name}`)
    }
  }

  return []
}
