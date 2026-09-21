import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement, useState } from 'react'

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
const homepage = 'https://www.douyin.com/user/MS4wLjABAAAA-test_id'
const user = {
  uid: '9876543210987654321',
  nickname: '测试达人',
  avatar_thumb: { url_list: ['https://images.example.test/avatar.png'] },
  follower_count: 42,
}
const success = (profile = user) => ({ data: { code: 200, data: { user: profile } } })
const calls = []
const messages = []
let respond
const fixture = {
  env: {},
  table: null,
  toast: () => {},
  http: {
    get: (url, config) => {
      calls.push({ method: 'get', url, config })
      return respond(url, config)
    },
    post: async (url, data) => {
      calls.push({ method: 'post', url, data })
      return { data: { code: 200 } }
    },
  },
}
window.addEventListener('mine:message', event => messages.push(event.detail))

const hasAllocation = existsSync(
  new URL('../src/modules/creator/allocation/views/components/CreatorAllocationForm.tsx', import.meta.url),
)
const hasCommission = existsSync(new URL('../src/modules/data/offline-commission/views/index.tsx', import.meta.url))
const result = await build({
  stdin: {
    contents: [
      "export * from './src/modules/creator/components/nm-douyin-user-parser'",
      "export * from './src/modules/creator/components/nm-douyin-user-parser/utils/parser'",
      "export * from './src/modules/creator/components/nm-douyin-user-parser/api/douyin-user'",
      hasAllocation ? "export * from './src/modules/creator/allocation/views/components/CreatorAllocationForm'" : '',
      hasCommission
        ? "export { default as OfflineCommissionPage } from './src/modules/data/offline-commission/views'"
        : '',
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  define: { 'import.meta.env': '__douyinFixture.env' },
  plugins: [
    {
      name: 'douyin-form-fixtures',
      setup(build) {
        const sources = {
          http: 'export default __douyinFixture.http',
          toast: 'export function useToast() { return { toast: __douyinFixture.toast } }',
          table: 'export function MaProTable(props) { __douyinFixture.table = props; return props.toolbarLeft }',
          options: `const options = { users: [{ value: '7', label: '测试商务' }], categories: [{ value: 'category', label: '测试渠道' }], loading: false, error: '', reload() {} }; export function useAllocationOptions() { return options }`,
        }
        build.onResolve({ filter: /^@\/provider\/http$/ }, () => ({ path: 'http', namespace: 'douyin-fixture' }))
        build.onResolve({ filter: /^@\/components\/reui\/use-toast$/ }, () => ({
          path: 'toast',
          namespace: 'douyin-fixture',
        }))
        build.onResolve({ filter: /^@\/components\/ma-pro-table$/ }, () => ({
          path: 'table',
          namespace: 'douyin-fixture',
        }))
        build.onResolve({ filter: /\/hooks\/use-allocation-options$/ }, () => ({
          path: 'options',
          namespace: 'douyin-fixture',
        }))
        build.onLoad({ filter: /.*/, namespace: 'douyin-fixture' }, args => ({ contents: sources[args.path] }))
      },
    },
  ],
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', '__douyinFixture', result.outputFiles[0].text)(
  compiled,
  compiled.exports,
  require,
  fixture,
)
const {
  NmDouyinUserParser,
  extractSecUserId,
  normalizeDouyinUser,
  getDouyinUserProfile,
  CreatorAllocationForm,
  OfflineCommissionPage,
} = compiled.exports

beforeEach(() => {
  calls.length = 0
  messages.length = 0
  fixture.env = { VITE_APP_API_THIRDURL: 'https://profile.example.test/' }
  respond = async () => success()
})
after(async () => {
  await dom.happyDOM.abort()
  dom.close()
})

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

async function mount(t, component, props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let mounted = true
  const render = async nextProps => {
    await act(async () => root.render(createElement(component, nextProps)))
  }
  const unmount = async () => {
    if (mounted) {
      await act(async () => root.unmount())
      container.remove()
      mounted = false
    }
  }
  t.after(unmount)
  await render(props)
  return { container, render, unmount }
}

function button(container, text) {
  const element = [...container.querySelectorAll('button')].find(node => node.textContent === text)
  assert.ok(element, `应找到“${text}”按钮`)
  return element
}

async function click(element) {
  await act(async () => element.click())
}
async function enterValue(input, value) {
  assert.ok(input, '应找到输入控件')
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new dom.Event('input', { bubbles: true }))
  })
}

