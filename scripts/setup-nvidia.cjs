// Install the pinned NVIDIA Apple Silicon runtime in Anna's app-data directory.
// Model downloads are pinned and checksum-verified by nemo-speech itself.
const { mkdirSync, existsSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { homedir, tmpdir } = require('node:os')
const { createHash } = require('node:crypto')
const { execFileSync } = require('node:child_process')

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error('This NVIDIA test requires an Apple Silicon Mac.')
  }
  const directory = join(homedir(), 'Library', 'Application Support', 'anna', 'nvidia-runtime')
  const binary = join(directory, 'bin', 'nemo-speech')
  if (!existsSync(binary)) {
    const name = 'nemo-speech-0.2.0-macos-aarch64-metal.tar.gz'
    const base = 'https://github.com/NVIDIA/NeMo-Speech.cpp/releases/download/v0.2.0/'
    console.log('Downloading NVIDIA Metal runtime v0.2.0...')
    const [archive, checksum] = await Promise.all([download(base + name), download(base + name + '.sha256')])
    const expected = checksum.toString('utf8').trim().split(/\s+/)[0]
    if (createHash('sha256').update(archive).digest('hex') !== expected) {
      throw new Error('NVIDIA runtime checksum mismatch')
    }
    const temporary = mkdtempSync(join(tmpdir(), 'anna-nvidia-'))
    try {
      const path = join(temporary, name)
      writeFileSync(path, archive)
      mkdirSync(directory, { recursive: true })
      execFileSync('/usr/bin/tar', ['-xzf', path, '-C', directory, '--strip-components=1'])
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  }
  console.log('Preparing Parakeet TDT 0.6B v3 (~681 MiB)...')
  execFileSync(binary, ['pull', 'parakeet-tdt'], { stdio: 'inherit' })
  console.log('Preparing Nemotron 3.5 ASR (~707 MiB)...')
  execFileSync(binary, ['pull', 'nemotron-3.5'], { stdio: 'inherit' })
  console.log('Preparing Nemotron 3 Diarization (~102 MiB)...')
  execFileSync(binary, ['pull', 'nemotron-3-diarization'], { stdio: 'inherit' })
  console.log('NVIDIA local transcription is ready.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
