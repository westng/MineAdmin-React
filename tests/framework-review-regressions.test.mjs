import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement as h, createRef } from 'react'

const dom = new Window({
  url: 'http://admin.fixture.test/',
  settings: {
    disableCSSFileLoading: true,
    disableJavaScriptFileLoading: true,
    disableIframePageLoading: true,
  },
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
  'FormData',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom : dom[key] })
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom)
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom)
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  throw new Error('External requests are disabled in these tests')
}
const require = createRequire(import.meta.url)
const { createRoot } = require('react-dom/client')
const env = {}
const built = await build({
  stdin: {
    contents: `
    export { createAppRuntime } from './src/app/runtime/create-runtime'
    export { AppProviders } from './src/provider/app-provider'
    export { ToastContext } from './src/components/reui/toast-context'
    export { MaProTable } from './src/components/ma-pro-table'
    export { UserRoleDialog } from './src/modules/base/user/views/components/UserRoleDialog'
    export { VerifyCode } from './src/modules/base/login/views/components/verify-code'
    export { LoginForm } from './src/modules/base/login/views/components/login-form'
  `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  loader: { '.css': 'empty' },
  define: { 'import.meta.env': '__reviewEnv', 'import.meta.glob': '__reviewGlob', 'import.meta.hot': 'undefined' },
  banner: { js: 'const __reviewGlob = () => ({})' },
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', '__reviewEnv', built.outputFiles[0].text)(
  compiled,
  compiled.exports,
  require,
  env,
)
const core = compiled.exports
const envelope = (data, message = '') => ({ code: 200, data, message })
const tick = (milliseconds = 25) =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, milliseconds))
  })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const findButton = (text, scope = document) =>
  [...scope.querySelectorAll('button')].find(
    node => node.textContent.trim() === text || node.getAttribute('aria-label') === text,
  )
const click = async element => {
  assert.ok(element, 'Expected a clickable control')
  await act(async () => element.click())
}
const enter = async (input, value) => {
  assert.ok(input, 'Expected an input')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function fixture(t, handler) {
  const runtime = core.createAppRuntime({
    baseURL: 'http://admin.fixture.test',
    origin: 'http://admin.fixture.test',
    storage: { getItem: () => null, setItem() {}, removeItem() {} },
  })
  runtime.query.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
  runtime.session.setState({ token: 'synthetic-admin-token', permissions: ['*'], roles: ['SuperAdmin'] })
  const calls = [],
    notices = []
  runtime.http.defaults.adapter = async config => {
    const call = {
      config,
      url: config.url,
      method: config.method,
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    }
    calls.push(call)
    const data = await handler(call)
    return { config, status: 200, statusText: 'OK', headers: {}, data }
  }
  const toast = Object.assign(
    message => notices.push({ kind: 'success', message }),
    Object.fromEntries(
      ['success', 'error', 'warning', 'info'].map(kind => [kind, message => notices.push({ kind, message })]),
    ),
  )
  t.after(() => runtime.dispose())
  return {
    runtime,
    calls,
    notices,
    wrap: child => h(core.AppProviders, { runtime }, h(core.ToastContext.Provider, { value: { toast } }, child)),
  }
}

async function mount(t, element, context) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  await act(async () => root.render(context ? context.wrap(element) : element))
  await tick()
  return container
}

after(async () => {
  globalThis.fetch = originalFetch
  await dom.happyDOM.abort()
  dom.close()
})

for (const queryBacked of [false, true]) {
  test(`删除末页最后一条后，${queryBacked ? 'Query 后台刷新' : '独立请求'}同步回到有效页`, async t => {
    let rows = Array.from({ length: 11 }, (_, id) => ({ id: id + 1 }))
    const calls = []
    const api = async params => {
      calls.push(params.page)
      return {
        list: rows.slice((params.page - 1) * params.page_size, params.page * params.page_size),
        total: rows.length,
      }
    }
    const ctx = queryBacked
      ? fixture(t, () => {
          throw new Error('No HTTP expected')
        })
      : null
    const ref = createRef()
    await mount(
      t,
      h(core.MaProTable, {
        ref,
        schema: { tableColumns: [{ prop: 'id', label: 'ID' }] },
        options: {
          requestOptions: { api },
          tableOptions: { pagination: { currentPage: 2, pageSize: 10 }, showPagination: true },
        },
      }),
      ctx,
    )
    await tick()
    assert.deepEqual(calls, [2])
    rows = rows.slice(0, 10)
    await act(async () =>
      queryBacked
        ? ctx.runtime.query.invalidateQueries({ predicate: query => query.queryKey.includes('table') })
        : ref.current.refresh(),
    )
    await tick()
    await tick()
    assert.deepEqual(calls, [2, 2, 1])
    assert.equal(ref.current.getTableRef().getCurrentPage(), 1)
    assert.equal(ref.current.getElTableStates().data.length, 10)
    await act(async () => ref.current.refresh())
    assert.equal(calls.at(-1), 1)
  })
}

