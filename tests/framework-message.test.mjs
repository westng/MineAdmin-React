import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const result = await build({
  entryPoints: ['src/hooks/framework/use-message.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { toast } = require('sonner')

test('useMessage 同时送达实际 Toast 和兼容消息事件', t => {
  const previous = globalThis.window
  globalThis.window = new EventTarget()
  t.after(() => {
    globalThis.window = previous
  })
  const messages = []
  window.addEventListener('mine:message', event => messages.push(event.detail))
  const message = compiled.exports.useMessage()
  for (const level of ['success', 'error', 'warning', 'info']) {
    message[level](`消息-${level}`)
    const last = toast.getHistory().at(-1)
    assert.equal(last.title, `消息-${level}`)
    assert.equal(last.type, level)
  }
  assert.deepEqual(
    messages.map(item => item.level),
    ['success', 'error', 'warning', 'info'],
  )
})
