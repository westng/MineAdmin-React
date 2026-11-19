import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { build } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import { Window } from 'happy-dom'

const dom = new Window({ url: 'http://localhost/admin/' })
Object.defineProperty(globalThis, 'document', { value: dom.document, configurable: true })
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0)
const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: `
      export { downloadFile, createDownloadNotification } from './src/components/ma-download'
      export { createToast } from './src/components/reui/toast-api'
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
const { downloadFile, createDownloadNotification, createToast } = compiled.exports
const { toast: sonner } = require('sonner')

function fixture(t) {
  const notices = [],
    links = [],
    blobs = [],
    releases = []
  const toast = Object.fromEntries(
    ['loading', 'success', 'error', 'info'].map(kind => [
      kind,
      (message, options) => {
        notices.push({ kind, message, options })
        return options.id
      },
    ]),
  )
  t.mock.method(dom.HTMLAnchorElement.prototype, 'click', function () {
    links.push({ url: this.href, name: this.download, referrerPolicy: this.referrerPolicy })
  })
  t.mock.method(URL, 'createObjectURL', blob => {
    blobs.push(blob)
    return `blob:http://localhost/test-${blobs.length}`
  })
  t.mock.method(URL, 'revokeObjectURL', () => undefined)
  const schedule = globalThis.setTimeout
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
    if (delay === 60000) {
      releases.push(callback)
      return 0
    }
    return schedule(callback, delay, ...args)
  })
  t.after(() => releases.forEach(release => release()))
  return { toast, notices, links, blobs }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

test('流式下载在保存前回报真实字节，复用同一条框架 Sonner 通知且不发送后台认证', async t => {
  const ctx = fixture(t),
    progress = [],
    requests = []
  let stream,
    now = 1000
  t.mock.method(Date, 'now', () => now)
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options })
    return new Response(
      new ReadableStream({
        start(value) {
          stream = value
        },
      }),
      { headers: { 'content-length': '4' } },
    )
  })
  const transfer = downloadFile(
    {
      request: async () => ({ url: 'https://node.invalid/file?ticket=test', filename: '节点/素材.mp4' }),
      onProgress: value => progress.push(value),
    },
    ctx.toast,
  )
  await tick()
  assert.equal(ctx.links.length, 0)
  assert.equal(ctx.notices.at(-1).kind, 'loading')
  now += 150
  stream.enqueue(new Uint8Array([1, 2]))
  await tick()
  assert.deepEqual(progress.at(-1), { loaded: 2, total: 4 })
  assert.match(renderToStaticMarkup(ctx.notices.at(-1).options.description), /50%/)
  assert.equal(ctx.links.length, 0)
  stream.enqueue(new Uint8Array([3, 4]))
  stream.close()
  await transfer
  assert.deepEqual([...new Uint8Array(await ctx.blobs[0].arrayBuffer())], [1, 2, 3, 4])
  assert.equal(ctx.links[0].name, '节点_素材.mp4')
  assert.equal(ctx.links[0].referrerPolicy, 'no-referrer')
  assert.equal(ctx.notices.at(-1).kind, 'success')
  assert.match(ctx.notices.at(-1).options.description, /节点_素材.mp4.*浏览器保存/)
  assert.equal(new Set(ctx.notices.map(item => item.options.id)).size, 1)
  assert.equal(requests[0].options.credentials, 'same-origin')
  assert.equal(requests[0].options.headers, undefined)
  assert.equal(requests[0].options.referrerPolicy, 'no-referrer')
})

