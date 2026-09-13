import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { build } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)

async function harness() {
  const result = await build({
    stdin: {
      contents: [
        "export { MaTable } from './src/components/ma-table'",
        "export { MaProTable } from './src/components/ma-pro-table'",
        "export { MaTableBody } from './src/components/ma-table/components/ma-table-body'",
        "export * from './src/components/ma-table/utils/cell-renderers'",
        "export { renderTableCell } from './src/components/ma-table/utils/render-cell'",
        "export { default as plugin, AvatarInfoCell, BadgeCell } from './src/plugins/west/cell-enhance'",
        "export { useDictStore } from './src/provider/dictionary'",
      ].join('\n'),
      resolveDir: frontendRoot,
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
  })
  const module = { exports: {} }
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
  return module.exports
}

function registerDictionary(h, code, options) {
  h.useDictStore.getState().push(code, options, true)
  // 静态渲染读取 Zustand 的初始快照，同步测试夹具到服务端快照。
  h.useDictStore.getInitialState().dictionaries = h.useDictStore.getState().dictionaries
}

function tableMarkup(h, columns, data, pro = false) {
  return renderToStaticMarkup(createElement(pro ? h.MaProTable : h.MaTable, pro
    ? { schema: { tableColumns: columns }, data, options: { header: { show: false }, toolbar: false, tableOptions: { showPagination: false } } }
    : { columns, data, options: { showPagination: false } }))
}

const badgeConfig = {
  name: 'west/cell-enhance',
  props: { type: 'badge', props: { options: [{ value: 1, label: '启用', variant: 'success-light' }] } },
}

test('头像信息在 MaTable 和 MaProTable 中按嵌套字段显示头像、姓名、徽章和副标题', async () => {
  const h = await harness()
  h.plugin.install()
  const row = Object.freeze({ id: 1, user: Object.freeze({
    avatar: 'https://example.invalid/avatar.jpg', nickname: 'Alex Johnson', title: 'Founder & CEO', plan: 'Pro',
  }) })
  const column = {
    prop: 'user.nickname',
    cellRenderTo: { name: 'west/cell-enhance', props: { type: 'avatar-info', props: {
      name: '直接值不应覆盖映射',
      fields: { avatar: 'user.avatar', name: 'user.nickname', badge: 'user.plan', description: 'user.title' },
    } } },
  }
  const element = h.renderTableCell({ column, row, rowIndex: 0, value: '列值' }, h.getTableCellRenderers())
  assert.equal(element.type, h.AvatarInfoCell)
  assert.equal(element.props.avatar, row.user.avatar)
  assert.equal(element.props.name, row.user.nickname)
  assert.equal(element.props.badge, row.user.plan)
  assert.equal(element.props.description, row.user.title)
  assert.equal(element.props.fields, undefined)
  for (const pro of [false, true]) {
    const html = tableMarkup(h, [column], [row], pro)
    assert.match(html, /data-slot="avatar"/)
    assert.match(html, /Alex Johnson/)
    assert.match(html, /data-slot="avatar-fallback"[^>]*>A<\/span>/)
    assert.match(html, /data-slot="badge"[^>]*>Pro<\/span>/)
    assert.match(html, /Founder &amp; CEO/)
    assert.doesNotMatch(html, /直接值不应覆盖映射|fields=|badgeProps=|\[object Object\]/)
  }
})

test('头像信息支持当前列值、按行配置和直接传值，缺失头像使用自定义文字或昵称首字', async () => {
  const h = await harness()
  h.plugin.install()
  const column = {
    prop: row => row.nickname,
    cellRenderTo: { name: 'west/cell-enhance', props: ({ row }) => ({ type: 'avatar-info', props: {
      badge: row.active ? '专业版' : null,
      description: row.title,
      badgeProps: { variant: 'success-light' },
    } }) },
  }
  for (const pro of [false, true]) {
    const html = tableMarkup(h, [column], [{ id: 1, nickname: '亚历克斯', active: true, title: '创始人' }], pro)
    assert.match(html, /亚历克斯/)
    assert.match(html, /data-slot="avatar-fallback"[^>]*>亚<\/span>/)
    assert.match(html, /专业版/)
    assert.match(html, /bg-success\/10/)
    assert.match(html, /创始人/)
    const plain = tableMarkup(h, [column], [{ id: 2, nickname: 'Alex Johnson', active: false }], pro)
    assert.match(plain, /Alex Johnson/)
    assert.doesNotMatch(plain, /data-slot="badge"|专业版/)
  }
  const direct = renderToStaticMarkup(createElement(h.AvatarInfoCell, {
    name: 'Alex Johnson', fallback: '用户', description: '创始人', badge: 'Pro', avatarSize: 'sm',
    badgeProps: { variant: 'info-light' }, 'aria-label': '用户信息',
  }))
  assert.match(direct, /aria-label="用户信息"/)
  assert.match(direct, /data-slot="avatar-fallback"[^>]*>用户<\/span>/)
  assert.match(direct, /bg-info\/10/)
})

test('头像信息的缺失字段优先按空值处理，不显示对象或空徽章，数字零保持可见', async () => {
  const h = await harness()
  h.plugin.install()
  const column = {
    prop: 'nickname',
    cellRenderTo: { name: 'west/cell-enhance', props: { type: 'avatar-info', props: {
      name: '不应回退', badge: '不应显示', emptyText: '暂无用户',
      fields: { avatar: 'user.avatar', name: 'user.name', badge: 'user.badge', description: 'user.description' },
    } } },
  }
  const invalid = { id: 1, nickname: '列值不应回退', user: { avatar: 42, badge: {}, description: [] } }
  const empty = tableMarkup(h, [column], [invalid], true)
  assert.match(empty, /暂无用户/)
  assert.doesNotMatch(empty, /data-slot="avatar"|data-slot="badge"|不应|\[object Object\]/)
  const zero = tableMarkup(h, [column], [{ id: 2, user: { name: 0, badge: 0, description: 0 } }])
  assert.match(zero, /data-slot="badge"[^>]*>0<\/span>/)
  assert.match(zero, /title="0"/)
  assert.doesNotMatch(zero, /暂无用户/)
  const blank = renderToStaticMarkup(createElement(h.AvatarInfoCell, { name: ' ', badge: null, description: '' }))
  assert.match(blank, />-<\/div>/)
  assert.doesNotMatch(blank, /data-slot="avatar"|data-slot="badge"/)
})

test('头像信息配置错误时回退到原始列值', async () => {
  const h = await harness()
  h.plugin.install()
  for (const props of [
    null, [], { fields: null }, { fields: [] }, { fields: { avatar: 1 } }, { fields: { name: '' } },
    { badgeProps: [] }, { badgeProps: null }, { avatarSize: 'invalid' },
  ]) {
    const html = tableMarkup(h, [{ prop: 'name', cellRenderTo: {
      name: 'west/cell-enhance', props: { type: 'avatar-info', props },
    } }], [{ id: 1, name: '原始列值' }])
    assert.match(html, />原始列值<\/td>/)
    assert.doesNotMatch(html, /data-slot="avatar"|data-slot="badge"/)
  }
})

test('MaTable 与 MaProTable 通过 cellRenderTo 同时支持 dictName 和 options 数组', async () => {
  const h = await harness()
  h.plugin.install()
  const dictionaryConfig = { name: 'west/cell-enhance', props: { type: 'badge', props: { dictName: 'system-status' } } }
  for (const [config, color] of [[badgeConfig, /bg-success\/10/], [dictionaryConfig, /bg-primary\/10/]]) {
    const columns = [{ label: '状态', prop: 'account.status', cellRenderTo: config }]
    for (const pro of [false, true]) {
      const html = tableMarkup(h, columns, [{ id: 1, account: { status: '1' } }], pro)
      assert.match(html, /data-slot="badge"/)
      assert.match(html, /启用/)
      assert.match(html, color)
    }
  }
})

test('动态 props 接收当前行、列、索引以及函数列解析的原始值', async () => {
  const h = await harness()
  h.plugin.install()
  const row = Object.freeze({ id: 7, count: 0 })
  let seen
  const column = {
    label: '数量',
    prop: item => item.count,
    cellRenderTo: {
      name: 'west/cell-enhance',
      props: context => {
        seen = context
        return { type: 'badge', props: { formatValue: value => '数量 ' + value } }
      },
    },
  }
  assert.match(tableMarkup(h, [column], [row], true), /数量 0/)
  assert.equal(seen.row, row)
  assert.equal(seen.column, column)
  assert.equal(seen.rowIndex, 0)
  assert.equal(seen.value, 0)
  assert.equal(row.count, 0)
})

test('特殊列优先，普通列保留 cellRender、插件、formatter 的顺序', async () => {
  const h = await harness()
  h.registerTableCellRenderer({ name: 'test', render: () => '插件' })
  const column = { prop: 'value', cellRenderTo: { name: 'test' }, formatter: () => '格式化' }
  const context = { column, row: { value: '原值' }, rowIndex: 0, value: '原值' }
  const render = () => h.renderTableCell(context, h.getTableCellRenderers())
  assert.equal(render(), '插件')
  column.cellRender = () => '自定义'
  assert.equal(render(), '自定义')
  delete column.cellRender
  h.removeTableCellRenderer('test')
  assert.equal(render(), '格式化')
  delete column.formatter
  assert.equal(render(), '原值')

  h.registerTableCellRenderer({ name: 'empty', render: () => null })
  column.cellRenderTo = { name: 'empty' }
  assert.equal(render(), null)
  const html = tableMarkup(h, [{ type: 'index', cellRenderTo: { name: 'empty' } }], [{ id: 1 }])
  assert.match(html, />1<\/td>/)
})

test('同名替换后注销旧注册不会误删新实现', async () => {
  const h = await harness()
  let notifications = 0
  const unsubscribe = h.subscribeTableCellRenderers(() => notifications++)
  const removeOld = h.registerTableCellRenderer({ name: 'test', render: () => '旧' })
  const removeNew = h.registerTableCellRenderer({ name: 'test', render: () => '新' })
  removeOld()
  assert.equal(h.getTableCellRenderers().get('test').render(), '新')
  assert.equal(notifications, 2)
  removeNew()
  assert.equal(h.getTableCellRenderers().has('test'), false)
  assert.equal(notifications, 3)
  unsubscribe()
  assert.throws(() => h.registerTableCellRenderer({ name: ' ', render: () => null }), /缺少名称/)
})

test('旧基础表体兼容入口也支持相同的 cellRenderTo', async () => {
  const h = await harness()
  h.plugin.install()
  const html = renderToStaticMarkup(createElement('table', null, createElement(h.MaTableBody, {
    rows: [{ id: 1, status: 1 }],
    columns: [{ prop: 'status', cellRenderTo: badgeConfig }],
    options: {},
    currentPage: 1,
    pageSize: 10,
    loading: false,
    selectedKeys: new Set(),
    expandedKeys: new Set(),
    getRowKey: row => String(row.id),
    onSelectionChange: () => {},
    onExpandChange: () => {},
  })))
  assert.match(html, /data-slot="badge"/)
  assert.match(html, /启用/)
})

test('Badge 过滤无效值但保留零与 false，映射按类型优先', async () => {
  const h = await harness()
  const html = renderToStaticMarkup(createElement(h.BadgeCell, {
    value: [null, undefined, '', ' ', {}, [], NaN, Infinity, 0, false, '1'],
    options: [{ value: 1, label: '数字' }, { value: '1', label: '字符串' }],
  }))
  assert.equal((html.match(/data-slot="badge"/g) ?? []).length, 3)
  assert.match(html, />0</)
  assert.match(html, />false</)
  assert.match(html, /字符串/)
  assert.doesNotMatch(html, /数字/)
  const empty = renderToStaticMarkup(createElement(h.BadgeCell, { value: [], emptyText: '暂无' }))
  assert.match(empty, /暂无/)
  assert.doesNotMatch(empty, /data-slot="badge"/)
})

test('Badge 合并单项属性，支持插槽、圆点、原生 render 和空标签', async () => {
  const h = await harness()
  const html = renderToStaticMarkup(createElement(h.BadgeCell, {
    value: [1, 2],
    variant: 'secondary',
    radius: 'full',
    style: { color: 'red' },
    leading: createElement('svg', { 'aria-label': '图标' }),
    dot: true,
    options: [
      { value: 1, label: '启用', variant: 'success-light', style: { color: 'blue' }, render: createElement('a', { href: '#detail' }) },
      { value: 2, label: null, dot: false, leading: null },
    ],
  }))
  assert.match(html, /href="#detail"/)
  assert.match(html, /bg-success\/10/)
  assert.match(html, /color:blue/)
  assert.match(html, /rounded-full/)
  assert.equal((html.match(/aria-label="图标"/g) ?? []).length, 1)
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 1)
  assert.doesNotMatch(html, /options=|optionProps=|formatValue=|value="|code=|i18n=|color="|>2</)
})

