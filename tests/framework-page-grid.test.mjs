import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { compile } from 'tailwindcss'

const require = createRequire(import.meta.url)
const { transform } = createRequire(require.resolve('@tailwindcss/vite'))('lightningcss')
const source = await readFile(new URL('../src/assets/styles/globals.css', import.meta.url), 'utf8')
const theme = await readFile(require.resolve('tailwindcss/theme.css'), 'utf8')
// Compile the public stylesheet without application imports or opening a server.
const compiler = await compile(`${theme}\n${source.replace(/^@import[^\n]+\n/gm, '')}\n@tailwind utilities;`)
let rules
transform({
  filename: 'page-grid.css',
  code: Buffer.from(compiler.build([])),
  visitor: {
    StyleSheet(sheet) {
      rules = sheet.rules
    },
  },
})

function* styles(nodes, conditions = []) {
  for (const rule of nodes) {
    if (rule.type === 'style') yield { ...rule.value, conditions }
    else if (rule.type === 'media')
      yield* styles(rule.value.rules, [...conditions, { type: 'media', value: rule.value.query }])
    else if (rule.type === 'container')
      yield* styles(rule.value.rules, [...conditions, { type: 'container', value: rule.value.condition }])
    else if (rule.type === 'layer-block') yield* styles(rule.value.rules, conditions)
  }
}
const compiledStyles = [...styles(rules)]

function matchesWidth(condition, width) {
  assert.equal(condition.type, 'feature')
  const feature = condition.value
  assert.equal(feature.type, 'range')
  assert.equal(feature.name, 'width')
  assert.equal(feature.operator, 'greater-than-equal')
  const length = feature.value.value.value
  assert.equal(length.unit, 'rem')
  return width >= length.value * 16
}

function declarations(selector, viewport, container) {
  return compiledStyles
    .filter(rule =>
      rule.selectors.some(
        parts =>
          parts.length === 1 &&
          (selector === ':root'
            ? parts[0].type === 'pseudo-class' && parts[0].kind === 'root'
            : parts[0].type === 'class' && parts[0].name === selector),
      ),
    )
    .filter(rule =>
      rule.conditions.every(condition =>
        condition.type === 'container'
          ? matchesWidth(condition.value, container)
          : condition.value.mediaQueries.some(query => matchesWidth(query.condition, viewport)),
      ),
    )
    .flatMap(rule => rule.declarations.declarations)
}

function variables(selector, viewport, container, inherited = {}) {
  const values = { ...inherited }
  for (const declaration of declarations(selector, viewport, container)) {
    if (declaration.property !== 'custom' || !declaration.value.name.startsWith('--page-')) continue
    const [value] = declaration.value.value
    values[declaration.value.name] =
      value.type === 'var'
        ? values[value.value.name.ident]
        : value.type === 'length'
          ? value.value.value * (value.value.unit === 'rem' ? 16 : 1)
          : value.value.value
  }
  return values
}

test('页面栅格在设备断点两侧保持 4/8/12 栏、16px 间距和统一外边距', () => {
  for (const [width, columns, margin] of [
    [320, 4, 16],
    [375, 4, 16],
    [767, 4, 16],
    [768, 8, 24],
    [1023, 8, 24],
    [1024, 12, 24],
    [1440, 12, 24],
    [2560, 12, 24],
  ]) {
    const values = variables(':root', width, width)
    assert.equal(values['--page-grid-columns'], columns, `${width}px columns`)
    assert.equal(values['--page-grid-gutter'], 16, `${width}px gutter`)
    assert.equal(values['--page-grid-margin'], margin, `${width}px margin`)
  }
  const grid = declarations('page-grid', 375, 343)
  const template = grid.find(item => item.value?.propertyId?.property === 'grid-template-columns')
  assert.ok(template, '实际栅格必须消费设备列数')
  assert.match(JSON.stringify(template.value), /--page-grid-columns/)
  const gap = grid.find(item => item.value?.propertyId?.property === 'gap')
  assert.match(JSON.stringify(gap?.value), /--page-grid-gutter/)
})

test('卡片在侧栏和限宽容器变化时只采用完整整数跨栏', () => {
  for (const viewport of [375, 768, 1023, 1024, 1440, 1920]) {
    for (const container of [240, 343, 511, 512, 767, 768, 1023, 1024, 1280]) {
      if (container > viewport) continue
      const root = variables(':root', viewport, container)
      const values = variables('page-card-grid', viewport, container, root)
      const columns = values['--page-grid-columns']
      const span = values['--page-card-span']
      const count =
        viewport < 768 || container < 512 ? 1 : viewport < 1024 || container < 768 ? 2 : container < 1024 ? 3 : 4
      assert.equal(columns / span, count, `viewport ${viewport}px, container ${container}px`)
      assert.equal(columns % span, 0, '不允许五等分或平板三等分造成的分数跨栏')
      const track = (container - (columns - 1) * 16) / columns
      const card = track * span + (span - 1) * 16
      assert.equal(card * count + (count - 1) * 16, container, '最后一张卡片必须落在容器右边界')
    }
  }
})
