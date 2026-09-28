import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'
import React from 'react'
import { renderToString } from 'react-dom/server'

globalThis.requestAnimationFrame = callback => setTimeout(callback, 0)
const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: `
    export { useMessage } from './src/hooks/ui/use-message'
    export { createToast } from './src/components/reui/toast-api'
    export { ToastContext } from './src/components/reui/toast-context'
  `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { createToast, ToastContext, useMessage } = compiled.exports
const { toast: sonner } = require('sonner')

test('useMessage 使用所在 provider 的通知实例', () => {
  const toast = createToast('message-test')
  function Probe() {
    const message = useMessage()
    for (const level of ['success', 'error', 'warning', 'info']) message[level](`消息-${level}`)
    return null
  }
  renderToString(React.createElement(ToastContext.Provider, { value: { toast } }, React.createElement(Probe)))
  assert.deepEqual(
    sonner
      .getHistory()
      .filter(item => item.toasterId === 'message-test')
      .map(item => [item.type, item.title]),
    ['success', 'error', 'warning', 'info'].map(level => [level, `消息-${level}`]),
  )
  toast.dismiss()
})

test('相同通知 ID 和全量 dismiss 限制在所属 provider', async () => {
  const a = createToast('a'),
    b = createToast('b')
  const aid = a.info('A', { id: 'same' }),
    bid = b.info('B', { id: 'same' })
  assert.notEqual(aid, bid)
  a.dismiss()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(
    sonner.getToasts().some(item => item.id === aid),
    false,
  )
  assert.equal(
    sonner.getToasts().some(item => item.id === bid),
    true,
  )
  b.dismiss('same')
})
