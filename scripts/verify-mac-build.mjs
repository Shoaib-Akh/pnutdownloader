import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const appPath = join(process.cwd(), 'dist', 'mac-universal', 'PNUTDownloader.app')
const binaries = [
  join(appPath, 'Contents', 'MacOS', 'PNUTDownloader'),
  join(appPath, 'Contents', 'Resources', 'ffmpeg'),
  join(appPath, 'Contents', 'Resources', 'yt-dlp_macos')
]

for (const binaryPath of binaries) {
  if (!existsSync(binaryPath)) throw new Error(`Missing macOS build binary: ${binaryPath}`)
  const architectures = execFileSync('lipo', ['-archs', binaryPath], { encoding: 'utf8' })
    .trim()
    .split(/\s+/)
  if (!architectures.includes('x86_64') || !architectures.includes('arm64')) {
    throw new Error(`Binary is not universal: ${binaryPath} (${architectures.join(', ')})`)
  }
}

console.log(`Verified universal macOS build: ${appPath}`)
