import { runtimeExports, createRuntimeFixture } from './fixtures/runtime.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'

const dom = new Window({
  url: 'http://localhost',
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
})
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

const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const result = await build({
  stdin: {
    contents: [
      runtimeExports.replaceAll("'./src/", "'../src/"),
      "export { default as ConnectionPage } from '../src/modules/feishu/connection/views/index'",
      "export { setFixture, default as fixtureHttp } from 'connection-page-fixture'",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('.', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  plugins: [
    {
      name: 'connection-page-fixture',
      setup(builder) {
        builder.onResolve(
          {
            filter:
              /^(connection-page-fixture|@\/(provider\/http|hooks\/auth\/use-permission|components\/reui\/use-toast))$/,
          },
          () => ({ path: 'fixture', namespace: 'connection-page' }),
        )
        builder.onLoad({ filter: /.*/, namespace: 'connection-page' }, () => ({
          contents: `
        let fixture;
        export const setFixture = value => { fixture = value };
        export const hasAuth = permission => fixture.permissions.includes(permission);
        export const usePermission = () => ({ hasAuth });
        export const toast = Object.assign(message => fixture.messages.push(message), {
          success: message => fixture.messages.push(message), error: message => fixture.messages.push(message),
        });
        export const useToast = () => ({ toast });
        export default { get: (...args) => fixture.get(...args), delete: (...args) => fixture.delete(...args) };
      `,
        }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(compiled, compiled.exports, require)
const { ConnectionPage, setFixture } = compiled.exports

const response = data => ({ data: { code: 200, data } })
const connection = {
  id: 7,
  name: '测试主体',
  app_id: 'cli_example',
  app_secret_configured: true,
  tenant_key: null,
  remark: null,
  base_url: 'https://open.feishu.cn',
  redirect_uri: 'https://api.example.com/admin/passport/feishu/callback',
  status: 2,
  last_test_at: null,
  last_test_status: 1,
  last_test_error: null,
}

async function mount(
  t,
  { permissions = ['feishu:connection:list', 'feishu:connection:delete'], remove = async () => response(null) } = {},
) {
  let rows = [connection]
  const requests = []
  const messages = []
  setFixture({
    permissions,
    messages,
    get: async url => {
      assert.equal(url, '/admin/feishu/connection/list')
      requests.push({ method: 'get', url })
      return response({ list: rows, total: rows.length })
    },
    delete: async (url, options) => {
      requests.push({ method: 'delete', url, options })
      const result = await remove()
      rows = []
      return result
    },
  })
  const runtimeFixture = createRuntimeFixture(compiled.exports, compiled.exports.fixtureHttp)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    runtimeFixture.runtime.dispose()
    container.remove()
  })
  await act(async () => root.render(runtimeFixture.wrap(createElement(ConnectionPage))))
  return { container, requests, messages }
}

function button(container, label) {
  return [...container.querySelectorAll('button')].find(
    node => node.textContent.trim() === label || node.getAttribute('aria-label') === label,
  )
}

async function click(element) {
  assert.ok(element, '应找到目标控件')
  await act(async () => element.click())
}

after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

test('删除需确认，取消不发请求，确认后防重复提交并刷新列表', async t => {
  let finishDelete
  const deferred = new Promise(resolve => {
    finishDelete = resolve
  })
  const { container, requests, messages } = await mount(t, { remove: () => deferred })
  const deletions = () => requests.filter(request => request.method === 'delete')
  await click(button(container, '删除'))
  assert.match(document.querySelector('[role="dialog"]').textContent, /测试主体/)
  assert.equal(deletions().length, 0)
  await click(button(document.querySelector('[role="dialog"]'), '取消'))
  assert.equal(deletions().length, 0)
  assert.equal(document.querySelector('[role="dialog"]'), null)
  await click(button(container, '删除'))
  await click(button(document.querySelector('[role="dialog"]'), '确认删除'))
  assert.deepEqual(deletions(), [
    { method: 'delete', url: '/admin/feishu/connection/delete', options: { data: { ids: [7] } } },
  ])
  const dialog = document.querySelector('[role="dialog"]')
  assert.equal(button(dialog, '删除中…').disabled, true)
  assert.equal(button(dialog, '取消').disabled, true)
  await click(button(dialog, '删除中…'))
  assert.equal(deletions().length, 1)
  await act(async () => finishDelete(response(null)))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.doesNotMatch(container.querySelector('tbody').textContent, /测试主体/)
  assert.equal(requests.filter(request => request.method === 'get').length, 2)
  assert.deepEqual(messages, ['连接已删除'])
})

test('删除失败保留确认弹窗，用户可以重试', async t => {
  let attempts = 0
  const { container, messages } = await mount(t, {
    remove: async () => {
      attempts += 1
      if (attempts === 1) throw { message: '暂时无法删除连接' }
      return response(null)
    },
  })
  await click(button(container, '删除'))
  await click(button(document.querySelector('[role="dialog"]'), '确认删除'))
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.match(container.querySelector('tbody').textContent, /测试主体/)
  assert.deepEqual(messages, ['暂时无法删除连接'])
  await click(button(document.querySelector('[role="dialog"]'), '确认删除'))
  assert.equal(attempts, 2)
  assert.equal(document.querySelector('[role="dialog"]'), null)
})

test('没有删除权限时操作列不显示删除按钮', async t => {
  const { container, requests } = await mount(t, {
    permissions: ['feishu:connection:list', 'feishu:connection:update'],
  })
  assert.match(container.querySelector('tbody').textContent, /测试主体/)
  assert.ok(button(container, '编辑'))
  assert.equal(button(container, '删除'), undefined)
  assert.equal(
    requests.some(request => request.method === 'delete'),
    false,
  )
})
