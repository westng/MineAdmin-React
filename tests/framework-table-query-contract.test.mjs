import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'

import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = await import(require.resolve('esbuild'))
const { Window } = await import(require.resolve('happy-dom'))
const dom = new Window({ url: 'http://localhost/' })
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'Element',
  'Node',
  'NodeFilter',
  'DocumentFragment',
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'PointerEvent',
  'FocusEvent',
  'CustomEvent',
  'DOMRect',
  'ShadowRoot',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act, createElement: h, Activity } = React
const { createRoot } = require('react-dom/client')
const buildResult = await build({
  stdin: {
    contents: `export * from './src/components/ma-pro-table'; export { createTableRequestStore } from './src/provider/query/table-adapter'; export { createQueryClient } from './src/services/query/client';`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  plugins: [
    {
      name: 'local-icons',
      setup(builder) {
        builder.onResolve({ filter: /^@\/utils\/icons$/ }, () => ({ path: 'icons', namespace: 'icons' }))
        builder.onLoad({ filter: /.*/, namespace: 'icons' }, () => ({
          contents: 'export const customIconUrls = {}; export const normalizeIconName = value => value || "";',
        }))
      },
    },
  ],
})
const module = { exports: {} }
new Function('module', 'exports', 'require', buildResult.outputFiles[0].text)(module, module.exports, require)
const core = module.exports
const roots = []
afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach(root => root.unmount())
  })
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})
const settle = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20))
  })
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function mount(Component) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = async mode => {
    await act(async () => root.render(h(Activity, { mode }, h(Component))))
    await settle()
  }
  await render('visible')
  return { container, render }
}

for (const withQuery of [true, false]) {
  test(`MaProTable source: changeApi during an in-flight request, query=${withQuery}`, async t => {
    const oldRequest = deferred()
    const ref = React.createRef()
    const calls = []
    const client = core.createQueryClient()
    t.after(() => client.clear())
    const adapter = id => core.createTableRequestStore(client, () => 1, id)
    const originalApi = (_params, signal) => {
      calls.push({ api: 'old', signal })
      return oldRequest.promise
    }
    const nextApi = async (_params, signal) => {
      calls.push({ api: 'new', signal })
      return { list: [{ id: 'new-source' }], total: 1 }
    }
    const options = { requestOptions: { api: originalApi, autoRequest: false }, tableOptions: { rowKey: 'id' } }
    function Fixture() {
      const table = h(core.MaProTable, { ref, options, schema: { tableColumns: [{ prop: 'id', label: 'ID' }] } })
      return withQuery ? h(core.TableRequestContext.Provider, { value: adapter }, table) : table
    }
    await mount(Fixture)
    await act(async () => {
      void ref.current.requestData()
    })
    await settle()
    assert.equal(calls.length, 1)
    await act(async () => ref.current.changeApi(nextApi))
    await settle()
    assert.deepEqual(
      calls.map(call => call.api),
      ['old', 'new'],
    )
    assert.equal(calls[0].signal.aborted, true)
    await act(async () => oldRequest.resolve({ list: [{ id: 'old-source' }], total: 1 }))
    await settle()
    assert.deepEqual(ref.current.getElTableStates().data, [{ id: 'new-source' }])
    assert.equal(ref.current.getProTableOptions().requestOptions.api, nextApi)
  })
}
