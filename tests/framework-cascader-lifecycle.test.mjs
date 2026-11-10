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
  'Element',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'FocusEvent',
  'DOMRect',
  'ShadowRoot',
  'CSS',
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
const result = await build({
  stdin: {
    contents:
      "export * from './src/components/reui/cascader/cascader'; export * from './src/components/reui/cascader/cascader-columns'; export { CASCADER_ROOT_KEY } from './src/components/reui/cascader/cascader-lib'",
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const ui = module.exports
const roots = []
const empty = []
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()))
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})
const settle = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 25))
  })
function deferred() {
  let resolve
  const promise = new Promise(yes => {
    resolve = yes
  })
  return { promise, resolve }
}
async function mount(initialProps, body) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const view = { container, state: null, actions: null }
  function Probe() {
    view.state = ui.useCascaderState()
    view.actions = ui.useCascaderActions()
    return null
  }
  let current = { items: empty, open: true, ...initialProps }
  view.render = async (changes = {}, mode = 'visible') => {
    current = { ...current, ...changes }
    await act(async () => root.render(h(Activity, { mode }, h(ui.Cascader, current, h(Probe), body))))
    await settle()
  }
  await view.render()
  return view
}

test('Cascader cancellation releases the pending page latch and retries the same cursor', async () => {
  const page = deferred()
  const requests = []
  const view = await mount({
    getChildren: (_node, context) => {
      requests.push(context)
      return context.cursor ? page.promise : { items: [{ value: 'one', label: 'First' }], nextCursor: 'page-2' }
    },
  })
  assert.equal(view.state.loadStates.get(ui.CASCADER_ROOT_KEY).hasMore, true)
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  assert.equal(requests.length, 2)
  await view.render({ open: false })
  assert.equal(requests[1].signal.aborted, true)
  await act(async () => page.resolve([{ value: 'two', label: 'Second' }]))
  await view.render({ open: true })
  assert.equal(view.state.loadStates.get(ui.CASCADER_ROOT_KEY).loading, false)
  assert.equal(view.state.loadStates.get(ui.CASCADER_ROOT_KEY).hasMore, true)
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await settle()
  assert.equal(requests.length, 3)
  assert.equal(requests[2].cursor, 'page-2')
  assert.deepEqual(
    view.state.levelItems.map(node => node.value),
    ['one', 'two'],
  )
})

test('Cascader loadKey reset searches the retained query against the new source', async () => {
  const requests = []
  const view = await mount({
    inputValue: 'fixed',
    searchDebounce: 0,
    loadKey: 'source-a',
    onSearch: query => {
      requests.push(['a', query])
      return [{ value: 'a', label: 'Source A' }]
    },
  })
  assert.deepEqual(requests, [['a', 'fixed']])
  assert.equal(view.state.searchState.loading, false)
  await view.render({
    loadKey: 'source-b',
    onSearch: query => {
      requests.push(['b', query])
      return [{ value: 'b', label: 'Source B' }]
    },
  })
  await settle()
  assert.deepEqual(requests, [
    ['a', 'fixed'],
    ['b', 'fixed'],
  ])
  assert.deepEqual(
    view.state.deepResults.map(node => node.value),
    ['b'],
  )
  assert.equal(view.state.searchState.loading, false)
})

test('Cascader Activity recovery retries the canceled first level', async () => {
  const first = deferred()
  const requests = []
  const view = await mount({
    getChildren: (_node, context) => {
      requests.push(context)
      return first.promise
    },
  })
  assert.equal(requests.length, 1)
  assert.equal(view.state.loadStates.get(ui.CASCADER_ROOT_KEY).loading, true)
  await view.render({}, 'hidden')
  assert.equal(requests[0].signal.aborted, true)
  await act(async () => first.resolve([{ value: 'one', label: 'First' }]))
  await view.render({}, 'visible')
  assert.equal(requests.length, 2)
  assert.equal(view.state.loadStates.get(ui.CASCADER_ROOT_KEY).loading, false)
  assert.deepEqual(
    view.state.levelItems.map(node => node.value),
    ['one'],
  )
})