test('未知总量显示已接收大小和不定进度，不伪造百分比', async t => {
  const ctx = fixture(t),
    progress = []
  t.mock.method(globalThis, 'fetch', async () => new Response('abc'))
  await downloadFile({ url: '/files/unknown.txt', onProgress: value => progress.push(value) }, ctx.toast)
  assert.equal(progress.at(-1).loaded, 3)
  assert.equal(progress.at(-1).total, undefined)
  const notice = createDownloadNotification(ctx.toast, 'unknown.txt')
  notice.progress(progress.at(-1))
  const markup = renderToStaticMarkup(ctx.notices.at(-1).options.description)
  assert.match(markup, /3 B.*正在接收文件/)
  const element = dom.document.createElement('div')
  element.innerHTML = markup
  assert.doesNotMatch(element.textContent, /[0-9]+%/)
  assert.equal(element.querySelector('[role="progressbar"]').hasAttribute('aria-valuenow'), false)
  assert.equal(element.querySelector('[role="progressbar"]').hasAttribute('data-indeterminate'), true)
  notice.cancel()
})

test('HTTP 失败、内容截断和非法 URL 不保存文件，并更新原通知为失败', async t => {
  const ctx = fixture(t)
  t.mock.method(globalThis, 'fetch', async () => new Response('no', { status: 403 }))
  await assert.rejects(downloadFile({ url: 'https://node.invalid/denied' }, ctx.toast), /HTTP 403/)
  t.mock.method(globalThis, 'fetch', async () => new Response('short', { headers: { 'content-length': '20' } }))
  await assert.rejects(downloadFile({ url: 'https://node.invalid/incomplete' }, ctx.toast), /不完整/)
  await assert.rejects(downloadFile({ url: 'javascript:alert(1)' }, ctx.toast), /不支持/)
  assert.equal(ctx.links.length, 0)
  assert.equal(ctx.notices.filter(item => item.kind === 'error').length, 3)
  assert.equal(ctx.notices.filter(item => item.kind === 'success').length, 0)
})

test('通知上的取消会中断接收，不保存已接收的部分文件，也不标记成功', async t => {
  const ctx = fixture(t)
  let signal
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal
    return new Response(
      new ReadableStream({
        start(stream) {
          stream.enqueue(new Uint8Array([1]))
          signal.addEventListener('abort', () => stream.error(new DOMException('Aborted', 'AbortError')), {
            once: true,
          })
        },
      }),
    )
  })
  const transfer = downloadFile({ url: 'https://node.invalid/large.mp4' }, ctx.toast)
  await tick()
  ctx.notices[0].options.action.onClick()
  await assert.rejects(transfer, { name: 'AbortError' })
  assert.equal(signal.aborted, true)
  assert.equal(ctx.links.length, 0)
  assert.equal(ctx.notices.at(-1).kind, 'info')
  assert.equal(ctx.notices.filter(item => ['success', 'error'].includes(item.kind)).length, 0)
})

test('取消准备后忽略晚到票据，不再请求节点或保存文件', async t => {
  const ctx = fixture(t),
    controller = new AbortController()
  let resolve
  const pending = new Promise(done => {
    resolve = done
  })
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('must not fetch')
  })
  const transfer = downloadFile({ signal: controller.signal, request: () => pending }, ctx.toast)
  controller.abort()
  resolve({ url: 'https://node.invalid/late', filename: 'late.mp4' })
  await assert.rejects(transfer, { name: 'AbortError' })
  assert.equal(fetch.mock.callCount(), 0)
  assert.equal(ctx.links.length, 0)
  assert.equal(ctx.notices.at(-1).kind, 'info')
})

test('并发同名下载保持独立通知，并遵守框架 ToastProvider 作用域', async t => {
  fixture(t)
  const a = createToast('download-a'),
    b = createToast('download-b')
  await Promise.all([
    downloadFile({ blob: new Blob(['a']), filename: '同名.txt' }, a),
    downloadFile({ blob: new Blob(['b']), filename: '同名.txt' }, a),
    downloadFile({ blob: new Blob(['c']), filename: '同名.txt' }, b),
  ])
  const history = sonner.getHistory().filter(item => item.toasterId?.startsWith('download-'))
  assert.equal(history.filter(item => item.toasterId === 'download-a').length, 2)
  assert.equal(history.filter(item => item.toasterId === 'download-b').length, 1)
  assert.equal(
    history.every(item => item.type === 'success'),
    true,
  )
  a.dismiss()
  b.dismiss()
})
