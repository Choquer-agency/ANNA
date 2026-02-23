/**
 * Whisper native module pre-validation script.
 *
 * Spawned as a child process at startup to verify that the @fugood/whisper.node
 * native binary can load on this macOS version. If this process crashes (segfault),
 * the main process detects it and warns the user instead of crashing on first dictation.
 */
try {
  require('@fugood/whisper.node')
  process.exit(0)
} catch {
  process.exit(1)
}
