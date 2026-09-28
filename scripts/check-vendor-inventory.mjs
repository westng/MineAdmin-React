import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { listPublicFiles, projectRoot } from './public-files.mjs'
const manifestPath = path.join(projectRoot, 'THIRD_PARTY_SOURCE.json')
const files = listPublicFiles().filter(file => file.startsWith('src/components/reui/') && !file.endsWith('/README.md'))
const hashes = Object.fromEntries(
  files.map(file => [
    file,
    createHash('sha256')
      .update(readFileSync(path.join(projectRoot, file)))
      .digest('hex'),
  ]),
)
if (process.argv.includes('--write')) {
  let previous
  try {
    previous = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schema: 1,
        upstream: previous?.upstream ?? {
          project: 'ReUI',
          repository: 'https://github.com/keenthemes/reui',
          revision: null,
        },
        note: 'Local source baseline. Upstream revision is unverified; hashes do not establish upstream provenance.',
        files: hashes,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`Recorded ${files.length} local vendor hashes; review changes before committing`)
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const changed = [...new Set([...Object.keys(hashes), ...Object.keys(manifest.files)])].filter(
    file => hashes[file] !== manifest.files[file],
  )
  if (changed.length) {
    console.error(`Vendor inventory differs:\n${changed.join('\n')}`)
    process.exitCode = 1
  } else
    console.log(
      `Vendor inventory verified: ${files.length} files (upstream revision ${manifest.upstream.revision ?? 'unverified'})`,
    )
}
