import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

const rootDirectory = process.cwd()
const args = process.argv.slice(2)
const publishPolicy = args.includes('--no-publish') ? 'never' : 'always'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const electronBuilderCommand = join(
  rootDirectory,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
)

const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  CSC_LINK: '',
  CSC_KEY_PASSWORD: '',
  WIN_CSC_LINK: '',
  WIN_CSC_KEY_PASSWORD: ''
}

const run = (command, commandArgs) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDirectory,
      env,
      stdio: 'inherit'
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code}`))
      }
    })
  })

if (publishPolicy === 'always' && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.warn('GH_TOKEN or GITHUB_TOKEN is required to upload the release to GitHub.')
}

await rm(join(rootDirectory, 'dist'), { recursive: true, force: true })
await rm(join(rootDirectory, 'out'), { recursive: true, force: true })

await run(npmCommand, ['run', 'build'])
await run(electronBuilderCommand, ['--win', `--publish=${publishPolicy}`])
