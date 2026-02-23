/**
 * Whisper native module pre-validation script.
 *
 * Spawned as a utility process at startup to verify that the platform-specific
 * whisper native binary can load on this macOS version. If this process crashes
 * (segfault), the main process detects it and warns the user instead of
 * crashing on first dictation.
 *
 * Loads the native binary directly (bypassing @fugood/whisper.node's binding.js
 * which uses dynamic import() that fails inside Electron's asar archive).
 */
try {
  const pkg = `@fugood/node-whisper-${process.platform}-${process.arch}`
  try {
    require(pkg)
    process.exit(0)
  } catch {}
  try {
    require(require.resolve(`${pkg}/index.node`))
    process.exit(0)
  } catch {}
  process.exit(1)
} catch {
  process.exit(1)
}
