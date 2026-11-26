import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = require('esbuild')
const { Window } = require('happy-dom')
const window = new Window({ url: 'https://example.test/' })
for (const name of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'DOMRect',
]) {
  Object.defineProperty(globalThis, name, { value: name === 'window' ? window : window[name], configurable: true })
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { act, createElement: h } = React
const { createRoot } = require('react-dom/client')
const bundle = await build({
  stdin: {
    contents: ['message', 'bubble', 'message-scroller', 'marker']
      .map(name => `export * from './src/components/reui/primitives/${name}'`)
      .join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  packages: 'external',
  format: 'cjs',
  platform: 'node',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(module, module.exports, require)
const ui = module.exports
const roots = []
afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
})
after(async () => {
  await window.happyDOM.abort()
  window.close()
})
async function mount(element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = value => act(async () => root.render(value))
  await render(element)
  return { container, render }
}
async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 40))
  })
}

test('ReUI messages preserve roles, bubble variants and plain text while streaming', async () => {
  const conversation = text =>
    h(
      ui.MessageGroup,
      null,
      h(
        ui.Message,
        { align: 'end' },
        h(
          ui.MessageContent,
          null,
          h(ui.MessageHeader, null, 'You'),
          h(ui.Bubble, { variant: 'muted' }, h(ui.BubbleContent, null, 'Question')),
        ),
      ),
      h(
        ui.Message,
        { align: 'start' },
        h(
          ui.MessageContent,
          null,
          h(ui.MessageHeader, null, 'Assistant'),
          h(ui.Bubble, { variant: 'ghost' }, h(ui.BubbleContent, null, text)),
        ),
      ),
    )
  const view = await mount(conversation('partial'))
  const bubble = view.container.querySelector('[data-variant="ghost"]')
  await view.render(conversation('partial <script>text</script>'))
  assert.equal(view.container.querySelector('[data-variant="ghost"]'), bubble)
  assert.equal(view.container.querySelector('script'), null)
  assert.equal(view.container.querySelectorAll('[data-slot="message"][data-align="end"]').length, 1)
  assert.match(bubble.textContent, /<script>text<\/script>/)
})

test('ReUI BubbleContent and Marker keep render composition and event handlers', async () => {
  let clicked = 0
  const view = await mount(
    h(
      'div',
      null,
      h(
        ui.Bubble,
        { variant: 'outline' },
        h(ui.BubbleContent, { render: h('button', { type: 'button' }), onClick: () => clicked++ }, 'Open source'),
      ),
      h(
        ui.Marker,
        { variant: 'border', render: h('a', { href: '#result' }) },
        h(ui.MarkerIcon, null, '✓'),
        h(ui.MarkerContent, null, 'Completed'),
      ),
    ),
  )
  await act(async () => view.container.querySelector('button').click())
  assert.equal(clicked, 1)
  assert.equal(view.container.querySelector('[data-slot="marker"]').tagName, 'A')
  assert.equal(view.container.querySelector('[data-slot="marker-icon"]').getAttribute('aria-hidden'), 'true')
})

test('ReUI scroller follows new content, preserves manual reading and supports returning to the latest message', async () => {
  let viewport
  let contentHeight = 500
  const itemHeight = 100
  const render = count =>
    h(
      ui.MessageScrollerProvider,
      { autoScroll: true },
      h(
        ui.MessageScroller,
        null,
        h(
          ui.MessageScrollerViewport,
          {
            'aria-label': 'Conversation',
            ref: node => {
              if (!node) return
              viewport = node
              Object.defineProperties(node, {
                clientHeight: { configurable: true, get: () => 200 },
                scrollHeight: { configurable: true, get: () => contentHeight },
              })
              node.getBoundingClientRect = () => new window.DOMRect(0, 0, 320, 200)
              node.scrollTo = options => {
                node.scrollTop = options.top
                node.dispatchEvent(new window.Event('scroll', { bubbles: true }))
              }
            },
          },
          h(
            ui.MessageScrollerContent,
            null,
            Array.from({ length: count }, (_, index) =>
              h(
                ui.MessageScrollerItem,
                {
                  key: index,
                  messageId: String(index),
                  ref: node => {
                    if (node)
                      node.getBoundingClientRect = () =>
                        new window.DOMRect(0, index * itemHeight - viewport.scrollTop, 320, itemHeight)
                  },
                },
                `Message ${index}`,
              ),
            ),
          ),
        ),
        h(ui.MessageScrollerButton, { 'aria-label': 'Latest message', behavior: 'auto' }),
      ),
    )
  const view = await mount(render(5))
  await flush()
  assert.equal(viewport.scrollTop, 300)
  await act(async () => {
    viewport.dispatchEvent(new window.WheelEvent('wheel', { deltaY: -100, bubbles: true }))
    viewport.scrollTop = 50
    viewport.dispatchEvent(new window.Event('scroll', { bubbles: true }))
  })
  contentHeight = 600
  await view.render(render(6))
  await flush()
  assert.equal(viewport.scrollTop, 50, 'new content must not interrupt reading older messages')
  const button = view.container.querySelector('[data-slot="message-scroller-button"]')
  assert.equal(button.getAttribute('data-active'), 'true')
  await act(async () => button.click())
  await flush()
  assert.equal(viewport.scrollTop, 400)
  contentHeight = 700
  await view.render(render(7))
  await flush()
  assert.equal(viewport.scrollTop, 500, 'following resumes after the latest-message action')
})
