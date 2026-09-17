import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement, StrictMode } from 'react'
const require = createRequire(import.meta.url)
const dom = new Window({ url: 'http://localhost', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true } })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLFormElement', 'Element', 'Node', 'DocumentFragment', 'MutationObserver', 'ResizeObserver', 'Event', 'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'FocusEvent', 'CustomEvent', 'DOMRect', 'ShadowRoot']) Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = require('react-dom/client')
const requests = []; const notices = []
const hasImportExport = existsSync(new URL('../src/plugins/west/importExportPro/components/ImportExportToolbar.tsx', import.meta.url))
const hasMarketing = existsSync(new URL('../src/modules/marketing/schedule/utils/schedule-form.ts', import.meta.url))
const result = await build({
  stdin: { contents: `export { default as UserPage } from './src/modules/base/permission/user/views/components/permission-user-page'; export { default as RolePage } from './src/modules/base/permission/role/views/components/permission-role-page'; ${hasImportExport ? "export { default as Toolbar } from './src/plugins/west/importExportPro/components/ImportExportToolbar'; export * from './src/plugins/west/importExportPro/utils';" : ''} export * from './src/hooks/use-file-upload'; export * from './src/router/access'; export * from './src/router/dynamic-menu'; export * from './src/router/lazy-view'; ${hasMarketing ? "export * from './src/modules/marketing/schedule/utils/schedule-form'; export { emptyForm } from './src/modules/marketing/schedule/views/data';" : ''}`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'boundary-doubles', setup(builder) {
    builder.onResolve({ filter: /^@\/(utils\/http|provider\/dictionary|components\/common\/use-toast|layouts\/components\/bars\/toolbar\/use-header-actions)$/ }, args => ({ path: args.path, namespace: 'double' }))
    builder.onResolve({ filter: /^(\.\/UserProTable|\.\/RoleProTable)$/ }, args => ({ path: args.path, namespace: 'double' }))
    builder.onLoad({ filter: /.*/, namespace: 'double' }, args => {
      let contents
      if (args.path.endsWith('/http')) contents = `export default globalThis.__boundaryHttp`
      else if (args.path.endsWith('use-toast')) contents = `export const useToast = () => ({ toast: (...args) => globalThis.__boundaryNotices.push(args) })`
      else if (args.path.endsWith('dictionary')) contents = `export const useDictStore = fn => fn({ t: (_type, value) => value })`
      else if (args.path.endsWith('use-header-actions')) contents = `export const useHeaderActions = () => {}`
      else contents = `import { createElement } from 'react'; export default function Table(props) { return createElement('div', null, ...[1,2].map(id => createElement('button', { key: id, onClick: () => (props.onOpenRoles || props.onPermissions)({ id, username: '对象'+id, name: '对象'+id }) }, '打开'+id))) }`
      return { contents, loader: 'js', resolveDir: process.cwd() }
    })
  } }],
})
globalThis.__boundaryNotices = notices
globalThis.__boundaryHttp = Object.fromEntries(['get', 'post', 'put', 'delete'].map(method => [method, (url, data) => {
  if (/department|position/.test(url)) return Promise.resolve({ data: { code: 200, data: [] } })
  return new Promise((resolve, reject) => requests.push({ method, url, data, resolve: value => resolve({ data: { code: 200, data: value } }), blob: data => resolve({ data }), reject }))
}]))
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const h = module.exports
async function mount(t, Component, props = {}, strict = false) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container)
  const unmount = async () => { await act(async () => root.unmount()); container.remove() }
  t.after(unmount)
  await act(async () => root.render(strict ? createElement(StrictMode, null, createElement(Component, props)) : createElement(Component, props)))
  return { container, unmount }
}
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text)
const click = async element => { assert.ok(element); await act(async () => element.click()) }
const take = part => { const index = requests.findIndex(item => item.url.includes(part)); assert.ok(index >= 0, part); return requests.splice(index, 1)[0] }
after(async () => { await dom.happyDOM.abort(); dom.close() })

