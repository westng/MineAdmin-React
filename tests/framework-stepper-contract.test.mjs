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
  stdin: { contents: "export * from './src/components/reui/stepper'", resolveDir: webRoot },
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

function Steps({ view, steps = [1, 2, 3], disabled = [] }) {
  function Probe() {
    view.api = ui.useStepper()
    return null
  }
  return h(
    ui.Stepper,
    { defaultValue: 1 },
    ...steps.map(step =>
      h(
        ui.StepperItem,
        { key: step, step, disabled: disabled.includes(step) },
        h(ui.StepperTrigger, null, `Synthetic step ${step}`),
      ),
    ),
    h(Probe),
    h(
      ui.StepperContent,
      { value: 1, id: 'consumer-panel', role: 'tabpanel', 'data-test': 'expected' },
      'Synthetic content',
    ),
  )
}

test('Stepper unregisters unmounted triggers and navigates to the next available step', async () => {
  const view = await mount(Steps)
  const before = [...view.container.querySelectorAll('[data-slot="stepper-trigger"]')]
  await view.replace({ steps: [1, 3] })
  const after = [...view.container.querySelectorAll('[data-slot="stepper-trigger"]')]
  assert.equal(before[1].isConnected, false)
  assert.equal(view.api.triggerNodes.includes(before[1]), false)
  await act(async () => after[0].focus())
  await key(after[0], 'ArrowRight')
  assert.equal(document.activeElement, after[1])
})

test('Stepper keyboard navigation skips disabled steps', async () => {
  const view = await mount(Steps, { disabled: [2] })
  const triggers = [...view.container.querySelectorAll('[data-slot="stepper-trigger"]')]
  assert.equal(triggers[1].disabled, true)
  await act(async () => triggers[0].focus())
  await key(triggers[0], 'ArrowRight')
  assert.equal(document.activeElement, triggers[2])
})

test('Stepper counts its three direct items', async () => {
  const view = await mount(Steps)
  assert.equal(view.container.querySelectorAll('[data-slot="stepper-trigger"]').length, 3)
  assert.equal(view.api.stepsCount, 3)
})

test('Stepper panel IDs and div attributes preserve accessible relationships', async () => {
  const view = await mount(Steps)
  const trigger = view.container.querySelector('[data-slot="stepper-trigger"]')
  assert.equal(
    document.getElementById(trigger.getAttribute('aria-controls')),
    view.container.querySelector('[data-slot="stepper-content"]'),
  )
  const content = view.container.querySelector('[data-slot="stepper-content"]')
  assert.equal(content.getAttribute('id'), 'consumer-panel')
  assert.equal(content.getAttribute('role'), 'tabpanel')
  assert.equal(content.getAttribute('data-test'), 'expected')
})

test('Stepper dynamic and wrapped items update their count and DOM navigation order', async () => {
  const view = await mount(Steps)
  await view.replace({ steps: [3, 1, 4, 2], disabled: [2] })
  assert.equal(view.api.stepsCount, 4)
  const triggers = [...view.container.querySelectorAll('[data-slot="stepper-trigger"]')]
  await act(async () => triggers[0].focus())
  await key(triggers[0], 'ArrowRight')
  assert.equal(document.activeElement, triggers[1])
  await key(triggers[1], 'ArrowLeft')
  assert.equal(document.activeElement, triggers[0])
  await key(triggers[0], 'End')
  assert.equal(document.activeElement, triggers[2])
  await key(triggers[2], 'ArrowRight')
  assert.equal(document.activeElement, triggers[0])
  await key(triggers[0], 'Home')
  assert.equal(document.activeElement, triggers[0])
  await view.replace({ steps: [] })
  assert.equal(view.api.stepsCount, 0)
  function Wrapped({ view }) {
    function Items() {
      return h(ui.StepperItem, { step: 1 }, h(ui.StepperTrigger, null, 'Wrapped'))
    }
    function Probe() {
      view.api = ui.useStepper()
      return null
    }
    return h(ui.Stepper, null, h(ui.StepperNav, null, h(Items)), h(Probe))
  }
  const wrapped = await mount(Wrapped)
  assert.equal(wrapped.api.stepsCount, 1)
})

test('Stepper explicit IDs update, inactive panels stay linked, and instances have distinct IDs', async () => {
  function Pair({ panelId = 'first-panel', tabId = 'first-tab' }) {
    return h(
      React.Fragment,
      null,
      ...['a', 'b'].map(instance =>
        h(
          ui.Stepper,
          { key: instance, 'data-instance': instance },
          h(
            ui.StepperNav,
            null,
            ...[1, 2].map(step =>
              h(
                ui.StepperItem,
                { key: step, step },
                h(ui.StepperTrigger, { id: instance === 'a' && step === 1 ? tabId : undefined }, `${instance}-${step}`),
              ),
            ),
          ),
          ...[1, 2].map(step =>
            h(
              ui.StepperContent,
              {
                key: step,
                value: step,
                id: instance === 'a' && step === 1 ? panelId : undefined,
                role: instance === 'a' ? 'region' : undefined,
                'data-extra': 'forwarded',
              },
              h('span', null, `Panel ${instance}-${step}`),
            ),
          ),
        ),
      ),
    )
  }
  const view = await mount(Pair)
  const ids = [...view.container.querySelectorAll('[id]')].map(node => node.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const trigger of view.container.querySelectorAll('[data-slot="stepper-trigger"]')) {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'))
    assert.ok(panel)
    assert.equal(panel.getAttribute('aria-labelledby'), trigger.id)
    assert.equal(panel.getAttribute('data-extra'), 'forwarded')
  }
  const inactive = view.container.querySelector('[data-instance="a"] [data-slot="stepper-content"][hidden]')
  assert.ok(inactive)
  assert.equal(inactive.childElementCount, 0)
  assert.equal(document.getElementById('first-panel').getAttribute('role'), 'region')
  await view.replace({ panelId: 'updated-panel', tabId: 'updated-tab' })
  assert.equal(document.getElementById('updated-tab').getAttribute('aria-controls'), 'updated-panel')
  assert.equal(document.getElementById('updated-panel').getAttribute('aria-labelledby'), 'updated-tab')
})

test('Stepper disabling the selected item preserves a Tab entry and blocks activation', async () => {
  const view = await mount(Steps)
  await view.replace({ disabled: [1, 2] })
  const triggers = [...view.container.querySelectorAll('[data-slot="stepper-trigger"]')]
  assert.equal(triggers[2].tabIndex, 0)
  await key(triggers[1], 'Enter')
  assert.equal(view.api.activeStep, 1)
  await key(triggers[2], 'Enter')
  assert.equal(view.api.activeStep, 3)
})
