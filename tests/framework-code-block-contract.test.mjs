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
  'MutationObserver',
  'ResizeObserver',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
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
async function bundle(entry, plugins = []) {
  const result = await build({
    stdin: { contents: `export * from '${entry}'`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    packages: 'external',
    plugins,
  })
  const module = { exports: {} }
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
  return module.exports
}
const helpers = await bundle('./src/components/reui/code-block/code-block-highlight')
globalThis.__codeBlockTestHelpers = helpers
const pending = []
globalThis.__codeBlockTestHighlight = (code, options) =>
  new Promise(resolve => pending.push({ code, options, resolve }))
const ui = await bundle('./src/components/reui/code-block/code-block', [
  {
    name: 'controlled-highlighter',
    setup(builder) {
      builder.onResolve({ filter: /^@\/components\/reui\/code-block\/code-block-highlight$/ }, () => ({
        path: 'highlight',
        namespace: 'review',
      }))
      builder.onLoad({ filter: /.*/, namespace: 'review' }, () => ({
        contents: `
    export const { markdownCodeProps, markdownFences, resolveCodeBlockLanguage, stripNotationComments, toPlainLines, ansiToLines, parseUnifiedDiff } = globalThis.__codeBlockTestHelpers;
    export const highlightCode = (...args) => globalThis.__codeBlockTestHighlight(...args);
  `,
      }))
    },
  },
])
const roots = []
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()))
  document.body.replaceChildren()
  pending.splice(0)
})
after(async () => {
  delete globalThis.__codeBlockTestHelpers
  delete globalThis.__codeBlockTestHighlight
  await dom.happyDOM.abort()
  dom.close()
})
async function mount(props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  let current = props
  const render = async changes => {
    current = { ...current, ...changes }
    await act(async () => root.render(h(ui.CodeBlock, current)))
  }
  await render({})
  return { container, render }
}
const texts = container =>
  [...container.querySelectorAll('[data-slot="code-block-line-content"]')].map(node => node.textContent)

test('Unified diff parser retains a removed decrement expression', () => {
  const patch = [
    'diff --git a/example.js b/example.js',
    '--- a/example.js',
    '+++ b/example.js',
    '@@ -1 +1 @@',
    '---counter;',
    '+counter -= 1;',
  ].join('\n')
  const [file] = helpers.parseUnifiedDiff(patch)
  assert.equal(file.added, 1)
  assert.equal(file.removed, 1)
  assert.equal(
    file.lines.some(line => line.text === '--counter;'),
    true,
  )
})

test('Unified deletion without git wrapper uses the old path', () => {
  const patch = ['--- a/example.txt', '+++ /dev/null', '@@ -1 +0,0 @@', '-old'].join('\n')
  const [file] = helpers.parseUnifiedDiff(patch)
  assert.equal(file.file, 'example.txt')
  assert.equal(file.removed, 1)
  assert.equal(file.added, 0)
  assert.ok(file.lines.some(line => line.text === 'old'))
})

test('ANSI OSC hyperlinks terminated by BEL or ST retain visible text', () => {
  const st = '\u001b\\'
  const bel = '\u0007'
  const link = terminator =>
    `before \u001b]8;;https://example.invalid/${terminator}visible label\u001b]8;;${terminator} after`
  assert.equal(helpers.ansiToLines(link(bel))[0].text, 'before visible label after')
  assert.equal(helpers.ansiToLines(link(st))[0].text, 'before visible label after')
})

test('ANSI style persists across newlines until its reset', () => {
  const lines = helpers.ansiToLines('\u001b[31mfirst\nsecond\u001b[0m')
  assert.ok(lines[0].tokens[0].color)
  assert.equal(lines[1].tokens[0].color, lines[0].tokens[0].color)
})