for (const [name, Page, listUrl, detailSuffix, saveLabel, list, detail] of [
  ['用户角色', h.UserPage, '/role/list', '/roles', '保存角色', [{ code: 'A', name: 'A角色' }, { code: 'B', name: 'B角色' }], id => [{ code: id === 1 ? 'A' : 'B' }]],
  ['角色权限', h.RolePage, '/menu', '/permissions', '保存权限', [{ id: 1, name: 'A', meta: { title: 'A权限' } }, { id: 2, name: 'B', meta: { title: 'B权限' } }], id => [{ name: id === 1 ? 'A' : 'B' }]],
]) {
  test(`${name}：A/B 响应倒序、失败禁止保存、重复提交及关闭保护`, async t => {
    requests.length = 0
    const view = await mount(t, Page)
    await click(button('打开1')); const listA = take(listUrl); const dataA = take('/1' + detailSuffix)
    assert.equal(button(saveLabel).disabled, true)
    await click(button('取消')); await click(button('打开2')); const listB = take(listUrl); const dataB = take('/2' + detailSuffix)
    await act(async () => { listB.resolve(list); dataB.resolve(detail(2)) })
    await act(async () => { listA.resolve(list); dataA.resolve(detail(1)) })
    assert.equal(button(saveLabel).disabled, false)
    const selected = [...document.querySelectorAll('[role="checkbox"]')].filter(node => node.getAttribute('aria-checked') === 'true')
    assert.equal(selected.length, 1); assert.match(selected[0].parentElement.textContent, /B/)
    const save = button(saveLabel)
    await act(async () => { save.click(); save.click() })
    const write = take('/2' + detailSuffix); assert.equal(write.method, 'put'); assert.deepEqual(Object.values(write.data)[0], ['B'])
    assert.equal(requests.filter(r => r.method === 'put').length, 0)
    await click(button('打开1')); assert.equal(requests.length, 0)
    await act(async () => write.reject(new Error('保存失败')))
    assert.ok(button(saveLabel)); await click(button('取消'))
    await click(button('打开1')); const failedList = take(listUrl); const failedData = take('/1' + detailSuffix)
    await act(async () => { failedList.resolve(list); failedData.reject(new Error('加载失败')) })
    assert.equal(button(saveLabel).disabled, true)
    await click(button('取消')); await click(button('打开2')); const lastList = take(listUrl); const lastData = take('/2' + detailSuffix)
    await click(button('取消')); await act(async () => { lastList.resolve(list); lastData.resolve(detail(2)) })
    assert.equal(button(saveLabel), undefined); assert.ok(view.container)
  })
}

test('路由匹配遵循精确/参数优先级，并合并动态父级限制', () => {
  const state = { roles: [], permissions: [], userInfo: { username: '普通用户' } }
  const dynamic = h.flattenMenuRoutes([{ path: '/parent', meta: { permission: 'parent' }, children: [{ path: '/parent/:id', meta: { permission: 'child' } }] }]).map(({ menu, accessMeta }) => ({ name: menu.path, path: menu.path, accessMeta }))
  const routes = [{ name: 'root', path: '/', children: [{ name: 'fallback', path: '*', meta: { hidden: true } }, { name: 'plugin-list', path: 'plugin' }, { name: 'plugin-edit', path: 'plugin/:id', meta: { permission: 'edit' } }, { name: 'specific', path: 'plugin/public' }, ...dynamic] }]
  assert.equal(h.hasMatchedRouteAccess(routes, '/plugin/1', state), false)
  assert.equal(h.hasMatchedRouteAccess(routes, '/plugin/public', state), true)
  assert.equal(h.hasMatchedRouteAccess(routes, '/parent/1', { ...state, permissions: ['child'] }), false)
  assert.equal(h.hasMatchedRouteAccess(routes, '/parent/1', { ...state, permissions: ['parent', 'child'] }), true)
  assert.equal(h.hasMatchedRouteAccess(routes, '/missing', state), true)
})

test('懒加载失败显示恢复入口，重试重新执行 loader', async t => {
  let tries = 0
  const Lazy = h.lazyView(async () => { if (++tries === 1) throw new Error('模拟分包失败'); return { default: () => createElement('p', null, '恢复成功') } }, '测试页面')
  const errors = []; const original = console.error; console.error = (...args) => errors.push(args)
  t.after(() => { console.error = original })
  const view = await mount(t, Lazy)
  assert.match(view.container.textContent, /加载失败/); assert.equal(tries, 1)
  await click(button('重试')); assert.equal(tries, 2); assert.match(view.container.textContent, /恢复成功/)
})

