import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('the Vite stylesheet includes the ignored marketing module timeline styles', async () => {
  // Compile CSS through the real plugin configuration without starting a listener or browser.
  const server = await createServer({
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null, preTransformRequests: false },
  })
  try {
    const result = await server.transformRequest('/src/assets/styles/globals.css')
    const encoded = result?.code.match(/const __vite__css = (".*")/)
    assert.ok(encoded, 'Vite must return the generated stylesheet')
    const css = JSON.parse(encoded[1])
    for (const [selector, declaration] of [
      ['.h-3\\.5', 'height: calc(var(--spacing) * 3.5)'],
      ['.leading-3\\.5', 'line-height: calc(var(--spacing) * 3.5)'],
      ['.bg-\\(--schedule-bg\\)', 'background-color: var(--schedule-bg)'],
      ['.text-\\(--schedule-fg\\)', 'color: var(--schedule-fg)'],
      ['.border-\\(--schedule-border\\)', 'border-color: var(--schedule-border)'],
      ['.bg-\\(image\\:--schedule-pattern\\)', 'background-image: var(--schedule-pattern)'],
      ['.dark\\:bg-\\(--schedule-dark-bg\\)', 'background-color: var(--schedule-dark-bg)'],
      ['.dark\\:text-\\(--schedule-dark-fg\\)', 'color: var(--schedule-dark-fg)'],
      ['.dark\\:bg-\\(image\\:--schedule-dark-pattern\\)', 'background-image: var(--schedule-dark-pattern)'],
    ]) {
      const start = css.indexOf(selector)
      assert.notEqual(start, -1, `Missing timeline utility: ${selector}`)
      // Vite may flatten the dark selector to `.class:is(.dark *)`.
      const block = css.slice(css.indexOf('{', start), css.indexOf('}', start))
      assert.ok(block.includes(declaration), `Missing timeline declaration: ${declaration}`)
    }
  } finally {
    await server.close()
  }
})
