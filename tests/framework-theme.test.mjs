import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'

const require = createRequire(import.meta.url)
const dom = new Window({ url: 'http://theme.fixture.test/' })
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'ResizeObserver',
  'DOMRect',
  'ShadowRoot',
  'DocumentFragment',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  throw new Error('Theme tests prohibit external requests')
}
const { act, createElement: h, useState } = require('react')
const { createRoot } = require('react-dom/client')
const built = await build({
  stdin: {
    contents: `
      export { resolvePrimaryColors, getColorForeground } from './src/components/reui/utils/theme-color'
      export { themeColors } from './src/store/settings/colors'
      export { createAppRuntime } from './src/app/runtime/create-runtime'
      export { AppProviders } from './src/provider/app-provider'
      export { ThemeColorPicker } from './src/components/reui/theme-color-picker'
      export { highlightCode, ansiToLines } from './src/components/reui/code-block/code-block-highlight'
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.env': '{}', 'import.meta.hot': 'undefined' },
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', built.outputFiles[0].text)(compiled, compiled.exports, require)
const core = compiled.exports

function rgb(value) {
  if (value.startsWith('#')) {
    const hex = value.slice(1)
    const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
    return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16))
  }
  return value
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
}

function contrast(first, second) {
  const luminance = color =>
    rgb(color).reduce((sum, channel, index) => {
      const encoded = channel / 255
      const linear = encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4
      return sum + linear * [0.2126, 0.7152, 0.0722][index]
    }, 0)
  const a = luminance(first),
    b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function tint(color, surface, alpha) {
  const background = rgb(surface)
  return `rgb(${rgb(color)
    .map((channel, index) => channel * alpha + background[index] * (1 - alpha))
    .join(',')})`
}

for (const dark of [false, true]) {
  test(`All preset and custom primary colors remain readable in ${dark ? 'dark' : 'light'} mode`, () => {
    for (const value of [
      ...core.themeColors.map(item => item.value),
      '#000000',
      '#FFFFFF',
      '#777777',
      '#FFEE00',
      '#123456',
      '#abc',
    ]) {
      const colors = core.resolvePrimaryColors(value, dark)
      assert.ok(contrast(colors.primary, colors.foreground) >= 4.5, `${value}: filled primary`)
      assert.ok(contrast(colors.hover, colors.foreground) >= 4.5, `${value}: hovered primary`)
      for (const surface of dark ? ['#0A0A0A', '#171717', '#262626'] : ['#FFFFFF', '#FAFAFA', '#F5F5F5']) {
        assert.ok(contrast(colors.primary, surface) >= 4.5, `${value}: link on ${surface}`)
        assert.ok(
          contrast(colors.primary, tint(colors.primary, surface, 0.1)) >= 4.5,
          `${value}: tinted selection on ${surface}`,
        )
      }
      assert.ok(
        contrast(colors.primary, tint(colors.primary, dark ? '#171717' : '#FFFFFF', dark ? 0.15 : 0.1)) >= 4.5,
        `${value}: primary badge`,
      )
    }
  })
}

test('Default syntax colors stay readable and an unknown dark theme falls back to dark colors', async t => {
  const source = '// comment\nconst enabled = true\nfunction greet(name: string) { return `Hello ${name}` }'
  const lines = await core.highlightCode(source, { language: 'tsx' })
  const tokens = lines.flatMap(line => line.tokens).filter(token => token.color && token.colorDark)
  assert.ok(tokens.length > 10, 'The actual syntax highlighter must load')
  for (const token of tokens) {
    for (const surface of ['#FFFFFF', '#F5F5F5'])
      assert.ok(contrast(token.color, surface) >= 4.5, `Light token: ${token.content}`)
    for (const surface of ['#171717', '#262626'])
      assert.ok(contrast(token.colorDark, surface) >= 4.5, `Dark token: ${token.content}`)
  }
  t.mock.method(console, 'warn', () => {})
  const fallback = await core.highlightCode(source, {
    language: 'tsx',
    themes: { light: 'github-light-high-contrast', dark: 'unknown-fixture-theme' },
  })
  assert.deepEqual(
    fallback.flatMap(line => line.tokens.map(token => token.colorDark)),
    lines.flatMap(line => line.tokens.map(token => token.colorDark)),
  )
})

test('All sixteen standard ANSI colors stay readable without rewriting truecolor input', () => {
  const source = Array.from(
    { length: 16 },
    (_, index) => `\u001b[${index < 8 ? 30 + index : 90 + index - 8}mcolor${index}\u001b[0m`,
  ).join(' ')
  const tokens = core
    .ansiToLines(source)
    .flatMap(line => line.tokens)
    .filter(token => token.color)
  assert.equal(tokens.length, 16)
  for (const token of tokens) {
    const light = token.color.match(/#[\da-f]{6}/i)[0],
      dark = token.colorDark.match(/#[\da-f]{6}/i)[0]
    assert.ok(contrast(light, '#F5F5F5') >= 4.5, `Light ANSI: ${token.content}`)
    assert.ok(contrast(dark, '#262626') >= 4.5, `Dark ANSI: ${token.content}`)
  }
  const literal = core.ansiToLines('\u001b[38;2;17;34;51mexact\u001b[0m')[0].tokens[0]
  assert.equal(literal.color, '#112233')
  assert.equal(literal.colorDark, '#112233')
})

test('Swatch check marks stay readable independent of the active theme', () => {
  for (const value of [
    ...core.themeColors.map(item => item.value),
    '#FFFFFF',
    '#777777',
    '#808080',
    '#000000',
    '#abc',
  ]) {
    assert.ok(contrast(value, core.getColorForeground(value)) >= 4.5, value)
  }
  for (const value of ['', 'invalid', 'bad', '#12', '#GGGGGG', 'url(unsafe)']) {
    assert.equal(core.getColorForeground(value), undefined)
    assert.equal(core.resolvePrimaryColors(value, true), undefined)
  }
})

function runtime(colorMode, primaryColor) {
  const data = new Map()
  const app = core.createAppRuntime({
    storage: {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: key => data.delete(key),
    },
  })
  app.settings.getState().setSettings({ app: { ...app.settings.getState().settings.app, colorMode, primaryColor } })
  return app
}

async function mount(t, element) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  await act(async () => root.render(element))
  return container
}

test('Providers isolate appearance, follow system changes and preserve saved color choices', async t => {
  const listeners = new Set()
  const originalMatchMedia = dom.matchMedia
  const media = {
    matches: false,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  }
  dom.matchMedia = () => media
  const first = runtime('dark', '#18181B'),
    second = runtime('light', '#16A34A')
  t.after(() => {
    first.dispose()
    second.dispose()
    dom.matchMedia = originalMatchMedia
  })
  const container = await mount(
    t,
    h(
      'div',
      null,
      h(core.AppProviders, { runtime: first }, h('p', null, 'First app')),
      h(core.AppProviders, { runtime: second }, h('p', null, 'Second app')),
    ),
  )
  const [darkScope, lightScope] = container.querySelectorAll('[data-app-scope]')
  assert.ok(darkScope.classList.contains('dark'))
  assert.ok(!lightScope.classList.contains('dark'))
  assert.ok(darkScope.classList.contains('text-foreground'))
  assert.equal(darkScope.style.colorScheme, 'dark')
  assert.equal(lightScope.style.colorScheme, 'light')
  assert.equal(first.settings.getState().settings.app.primaryColor, '#18181B')
  assert.ok(contrast(darkScope.style.getPropertyValue('--primary'), '#171717') >= 4.5)
  const originalLightPrimary = lightScope.style.getPropertyValue('--primary')
  await act(async () => first.settings.getState().setColorMode('autoMode'))
  assert.ok(listeners.size >= 1)
  assert.ok(!darkScope.classList.contains('dark'))
  await act(async () => {
    media.matches = true
    for (const listener of listeners) listener({ matches: true })
  })
  assert.ok(darkScope.classList.contains('dark'))
  assert.equal(darkScope.style.colorScheme, 'dark')
  assert.equal(lightScope.style.getPropertyValue('--primary'), originalLightPrimary)
  assert.ok(!document.documentElement.classList.contains('dark'))
  await act(async () => first.settings.getState().setColorMode('light'))
  await act(async () => {
    for (const listener of listeners) listener({ matches: true })
  })
  assert.ok(!darkScope.classList.contains('dark'), 'An explicit light mode stops following system changes')
  await act(async () => first.settings.getState().setPrimaryColor(''))
  for (const property of ['--primary', '--primary-foreground', '--primary-hover', '--ring']) {
    assert.equal(darkScope.style.getPropertyValue(property), '', `Clear stale ${property}`)
  }
})

test('The palette uses readable check marks and supports keyboard selection', async t => {
  function Picker() {
    const [value, setValue] = useState(core.themeColors[0].value)
    return h(core.ThemeColorPicker, { colors: core.themeColors, value, onChange: setValue })
  }
  const container = await mount(t, h(Picker))
  const radios = [...container.querySelectorAll('[role="radio"]')]
  await act(async () => radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  assert.equal(radios[1].getAttribute('aria-checked'), 'true')
  assert.equal(document.activeElement, radios[1])
  for (const radio of radios) {
    await act(async () => radio.click())
    const mark = radio.querySelector('svg')
    assert.ok(mark)
    assert.ok(contrast(radio.style.backgroundColor, mark.style.color) >= 4.5, radio.getAttribute('aria-label'))
  }
})

after(async () => {
  globalThis.fetch = originalFetch
  await dom.happyDOM.close()
})