test('主页链接支持查询参数、锚点、分享文字和无协议地址', () => {
  for (const link of [
    homepage,
    `  ${homepage}/?from=share#profile  `,
    homepage.replace('https://', ''),
    `分享达人主页：${homepage}，打开查看`,
  ]) {
    assert.equal(extractSecUserId(link), 'MS4wLjABAAAA-test_id')
  }
  assert.throws(() => extractSecUserId(' '), /请输入抖音用户主页链接/)
  for (const link of [
    'https://notdouyin.com/user/test',
    'https://douyin.com.example.test/user/test',
    'https://www.douyin.com/video/123',
    'https://www.douyin.com/user/',
    'https://example.test@www.douyin.com/user/test',
  ]) {
    assert.throws(() => extractSecUserId(link), /正确的抖音用户主页链接/)
  }
  assert.throws(() => extractSecUserId('https://v.douyin.com/abc123/'), /暂不支持短链接/)
})

test('用户数据保留长 UID 和扩展字段，头像缺失与异常 UID 有明确处理', () => {
  assert.deepEqual(normalizeDouyinUser(user), user)
  assert.equal(normalizeDouyinUser({ uid: 123 }).uid, '123')
  assert.equal(normalizeDouyinUser({ uid: '123' }).nickname, '')
  assert.equal(normalizeDouyinUser({ uid: '123', avatar_thumb: null }).avatar_thumb, undefined)
  assert.deepEqual(normalizeDouyinUser({ uid: '123', avatar_thumb: { url_list: null } }).avatar_thumb.url_list, [])
  for (const value of [undefined, null, {}, { uid: '' }])
    assert.throws(() => normalizeDouyinUser(value), /未获取到用户 UID/)
  for (const uid of [0, -1, 'abc', {}, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => normalizeDouyinUser({ uid }), /UID 格式无效/)
})

test('API 沿用旧服务的路径、参数、响应契约和可取消请求', async () => {
  const controller = new AbortController()
  assert.deepEqual(await getDouyinUserProfile('test_id', controller.signal), user)
  assert.equal(calls[0].url, 'https://profile.example.test/api/douyin/web/handler_user_profile')
  assert.deepEqual(calls[0].config.params, { sec_user_id: 'test_id' })
  assert.equal(calls[0].config.signal, controller.signal)
  assert.equal(calls[0].config.timeout, 10000)
  respond = async () => ({ data: { code: 500, message: '达人信息获取失败' } })
  await assert.rejects(getDouyinUserProfile('test_id'), /达人信息获取失败/)
  fixture.env = {}
  const count = calls.length
  await assert.rejects(getDouyinUserProfile('test_id'), /服务未配置/)
  assert.equal(calls.length, count)
})

test('输入框、解析和清空独立排列，使用 ReUI 输入框和按钮', async t => {
  const { container } = await mount(t, NmDouyinUserParser)
  const group = container.querySelector('[role="group"][aria-label="抖音用户解析"]')
  assert.ok(group)
  assert.equal(container.querySelector('[data-slot="button-group"]'), null)
  assert.deepEqual(
    [...group.children].map(element => element.tagName),
    ['INPUT', 'BUTTON', 'BUTTON'],
  )
  assert.deepEqual(
    [...group.querySelectorAll('button')].map(element => element.textContent),
    ['解析', '清空'],
  )
  assert.equal(group.querySelector('[data-slot="input-group-addon"]'), null)
})

test('空值和无效链接不会发送请求，输入和清空支持受控值', async t => {
  const changes = []
  function ControlledInput() {
    const [value, setValue] = useState('')
    return createElement(NmDouyinUserParser, {
      value,
      onChange: next => {
        changes.push(next)
        setValue(next)
      },
    })
  }
  const { container } = await mount(t, ControlledInput)
  await click(button(container, '解析'))
  assert.match(messages.at(-1).message, /请输入抖音用户主页链接/)
  await enterValue(container.querySelector('input'), '无效链接')
  await click(button(container, '解析'))
  assert.equal(calls.length, 0)
  await click(button(container, '清空'))
  assert.equal(container.querySelector('input').value, '')
  assert.deepEqual(changes, ['无效链接', ''])
})

test('请求中防重复点击，成功后回调完整用户信息并恢复按钮', async t => {
  const request = deferred()
  respond = () => request.promise
  const parsed = []
  const { container } = await mount(t, NmDouyinUserParser, {
    defaultValue: homepage,
    dataHandle: value => parsed.push(value),
  })
  const parseButton = button(container, '解析')
  await act(async () => {
    parseButton.click()
    parseButton.click()
  })
  assert.equal(calls.length, 1)
  assert.equal(button(container, '解析中…').disabled, true)
  await act(async () => request.resolve(success()))
  assert.deepEqual(parsed, [user])
  assert.equal(button(container, '解析').disabled, false)
  assert.equal(messages.at(-1).level, 'success')
})

test('解析回车不会提交外层表单，中文输入法确认不会触发解析', async t => {
  let submits = 0
  function Form() {
    return createElement(
      'form',
      {
        onSubmit: event => {
          event.preventDefault()
          submits++
        },
      },
      createElement(NmDouyinUserParser, { defaultValue: homepage }),
    )
  }
  const { container } = await mount(t, Form)
  const input = container.querySelector('input')
  await act(async () =>
    input.dispatchEvent(
      new dom.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }),
    ),
  )
  assert.equal(calls.length, 0)
  const event = new dom.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  await act(async () => input.dispatchEvent(event))
  assert.equal(event.defaultPrevented, true)
  assert.equal(calls.length, 1)
  assert.equal(submits, 0)
  assert.equal(button(container, '解析').type, 'button')
  assert.equal(button(container, '清空').type, 'button')
})

