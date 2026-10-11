// Import the signing identity explicitly. electron-builder 26.8 mixes up the
// certificate password and its randomly generated keychain password.
const { execFileSync } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const { writeFileSync, appendFileSync, unlinkSync } = require('node:fs')
const { join } = require('node:path')
const directory = process.env.RUNNER_TEMP
if (!directory || !process.env.MAC_CERTS || !process.env.MAC_CERTS_PASSWORD || !process.env.GITHUB_ENV) throw Error('Missing CI signing configuration')
const keychain = join(directory, 'anna-signing.keychain-db')
const certificate = join(directory, 'anna-signing.p12')
const password = randomBytes(32).toString('hex')
console.log('::add-mask::' + password)
writeFileSync(certificate, Buffer.from(process.env.MAC_CERTS, 'base64'), { mode: 0o600 })
function security(args) { return execFileSync('/usr/bin/security', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
try {
  security(['create-keychain', '-p', password, keychain])
  security(['set-keychain-settings', '-lut', '21600', keychain])
  security(['unlock-keychain', '-p', password, keychain])
  security(['import', certificate, '-k', keychain, '-P', process.env.MAC_CERTS_PASSWORD, '-T', '/usr/bin/codesign', '-T', '/usr/bin/productbuild'])
  security(['set-key-partition-list', '-S', 'apple-tool:,apple:', '-s', '-k', password, keychain])
  const existing = security(['list-keychains', '-d', 'user']).split('\n').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
  security(['list-keychains', '-d', 'user', '-s', keychain, ...existing])
  appendFileSync(process.env.GITHUB_ENV, `CSC_KEYCHAIN=${keychain}\n`)
  console.log('CI signing keychain prepared')
} catch (error) {
  // Do not dump subprocess arguments: they contain credentials.
  throw Error('Could not prepare signing keychain: ' + (error.stderr?.toString().trim() || 'security command failed'))
} finally { unlinkSync(certificate) }
