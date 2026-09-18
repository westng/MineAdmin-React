import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))

try {
  const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: packageRoot,
    encoding: 'utf8',
  }).trim()

  const normalizedPackageRoot = packageRoot.endsWith('/') ? packageRoot.slice(0, -1) : packageRoot

  if (gitRoot === normalizedPackageRoot) {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
      cwd: packageRoot,
      stdio: 'ignore',
    })
  }
} catch {
  // Dependency installation can run outside a Git checkout.
}
