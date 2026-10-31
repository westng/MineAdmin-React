import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicSource, projectRoot } from './public-files.mjs'

export function parseReleaseTag(tag) {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(tag ?? '')
  if (!match || match[4]?.split('.').some(identifier => /^0\d+$/.test(identifier)))
    throw new Error('Release tag must be vX.Y.Z or vX.Y.Z-prerelease without leading zeroes')
  return { tag, version: tag.slice(1), prerelease: Boolean(match[4]) }
}

export function extractReleaseNotes(changelog, version) {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n')
  const headings = []
  let fence
  for (const [index, line] of lines.entries()) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim())
        fence = undefined
      continue
    }
    if (marker) {
      fence = marker[1]
      continue
    }
    if (line.startsWith('## ')) headings.push({ index, text: line })
  }
  if (!headings.some(heading => /^## (?:Unreleased|\[Unreleased\])\s*$/.test(heading.text)))
    throw new Error('CHANGELOG.md must retain an Unreleased section')
  const entries = headings.filter(heading => {
    const match = /^## \[([^\]]+)\](?:\s+-\s+.*)?$/.exec(heading.text)
    return match?.[1] === version
  })
  if (entries.length !== 1) throw new Error(`CHANGELOG.md must contain exactly one released entry for ${version}`)
  const heading = entries[0]
  const dateText = /^## \[[^\]]+\] - (\d{4}-\d{2}-\d{2})\s*$/.exec(heading.text)?.[1]
  const date = new Date(`${dateText}T00:00:00Z`)
  if (!dateText || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText)
    throw new Error(`CHANGELOG.md entry for ${version} must have a valid YYYY-MM-DD release date`)
  const end = headings.find(item => item.index > heading.index)?.index ?? lines.length
  if (
    !lines
      .slice(heading.index + 1, end)
      .join('\n')
      .trim()
  )
    throw new Error(`CHANGELOG.md entry for ${version} must contain release notes`)
  return lines.slice(heading.index, end).join('\n').trim() + '\n'
}

export function checkRelease(tag, { root = projectRoot } = {}) {
  const metadata = parseReleaseTag(tag)
  const source = publicSource({ root })
  const tagRevision = execFileSync('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  if (source.revision !== tagRevision) throw new Error('Release tag must point to the checked-out HEAD commit')
  const pkg = JSON.parse(source.read('package.json').toString('utf8'))
  if (pkg.version !== metadata.version)
    throw new Error(`Release tag version ${metadata.version} does not match package.json version ${pkg.version}`)
  const notes = extractReleaseNotes(source.read('CHANGELOG.md').toString('utf8'), metadata.version)
  return { ...metadata, revision: source.revision, notes }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [tag, directory, ...extra] = process.argv.slice(2).filter(argument => argument !== '--')
    if (extra.length) throw new Error('Usage: check-release.mjs <tag> [new release notes directory]')
    const metadata = checkRelease(tag)
    if (directory) {
      mkdirSync(directory, { recursive: true })
      writeFileSync(path.join(directory, 'RELEASE_NOTES.md'), metadata.notes, { flag: 'wx' })
    }
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `tag=${metadata.tag}\nversion=${metadata.version}\nrevision=${metadata.revision}\nprerelease=${metadata.prerelease}\n`,
      )
    console.log(`Release metadata passed: ${metadata.tag} at ${metadata.revision}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
