import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const testsDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(testsDirectory, '..')
const matrixPath = path.join(testsDirectory, 'platform-cases.json')

const parseArguments = (argv) => {
  const options = {
    platforms: [],
    report: path.join(testsDirectory, 'reports', 'platform-smoke-report.json'),
    skipAuth: false,
    timeoutMs: 60000
  }

  for (const argument of argv) {
    if (argument.startsWith('--platform=')) {
      options.platforms.push(...argument.slice('--platform='.length).split(',').filter(Boolean))
    } else if (argument.startsWith('--cookies=')) {
      options.cookies = path.resolve(argument.slice('--cookies='.length))
    } else if (argument.startsWith('--report=')) {
      options.report = path.resolve(argument.slice('--report='.length))
    } else if (argument.startsWith('--timeout=')) {
      options.timeoutMs = Number(argument.slice('--timeout='.length)) * 1000
    } else if (argument === '--skip-auth') {
      options.skipAuth = true
    } else if (argument === '--help') {
      options.help = true
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error('--timeout must be a number of seconds greater than zero')
  }

  options.cookies ||= process.env.PNUT_TEST_COOKIES
    ? path.resolve(process.env.PNUT_TEST_COOKIES)
    : undefined

  return options
}

const printHelp = () => {
  console.log(`Usage: npm run test:platforms:live -- [options]

Options:
  --platform=id[,id]  Test only the listed platform IDs
  --cookies=/path     Netscape-format cookie file for authenticated sites
  --skip-auth         Skip cases marked as requiring cookies
  --timeout=seconds   Per-platform timeout (default: 60)
  --report=/path      JSON report destination
  --help              Show this help

Environment:
  YTDLP_PATH          Override the yt-dlp executable
  PNUT_TEST_COOKIES   Cookie file, equivalent to --cookies`)
}

const isExecutable = async (candidate) => {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}

const resolveYtdlp = async () => {
  if (process.env.YTDLP_PATH) return path.resolve(process.env.YTDLP_PATH)

  const candidates =
    process.platform === 'win32'
      ? ['public/yt-dlp.exe']
      : process.platform === 'darwin'
        ? ['public/yt-dlp', 'public/yt-dlp_macos']
        : ['public/yt-dlp', 'yt-dlp']

  for (const candidate of candidates) {
    const absoluteCandidate = path.resolve(projectRoot, candidate)
    if (await isExecutable(absoluteCandidate)) return absoluteCandidate
  }

  throw new Error('yt-dlp was not found. Set YTDLP_PATH or install the bundled dependency.')
}

const runProcess = (executable, args, timeoutMs) =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })
    let stdout = ''
    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      reject(new Error(`timed out after ${Math.round(timeoutMs / 1000)} seconds`))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ code, stdout, stderr })
    })
  })

const findThumbnail = (info) => {
  if (typeof info.thumbnail === 'string' && info.thumbnail.trim()) return info.thumbnail
  if (!Array.isArray(info.thumbnails)) return null

  return (
    [...info.thumbnails]
      .reverse()
      .find((thumbnail) => typeof thumbnail?.url === 'string' && thumbnail.url.trim())?.url || null
  )
}

const hasMediaFormat = (info, media) => {
  const formats = Array.isArray(info.formats) ? info.formats : []
  const codecKey = media === 'audio' ? 'acodec' : 'vcodec'
  const audioExtensions = new Set(['aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav'])
  const videoExtensions = new Set(['3gp', 'flv', 'm4v', 'mkv', 'mov', 'mp4', 'webm'])
  const expectedExtensions = media === 'audio' ? audioExtensions : videoExtensions
  const isExpectedFormat = (format) =>
    (typeof format?.[codecKey] === 'string' && format[codecKey] !== 'none') ||
    expectedExtensions.has(format?.ext) ||
    (media === 'video' && (Number(format?.height) > 0 || Number(format?.width) > 0))

  if (isExpectedFormat(info) && typeof info.url === 'string' && info.url) return true
  return formats.some((format) => isExpectedFormat(format) && typeof format?.url === 'string')
}