test('Fold marker and gutter toggle use source indices with offset display lines', async () => {
  const changes = []
  const view = await mount({
    code: 'root\n  child\nend',
    highlight: false,
    foldable: true,
    startLine: 100,
    defaultFolded: [1],
    onFoldedChange: value => changes.push(value),
  })
  const rows = () =>
    [...view.container.querySelectorAll('[data-code-line]')].map(node => node.getAttribute('data-code-line'))
  assert.deepEqual(rows(), ['100', '102'])
  await act(async () => view.container.querySelector('[data-slot="code-block-fold-marker"]').click())
  assert.deepEqual(changes, [[]])
  assert.deepEqual(rows(), ['100', '101', '102'])
  await act(async () => view.container.querySelector('[data-slot="code-block-fold-toggle"]').click())
  assert.deepEqual(rows(), ['100', '102'])
  await act(async () => view.container.querySelector('[data-slot="code-block-fold-toggle"]').click())
  assert.deepEqual(rows(), ['100', '101', '102'])
})

test('Streaming source remains complete while its highlighter is pending', async () => {
  const view = await mount({ code: 'a', language: 'javascript', streaming: true })
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve(helpers.toPlainLines('a')))
  assert.deepEqual(texts(view.container), ['a'])
  await view.render({ code: 'ab' })
  assert.equal(pending.at(-1).code, 'ab')
  assert.deepEqual(texts(view.container), ['ab'])
  await act(async () => pending.at(-1).resolve(helpers.toPlainLines('ab')))
  assert.deepEqual(texts(view.container), ['ab'])
  await view.render({ code: 'abc\nsecond' })
  assert.equal(pending.at(-1).code, 'abc\nsecond')
  assert.deepEqual(texts(view.container), ['abc', 'second'])
  await act(async () => pending.at(-1).resolve(helpers.toPlainLines('abc\nsecond')))
  assert.deepEqual(texts(view.container), ['abc', 'second'])
})

test('Unified diff separates multiple files and treats file-like hunk lines as text', () => {
  const patch = [
    '--- a/old.txt\tbefore',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '--- header-like text',
    '--- /dev/null',
    '+++ b/new.txt\tafter',
    '@@ -0,0 +1 @@',
    '+++ added header-like text',
  ].join('\n')
  const files = helpers.parseUnifiedDiff(patch)
  assert.deepEqual(
    files.map(file => [file.file, file.added, file.removed]),
    [
      ['old.txt', 0, 1],
      ['new.txt', 1, 0],
    ],
  )
  assert.equal(files[0].lines[1].text, '-- header-like text')
  assert.equal(files[1].lines[1].text, '++ added header-like text')
})
test('ANSI incomplete OSC tails are omitted and SGR resets restore plain text after empty rows', () => {
  assert.equal(helpers.ansiToLines('before \u001b]8;;unfinished')[0].text, 'before ')
  const lines = helpers.ansiToLines('\u001b[31m\u001b[1mfirst\n\nsecond\u001b[0m plain\nlast')
  assert.deepEqual(
    lines.map(line => line.text),
    ['first', '', 'second plain', 'last'],
  )
  assert.equal(lines[2].tokens[0].color, lines[0].tokens[0].color)
  assert.equal(lines[2].tokens[0].fontStyle, 'bold')
  assert.equal(lines[2].tokens[1].color, undefined)
  assert.equal(lines[3].tokens[0].color, undefined)
})
test('Stale highlights cannot replace a newer document or growing tail', async () => {
  const view = await mount({ code: 'first\ntail', language: 'javascript', streaming: true })
  await act(async () => pending[0].resolve(helpers.toPlainLines('first\ntail')))
  await view.render({ code: 'first\ntail grows' })
  const stale = pending.at(-1)
  await view.render({ code: 'replacement\ncurrent' })
  await act(async () => stale.resolve(helpers.toPlainLines('first\ntail grows')))
  assert.deepEqual(texts(view.container), ['replacement', 'current'])
  await act(async () => pending.at(-1).resolve(helpers.toPlainLines('replacement\ncurrent')))
  assert.deepEqual(texts(view.container), ['replacement', 'current'])
})
