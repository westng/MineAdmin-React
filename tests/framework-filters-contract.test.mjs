import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../package.json', import.meta.url))
const webRoot = fileURLToPath(new URL('../', import.meta.url))
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
  'PointerEvent',
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
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const result = await build({
  stdin: {
    contents:
      "export * from './src/components/reui/filters/filters'; export * from './src/components/reui/filters/filters-lib'; export * from './src/components/reui/filters/filters-context'; export * from './src/components/reui/filters/filters-editors'; export * from './src/components/reui/filters/filters-dnd'; export * from './src/components/reui/filters/filters-query'",
    resolveDir: webRoot,
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
afterEach(async () => {
  await act(async () => {
    ui.cancelActiveFilterDrags()
    roots.splice(0).forEach(root => root.unmount())
  })
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

const settle = (ms = 20) =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms))
  })
const rule = (id, path, operator, value) => ({ id, type: 'rule', path: [path], operator, value })
const query = (...rules) => ({ id: 'root', type: 'group', combinator: 'and', rules })

async function mountView(Component, initial) {
  const view = { container: document.createElement('div') }
  document.body.append(view.container)
  const root = createRoot(view.container)
  roots.push(root)
  function Fixture() {
    const [props, setProps] = React.useState(initial)
    view.replace = async patch => act(async () => setProps(old => ({ ...old, ...patch })))
    return h(Component, { ...props, view })
  }
  await act(async () => root.render(h(Fixture)))
  await settle()
  return view
}

function FilterCapture({ view, advanced, remote }) {
  view.actions = ui.useFilterActions()
  view.state = ui.useFilterState()
  view.focus = ui.useFilterFocusStore()
  if (remote) return h(RemoteCapture, { view })
  return advanced ? h(ui.FiltersAdvancedPanel, { mode: 'inline' }) : h(ui.FiltersRow)
}
function FilterFixture({ view, advanced = false, remote = false, ...props }) {
  return h(ui.Filters, props, h(FilterCapture, { view, advanced, remote }))
}
function RemoteCapture({ view }) {
  const actions = ui.useFilterActions()
  view.options = ui.useFilterOptions(actions.index.byPath.get('owner'), true, 0)
  return h(ui.FiltersRow)
}

test('Filters range and scalar validators both run after the built-in checks pass', async () => {
  const calls = { range: 0, scalar: 0 }
  const view = await mountView(FilterFixture, {
    advanced: true,
    fields: [
      {
        id: 'range',
        label: 'Synthetic range',
        type: 'number',
        validate: () => {
          calls.range++
          return 'Range exceeds synthetic limit'
        },
      },
      {
        id: 'scalar',
        label: 'Synthetic scalar',
        type: 'number',
        validate: () => {
          calls.scalar++
          return 'Scalar exceeds synthetic limit'
        },
      },
    ],
    defaultQuery: query(rule('r', 'range', 'between', [1, 100]), rule('s', 'scalar', 'eq', 100)),
  })
  await act(async () => view.actions.updateRule('r', { value: [1, 200] }))
  await act(async () => view.actions.updateRule('s', { value: 200 }))
  assert.ok(calls.range > 0)
  assert.ok(calls.scalar > 0)
  assert.equal(
    view.container.querySelector('[data-node-id="r"] [data-filter-cell="value"]').getAttribute('aria-invalid'),
    'true',
  )
  assert.equal(
    view.container.querySelector('[data-node-id="s"] [data-filter-cell="value"]').getAttribute('aria-invalid'),
    'true',
  )
})

test('Filters immediately enforces newly disabled static options', async () => {
  const fields = disabled => [
    {
      id: 'owner',
      label: 'Synthetic owner',
      type: 'select',
      options: [
        { value: 'x', label: 'Choice X', disabled },
        { value: 'y', label: 'Choice Y' },
      ],
    },
  ]
  const view = await mountView(FilterFixture, {
    fields: fields(false),
    defaultQuery: query(rule('r', 'owner', 'is', 'y')),
  })
  await view.replace({ fields: fields(true) })
  assert.equal(view.actions.index.byPath.get('owner').options[0].disabled, true)
  const trigger = view.container.querySelector('button[aria-label="Choice Y"]')
  assert.ok(trigger)
  await act(async () => trigger.click())
  await settle()
  const option = [...document.querySelectorAll('[data-slot="cascader-item"]')].find(el =>
    el.textContent.includes('Choice X'),
  )
  assert.ok(option)
  assert.equal(option.getAttribute('aria-disabled'), 'true')
  await act(async () => option.click())
  assert.equal(view.state.query.rules[0].value, 'y')
})

test('Filters replaces custom operator arity and its editor after a schema change', async () => {
  const fields = arity => [
    {
      id: 'amount',
      label: 'Synthetic amount',
      type: 'number',
      operators: [{ value: 'custom', label: 'Synthetic condition', arity }],
    },
  ]
  const view = await mountView(FilterFixture, {
    fields: fields('one'),
    defaultQuery: query(rule('r', 'amount', 'custom', 10)),
  })
  await view.replace({ fields: fields('range') })
  const currentField = view.actions.index.byPath.get('amount')
  const operator = view.actions.resolveOperators(currentField)[0]
  assert.equal(operator.arity, 'range')
  assert.equal(view.actions.resolveEditor(currentField, operator), ui.FilterRangeEditor)
})

function OptionsFixture({ view, field, enabled = true }) {
  view.options = ui.useFilterOptions(field, enabled, 0)
  return h('output', null, view.options.resolve('shared')?.label ?? 'unresolved')
}

test('Filter options isolates labels between fields with the same option ID', async () => {
  const view = await mountView(OptionsFixture, {
    field: { id: 'old', label: 'Synthetic old field', options: [{ value: 'shared', label: 'Old field label' }] },
  })
  await view.replace({ field: { id: 'new', label: 'Synthetic new field', options: [] } })
  assert.equal(view.options.items.length, 0)
  assert.equal(view.options.resolve('shared'), undefined)
  assert.equal(view.container.textContent, 'unresolved')
})

test('Filter options cancels disabled requests and ignores late results', async () => {
  let capturedSignal
  let finish
  const field = {
    id: 'async',
    label: 'Synthetic async field',
    loadOptions: (_query, context) => {
      capturedSignal = context.signal
      return new Promise(resolve => {
        finish = resolve
      })
    },
  }
  const view = await mountView(OptionsFixture, { field })
  assert.ok(capturedSignal)
  await view.replace({ enabled: false })
  assert.equal(capturedSignal.aborted, true)
  await act(async () => finish([{ value: 'shared', label: 'Result after close' }]))
  assert.equal(view.options.items.length, 0)
  assert.equal(view.options.loading, false)
  assert.equal(view.options.error, false)
})

test('Filters remote label refresh repaints existing chips without changing values', async () => {
  let calls = 0
  const field = {
    id: 'owner',
    label: 'Synthetic owner',
    type: 'select',
    loadOptions: () => [{ value: 'x', label: ++calls === 1 ? 'Old remote label' : 'New remote label' }],
  }
  const view = await mountView(FilterFixture, {
    fields: [field],
    remote: true,
    defaultQuery: query(rule('r', 'owner', 'is', 'x')),
  })
  assert.match(view.container.querySelector('[data-slot="filter-chip"]').textContent, /Old remote label/)
  await act(async () => view.options.retry())
  await settle()
  assert.equal(calls, 2)
  assert.equal(view.options.resolve('x').label, 'New remote label')
  const chip = view.container.querySelector('[data-slot="filter-chip"]')
  assert.match(chip.textContent, /New remote label/)
  assert.equal(view.state.query.rules[0].value, 'x')
})

test('Filters rejected advanced add preserves the existing Tab entry and focus state', async () => {
  let vetoes = 0
  const view = await mountView(FilterFixture, {
    advanced: true,
    fields: [{ id: 'field', label: 'Synthetic field' }],
    defaultQuery: query(rule('existing', 'field', 'contains', 'sample')),
    onBeforeQueryChange: () => {
      vetoes++
      return false
    },
  })
  assert.equal(view.container.querySelectorAll('[data-slot="filter-row"] [tabindex="0"]').length, 1)
  const before = view.focus.getSnapshot()
  const add = [...view.container.querySelectorAll('[data-slot="filters-advanced-footer"] button')].find(
    el => el.textContent === 'Add filter',
  )
  assert.ok(add)
  await act(async () => add.click())
  await settle()
  assert.equal(vetoes, 1)
  assert.equal(view.state.query.rules.length, 1)
  assert.deepEqual(view.focus.getSnapshot(), before)
  assert.equal(view.container.querySelectorAll('[data-slot="filter-row"] [tabindex="0"]').length, 1)
})

test('Filter validation emits one built-in issue before considering a range validator', () => {
  let calls = 0
  const validate = () => {
    calls++
    return 'Outside allowed span'
  }
  const result = ui.collectFilterIssues(
    query(
      rule('incomplete', 'n', 'between', [1]),
      rule('reversed', 'n', 'between', [4, 1]),
      rule('valid', 'n', 'between', [1, 4]),
    ),
    () => 'range',
    validate,
  )
  assert.deepEqual(
    result.map(issue => [issue.nodeId, issue.reason]),
    [
      ['incomplete', 'incomplete-range'],
      ['reversed', 'reversed-range'],
      ['valid', 'custom'],
    ],
  )
  assert.equal(calls, 1)
})

test('Filter index preserves unchanged data and refreshes every behavioral callback', async () => {
  const firstValidator = () => 'Old validation'
  const firstLoader = () => []
  const field = {
    id: 'owner',
    label: 'Owner',
    type: 'select',
    validate: firstValidator,
    loadOptions: firstLoader,
    options: [{ value: 'x', label: 'X' }],
  }
  const index = ui.buildFilterIndex([field])
  assert.equal(ui.buildFilterIndex([{ ...field, options: [{ value: 'x', label: 'X' }] }], index), index)
  for (const patch of [
    { validate: () => 'New validation' },
    { loadOptions: () => [{ value: 'new', label: 'New' }] },
    { valueText: () => 'Accessible value' },
    { placeholder: 'New placeholder' },
    { renderValue: () => 'New render' },
    { options: [{ value: 'x', label: 'X', disabled: true }] },
  ]) {
    const changed = { ...field, ...patch }
    const next = ui.buildFilterIndex([changed], index)
    assert.notEqual(next, index)
    assert.equal(next.byPath.get('owner'), changed)
  }
  const view = await mountView(FilterFixture, {
    advanced: true,
    fields: [field],
    defaultQuery: query(rule('r', 'owner', 'is', 'x')),
  })
  const validate = () => 'New validation'
  const loader = () => [{ value: 'shared', label: 'New loader' }]
  await view.replace({ fields: [{ ...field, validate, loadOptions: loader }] })
  assert.equal(view.actions.index.byPath.get('owner').validate, validate)
  assert.equal(view.actions.index.byPath.get('owner').loadOptions, loader)
  await act(async () => view.actions.updateRule('r', { value: 'shared' }))
  const cell = view.container.querySelector('[data-node-id="r"] [data-filter-cell="value"]')
  assert.equal(cell.getAttribute('aria-invalid'), 'true')
})

test('Filter options loader replacement and re-enabling isolate late requests', async () => {
  const pending = []
  const loader = (_q, { signal }) => new Promise((resolve, reject) => pending.push({ resolve, reject, signal }))
  const view = await mountView(OptionsFixture, { field: { id: 'one', label: 'One', loadOptions: loader } })
  await view.replace({ enabled: false })
  assert.equal(pending[0].signal.aborted, true)
  await view.replace({ enabled: true })
  await settle()
  assert.equal(pending.length, 2)
  await act(async () => pending[0].reject(new Error('Late failure')))
  assert.equal(view.options.loading, true)
  assert.equal(view.options.error, false)
  await act(async () => pending[1].resolve([{ value: 'shared', label: 'Current' }]))
  assert.equal(view.container.textContent, 'Current')
  await view.replace({ field: { id: 'one', label: 'One', loadOptions: () => [] } })
  await settle()
  assert.equal(view.container.textContent, 'unresolved')
  assert.equal(view.options.resolve('shared'), undefined)
})

test('Filter options unmount aborts without publishing a late completion', async () => {
  let request
  const view = await mountView(OptionsFixture, {
    field: {
      id: 'async',
      label: 'Async',
      loadOptions: (_q, { signal }) =>
        new Promise(resolve => {
          request = { signal, resolve }
        }),
    },
  })
  await act(async () => roots.pop().unmount())
  assert.equal(request.signal.aborted, true)
  await act(async () => request.resolve([{ value: 'shared', label: 'Late' }]))
  assert.equal(view.container.textContent, '')
})

test('Filter resolution store publishes changed metadata once, preserving the value', () => {
  const store = ui.createFilterResolutionStore()
  const changes = []
  store.subscribe(() => changes.push(store.getVersion()))
  store.set('owner', [{ value: 'x', label: 'Old', disabled: false }])
  store.set('owner', [{ value: 'x', label: 'Old', disabled: false }])
  store.set('owner', [{ value: 'x', label: 'New', disabled: true }])
  assert.deepEqual(changes, [1, 2])
  assert.deepEqual(store.get('owner', 'x'), { value: 'x', label: 'New', disabled: true })
})

test('Filters successful advanced add focuses the new rule only after acceptance', async () => {
  const view = await mountView(FilterFixture, {
    advanced: true,
    fields: [{ id: 'field', label: 'Field' }],
    defaultQuery: query(rule('existing', 'field', 'contains', 'sample')),
  })
  const add = [...view.container.querySelectorAll('[data-slot="filters-advanced-footer"] button')].find(
    el => el.textContent === 'Add filter',
  )
  await act(async () => add.click())
  await settle()
  assert.equal(view.state.query.rules.length, 2)
  assert.equal(view.focus.getSnapshot().id, view.state.query.rules[1].id)
  assert.ok(view.container.querySelector('[data-slot="filter-row"] [tabindex="0"]'))
})