test('清空后可重新解析，迟到的旧响应不会覆盖新结果或加载状态', async t => {
  const oldRequest = deferred()
  const newRequest = deferred()
  respond = () => (calls.length === 1 ? oldRequest.promise : newRequest.promise)
  const parsed = []
  const { container } = await mount(t, NmDouyinUserParser, {
    defaultValue: homepage,
    dataHandle: value => parsed.push(value),
  })
  await click(button(container, '解析'))
  await click(button(container, '清空'))
  assert.equal(calls[0].config.signal.aborted, true)
  assert.equal(container.querySelector('input').value, '')
  await enterValue(container.querySelector('input'), 'https://www.douyin.com/user/new_user')
  await click(button(container, '解析'))
  await act(async () => oldRequest.resolve(success()))
  assert.deepEqual(parsed, [])
  assert.equal(button(container, '解析中…').disabled, true)
  await act(async () => newRequest.resolve(success({ ...user, uid: '123', nickname: '新达人' })))
  assert.equal(parsed[0].nickname, '新达人')
  assert.equal(messages.filter(item => item.level === 'success').length, 1)
})

test('外部修改链接、禁用和卸载组件会取消请求且不回填', async t => {
  for (const change of ['value', 'disabled', 'unmount']) {
    const request = deferred()
    respond = () => request.promise
    const parsed = []
    const props = { value: homepage, dataHandle: value => parsed.push(value) }
    const view = await mount(t, NmDouyinUserParser, props)
    await click(button(view.container, '解析'))
    const pending = calls.at(-1)
    if (change === 'unmount') await view.unmount()
    else await view.render({ ...props, ...(change === 'value' ? { value: '' } : { disabled: true }) })
    assert.equal(pending.config.signal.aborted, true)
    await act(async () => request.resolve(success()))
    assert.deepEqual(parsed, [])
    await view.unmount()
  }
  assert.equal(messages.length, 0)
})