test('错误渲染配置回退到原值，不会把错误属性传给 Badge', async () => {
  const h = await harness()
  h.plugin.install()
  for (const props of [
    undefined, null, [], { type: 'missing' }, { type: 'badge', props: [] },
    { type: 'badge', props: { options: 'system-status' } },
    { type: 'badge', props: { options: 3 } },
    { type: 'badge', props: { options: null } },
    { type: 'badge', props: { dictName: [] } },
    { type: 'badge', props: { optionProps: [] } },
  ]) {
    const html = tableMarkup(h, [{ prop: 'status', cellRenderTo: { name: 'west/cell-enhance', props } }], [{ id: 1, status: 3 }])
    assert.match(html, />3<\/td>/)
    assert.doesNotMatch(html, /data-slot="badge"/)
  }
})

test('字典按分类 code 取值，缺失分类和未知值保留原值', async () => {
  const h = await harness()
  h.plugin.install()
  registerDictionary(h, 'test-status', [{ value: '1', label: '已授权', code: 'authorized' }])
  for (const pro of [false, true]) {
    const columns = dictName => [{ prop: 'status', cellRenderTo: {
      name: 'west/cell-enhance', props: { type: 'badge', props: { dictName } },
    } }]
    const html = tableMarkup(h, columns('test-status'), [{ id: 1, status: 1 }], pro)
    assert.match(html, /已授权/)
    for (const code of ['authorized', 'missing-category', '', '__proto__']) {
      const fallback = tableMarkup(h, columns(code), [{ id: 1, status: 1 }], pro)
      assert.match(fallback, /data-slot="badge"[^>]*>1<\/span>/)
      assert.doesNotMatch(fallback, /已授权/)
    }
    assert.match(tableMarkup(h, columns('test-status'), [{ id: 1, status: 9 }], pro), />9<\/span>/)
  }
  const formatted = renderToStaticMarkup(createElement(h.BadgeCell, {
    value: 9, dictName: 'missing-category', formatValue: value => `未知 ${value}`,
  }))
  assert.match(formatted, /未知 9/)
})