test('Query 表格显示普通接口错误，且参数转换异常不会被旧响应覆盖', async t => {
  let fail = false
  const ctx = fixture(t, () =>
    fail ? { code: 422, message: '筛选条件无效', data: null } : envelope({ list: [{ id: 1 }], total: 1 }),
  )
  const ref = createRef()
  await mount(
    t,
    h(core.MaProTable, {
      ref,
      schema: { tableColumns: [{ prop: 'id', label: 'ID' }] },
      options: {
        requestOptions: { api: params => ctx.runtime.http.get('/fixture/list', { params }) },
      },
    }),
    ctx,
  )
  fail = true
  await act(async () => ref.current.refresh())
  await tick()
  assert.match(document.querySelector('[role="alert"]').textContent, /筛选条件无效/)
  await act(async () =>
    ref.current.setProTableOptions({
      requestOptions: {
        paramsTransform: () => {
          throw new Error('参数转换失败')
        },
      },
    }),
  )
  await act(async () => ref.current.refresh())
  await tick()
  assert.match(document.querySelector('[role="alert"]').textContent, /参数转换失败/)
})

test('角色选择能访问第二页，搜索和保存保留原有的非首页角色', async t => {
  const roles = Array.from({ length: 41 }, (_, index) => ({
    id: index + 1,
    code: `role_${index + 1}`,
    name: `角色${index + 1}`,
  }))
  let saved
  const ctx = fixture(t, call => {
    if (call.url === '/admin/user/7/roles') {
      if (call.method === 'put') {
        saved = call.data.role_codes
        return envelope(null)
      }
      return envelope([roles[40]])
    }
    if (call.url === '/admin/role/list') {
      const params = call.config.params
      const selected = params.code
        ? roles.filter(role => params.code.includes(role.code))
        : roles.filter(role => !params.name || role.name.includes(params.name))
      const page = params.page ?? 1,
        size = params.page_size ?? 10
      return envelope({ list: selected.slice((page - 1) * size, page * size), total: selected.length })
    }
    throw new Error('Unexpected request: ' + call.url)
  })
  const ref = createRef()
  await mount(t, h(core.UserRoleDialog, { ref }), ctx)
  await act(async () => ref.current.open({ id: 7, username: 'fixture-user' }))
  await tick()
  await tick()
  assert.match(document.querySelector('[role="dialog"]').textContent, /角色41/)
  await click(document.querySelector('#roleCodes'))
  await tick()
  await act(async () =>
    document.querySelector('[role="listbox"]').dispatchEvent(new Event('scroll', { bubbles: true })),
  )
  await tick()
  assert.ok(ctx.calls.some(call => call.url === '/admin/role/list' && call.config.params.page === 2))
  await click(
    [...document.querySelectorAll('[role="option"]')].find(option => option.textContent.includes('role_25）')),
  )
  await enter(document.querySelector('input[placeholder="请输入关键词"]'), '角色39')
  await tick(280)
  assert.ok(ctx.calls.some(call => call.url === '/admin/role/list' && call.config.params.name === '角色39'))
  assert.match(document.querySelector('#roleCodes').textContent, /角色41/)
  await act(async () =>
    document
      .querySelector('input[placeholder="请输入关键词"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  await click(findButton('保存角色'))
  await tick()
  assert.deepEqual(new Set(saved), new Set(['role_41', 'role_25']))
})

test('验证码加载可取消旧请求，失败可重试且不保留旧挑战', async t => {
  const pending = []
  const ctx = fixture(t, call => {
    const request = deferred()
    pending.push({ ...request, signal: call.config.signal })
    return request.promise
  })
  const ref = createRef(),
    ready = []
  const container = await mount(t, h(core.VerifyCode, { ref, onReadyChange: value => ready.push(value) }), ctx)
  assert.equal(ref.current.getChallengeId(), null)
  await act(async () => ref.current.refresh())
  assert.equal(pending[0].signal.aborted, true)
  await act(async () =>
    pending[1].resolve(
      envelope({ captcha_id: 'b'.repeat(64), image: 'data:image/png;base64,aGVsbG8=', expires_in: 120 }),
    ),
  )
  await act(async () =>
    pending[0].resolve(envelope({ captcha_id: 'a'.repeat(64), image: 'data:image/png;base64,b2xk', expires_in: 120 })),
  )
  await tick()
  assert.equal(ref.current.getChallengeId(), 'b'.repeat(64))
  assert.equal(ready.at(-1), true)
  await act(async () => ref.current.refresh())
  await act(async () => pending[2].resolve({ code: 503, message: '验证码暂时不可用' }))
  await tick()
  assert.equal(ref.current.getChallengeId(), null)
  assert.match(container.textContent, /验证码暂时不可用/)
  assert.equal(findButton('刷新验证码', container).disabled, false)
})

test('登录提交服务端挑战，登录失败后清空答案并刷新挑战', async t => {
  let sequence = 0
  const submitted = []
  const ctx = fixture(t, call => {
    assert.equal(call.url, '/admin/passport/captcha')
    sequence += 1
    return envelope({
      captcha_id: String(sequence).repeat(64),
      image: 'data:image/png;base64,aGVsbG8=',
      expires_in: 120,
    })
  })
  const container = await mount(
    t,
    h(core.LoginForm, {
      onSubmit: async values => {
        submitted.push(values)
        throw { code: 422, message: '验证码已过期' }
      },
    }),
    ctx,
  )
  await tick()
  await enter(container.querySelector('[name="username"]'), 'fixture-user')
  await enter(container.querySelector('[name="password"]'), 'synthetic-password')
  await enter(container.querySelector('[name="code"]'), 'ABCD')
  await act(async () => container.querySelector('form').requestSubmit())
  await tick()
  assert.equal(submitted[0].captcha_id, '1'.repeat(64))
  assert.equal(submitted[0].code, 'ABCD')
  assert.equal(sequence, 2)
  assert.equal(container.querySelector('[name="code"]').value, '')
  assert.match(container.textContent, /验证码已过期/)
})