test('接口异常不回填，可以再次解析；缺少头像不影响成功', async t => {
  const parsed = []
  respond = async () => success({ nickname: '缺少UID' })
  const { container } = await mount(t, NmDouyinUserParser, {
    defaultValue: homepage,
    dataHandle: value => parsed.push(value),
  })
  await click(button(container, '解析'))
  assert.match(messages.at(-1).message, /未获取到用户 UID/)
  respond = async () => {
    throw { message: '解析服务暂时不可用' }
  }
  await click(button(container, '解析'))
  assert.equal(messages.at(-1).message, '解析服务暂时不可用')
  assert.deepEqual(parsed, [])
  respond = async () => success({ uid: user.uid, nickname: user.nickname })
  await click(button(container, '解析'))
  assert.equal(parsed[0].uid, user.uid)
  assert.equal(parsed[0].avatar_thumb, undefined)
})

test('请求结束时使用最新回填函数，避免旧闭包覆盖表单值', async t => {
  const request = deferred()
  respond = () => request.promise
  const parsed = []
  const view = await mount(t, NmDouyinUserParser, { defaultValue: homepage, dataHandle: () => parsed.push('旧回调') })
  await click(button(view.container, '解析'))
  await view.render({ defaultValue: homepage, dataHandle: () => parsed.push('当前回调') })
  await act(async () => request.resolve(success()))
  assert.deepEqual(parsed, ['当前回调'])
})

test(
  '达人分配表单关闭后取消请求，重新打开时不会回填旧用户',
  { skip: !hasAllocation && '当前仓库未包含达人业务模块' },
  async t => {
    const request = deferred()
    respond = () => request.promise
    const changes = []
    const props = {
      open: true,
      editing: false,
      value: { aweme_name: '', aweme_id: '', performance_id: '', business_id: '' },
      busy: false,
      onChange: value => changes.push(value),
      onClose() {},
      onSubmit: async () => {},
    }
    const view = await mount(t, CreatorAllocationForm, props)
    const dialog = document.querySelector('[role="dialog"]')
    await enterValue(dialog.querySelector('[aria-label="抖音用户主页链接"]'), homepage)
    await click(button(dialog, '解析'))
    await view.render({ ...props, open: false })
    assert.equal(calls.at(-1).config.signal.aborted, true)
    await view.render(props)
    await act(async () => request.resolve(success()))
    assert.deepEqual(changes, [])
  },
)

test(
  '达人分配使用弹窗操作区触发表单校验，保存中禁止重复提交和关闭',
  { skip: !hasAllocation && '当前仓库未包含达人业务模块' },
  async t => {
    const saved = []
    let closed = 0
    const props = {
      open: true,
      editing: false,
      value: { aweme_name: '', aweme_id: '', performance_id: '', business_id: '' },
      busy: false,
      onChange() {},
      onClose: () => {
        closed++
      },
      onSubmit: async value => {
        saved.push(value)
      },
    }
    const view = await mount(t, CreatorAllocationForm, props)
    const dialog = document.querySelector('[role="dialog"]')
    const footer = dialog.querySelector('[data-slot="dialog-footer"]')
    assert.ok(footer)
    assert.equal(button(footer, '保存').closest('form'), null)
    await click(button(footer, '保存'))
    assert.equal(saved.length, 0)
    assert.equal(closed, 0)
    assert.match(dialog.textContent, /请填写抖音UID/)

    const valid = {
      ...props,
      value: { aweme_name: user.nickname, aweme_id: user.uid, performance_id: 'category', business_id: '7' },
    }
    await view.render({ ...valid, busy: true })
    assert.equal(button(footer, '保存中…').disabled, true)
    assert.equal(button(footer, '取消').disabled, true)
    await act(async () =>
      dialog.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })),
    )
    await click(dialog.querySelector('[data-slot="dialog-close"]'))
    assert.equal(saved.length, 0)
    assert.equal(closed, 0)

    await view.render(valid)
    await click(button(footer, '保存'))
    assert.deepEqual(saved, [valid.value])
    assert.equal(closed, 0)
    await click(button(footer, '取消'))
    assert.equal(closed, 1)
  },
)

