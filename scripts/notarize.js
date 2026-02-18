const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  // These env vars must be set during the build
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization — missing APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID')
    return
  }

  const appName = context.packager.appInfo.productFilename
  console.log(`Notarizing ${appName}...`)

  await notarize({
    appBundleId: 'com.anna.dictation',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })

  console.log('Notarization complete!')
}
