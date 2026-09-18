import { execFileSync } from 'node:child_process'
import { isPublicFile, projectRoot } from './public-files.mjs'
const files = execFileSync('git', ['ls-files', '-z'], { cwd: projectRoot, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const forbidden = files.filter(file => !isPublicFile(file))
if (forbidden.length) {
  console.error(
    `Public repository index contains ${forbidden.length} files outside the reviewed public manifest:\n${forbidden.join('\n')}`,
  )
  process.exitCode = 1
} else console.log('Public repository index matches the reviewed public manifest')
