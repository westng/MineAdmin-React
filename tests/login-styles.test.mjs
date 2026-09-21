import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createServer } from 'vite'

test('the shared login layout is included in the generated Vite stylesheet', async () => {
  const source = await readFile(new URL('../src/modules/base/auth/views/index.tsx', import.meta.url), 'utf8')
  // Read candidates from the actual component so this test cannot supply missing classes to Tailwind.
  const classes = [...new Set(source.match(/[\w:-]+-\[[^\]\s]+\]/g) ?? [])]
  const widths = classes.filter(candidate => /^(lg:w|max-w)-\[/.test(candidate))
  assert.equal(widths.length, 3, 'The login layout needs two desktop columns and a bounded form')
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'biotech-login-styles-'))
  let server
  try {
    server = await createServer({
      cacheDir,
      logLevel: 'error',
      server: { middlewareMode: true, hmr: false, watch: null, open: false, preTransformRequests: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
    const result = await server.transformRequest('/src/assets/styles/globals.css')
    const encoded = result?.code.match(/const __vite__css = (".*")/)
    assert.ok(encoded, 'Vite must return the generated stylesheet')
    const css = JSON.parse(encoded[1])
    for (const candidate of widths) {
      const selector = `.${candidate.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`)}`
      const start = css.indexOf(`${selector} {`)
      assert.notEqual(start, -1, `Missing login layout utility: ${candidate}`)
      const block = css.slice(css.indexOf('{', start), css.indexOf('}', start))
      const property = candidate.startsWith('max-') ? 'max-width' : 'width'
      const value = candidate.slice(candidate.indexOf('[') + 1, -1)
      assert.ok(block.includes(`${property}: ${value}`), `Missing login layout declaration: ${candidate}`)
    }
  } finally {
    await server?.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
