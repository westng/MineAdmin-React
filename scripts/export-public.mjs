import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { listPublicFiles, projectRoot } from './public-files.mjs'

const destination = path.resolve(
  process.argv.slice(2).find(argument => argument !== '--') || path.join(projectRoot, 'dist-source'),
)
if (existsSync(destination)) throw new Error('Export destination already exists; choose a new empty path')
const files = listPublicFiles()
mkdirSync(destination, { recursive: true })
for (const file of files) {
  const target = path.join(destination, file)
  mkdirSync(path.dirname(target), { recursive: true })
  copyFileSync(path.join(projectRoot, file), target)
}
writeFileSync(
  path.join(destination, 'SOURCE_MANIFEST.json'),
  JSON.stringify(
    {
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
console.log(`Exported ${files.length} reviewed public files to ${destination}`)
