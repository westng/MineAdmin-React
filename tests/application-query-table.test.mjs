import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { Activity, act, createElement as h, createRef, useContext, useSyncExternalStore } from 'react'

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
])
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const { QueryClientProvider } = require('@tanstack/react-query')
const result = await build({
  stdin: {
    contents: `
 export { useQueryTable } from './src/hooks/query/use-query-table'
 export { createResourceQueries } from './src/services/query/resource'
 export { createAppRuntime } from './src/app/runtime/create-runtime'
 export { AppProviders } from './src/provider/app-provider'
 export { RuntimeContext } from './src/provider/runtime/context'
 export { MaProTable } from './src/components/ma-pro-table'
 export { MaDictionaryContext } from './src/components/ma-dict-select'
 export { AdvertiserSelect } from './src/components/business/advertiser-select'
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
const core = compiled.exports
const tick = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20))
  })
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

test('Request-mode tables share resource queries, refetch on mutation and release hidden consumers independently', async t => {
  const runtime = core.createAppRuntime({ storage: dom.localStorage })
  runtime.query.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  const pending = []
  const resource = core.createResourceQueries(
    'test',
    'shared',
    runtime.query,
    () => runtime.session.getState().sessionVersion,
  )
  const api = resource.list((params, signal) => new Promise(resolve => pending.push({ params, signal, resolve })))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const table = id =>
    h(core.MaProTable, {
      schema: { tableColumns: [{ prop: 'id', label: 'ID' }] },
      options: { id, requestOptions: { api } },
    })
  const render = (left, right) =>
    act(async () =>
      root.render(
        h(
          core.AppProviders,
          { runtime },
          h(Activity, { mode: left }, table('left')),
          h(Activity, { mode: right }, table('right')),
        ),
      ),
    )
  t.after(async () => {
    await act(async () => root.unmount())
    runtime.dispose()
    container.remove()
  })
  await render('visible', 'visible')
  await tick()
  assert.equal(pending.length, 1, 'two tables share one transport')
  await render('hidden', 'visible')
  assert.equal(pending[0].signal.aborted, false, 'the remaining table retains the shared transport')
  await act(async () => pending[0].resolve({ data: { data: { list: [{ id: 'shared-row' }], total: 1 } } }))
  await tick()
  const key = api.queryOptions(pending[0].params).queryKey
  assert.equal(runtime.query.getQueryData(key).data.data.list[0].id, 'shared-row')
  assert.equal(
    runtime.query
      .getQueryCache()
      .getAll()
      .filter(query => query.queryKey.includes('table') && query.state.data).length,
    0,
  )
  await act(async () => {
    void resource.mutate(async () => ({ data: { code: 200 } }))
  })
  await tick()
  assert.equal(pending.length, 2, 'resource mutation refetches the visible table')
  await act(async () => pending[1].resolve({ data: { data: { list: [{ id: 'after-mutation' }], total: 1 } } }))
  await tick()
  assert.match(container.textContent, /after-mutation/)
  await act(async () => {
    void runtime.query.invalidateQueries({ queryKey: key })
  })
  await tick()
  assert.equal(pending.length, 3)
  await render('hidden', 'hidden')
  assert.equal(pending[2].signal.aborted, true, 'the final hidden consumer cancels its transport')
})

test('Dictionary component ports update data and translations within each application scope', async t => {
  const left = core.createAppRuntime({ storage: dom.localStorage })
  const right = core.createAppRuntime({ storage: dom.localStorage })
  for (const runtime of [left, right]) {
    runtime.i18n.store.getState().setLocale('zh_CN')
    runtime.locales.register({
      id: 'dict:en',
      namespace: 'app',
      locale: 'en_US',
      messages: { 'test.label': 'Translated' },
    })
  }
  left.dictionaries.store.getState().push('test', [{ value: 1, label: '左侧', i18n: 'test.label' }])
  right.dictionaries.store.getState().push('test', [{ value: 1, label: '右侧', i18n: 'test.label' }])
  function Probe({ id }) {
    const source = useContext(core.MaDictionaryContext)
    const dictionaries = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
    useSyncExternalStore(source.subscribeLocale, source.getLocaleSnapshot, source.getLocaleSnapshot)
    const item = dictionaries.test[0]
    return h('span', { id }, source.translate(item.i18n, item.label))
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    left.dispose()
    right.dispose()
    container.remove()
  })
  await act(async () =>
    root.render(
      h(
        'div',
        null,
        h(core.AppProviders, { runtime: left }, h(Probe, { id: 'left' })),
        h(core.AppProviders, { runtime: right }, h(Probe, { id: 'right' })),
      ),
    ),
  )
  assert.equal(container.querySelector('#left').textContent, '左侧')
  assert.equal(container.querySelector('#right').textContent, '右侧')
  await act(async () => left.i18n.store.getState().setLocale('en_US'))
  assert.equal(container.querySelector('#left').textContent, 'Translated')
  assert.equal(container.querySelector('#right').textContent, '右侧')
  await act(async () => right.dictionaries.store.getState().push('test', [{ value: 2, label: '新值' }], true))
  assert.equal(container.querySelector('#right').textContent, '新值')
})

test('Query-backed tables cancel hidden work, resume, refetch invalidated data and share one state owner', async t => {
  const runtime = core.createAppRuntime({ storage: dom.localStorage })
  runtime.query.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  const pending = []
  const resource = core.createResourceQueries(
    'test',
    'rows',
    runtime.query,
    () => runtime.session.getState().sessionVersion,
  )
  const page = resource.list((params, signal) => new Promise(resolve => pending.push({ params, signal, resolve })))
  const ref = createRef()
  function Table() {
    const table = core.useQueryTable(page.queryOptions)
    return h(core.MaProTable, {
      ref,
      data: table.data,
      total: table.total,
      loading: table.loading,
      error: table.error,
      schema: { tableColumns: [{ prop: 'id', label: 'ID' }] },
      options: { requestOptions: { api: table.request } },
    })
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = mode =>
    act(async () =>
      root.render(
        h(
          core.RuntimeContext.Provider,
          { value: runtime },
          h(QueryClientProvider, { client: runtime.query }, h(Activity, { mode }, h(Table))),
        ),
      ),
    )
  t.after(async () => {
    await act(async () => root.unmount())
    runtime.dispose()
    container.remove()
  })
  await render('visible')
  await tick()
  assert.equal(pending.length, 1)
  await render('hidden')
  assert.equal(pending[0].signal.aborted, true)
  await render('visible')
  await tick()
  assert.equal(pending.length, 2)
  await act(async () => pending[1].resolve({ data: { data: { list: [{ id: 'current' }], total: 81 } } }))
  await tick()
  assert.equal(ref.current.getElTableStates().loading, false)
  assert.match(container.textContent, /current/)
  await act(async () => {
    void resource.mutate(async () => ({ data: { code: 200 } }))
  })
  assert.equal(pending.length, 3)
  await act(async () => pending[2].resolve({ data: { data: { list: [{ id: 'after-write' }], total: 82 } } }))
  await tick()
  assert.match(container.textContent, /after-write/)
  assert.doesNotMatch(container.textContent, /current/)
})

test('Advertiser selector bounds rendered rows for 2000 options and keeps selection operable', async t => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const originalHeight = Object.getOwnPropertyDescriptor(dom.HTMLElement.prototype, 'offsetHeight')
  const originalWidth = Object.getOwnPropertyDescriptor(dom.HTMLElement.prototype, 'offsetWidth')
  Object.defineProperty(dom.HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 240 })
  Object.defineProperty(dom.HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 })
  t.after(() => {
    for (const [key, descriptor] of [
      ['offsetHeight', originalHeight],
      ['offsetWidth', originalWidth],
    ]) {
      if (descriptor) Object.defineProperty(dom.HTMLElement.prototype, key, descriptor)
      else delete dom.HTMLElement.prototype[key]
    }
  })
  const options = Array.from({ length: 2000 }, (_, i) => ({ value: String(i), label: `Account ${i}` }))
  let selected
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  await act(async () =>
    root.render(
      h(core.AdvertiserSelect, {
        options,
        value: [],
        onChange: value => {
          selected = value
        },
      }),
    ),
  )
  await act(async () => container.querySelector('button').click())
  await tick()
  const inputs = container.querySelectorAll('input[type=checkbox]')
  assert.ok(inputs.length > 0 && inputs.length < 40, `${inputs.length} rendered rows`)
  await act(async () => inputs[0].click())
  assert.deepEqual(selected, ['0'])
})

test('Ordinary application tables use Query ownership without a per-page adapter', async t => {
  const runtime = core.createAppRuntime({ storage: dom.localStorage })
  runtime.query.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  const pending = []
  const api = (params, signal) => new Promise(resolve => pending.push({ params, signal, resolve }))
  const ref = createRef()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = mode =>
    act(async () =>
      root.render(
        h(
          core.AppProviders,
          { runtime },
          h(
            Activity,
            { mode },
            h(core.MaProTable, {
              ref,
              schema: { tableColumns: [{ prop: 'id', label: 'ID' }] },
              options: { requestOptions: { api } },
            }),
          ),
        ),
      ),
    )
  t.after(async () => {
    await act(async () => root.unmount())
    runtime.dispose()
    container.remove()
  })
  await render('visible')
  await tick()
  assert.equal(pending.length, 1)
  assert.equal(runtime.query.isFetching(), 1)
  await render('hidden')
  assert.equal(pending[0].signal.aborted, true)
  await render('visible')
  await tick()
  assert.equal(pending.length, 2)
  await act(async () => pending[1].resolve({ data: { data: { list: [{ id: 'owned-by-query' }], total: 29 } } }))
  await tick()
  assert.match(container.textContent, /owned-by-query/)
  assert.equal(ref.current.getElTableStates().loading, false)
  const query = runtime.query
    .getQueryCache()
    .getAll()
    .find(query => query.queryKey.includes('table') && query.state.data)
  assert.ok(query)
  await act(async () =>
    runtime.query.setQueryData(query.queryKey, { data: { data: { list: [{ id: 'cache-update' }], total: 30 } } }),
  )
  assert.match(container.textContent, /cache-update/)
  assert.doesNotMatch(container.textContent, /owned-by-query/)
  await act(async () => {
    void ref.current.refresh()
  })
  assert.equal(pending.length, 3)
  await act(async () => pending[2].resolve({ data: { data: { list: [], total: 0 } } }))
  await tick()
  assert.equal(runtime.query.isFetching(), 0)
})
