import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { publicSource, projectRoot } from './public-files.mjs'

const source = publicSource({ workingTree: process.argv.includes('--working-tree') })
const destination = path.resolve(
  process.argv.slice(2).find(argument => !argument.startsWith('--')) || path.join(projectRoot, 'dist-source'),
)
if (existsSync(destination)) throw new Error('Export destination already exists; choose a new empty path')
const files = source.files
mkdirSync(destination, { recursive: true })
for (const file of files) {
  const target = path.join(destination, file)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, source.read(file), { mode: source.mode(file) })
}
writeFileSync(
  path.join(destination, 'SOURCE_MANIFEST.json'),
  JSON.stringify(
    {
      source: source.source,
      revision: source.revision,
      files: files.map(file => ({
        path: file,
        sha256: createHash('sha256')
          .update(readFileSync(path.join(destination, file)))
          .digest('hex'),
      })),
    },
    null,
    2,
  ) + '\n',
)
console.log(`Exported ${files.length} public files from ${source.revision ?? source.source} to ${destination}`)