const validateInfo = (platformCase, info) => {
  const errors = []
  const title = typeof info.title === 'string' ? info.title.trim() : ''
  const thumbnail = findThumbnail(info)

  if (!title || /^(unknown|untitled|n\/a)$/i.test(title)) {
    errors.push('missing a usable title')
  }
  if (platformCase.live.requireThumbnail && !thumbnail) {
    errors.push('missing a thumbnail URL')
  }
  if (!hasMediaFormat(info, platformCase.live.media)) {
    errors.push(`missing a downloadable ${platformCase.live.media} format`)
  }

  return {
    errors,
    metadata: {
      id: info.id || null,
      title: title || null,
      thumbnail,
      duration: info.duration ?? null,
      extractor: info.extractor_key || info.extractor || null,
      formatCount: Array.isArray(info.formats) ? info.formats.length : 0
    }
  }
}

const runCase = async (executable, platformCase, options) => {
  const startedAt = Date.now()

  if (options.skipAuth && platformCase.live.requiresCookies && !options.cookies) {
    return {
      platform: platformCase.id,
      displayName: platformCase.displayName,
      url: platformCase.live.url,
      status: 'skipped',
      reason: 'case requires cookies; pass --cookies or omit --skip-auth',
      elapsedMs: 0
    }
  }

  const args = [
    '--dump-single-json',
    '--skip-download',
    '--no-playlist',
    '--socket-timeout',
    '20',
    '--retries',
    '1',
    '--extractor-retries',
    '1',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]
  if (options.cookies) args.push('--cookies', options.cookies)
  args.push(platformCase.live.url)

  try {
    const execution = await runProcess(executable, args, options.timeoutMs)
    if (execution.code !== 0) {
      throw new Error(execution.stderr.trim() || `yt-dlp exited with code ${execution.code}`)
    }

    const info = JSON.parse(execution.stdout)
    const validation = validateInfo(platformCase, info)
    const elapsedMs = Date.now() - startedAt

    if (validation.errors.length > 0) {
      return {
        platform: platformCase.id,
        displayName: platformCase.displayName,
        url: platformCase.live.url,
        status: 'failed',
        reason: validation.errors.join('; '),
        elapsedMs,
        ...validation.metadata
      }
    }

    return {
      platform: platformCase.id,
      displayName: platformCase.displayName,
      url: platformCase.live.url,
      status: 'passed',
      elapsedMs,
      ...validation.metadata
    }
  } catch (error) {
    return {
      platform: platformCase.id,
      displayName: platformCase.displayName,
      url: platformCase.live.url,
      status: 'failed',
      reason: String(error.message || error).slice(0, 2000),
      elapsedMs: Date.now() - startedAt
    }
  }
}

const main = async () => {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  if (options.cookies && !(await isExecutable(options.cookies))) {
    throw new Error(`Cookie file does not exist: ${options.cookies}`)
  }

  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'))
  const selected =
    options.platforms.length > 0
      ? matrix.platforms.filter(({ id }) => options.platforms.includes(id))
      : matrix.platforms
  const missing = options.platforms.filter((id) => !matrix.platforms.some((item) => item.id === id))
  if (missing.length > 0) throw new Error(`Unknown platform IDs: ${missing.join(', ')}`)
  if (selected.length === 0) throw new Error('No platform cases selected')

  const executable = await resolveYtdlp()
  const versionResult = await runProcess(executable, ['--version'], 30000)
  const version = versionResult.stdout.trim() || 'unknown'
  console.log(`yt-dlp ${version}`)
  console.log(`Running ${selected.length} live metadata checks sequentially...`)

  const results = []
  for (const platformCase of selected) {
    process.stdout.write(`- ${platformCase.displayName}: `)
    const result = await runCase(executable, platformCase, options)
    results.push(result)
    console.log(
      `${result.status.toUpperCase()} (${(result.elapsedMs / 1000).toFixed(1)}s)${result.reason ? ` - ${result.reason.split('\n')[0]}` : ''}`
    )
  }

  const counts = {
    passed: results.filter(({ status }) => status === 'passed').length,
    failed: results.filter(({ status }) => status === 'failed').length,
    skipped: results.filter(({ status }) => status === 'skipped').length
  }
  const report = {
    generatedAt: new Date().toISOString(),
    ytdlpPath: executable,
    ytdlpVersion: version,
    cookiesUsed: Boolean(options.cookies),
    counts,
    results
  }

  await mkdir(path.dirname(options.report), { recursive: true })
  await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`\nPassed: ${counts.passed}; failed: ${counts.failed}; skipped: ${counts.skipped}`)
  console.log(`Report: ${options.report}`)

  if (counts.failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