test(
  '达人分配新增表单自动回填并保留其他修改，提交不包含解析链接，编辑不展示解析',
  { skip: !hasAllocation && '当前仓库未包含达人业务模块' },
  async t => {
    const saved = []
    const request = deferred()
    respond = () => request.promise
    function AllocationForm({ editing = false }) {
      const [value, onChange] = useState({
        aweme_name: '',
        aweme_id: '',
        performance_id: 'category',
        leader_id: '',
        business_id: '7',
      })
      return createElement(CreatorAllocationForm, {
        open: true,
        editing,
        value,
        busy: false,
        onChange,
        onClose() {},
        onSubmit: async values => {
          saved.push(values)
        },
      })
    }
    const view = await mount(t, AllocationForm, {})
    const dialog = document.querySelector('[role="dialog"]')
    const parserField = dialog.querySelector('[aria-label="抖音用户主页链接"]').closest('[data-slot="field"]')
    assert.equal(parserField.style.gridColumn, 'span 2 / span 2')
    await enterValue(dialog.querySelector('[aria-label="抖音用户主页链接"]'), homepage)
    await click(button(dialog, '解析'))
    await enterValue(dialog.querySelector('#leader_id'), '2468')
    await act(async () => request.resolve(success()))
    assert.equal(dialog.querySelector('#aweme_id').value, user.uid)
    assert.equal(dialog.querySelector('#aweme_name').value, user.nickname)
    assert.equal(dialog.querySelector('#leader_id').value, '2468')
    await click(button(dialog, '保存'))
    assert.deepEqual(saved[0], {
      aweme_name: user.nickname,
      aweme_id: user.uid,
      performance_id: 'category',
      leader_id: '2468',
      business_id: '7',
    })
    await view.render({ editing: true })
    assert.equal(document.querySelector('[aria-label="抖音用户主页链接"]'), null)
  },
)

test(
  '线下佣金表单回填后保留佣金字段与长 UID，编辑不展示解析',
  { skip: !hasCommission && '当前仓库未包含线下佣金业务模块' },
  async t => {
    const { container } = await mount(t, OfflineCommissionPage)
    await click(button(container, '新增'))
    const dialog = document.querySelector('[role="dialog"]')
    const field = label => {
      const controlLabel = [...dialog.querySelectorAll('label')].find(node => node.textContent.trim() === label)
      return controlLabel ? dialog.querySelector(`[id="${controlLabel.htmlFor}"]`) : null
    }
    await enterValue(field('佣金率'), '15.25')
    await enterValue(dialog.querySelector('#offline-commission-douyin-url'), homepage)
    await click(button(dialog, '解析'))
    assert.equal(field('达人昵称').value, user.nickname)
    assert.equal(field('抖音ID').value, user.uid)
    assert.equal(field('佣金率').value, '15.25')
    await click(button(dialog, '保存'))
    const saved = calls.find(call => call.method === 'post')
    assert.ok(
      saved,
      `表单未提交：${[...dialog.querySelectorAll('input')]
        .filter(input => !input.validity.valid)
        .map(
          input =>
            `${input.id || input.name || input.type}: value=${input.value}, step=${input.step}, stepMismatch=${input.validity.stepMismatch}, ${input.validationMessage}`,
        )
        .join('; ')} ${dialog.textContent}`,
    )
    assert.equal(saved.url, '/admin/data/offlineCommission/create')
    assert.equal(saved.data.aweme_id, user.uid)
    assert.equal(saved.data.commission_rate, 15.25)
    assert.equal(Object.values(saved.data).includes(homepage), false)
    const edit = fixture.table.schema.tableColumns
      .find(column => column.type === 'operation')
      .operationConfigure.actions.find(action => action.name === 'edit')
    await act(async () => edit.onClick({ row: { id: 7, aweme_id: user.uid, aweme_name: user.nickname } }))
    assert.equal(document.querySelector('#offline-commission-douyin-url'), null)
  },
)
