import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { after, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'

const pagePath = new URL('../src/modules/account/ad-account/views/index.tsx', import.meta.url)
if (!existsSync(pagePath)) {
  test.skip('广告账户：业务模块未收录时跳过')
} else {
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
  const fixture = {
    permissions: new Set(),
    reads: [],
    writes: [],
    messages: [],
    authorizations: [],
    popups: [],
    holdReads: false,
  }
  fixture.permissionVersion = 0
  fixture.permissionListeners = new Set()
  fixture.subscribePermissions = listener => {
    fixture.permissionListeners.add(listener)
    return () => fixture.permissionListeners.delete(listener)
  }
  fixture.notifyPermissions = () => {
    fixture.permissionVersion += 1
    for (const listener of fixture.permissionListeners) listener()
  }
  const rows = [
    {
      id: 11,
      uid: '9007199254740993',
      app_id: 123,
      platform: 'QC',
      display_name: '千川甲',
      account_count: 2,
      advertise_count: 3,
      account_name: '原账户',
      advertiser_name: '原广告主',
      account_role: '代理',
      account_type: '公司',
      access_token: 'fixture-only',
    },
    { id: 22, uid: '1002', platform: 'QC', display_name: '千川乙', account_count: 1, advertise_count: 1 },
  ]
  const success = data => ({ data: { code: 200, data } })
  const defer = () => {
    let resolve, reject
    const promise = new Promise((yes, no) => {
      resolve = yes
      reject = no
    })
    return { promise, resolve, reject }
  }
  fixture.http = {
    get: (url, config) => {
      if (url === '/api/oc/getAuthCodeUrl') {
        const pending = defer()
        fixture.authorizations.push({ ...pending, params: config.params, signal: config.signal })
        return pending.promise
      }
      const pending = defer()
      const record = { ...pending, url, params: config?.params }
      fixture.reads.push(record)
      const list =
        url === '/admin/oc/account/list' && config?.params.platform === 'AD'
          ? [{ ...rows[0], uid: '2001', platform: 'AD', display_name: '广告甲' }]
          : rows
      return fixture.holdReads ? pending.promise : Promise.resolve(success({ list, total: list.length }))
    },
    ...Object.fromEntries(
      ['post', 'put', 'delete'].map(method => [
        method,
        (url, data) => {
          const pending = defer()
          fixture.writes.push({
            method,
            url,
            data,
            resolve: () => pending.resolve(success(null)),
            reject: pending.reject,
          })
          return pending.promise
        },
      ]),
    ),
  }
  const bundle = await build({
    stdin: {
      contents: `export { default } from './src/modules/account/ad-account/views/index.tsx';
        export { default as AccountListPage } from './src/modules/account/account-list/views/index.tsx';
        export { default as AdvertiserPage } from './src/modules/account/advertiser/views/index.tsx';`,
      resolveDir: fileURLToPath(new URL('..', import.meta.url)),
      loader: 'tsx',
    },
    define: { 'import.meta.env.VITE_APP_API_BASEURL': JSON.stringify('https://api.example.test') },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'ad-account-local-fixtures',
        setup(builder) {
          builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }))
          builder.onResolve({ filter: /^@\/provider\/http$/ }, () => ({ path: 'http', namespace: 'fixture' }))
          builder.onResolve({ filter: /^@\/hooks\/framework\/use-permission$/ }, () => ({
            path: 'permission',
            namespace: 'fixture',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents:
              path === 'http'
                ? 'export default __fixture.http'
                : `
            export const hasAuth = permission => (Array.isArray(permission) ? permission : [permission]).some(item => __fixture.permissions.has(item));
            import { useSyncExternalStore } from 'react';
            export const usePermission = () => {
              useSyncExternalStore(__fixture.subscribePermissions, () => __fixture.permissionVersion);
              return { hasAuth };
            };
            export const PermissionGate = ({ permission, children }) => {
              usePermission();
              return hasAuth(permission) ? children : null;
            };
          `,
          }))
        },
      },
    ],
  })
  const compiled = { exports: {} }
  new Function('module', 'exports', 'require', '__fixture', bundle.outputFiles[0].text)(
    compiled,
    compiled.exports,
    require,
    fixture,
  )
  const Page = compiled.exports.default
  window.addEventListener('mine:message', event => fixture.messages.push(event.detail))
  window.confirm = () => {
    throw new Error('标准 CRUD 不应调用原生 confirm')
  }
  const allPermissions = [
    'oc:account:list',
    'ad:account:list',
    'account:starMap:list',
    'account:aweme:account:list',
    'account:dj:list',
    'oc:accountList:list',
    'oc:advertiser:list',
    'oc:account:refreshAuth',
    'ad:account:refreshAuth',
    'account:aweme:account:refreshAuth',
    'oc:qc:getAuthCodeUrl',
    'oc:ad:getAuthCodeUrl',
    'oc:xt:getAuthCodeUrl',
    'oc:sxt:getAuthCodeUrl',
    'account:dj:create',
    'account:dj:save',
    'account:dj:delete',
  ]
  beforeEach(() => {
    fixture.permissions = new Set(allPermissions)
    for (const name of ['reads', 'writes', 'messages', 'authorizations', 'popups']) fixture[name].length = 0
    fixture.holdReads = false
    window.open = () => {
      const popup = {
        closed: false,
        location: { href: '' },
        opener: window,
        focus() {},
        close() {
          this.closed = true
        },
      }
      fixture.popups.push(popup)
      return popup
    }
  })
  after(async () => {
    await dom.happyDOM.abort()
    dom.close()
  })

  async function mount(t, Component = Page, props = {}) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const render = (nextProps = props) => act(async () => root.render(createElement(Component, nextProps)))
    t.after(async () => {
      await act(async () => root.unmount())
      container.remove()
    })
    await render()
    return { container, render }
  }
  function button(text, scope = document) {
    return [...scope.querySelectorAll('button')].find(
      node => node.textContent.trim() === text || node.getAttribute('aria-label') === text,
    )
  }
  async function click(element) {
    assert.ok(element, '应找到操作入口')
    await act(async () => element.click())
  }
  async function enter(input, value) {
    assert.ok(input, '应找到输入字段')
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new dom.Event('input', { bubbles: true }))
    })
  }
  const dialog = () => document.querySelector('[role="dialog"]')
  const field = name => dialog().querySelector(`#${name}`)
  const firstRow = () => document.querySelector('tbody tr')
  const switchPlatform = async label =>
    click([...document.querySelectorAll('[role=tab]')].find(node => node.textContent === label))

  test('平台容器使用独立页面：千川与广告共用账户接口并固定平台，其他平台使用各自接口', async t => {
    const { container } = await mount(t)
    assert.equal(fixture.reads[0].url, '/admin/oc/account/list')
    assert.equal(fixture.reads[0].params.platform, 'QC')
    assert.ok(button('新增授权'))
    assert.ok(!button('新增'))
    for (const [label, title, path, platform, searchField] of [
      ['巨量千川', '巨量千川账户', '/admin/oc/account/list', 'QC', 'display_name'],
      ['巨量广告', '巨量广告账户', '/admin/oc/account/list', 'AD', 'display_name'],
      ['巨量星图', '星图账户', '/admin/account/starMap/list', undefined, 'advertiser_name'],
      ['随心推', '随心推账户', '/admin/account/aweme/account/list', undefined, 'uid'],
      ['DOU+', 'DOU+账户', '/admin/account/dj/list', undefined, 'account_name'],
    ]) {
      await switchPlatform(label)
      assert.equal(fixture.reads.at(-1).url, path)
      assert.equal(fixture.reads.at(-1).params.platform, platform)
      assert.equal(container.querySelector('[data-slot="frame-panel-title"]')?.textContent, title)
      assert.ok(button('刷新', container), `${label}应保留默认刷新入口`)
      const input = container.querySelector(`#${searchField}`)
      assert.ok(input, `${label}应显示搜索字段`)
      assert.equal(input.value, '', `${label}不应继承其他平台的搜索条件`)
      await enter(input, '查询条件')
      await click(button('搜索', container))
      assert.equal(fixture.reads.at(-1).url, path)
      assert.equal(fixture.reads.at(-1).params.platform, platform)
      assert.equal(fixture.reads.at(-1).params[searchField], '查询条件')
      assert.equal(fixture.reads.at(-1).params.page, 1)
      await click(button('重置', container))
      assert.equal(input.value, '')
      assert.equal(fixture.reads.at(-1).params.platform, platform)
      assert.ok(!fixture.reads.at(-1).params[searchField])
      await enter(input, '留在当前平台')
      await click(button('搜索', container))
    }
  })

  test('账户数量与广告数量打开独立抽屉，关联查询保留完整 UID、平台和各自分页', async t => {
    const { container } = await mount(t)
    await click(button('查看已授权账户', container))
    assert.equal(fixture.reads.at(-1).url, '/admin/oc/accountlist/list')
    assert.deepEqual(fixture.reads.at(-1).params, { page: 1, page_size: 50, uid: rows[0].uid, platform: 'QC' })
    assert.ok(!button('新增', dialog()))
    assert.ok(!button('刷新授权', dialog()))
    await enter(dialog().querySelector('#advertiser_name'), '查询条件')
    await click(button('搜索', dialog()))
    assert.equal(fixture.reads.at(-1).params.uid, rows[0].uid)
    assert.equal(fixture.reads.at(-1).params.platform, 'QC')
    assert.equal(fixture.reads.at(-1).params.advertiser_name, '查询条件')
    await click(button('关闭', dialog()))
    await click(button('查看广告主', container))
    assert.equal(fixture.reads.at(-1).url, '/admin/oc/advertiser/list')
    assert.equal(fixture.reads.at(-1).params.uid, rows[0].uid)
    assert.equal(fixture.reads.at(-1).params.page_size, 20)
  })

  test('子页面切换账户时忽略旧请求，避免把另一个账户的明细显示进来', async t => {
    fixture.holdReads = true
    const { container, render } = await mount(t, compiled.exports.AccountListPage, {
      scope: { uid: 'old', platform: 'QC' },
    })
    const oldRequest = fixture.reads.at(-1)
    await render({ scope: { uid: 'new', platform: 'AD' } })
    const newRequest = fixture.reads.at(-1)
    assert.notEqual(oldRequest, newRequest)
    assert.equal(newRequest.params.platform, 'AD')
    await act(async () => newRequest.resolve(success({ list: [{ id: 2, advertiser_name: '新账户明细' }], total: 1 })))
    await act(async () => oldRequest.resolve(success({ list: [{ id: 1, advertiser_name: '旧账户明细' }], total: 1 })))
    assert.match(container.textContent, /新账户明细/)
    assert.doesNotMatch(container.textContent, /旧账户明细/)
  })

  test('授权窗口共用加载锁，业务错误保留错误信息，成功只跳转且使用后端回调域名', async t => {
    await mount(t)
    await click(button('新增授权'))
    await click(button('新增授权'))
    assert.equal(fixture.authorizations.length, 1)
    assert.equal(fixture.popups.length, 1)
    assert.deepEqual(fixture.authorizations[0].params, {
      platform: 'QC',
      cb_url: 'https://api.example.test/api/qianChuan/callback/index',
    })
    await act(async () => fixture.authorizations[0].reject({ message: '授权服务暂不可用' }))
    assert.equal(fixture.popups[0].closed, true)
    assert.equal(fixture.messages.at(-1).message, '授权服务暂不可用')
    assert.equal(button('新增授权').disabled, false)
    await click(button('新增授权'))
    await act(async () => fixture.authorizations[1].resolve(success('https://auth.example.test/fixture')))
    assert.equal(fixture.popups[1].location.href, 'https://auth.example.test/fixture')
    assert.equal(fixture.popups[1].opener, null)
    assert.equal(
      fixture.messages.some(item => item.level === 'success'),
      false,
    )
  })

  test('切换平台时取消尚未完成的授权，晚到的地址不会打开到旧窗口', async t => {
    await mount(t)
    await click(button('新增授权'))
    const request = fixture.authorizations[0]
    const popup = fixture.popups[0]
    await switchPlatform('巨量星图')
    assert.equal(request.signal.aborted, true)
    assert.equal(popup.closed, true)
    await act(async () => request.resolve(success('https://auth.example.test/old')))
    assert.equal(popup.location.href, '')
    await click(button('新增授权'))
    assert.equal(fixture.authorizations[1].params.platform, 'XT')
    await act(async () => fixture.authorizations[1].reject(new Error('fixture cleanup')))
  })

  test('刷新授权按后端契约发送最小载荷，星图共用授权接口、随心推使用独立接口', async t => {
    await mount(t)
    for (const [label, url, platform] of [
      [null, '/admin/oc/account/refreshAuth', 'QC'],
      ['巨量广告', '/admin/oc/account/refreshAuth', 'AD'],
      ['巨量星图', '/admin/oc/account/refreshAuth', 'XT'],
      ['随心推', '/admin/account/aweme/refreshAuth'],
    ]) {
      if (label) await switchPlatform(label)
      await click(button('刷新授权', firstRow()))
      const request = fixture.writes.at(-1)
      assert.equal(request.url, url)
      assert.equal(request.data.platform, platform)
      assert.equal(request.data.access_token, undefined)
      assert.equal(request.data.uid, platform === 'AD' ? '2001' : rows[0].uid)
      if (url === '/admin/account/aweme/refreshAuth') assert.equal(request.data.app_id, rows[0].app_id)
      await act(async () => request.resolve())
    }
  })

  test('DOU+ 使用默认表单流程：校验、失败保留、重复提交保护、成功刷新和字段白名单', async t => {
    await mount(t)
    await switchPlatform('DOU+')
    await click(button('新增授权'))
    await click(button('保存', dialog()))
    assert.equal(fixture.writes.length, 0)
    assert.match(dialog().textContent, /请输入账户名称/)
    await enter(field('account_name'), '新账户')
    await enter(field('advertiser_name'), '新广告主')
    await click(button('保存', dialog()))
    await click(button('保存', dialog()))
    assert.equal(fixture.writes.length, 1)
    assert.equal(fixture.writes[0].url, '/admin/account/dj/create')
    assert.deepEqual(fixture.writes[0].data, {
      account_name: '新账户',
      account_type: '',
      account_role: '',
      advertiser_name: '新广告主',
    })
    await act(async () => fixture.writes[0].reject({ message: '保存失败' }))
    assert.equal(field('account_name').value, '新账户')
    const before = fixture.reads.length
    await click(button('保存', dialog()))
    await act(async () => fixture.writes[1].resolve())
    assert.ok(!dialog(), '操作成功后应关闭弹窗')
    assert.ok(fixture.reads.length > before)
    await click(button('编辑', firstRow()))
    await click(button('保存', dialog()))
    assert.equal(fixture.writes[2].url, '/admin/account/dj/save/11')
    assert.equal(fixture.writes[2].data.access_token, undefined)
    await act(async () => fixture.writes[2].resolve())
  })

  test('DOU+ 批量删除使用确认弹窗，失败保留选择，成功清理；权限收回阻止表单提交', async t => {
    const { render } = await mount(t)
    await switchPlatform('DOU+')
    await click(firstRow().querySelector('[role=checkbox]'))
    await click(button('批量删除'))
    await click(button('删除', dialog()))
    assert.deepEqual(fixture.writes[0].data, { data: [11] })
    await act(async () => fixture.writes[0].reject({ message: '删除失败' }))
    assert.ok(dialog())
    await click(button('删除', dialog()))
    await act(async () => fixture.writes[1].resolve())
    assert.ok(!dialog(), '操作成功后应关闭弹窗')
    assert.equal(button('批量删除').disabled, true)
    await click(button('编辑', firstRow()))
    await act(async () => {
      fixture.permissions.delete('account:dj:save')
      fixture.notifyPermissions()
    })
    await render()
    assert.ok(!button('保存', dialog()), '权限撤回后应隐藏保存按钮')
    await act(async () =>
      dialog()
        .querySelector('form')
        .dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })),
    )
    assert.equal(fixture.writes.length, 2)
  })

  test('平台和明细入口遵循权限，未授权页面不发起查询', async t => {
    fixture.permissions = new Set(['ad:account:list'])
    const { container } = await mount(t)
    assert.equal(fixture.reads.length, 1)
    assert.equal(fixture.reads[0].params.platform, 'AD')
    assert.equal(container.querySelectorAll('[role=tab]').length, 1)
    assert.ok(!button('新增授权'))
    assert.ok(!button('查看已授权账户'))
    assert.ok(!button('查看广告主'))
    assert.equal(fixture.authorizations.length, 0)
  })
}