for (const flag of ['readOnly', 'disabled']) {
  test(`Cascader ${flag} ancestor column button cannot change selection`, async () => {
    const changes = []
    const view = await mount(
      {
        items: [
          { value: 'parent', label: 'Synthetic parent', children: [{ value: 'child', label: 'Synthetic child' }] },
        ],
        mode: 'columns',
        inline: true,
        selectable: 'any',
        multiple: true,
        defaultPath: ['parent'],
        [flag]: true,
        onValueChange: value => changes.push(value),
      },
      h(ui.CascaderColumns),
    )
    const ancestor = [...view.container.querySelectorAll('button[data-slot="cascader-item"]')].find(node =>
      node.textContent.includes('Synthetic parent'),
    )
    assert.ok(ancestor)
    assert.equal(ancestor.disabled, true)
    await act(async () => {
      ancestor.click()
      view.actions.commit(view.state.index.byValue.get('parent'))
    })
    assert.deepEqual(changes, [])
    assert.deepEqual(view.state.selectedValues, [])
    await view.render({ [flag]: false })
    assert.equal(ancestor.disabled, false)
    await act(async () => ancestor.click())
    assert.deepEqual(changes, [['parent']])
  })
}

test('Cascader search error retries the search and recovers', async () => {
  let requests = 0
  const view = await mount(
    {
      inline: true,
      inputValue: 'failed',
      searchDebounce: 0,
      onSearch: () => {
        requests++
        if (requests === 1) throw new Error('synthetic search failure')
        return [{ value: 'found', label: 'Found' }]
      },
    },
    h(ui.CascaderEmpty),
  )
  assert.equal(requests, 1)
  assert.equal(view.state.searchState.error, true)
  const retry = view.container.querySelector('button[data-slot="cascader-retry"]')
  assert.ok(retry)
  await act(async () => retry.click())
  await settle()
  assert.equal(requests, 2)
  assert.equal(view.state.searchState.error, false)
  assert.deepEqual(
    view.state.deepResults.map(node => node.value),
    ['found'],
  )
})

test('Cascader keeps the no-progress guard across closing a settled page', async () => {
  let calls = 0
  const getChildren = () => {
    calls++
    return { items: [{ value: 'one', label: 'One' }], nextCursor: 'same', hasMore: true }
  }
  const view = await mount({ getChildren })
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await settle()
  assert.equal(calls, 2)
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await settle()
  await view.render({ open: false })
  await view.render({ open: true })
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await settle()
  assert.equal(calls, 2)
})
test('Cascader accepts cursor progress even when a page contains only duplicates', async () => {
  const cursors = []
  const view = await mount({
    getChildren: (_node, context) => {
      cursors.push(context.cursor)
      return { items: [{ value: 'one', label: 'One' }], nextCursor: context.cursor ? 'third' : 'second', hasMore: true }
    },
  })
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await settle()
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await settle()
  assert.deepEqual(cursors, [undefined, 'second', 'third'])
})
test('Cascader late response from a replaced search cannot overwrite the current source', async () => {
  const pending = deferred(),
    errors = []
  let oldSignal
  const view = await mount({
    inputValue: 'fixed',
    searchDebounce: 0,
    loadKey: 'A',
    onSearch: (_query, context) => {
      oldSignal = context.signal
      return pending.promise
    },
    onLoadError: error => errors.push(error),
  })
  await view.render({ loadKey: 'B', onSearch: () => [{ value: 'B', label: 'Current' }] })
  assert.equal(oldSignal.aborted, true)
  await act(async () => pending.resolve([{ value: 'A', label: 'Old' }]))
  assert.deepEqual(
    view.state.deepResults.map(node => node.value),
    ['B'],
  )
  assert.deepEqual(errors, [])
})
test('Cascader old first-page completion cannot release the resumed request signature', async () => {
  const pending = []
  const view = await mount({
    getChildren: (_node, context) => {
      const task = deferred()
      pending.push({ ...task, context })
      return task.promise
    },
  })
  await view.render({}, 'hidden')
  await view.render({}, 'visible')
  assert.equal(pending.length, 2)
  await act(async () => pending[0].resolve([{ value: 'old', label: 'Old' }]))
  await act(async () => view.actions.retryLevel(ui.CASCADER_ROOT_KEY))
  assert.equal(pending.length, 2)
  assert.equal(view.state.loadStates.get(ui.CASCADER_ROOT_KEY).loading, true)
  await act(async () => pending[1].resolve([{ value: 'new', label: 'New' }]))
  assert.deepEqual(
    view.state.levelItems.map(node => node.value),
    ['new'],
  )
})

test('Cascader preserves the cursor of a successful empty page when the next page is canceled', async () => {
  const pending = deferred(),
    cursors = []
  const view = await mount({
    getChildren: (_node, context) => {
      cursors.push(context.cursor)
      return context.cursor ? pending.promise : { items: [], nextCursor: 'next', hasMore: true }
    },
  })
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  await view.render({ open: false })
  await view.render({ open: true })
  await act(async () => view.actions.loadMore(ui.CASCADER_ROOT_KEY))
  assert.deepEqual(cursors, [undefined, 'next', 'next'])
  await act(async () => pending.resolve([{ value: 'next', label: 'Next' }]))
})
