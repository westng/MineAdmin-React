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
      "export * from './src/components/reui/scrollspy'; export * from './src/components/reui/phone-input'; export * from './src/components/reui/rating'",
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
async function mount(Component, initial = {}) {
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
async function key(target, key) {
  await act(async () => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })))
}

test('Scrollspy retains only the latest click handler after callback changes', async () => {
  const calls = []
  function Spy({ callback }) {
    const targetRef = React.useRef(null)
    return h(
      'div',
      { ref: targetRef },
      h('section', { id: 'synthetic-section' }, 'Synthetic section'),
      h(
        ui.Scrollspy,
        { targetRef, history: false, smooth: false, onUpdate: callback },
        h('a', { href: '#synthetic-section', 'data-scrollspy-anchor': 'synthetic-section' }, 'Synthetic anchor'),
      ),
    )
  }
  const view = await mount(Spy, { callback: () => calls.push('old') })
  await view.replace({ callback: () => calls.push('new') })
  calls.length = 0
  await act(async () => view.container.querySelector('a').click())
  assert.deepEqual(calls, ['new'])
  const anchor = view.container.querySelector('a')
  await act(async () => roots.pop().unmount())
  calls.length = 0
  await act(async () => anchor.click())
  assert.deepEqual(calls, [])
})

test('PhoneInput preserves the enabled International country option', async () => {
  const NativePhone = require('react-phone-number-input').default
  const view = await mount(() =>
    h(
      React.Fragment,
      null,
      h(
        'div',
        { 'data-control': '' },
        h(NativePhone, { defaultCountry: 'US', addInternationalOption: true, onChange: () => {} }),
      ),
      h(
        'div',
        { 'data-wrapper': '' },
        h(ui.PhoneInput, { defaultCountry: 'US', addInternationalOption: true, onChange: () => {} }),
      ),
    ),
  )
  assert.ok(
    [...view.container.querySelectorAll('[data-control] option')].some(
      option => option.textContent === 'International',
    ),
  )
  const trigger = view.container.querySelector('[data-wrapper] [data-slot="combobox-trigger"]')
  assert.ok(trigger)
  await act(async () => trigger.click())
  await settle()
  const options = [...document.querySelectorAll('[data-slot="combobox-item"]')]
  assert.ok(options.length > 0)
  assert.equal(
    options.some(option => option.textContent === 'International'),
    true,
  )
})

test('Editable rating uses one change path for keyboard and pointer input', async () => {
  const changes = []
  function Fixture() {
    const [rating, setRating] = React.useState(1)
    return h(ui.Rating, {
      rating,
      editable: true,
      onRatingChange: value => {
        changes.push(value)
        setRating(value)
      },
    })
  }
  const view = await mount(Fixture)
  const radios = [...view.container.querySelectorAll('[role="radio"]')]
  assert.equal(radios.length, 5)
  assert.equal(radios.filter(radio => radio.tabIndex === 0).length, 1)
  await act(async () => radios[0].focus())
  await key(radios[0], 'ArrowRight')
  assert.equal(document.activeElement, radios[1])
  assert.equal(radios[1].getAttribute('aria-checked'), 'true')
  await key(radios[1], ' ')
  await key(radios[1], 'End')
  assert.equal(document.activeElement, radios[4])
  await key(radios[4], 'Home')
  assert.equal(document.activeElement, radios[0])
  await key(radios[0], 'ArrowLeft')
  assert.equal(document.activeElement, radios[4])
  await act(async () => radios[2].click())
  assert.equal(radios[2].getAttribute('aria-checked'), 'true')
  assert.deepEqual(changes, [2, 2, 5, 1, 5, 3])
})

for (const props of [{ editable: false }, { editable: true, disabled: true }, { editable: true, readOnly: true }]) {
  test(`Rating prevents writes for ${JSON.stringify(props)}`, async () => {
    const changes = []
    const view = await mount(() =>
      h(ui.Rating, { rating: 2.5, ...props, onRatingChange: value => changes.push(value) }),
    )
    const star = view.container.querySelector('[data-slot="rating-star-empty"]').parentElement
    await key(star, 'Enter')
    await key(star, 'ArrowRight')
    await act(async () => star.click())
    assert.deepEqual(changes, [])
    assert.equal(view.container.querySelectorAll('[tabindex="0"]').length, 0)
  })
}

test('PhoneInput selects International and returns to a country without coercing undefined', async () => {
  const countries = []
  const view = await mount(() =>
    h(ui.PhoneInput, {
      defaultCountry: 'US',
      countries: ['US', 'CN'],
      addInternationalOption: true,
      onChange: () => {},
      onCountryChange: country => countries.push(country),
    }),
  )
  const open = async () => {
    await act(async () => view.container.querySelector('[data-slot="combobox-trigger"]').click())
    await settle()
  }
  countries.length = 0
  await open()
  const international = [...document.querySelectorAll('[data-slot="combobox-item"]')].find(
    node => node.textContent === 'International',
  )
  assert.ok(international)
  await act(async () => international.click())
  await settle()
  assert.deepEqual(countries, [undefined])
  await open()
  const unitedStates = [...document.querySelectorAll('[data-slot="combobox-item"]')].find(node =>
    node.textContent.includes('United States'),
  )
  assert.ok(unitedStates)
  await act(async () => unitedStates.click())
  await settle()
  assert.deepEqual(countries, [undefined, 'US'])
})

test('PhoneInput hides International when the underlying option is disabled', async () => {
  const view = await mount(() =>
    h(ui.PhoneInput, { defaultCountry: 'US', countries: ['US'], addInternationalOption: false, onChange: () => {} }),
  )
  await act(async () => view.container.querySelector('[data-slot="combobox-trigger"]').click())
  await settle()
  assert.equal(
    [...document.querySelectorAll('[data-slot="combobox-item"]')].some(node => node.textContent === 'International'),
    false,
  )
})