test('字典支持语义颜色、ReUI 变体和 CSS 颜色，单项配置可以覆盖', async () => {
  const h = await harness()
  registerDictionary(h, 'test-badge-colors', [
    { value: 1, label: '危险', color: 'danger' },
    Object.freeze({ value: 2, label: '自定义', color: '#1677ff', code: 'custom', i18n: 'test.custom' }),
    { value: 3, label: '轮廓', color: 'success-outline' },
    { value: 4, label: '默认' },
  ])
  const html = renderToStaticMarkup(createElement(h.BadgeCell, {
    value: [1, 2, 3, 4], dictName: 'test-badge-colors', variant: 'secondary',
  }))
  assert.match(html, /bg-destructive\/10/)
  assert.match(html, /color:#1677ff;border-color:#1677ff/)
  assert.match(html, /text-success-foreground/)
  assert.match(html, /bg-secondary/)
  const overridden = renderToStaticMarkup(createElement(h.BadgeCell, {
    value: 2, dictName: 'test-badge-colors',
    optionProps: () => ({ variant: 'primary-outline', style: { color: 'red' } }),
  }))
  assert.match(overridden, /text-primary/)
  assert.match(overridden, /color:red;border-color:#1677ff/)
  assert.doesNotMatch(overridden, /code=|i18n=|dictName=|options=|optionProps=/)
})

test('同时提供 dictName 和 options 时数组优先，空数组或未匹配值也不回退字典', async () => {
  const h = await harness()
  h.plugin.install()
  for (const pro of [false, true]) {
    for (const [options, label] of [
      [[{ value: 1, label: '数组优先', variant: 'warning-light' }], '数组优先'],
      [[], '1'],
      [[{ value: 2, label: '其他选项' }], '1'],
    ]) {
      const columns = [{ prop: 'status', cellRenderTo: {
        name: 'west/cell-enhance',
        props: { type: 'badge', props: {
          dictName: 'system-status', options,
          optionProps: () => { throw new Error('数组模式不应解析字典项') },
        } },
      } }]
      const html = tableMarkup(h, columns, [{ id: 1, status: 1 }], pro)
      assert.ok(html.includes('>' + label + '</span>'))
      assert.doesNotMatch(html, /启用|dictName=|options=/)
    }
  }
})