test('上传批次去重、同一事件连续添加、StrictMode 回调与 URL 释放平衡', async t => {
  const created = []; const revoked = []; const originalCreate = URL.createObjectURL; const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = file => { const url = `blob:${created.length}-${file.name}`; created.push(url); return url }
  URL.revokeObjectURL = url => revoked.push(url)
  t.after(() => { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke })
  let state; let actions; const changes = []; const errors = []
  const Probe = () => { [state, actions] = h.useFileUpload({ multiple: true, maxFiles: 3, maxSize: 2, onFilesChange: files => changes.push(files), onError: value => errors.push(value) }); return null }
  const view = await mount(t, Probe, {}, true)
  const file = name => new File(['x'], name)
  await act(async () => actions.addFiles([file('A')]))
  await act(async () => { actions.addFiles([file('B'), file('A'), file('C'), file('C')]); actions.addFiles([file('D')]) })
  assert.deepEqual(state.files.map(item => item.file.name), ['A', 'B', 'C']); assert.equal(created.length, 3); assert.equal(changes.length, 2); assert.equal(errors.length, 1)
  await act(async () => actions.removeFile(state.files[0].id)); assert.equal(revoked.length, 1)
  await act(async () => actions.clearFiles()); assert.equal(revoked.length, 3)
  await act(async () => actions.addFiles([file('E')])); await view.unmount()
  assert.deepEqual(revoked.sort(), created.sort()); assert.equal(changes.length, 5)
})

test('单文件模式只保留一项，无效替换保留原文件', async t => {
  let state; let actions
  const Probe = () => { [state, actions] = h.useFileUpload({ maxSize: 2 }); return null }
  await mount(t, Probe)
  await act(async () => actions.addFiles([new File(['a'], 'A'), new File(['b'], 'B')]))
  assert.equal(state.files.length, 1); assert.equal(state.files[0].file.name, 'A')
  await act(async () => actions.addFiles([new File(['too big'], 'C')]))
  assert.equal(state.files[0].file.name, 'A'); assert.equal(state.errors.length, 1)
})

test('导出失败保留抽屉和参数，成功才关闭；非表格页面支持显式查询提供者', { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' }, async t => {
  requests.length = 0
  const table = { current: { getRequestParams: () => ({ status: 2, keyword: '已应用' }) } }
  await mount(t, h.Toolbar, { tableRef: table, permissions: { import: false }, options: { importExportPro: { api: { list: '/records/list' }, getRequestParams: () => ({ range_start: '2026-09-01', keyword: '日程条件' }) } } })
  await click(button('导出')); await act(async () => take('/exportFields').resolve([{ key: 'name', label: '名称' }]))
  await click(button('开始导出')); const failed = take('/export'); assert.equal(failed.data.keyword, '日程条件'); assert.equal(failed.data.range_start, '2026-09-01')
  await act(async () => failed.reject(new Error('导出失败'))); assert.ok(button('开始导出'))
  await click(button('开始导出')); const success = take('/export'); assert.deepEqual(success.data, failed.data)
  await act(async () => success.resolve({ id: 1 })); assert.equal(button('开始导出'), undefined)
})

test('Blob 中业务失败不作为成功文件保存，接口地址仅取显式配置', { skip: !hasImportExport && '当前仓库未安装本地导入导出插件' }, async () => {
  await assert.rejects(h.ensureDownload(new Blob([JSON.stringify({ code: 422, message: '筛选错误' })], { type: 'application/json' })), /筛选错误/)
  await assert.rejects(h.ensureDownload(new Blob([])), /为空/)
  await h.ensureDownload(new Blob(['a,b'], { type: 'text/csv' }))
  assert.equal(h.resolveListUrl(() => '/admin/list'), undefined); assert.equal(h.resolveListUrl(' /admin/list '), '/admin/list')
})

test('营销数值拒绝非法范围/精度，空白转 null 并保持业务字段隔离', { skip: !hasMarketing && '当前仓库未包含营销业务模块' }, () => {
  const base = { ...h.emptyForm(), marketing_name: '活动', business_type: 'seeding', campaign_start_at: '2026-09-17T08:00', campaign_end_at: '2026-09-17T10:00' }
  for (const [key, value] of [['exposure_count', '-1'], ['exposure_count', '1.5'], ['quotation_amount', 'NaN'], ['a3', 'Infinity'], ['cpm', '1.234'], ['quotation_amount', '1e3'], ['exposure_count', '9007199254740992']]) assert.ok(h.validateScheduleForm({ ...base, [key]: value }), `${key}=${value}`)
  const sales = { ...base, business_type: 'affiliate_live', online_commission_rate: '100.01' }
  assert.ok(h.validateScheduleForm(sales)); assert.throws(() => h.scheduleFormPayload(sales, true))
  const payload = h.scheduleFormPayload({ ...base, exposure_count: ' ', quotation_amount: ' 0.00 ', cpm: ' ', online_commission_rate: '101' }, true)
  assert.equal(payload.exposure_count, null); assert.equal(payload.quotation_amount, '0.00'); assert.equal(payload.cpm, null); assert.equal('online_commission_rate' in payload, false)
})
