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
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const buildResult = await build({
  stdin: {
    contents: [
      'calendar',
      'tabs',
      'tooltip',
      'scroll-area',
      'accordion',
      'avatar',
      'button',
      'combobox',
      'context-menu',
      'dropdown-menu',
      'dialog',
      'popover',
      'separator',
      'sheet',
      'select',
    ]
      .map(name => `export * from './src/components/reui/primitives/${name}'`)
      .join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', buildResult.outputFiles[0].text)(module, module.exports, require)
const ui = module.exports,
  roots = []
const settle = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20))
  })
async function mount(element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(element))
  await settle()
  return { container, render: element => act(async () => root.render(element)) }
}
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})
async function key(element, value) {
  await act(async () =>
    element.dispatchEvent(new dom.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })),
  )
  await settle()
}
for (const [name, Calendar] of [
  ['wrapper', ui.Calendar],
  ['DayPicker', require('react-day-picker').DayPicker],
])
  test(`${name} calendar moves actual focus with the arrow key`, async () => {
    const view = await mount(
      h(Calendar, { mode: 'single', defaultMonth: new Date(2026, 8, 1), showOutsideDays: false }),
    )
    const day = n =>
      [...view.container.querySelectorAll('[role="gridcell"] button')].find(node => node.textContent === String(n))
    await act(async () => day(16).focus())
    await key(day(16), 'ArrowRight')
    assert.equal(document.activeElement, day(17))
  })
test('CalendarDayButton composes caller refs and runs ref cleanup', async () => {
  const ref = React.createRef()
  const props = { day: { date: new Date(2026, 8, 16) }, modifiers: { focused: true }, children: '16' }
  const view = await mount(h(ui.CalendarDayButton, { ...props, ref }))
  assert.equal(ref.current, document.activeElement)
  await view.render(null)
  assert.equal(ref.current, null)
  let assigned,
    cleaned = 0
  await view.render(
    h(ui.CalendarDayButton, {
      ...props,
      ref: node => {
        assigned = node
        return () => {
          cleaned++
        }
      },
    }),
  )
  assert.equal(assigned, document.activeElement)
  await view.render(null)
  assert.equal(cleaned, 1)
})
for (const orientation of ['vertical', 'horizontal'])
  test(`Tabs ${orientation} keyboard and state class names match Base UI`, async () => {
    const seen = new Set()
    const callback = name => state => {
      assert.equal(typeof state, 'object')
      seen.add(name)
      return `consumer-${name}`
    }
    const view = await mount(
      h(
        ui.Tabs,
        { orientation, defaultValue: 'a', className: callback('root') },
        h(
          ui.TabsList,
          { className: callback('list') },
          h(ui.TabsTrigger, { value: 'a', className: callback('tab') }, 'A'),
          h(ui.TabsTrigger, { value: 'b' }, 'B'),
        ),
        h(ui.TabsContent, { value: 'a', className: callback('panel') }, 'Alpha'),
        h(ui.TabsContent, { value: 'b' }, 'Beta'),
      ),
    )
    const [a, b] = view.container.querySelectorAll('[role="tab"]')
    assert.equal(
      view.container.querySelector('[role="tablist"]').getAttribute('aria-orientation') ?? 'horizontal',
      orientation,
    )
    for (const part of ['root', 'list', 'tab', 'panel']) {
      assert.ok(seen.has(part))
      assert.ok(view.container.querySelector(`.consumer-${part}`))
    }
    await act(async () => a.focus())
    await key(a, orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight')
    assert.equal(document.activeElement, b)
    await view.render(
      h(
        ui.Tabs,
        { orientation, defaultValue: 'a', className: 'static-tab-class' },
        h(ui.TabsList, null, h(ui.TabsTrigger, { value: 'a' }, 'A')),
      ),
    )
    assert.ok(view.container.querySelector('.static-tab-class').classList.contains('group/tabs'))
  })
const cases = [
  [
    'Tooltip',
    c =>
      h(
        ui.TooltipProvider,
        null,
        h(
          ui.Tooltip,
          { open: true },
          h(ui.TooltipTrigger, null, 'trigger'),
          h(ui.TooltipContent, { className: c }, 'tip'),
        ),
      ),
  ],
  ['ScrollArea', c => h(ui.ScrollArea, { className: c }, 'scroll')],
  [
    'Accordion',
    c =>
      h(
        ui.Accordion,
        { defaultValue: ['one'], className: c },
        h(
          ui.AccordionItem,
          { value: 'one', className: c },
          h(ui.AccordionTrigger, { className: c }, 'one'),
          h(ui.AccordionContent, { className: c }, 'panel'),
        ),
      ),
  ],
  ['Avatar', c => h(ui.Avatar, { className: c }, h(ui.AvatarFallback, { className: c }, 'AB'))],
  ['Button', c => h(ui.Button, { className: c, disabled: true }, 'button')],
  [
    'Combobox',
    c =>
      h(
        ui.Combobox,
        { items: [] },
        h(ui.ComboboxInput, { className: c }),
        h(ui.ComboboxTrigger, { className: c }, 'trigger'),
      ),
  ],
  ['ContextMenu', c => h(ui.ContextMenu, null, h(ui.ContextMenuTrigger, { className: c }, 'context'))],
  [
    'DropdownMenu',
    c =>
      h(
        ui.DropdownMenu,
        { open: true },
        h(ui.DropdownMenuTrigger, null, 'trigger'),
        h(
          ui.DropdownMenuContent,
          { className: c },
          h(
            ui.DropdownMenuGroup,
            null,
            h(ui.DropdownMenuLabel, { className: c }, 'label'),
            h(ui.DropdownMenuItem, { className: c }, 'item'),
          ),
        ),
      ),
  ],
  [
    'Dialog',
    c =>
      h(
        ui.Dialog,
        { open: true },
        h(
          ui.DialogContent,
          null,
          h(ui.DialogTitle, { className: c }, 'dialog'),
          h(ui.DialogDescription, { className: c }, 'description'),
        ),
      ),
  ],
  [
    'Popover',
    c =>
      h(
        ui.Popover,
        { open: true },
        h(ui.PopoverTrigger, null, 'trigger'),
        h(
          ui.PopoverContent,
          null,
          h(ui.PopoverTitle, { className: c }, 'popover'),
          h(ui.PopoverDescription, { className: c }, 'description'),
        ),
      ),
  ],
  ['Separator', c => h(ui.Separator, { className: c })],
  [
    'Sheet',
    c =>
      h(
        ui.Sheet,
        { open: true },
        h(
          ui.SheetContent,
          null,
          h(ui.SheetTitle, { className: c }, 'sheet'),
          h(ui.SheetDescription, { className: c }, 'description'),
        ),
      ),
  ],
  [
    'Select',
    c =>
      h(
        ui.Select,
        { defaultValue: 'one', open: true },
        h(ui.SelectTrigger, null, h(ui.SelectValue)),
        h(
          ui.SelectContent,
          null,
          h(
            ui.SelectGroup,
            null,
            h(ui.SelectLabel, { className: c }, 'group'),
            h(ui.SelectItem, { value: 'one' }, 'one'),
          ),
          h(ui.SelectSeparator, { className: c }),
        ),
      ),
  ],
]
for (const [name, render] of cases)
  test(`${name} invokes its state class callback and applies its result`, async () => {
    let calls = 0
    const marker = `consumer-${name.toLowerCase()}`
    await mount(
      render(state => {
        assert.equal(typeof state, 'object')
        calls++
        return marker
      }),
    )
    assert.ok(calls > 0)
    assert.ok(document.querySelector(`.${marker}`))
  })
