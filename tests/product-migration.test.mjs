import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'

const dom = new Window({ url: 'http://localhost' })
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'Element',
  'Node',
  'MutationObserver',
  'Event',
  'MouseEvent',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const productId = '9876543210987654321'
const source = { shopId: '101', productId }
const target = { shop_id: '202', shop_name: '目标店铺' }
const response = data => ({ data: { code: 200, data } })
const fixture = {
  product: { id: 1, shop_id: source.shopId, product_id: productId, name: '迁移测试商品' },
  allowed: true,
  forms: new Map(),
  tables: [],
  calls: [],
  messages: [],
  get: async () => response({ list: [target], total: 1 }),
  freight: async () => response({ List: [{ template: { id: '301', template_name: '目标店铺模板' } }] }),
  create: async () => response(null),
}
const bundled = await build({
  stdin: {
    contents: [
      "export { default as ProductListPage } from './src/modules/product/product-list/views/index'",
      "export * from './src/modules/product/migration/utils/single-product'",
      "export * from './src/modules/product/migration/api/single-product'",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  plugins: [
    {
      name: 'migration-fixtures',
      setup(build) {
        const sources = {
          http: `export default {
          get: (url, config) => { fixture.calls.push({url, config}); return fixture.get(url, config) },
          post: (url, data) => { fixture.calls.push({url, data}); return url.endsWith('/freightTemplateList') ? fixture.freight(data) : fixture.create(data) },
        }`,
          toast:
            'const toast = (...args) => fixture.messages.push(args); export function useToast() { return { toast } }',
          permission: 'export function usePermission() { return { hasAuth: () => fixture.allowed } }',
          table: `import { createElement } from 'react'
          export function MaProTable(props) {
            fixture.tables.push(props)
            fixture.table = props
            const actions = props.schema.tableColumns.find(column => column.type === 'operation').operationConfigure.actions
            return createElement('div', null, actions.filter(action => action.show?.() !== false).map(action => createElement('button', {
              key: action.name, onClick: () => action.onClick({row: fixture.product}),
            }, action.text)))
          }`,
          form: `import { createElement, useImperativeHandle } from 'react'
          export function MaForm(props) {
            const key = props.items[0].prop === 'shop_ids' ? 'selection' : 'target'
            fixture.forms.set(key, props)
            useImperativeHandle(props.ref, () => ({ validate: async () => {
              const valid = props.items.every(item => (item.itemProps?.rules ?? []).every(rule => {
                const value = props.modelValue[item.prop]
                if (rule.required && (!value || (Array.isArray(value) && !value.length))) return false
                return !rule.pattern || rule.pattern.test(String(value))
              }))
              return { valid, errors: {} }
            } }), [props])
            return createElement('div', {'data-form': key})
          }`,
          drawer: `import { createElement } from 'react'
          export function MaDrawer(props) { fixture.drawer = props; return createElement('div', {role:'dialog'}, props.title, props.open ? props.children : null, props.footer) }`,
          dialog:
            'export function Dialog() { return null }; export function DialogContent() {}; export function DialogFooter() {}; export function DialogHeader() {}; export function DialogTitle() {}; export function DialogDescription() {}',
          product:
            "import { createElement } from 'react'; export function ProductInfoCell(props) { return createElement('div', null, props.name, props.description) }",
          button:
            "import { createElement } from 'react'; export function Button({variant, size, children, ...props}) { return createElement('button', props, children) }",
        }
        for (const [filter, path] of [
          [/^@\/provider\/http$/, 'http'],
          [/^@\/components\/reui\/use-toast$/, 'toast'],
          [/^@\/hooks\/framework\/use-permission$/, 'permission'],
          [/^@\/components\/ma-pro-table$/, 'table'],
          [/^@\/components\/ma-form$/, 'form'],
          [/^@\/components\/ma-drawer$/, 'drawer'],
          [/^@\/components\/reui\/primitives\/dialog$/, 'dialog'],
          [/^@\/components\/reui\/primitives\/button$/, 'button'],
          [/^\$\/west\/cell-enhance$/, 'product'],
        ])
          build.onResolve({ filter }, () => ({ path, namespace: 'migration-fixture' }))
        build.onLoad({ filter: /.*/, namespace: 'migration-fixture' }, args => ({
          contents: sources[args.path],
          resolveDir: fileURLToPath(new URL('../', import.meta.url)),
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', 'fixture', bundled.outputFiles[0].text)(
  compiled,
  compiled.exports,
  require,
  fixture,
)
const { ProductListPage, getMigrationSource, buildSingleProductMigration, loadMigrationShops, loadFreightTemplates } =
  compiled.exports
const task = { mobile: '13800138000', freight_id: '301' }
let root
let container
async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}
async function renderPage() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(createElement(ProductListPage)))
}
function button(text) {
  return [...container.querySelectorAll('button')].find(item => item.textContent === text)
}
async function click(text) {
  const element = button(text)
  assert.ok(element, `missing button: ${text}`)
  await act(async () => element.click())
  await settle()
}
async function configureTarget() {
  await click('迁移')
  await act(async () => fixture.forms.get('selection').onModelValueChange({ shop_ids: [target.shop_id] }))
  await settle()
  await act(async () => fixture.forms.get('target').onModelValueChange(task))
}
function submissions() {
  return fixture.calls.filter(call => call.url === '/admin/migration/task/create')
}
beforeEach(async () => {
  if (root) await act(async () => root.unmount())
  container?.remove()
  root = null
  fixture.allowed = true
  fixture.forms.clear()
  fixture.tables.length = 0
  fixture.calls.length = 0
  fixture.messages.length = 0
  fixture.get = async () => response({ list: [target], total: 1 })
  fixture.freight = async () => response({ List: [{ template: { id: '301', template_name: '目标店铺模板' } }] })
  fixture.create = async () => response(null)
})
after(async () => {
  if (root) await act(async () => root.unmount())
  dom.happyDOM.cancelAsync()
})

test('单商品 payload 保留长 ID、按店铺携带参数并去重', () => {
  const parsed = getMigrationSource({ shop_id: 101, product_id: productId })
  assert.deepEqual(parsed, source)
  assert.deepEqual(buildSingleProductMigration(parsed, [target, target], { 202: task }), {
    original_shop_id: '101',
    product_ids: [productId],
    status: 0,
    shop_list: [{ ...target, selected: true, task }],
  })
  assert.throws(() => getMigrationSource({ shop_id: 101, product_id: Number(productId) }), /ID 无效/)
})

test('拦截无目标、同源店铺、无效电话和无效运费模板', () => {
  assert.throws(() => buildSingleProductMigration(source, [], {}), /请选择目标店铺/)
  assert.throws(
    () => buildSingleProductMigration(source, [{ shop_id: '101', shop_name: '源店铺' }], {}),
    /不能与源店铺相同/,
  )
  assert.throws(() => buildSingleProductMigration(source, [target], { 202: { ...task, mobile: '' } }), /客服电话/)
  assert.throws(
    () => buildSingleProductMigration(source, [target], { 202: { ...task, freight_id: '1e3' } }),
    /运费模板/,
  )
})

test('目标店铺分页加载并排除源店铺', async () => {
  fixture.get = async (_url, config) =>
    response(
      config.params.page === 1
        ? { list: [{ shop_id: 101 }, target], total: 3 }
        : { list: [{ shop_id: '303', shop_name: '第二家' }], total: 3 },
    )
  assert.deepEqual(await loadMigrationShops('101'), [target, { shop_id: '303', shop_name: '第二家' }])
  assert.deepEqual(
    fixture.calls.map(call => call.config.params.page),
    [1, 2],
  )
})

test('运费模板绑定目标店铺并完整翻页', async () => {
  fixture.freight = async data =>
    response({
      List:
        data.page === 1
          ? Array.from({ length: 100 }, (_, index) => ({
              template: { id: String(index + 1), template_name: `模板${index}` },
            }))
          : [{ template: { id: productId, template_name: '长 ID 模板' } }],
    })
  const templates = await loadFreightTemplates('202')
  assert.equal(templates.length, 101)
  assert.equal(templates.at(-1).value, productId)
  assert.deepEqual(
    fixture.calls.map(call => call.data),
    [
      { shop_id: '202', page: 1, size: 100 },
      { shop_id: '202', page: 2, size: 100 },
    ],
  )
})

test('迁移按钮打开当前商品抽屉，提交仅包含该商品', async () => {
  await renderPage()
  const productTable = fixture.tables.find(
    table => table.schema.tableColumns.find(column => column.type === 'operation')?.fixed === 'right',
  )
  assert.ok(productTable)
  assert.equal(productTable.schema.tableColumns[0].type, 'selection')
  assert.equal(productTable.options.tableOptions.dataGridProps.tableLayout.columnsPinnable, true)
  await configureTarget()
  assert.match(container.textContent, new RegExp(productId))
  await click('提交迁移')
  assert.deepEqual(submissions()[0].data, buildSingleProductMigration(source, [target], { 202: task }))
  assert.equal(container.querySelector('[role=dialog]'), null)
  assert.match(fixture.messages.at(-1)[0], /迁移任务已提交/)
})

test('不填写客服电话时禁止创建任务', async () => {
  await renderPage()
  await configureTarget()
  await act(async () => fixture.forms.get('target').onModelValueChange({ mobile: '', freight_id: '0' }))
  await click('提交迁移')
  assert.equal(submissions().length, 0)
  assert.ok(container.querySelector('[role=dialog]'))
})

test('重复点击只提交一次，提交中阻止关闭，失败后保留配置并允许重试', async () => {
  let reject
  fixture.create = () =>
    new Promise((_resolve, rejectPromise) => {
      reject = rejectPromise
    })
  await renderPage()
  await configureTarget()
  const submit = button('提交迁移')
  await act(async () => {
    submit.click()
    submit.click()
  })
  await settle()
  assert.equal(submissions().length, 1)
  let cancelled = false
  fixture.drawer.onOpenChange(false, {
    cancel: () => {
      cancelled = true
    },
  })
  assert.equal(cancelled, true)
  await act(async () => reject({ message: '任务队列暂不可用' }))
  await settle()
  assert.match(fixture.messages.at(-1)[0], /任务队列暂不可用/)
  assert.deepEqual(fixture.forms.get('target').modelValue, task)
  fixture.create = async () => response(null)
  await click('提交迁移')
  assert.equal(submissions().length, 2)
  assert.equal(container.querySelector('[role=dialog]'), null)
})

test('运费加载失败不会提交，重试后使用该店铺模板', async () => {
  fixture.freight = async () => {
    throw { message: '模板接口失败' }
  }
  await renderPage()
  await configureTarget()
  assert.match(container.textContent, /模板接口失败/)
  await click('提交迁移')
  assert.equal(submissions().length, 0)
  fixture.freight = async () => response({ List: [{ template: { id: '301', template_name: '恢复后的模板' } }] })
  await click('重试')
  await click('提交迁移')
  assert.equal(submissions().length, 1)
})

test('关闭再打开时清空配置，过期的店铺响应不覆盖新抽屉', async () => {
  let resolveOld
  fixture.get = () =>
    new Promise(resolve => {
      resolveOld = resolve
    })
  await renderPage()
  await click('迁移')
  await click('取消')
  fixture.get = async () => response({ list: [target], total: 1 })
  await click('迁移')
  await act(async () => resolveOld(response({ list: [{ shop_id: '999', shop_name: '过期店铺' }], total: 1 })))
  await settle()
  assert.deepEqual(
    fixture.forms.get('selection').items[0].renderProps.options.map(option => option.value),
    ['202'],
  )
  assert.deepEqual(fixture.forms.get('selection').modelValue, { shop_ids: [] })
})

test('无创建权限时不提供迁移操作', async () => {
  fixture.allowed = false
  await renderPage()
  assert.equal(button('迁移'), undefined)
  assert.equal(submissions().length, 0)
})
