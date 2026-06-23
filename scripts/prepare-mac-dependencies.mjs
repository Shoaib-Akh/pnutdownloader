import { execFileSync } from 'node:child_process'
import { chmod, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const publicDirectory = join(process.cwd(), 'public')
const ffmpegPath = join(publicDirectory, 'ffmpeg')
const ytdlpPath = join(publicDirectory, 'yt-dlp_macos')
const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
const ffmpegBaseUrl = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1'

const getArchitectures = (filePath) =>
  execFileSync('lipo', ['-archs', filePath], { encoding: 'utf8' }).trim().split(/\s+/)

const isFile = async (filePath) => {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

const isUniversal = async (filePath) => {
  if (!(await isFile(filePath))) return false
  try {
    const architectures = getArchitectures(filePath)
    return architectures.includes('x86_64') && architectures.includes('arm64')
  } catch {
    return false
  }
}

const download = async (url, label) => {
  console.log(`Downloading ${label}...`)
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${label} download failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

if (!(await isUniversal(ytdlpPath))) {
  const temporaryPath = `${ytdlpPath}.download`
  await writeFile(temporaryPath, await download(ytdlpUrl, 'universal yt-dlp for macOS'))
  await chmod(temporaryPath, 0o755)
  if (!(await isUniversal(temporaryPath))) {
    await rm(temporaryPath, { force: true })
    throw new Error('Downloaded yt-dlp_macos is not universal')
  }
  await rename(temporaryPath, ytdlpPath)
}

if (!(await isUniversal(ffmpegPath))) {
  const x64Path = `${ffmpegPath}.download-x64`
  const arm64Path = `${ffmpegPath}.download-arm64`
  const universalPath = `${ffmpegPath}.download`

  try {
    const [x64Archive, arm64Archive] = await Promise.all([
      download(`${ffmpegBaseUrl}/ffmpeg-darwin-x64.gz`, 'FFmpeg for Intel Mac'),
      download(`${ffmpegBaseUrl}/ffmpeg-darwin-arm64.gz`, 'FFmpeg for Apple Silicon')
    ])
    await writeFile(x64Path, gunzipSync(x64Archive), { mode: 0o755 })
    await writeFile(arm64Path, gunzipSync(arm64Archive), { mode: 0o755 })
    execFileSync('lipo', ['-create', x64Path, arm64Path, '-output', universalPath])
    await chmod(universalPath, 0o755)
    if (!(await isUniversal(universalPath))) throw new Error('Could not create universal FFmpeg')
    await rename(universalPath, ffmpegPath)
  } finally {
    await Promise.all([
      rm(x64Path, { force: true }),
      rm(arm64Path, { force: true }),
      rm(universalPath, { force: true })
    ])
  }
}

await chmod(ytdlpPath, 0o755)
await chmod(ffmpegPath, 0o755)
console.log(`yt-dlp architectures: ${getArchitectures(ytdlpPath).join(', ')}`)
console.log(`FFmpeg architectures: ${getArchitectures(ffmpegPath).join(', ')}`)
