import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { after, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile } from 'tailwindcss'

const require = createRequire(import.meta.url)
const { transform, Features } = createRequire(require.resolve('@tailwindcss/vite'))('lightningcss')
const bundle = await build({
  entryPoints: ['src/components/reui/frame.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(compiled, compiled.exports, require)
const { Frame, FrameHeader, FrameTitle, FrameDescription, FramePanel, FrameFooter } = compiled.exports
const dom = new Window()
after(() => dom.close())
const source = await readFile(new URL('../src/assets/styles/globals.css', import.meta.url), 'utf8')
const theme = source.match(/@theme inline \{[\s\S]*?\n\}/)?.[0]
assert.ok(theme)

function computedColor(node, property = 'color') {
  const value = dom.getComputedStyle(node)[property]
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (!hex) return value
  const expanded = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
  return `rgb(${[0, 2, 4].map(index => Number.parseInt(expanded.slice(index, index + 2), 16)).join(', ')})`
}

function frame(props = {}) {
  return createElement(
    Frame,
    props,
    createElement(
      FrameHeader,
      null,
      createElement(FrameTitle, null, '标题'),
      createElement(FrameDescription, null, '说明'),
    ),
    createElement(FramePanel, null, createElement('span', null, '配置值')),
    createElement(FrameFooter, null, createElement('button', null, '操作')),
  )
}

async function mount(t, props) {
  const scope = dom.document.createElement('div')
  scope.className = 'frame-theme-scope'
  scope.innerHTML = renderToStaticMarkup(frame(props))
  dom.document.body.append(scope)
  const { build } = await compile(`
    :root { --foreground: rgb(30, 30, 30); --card-foreground: rgb(35, 35, 35); --card: rgb(255, 255, 255); --border: rgb(220, 220, 220); --muted: rgb(240, 240, 240); --muted-foreground: rgb(100, 100, 100); }
    .frame-theme-scope.dark { --foreground: rgb(245, 245, 245); --card-foreground: rgb(250, 250, 250); --card: rgb(35, 35, 35); --border: rgb(70, 70, 70); --muted: rgb(60, 60, 60); --muted-foreground: rgb(180, 180, 180); }
    body { color: var(--foreground); }
    ${theme}
    @tailwind utilities;
  `)
  const colors = [...new Set([...scope.querySelectorAll('*')].flatMap(node => [...node.classList]))].filter(name =>
    /^(text-|bg-|\[--frame-(panel-bg|panel-border-color|border-color):|border-\(|border-\[)/.test(name),
  )
  const style = dom.document.createElement('style')
  // 展开 Tailwind 混色规则中的嵌套 @supports，使用 Vite 同一优化器供 DOM 测试解析。
  style.textContent = transform({
    filename: 'frame-theme.css',
    code: Buffer.from(build(colors)),
    include: Features.Nesting,
  }).code.toString()
  dom.document.head.append(style)
  t.after(() => {
    scope.remove()
    style.remove()
  })
  return scope
}

for (const props of [{}, { dense: true, stacked: true }, { variant: 'ghost' }, { variant: 'inverse' }]) {
  test(`Frame ${JSON.stringify(props)} 在局部浅深主题往返切换时更新标题、内容、面板和边框`, async t => {
    const scope = await mount(t, props)
    const frame = scope.querySelector('[data-slot="frame"]')
    const panel = scope.querySelector('[data-slot="frame-panel"]')
    const title = scope.querySelector('[data-slot="frame-panel-title"]')
    const description = scope.querySelector('[data-slot="frame-panel-description"]')
    const footer = scope.querySelector('[data-slot="frame-panel-footer"]')
    assert.ok(!frame.className.includes('var(--color-'))
    for (const dark of [false, true, false]) {
      scope.classList.toggle('dark', dark)
      const computed = node => dom.getComputedStyle(node)
      const foreground = dark ? 'rgb(245, 245, 245)' : 'rgb(30, 30, 30)'
      const panelForeground = dark ? 'rgb(250, 250, 250)' : 'rgb(35, 35, 35)'
      const border = dark ? 'rgb(70, 70, 70)' : 'rgb(220, 220, 220)'
      assert.equal(computedColor(dom.document.body), 'rgb(30, 30, 30)')
      for (const node of [frame, title, footer]) assert.equal(computedColor(node), foreground)
      for (const node of [panel, panel.firstElementChild]) assert.equal(computedColor(node), panelForeground)
      assert.equal(computedColor(description), dark ? 'rgb(180, 180, 180)' : 'rgb(100, 100, 100)')
      assert.equal(computedColor(panel, 'borderTopColor'), border)
      if (props.variant !== 'ghost') assert.equal(computedColor(frame, 'borderTopColor'), border)
      if (props.variant === 'inverse') {
        assert.match(computed(frame).getPropertyValue('--frame-panel-bg'), /color-mix\(in oklch,/)
      } else {
        assert.equal(computedColor(panel, 'backgroundColor'), dark ? 'rgb(35, 35, 35)' : 'rgb(255, 255, 255)')
      }
    }
  })
}

test('Frame 继续允许调用方覆盖主题颜色变量和文字颜色', async t => {
  const scope = await mount(t, {
    className: 'text-primary [--frame-panel-bg:var(--background)] [--frame-border-color:var(--input)]',
  })
  const frame = scope.querySelector('[data-slot="frame"]')
  assert.ok(frame.classList.contains('text-primary'))
  assert.ok(!frame.classList.contains('text-foreground'))
  assert.ok(frame.classList.contains('[--frame-panel-bg:var(--background)]'))
  assert.ok(!frame.classList.contains('[--frame-panel-bg:var(--card)]'))
  assert.ok(frame.classList.contains('[--frame-border-color:var(--input)]'))
  assert.ok(!frame.classList.contains('[--frame-border-color:var(--border)]'))
})
