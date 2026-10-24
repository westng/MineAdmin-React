import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const mocks = {
  '@/hooks/runtime/use-runtime-factory':
    'export const useRuntimeFactory = create => create({ http: __connectionFixture.http })',
  react: 'export const { useCallback, useRef, useState } = __connectionFixture.react',
  '@/provider/http': 'export default __connectionFixture.http',
  '@/components/reui/use-toast': 'export const useToast = () => ({ toast: __connectionFixture.toast })',
  '@/hooks/auth/use-permission': 'export const usePermission = () => ({ hasAuth: __connectionFixture.hasAuth })',
}
const bundle = await build({
  stdin: {
    contents: [
      "export * from '../src/modules/feishu/connection/hooks/use-feishu-connections'",
      "export * from '../src/modules/feishu/connection/views/data/getFormItems'",
      "export * from '../src/modules/feishu/connection/views/data/getSearchItems'",
      "export * from '../src/modules/feishu/connection/views/data/getTableColumns'",
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
      name: 'feishu-connection-fixture',
      setup(builder) {
        builder.onResolve(
          {
            filter:
              /^(react|@\/(provider\/http|components\/reui\/use-toast|hooks\/(auth\/use-permission|runtime\/use-runtime-factory)))$/,
          },
          args => ({ path: args.path, namespace: 'connection-fixture' }),
        )
        builder.onLoad({ filter: /.*/, namespace: 'connection-fixture' }, args => ({ contents: mocks[args.path] }))
      },
    },
  ],
})

function connection(overrides = {}) {
  return {
    id: 7,
    name: '测试主体',
    app_id: 'cli_example',
    app_secret_configured: true,
    tenant_key: null,
    remark: null,
    base_url: 'https://open.feishu.cn',
    redirect_uri: 'https://api.example.com/admin/passport/feishu/callback',
    status: 2,
    last_test_at: '2026-09-13 10:00:00',
    last_test_status: 1,
    last_test_error: null,
    ...overrides,
  }
}

const response = data => ({ data: { code: 200, data } })

function harness({ permissions = ['*'], respond = () => response({ updated: true, success: true }) } = {}) {
  const calls = []
  const messages = []
  let refreshes = 0
  const fixture = {
    react: {
      useCallback: callback => callback,
      useRef: current => ({ current }),
      useState: initial => {
        let current = initial
        return [
          current,
          update => {
            current = typeof update === 'function' ? update(current) : update
          },
        ]
      },
    },
    hasAuth: permission => permissions.includes('*') || permissions.includes(permission),
    toast: Object.fromEntries(['success', 'error'].map(kind => [kind, message => messages.push({ kind, message })])),
    http: Object.fromEntries(
      ['get', 'post', 'put', 'delete'].map(method => [
        method,
        async (...args) => {
          calls.push({ method, args })
          return respond(method, ...args)
        },
      ]),
    ),
  }
  const loaded = { exports: {} }
  new Function('module', 'exports', 'require', '__connectionFixture', bundle.outputFiles[0].text)(
    loaded,
    loaded.exports,
    require,
    fixture,
  )
  const tableRef = {
    current: {
      refresh: async () => {
        refreshes += 1
      },
    },
  }
  return {
    ...loaded.exports,
    actions: loaded.exports.useFeishuConnections(tableRef),
    calls,
    messages,
    refreshes: () => refreshes,
  }
}

test('列表使用当前后端地址，并保留分页、筛选及 MineAdmin 响应结构', async () => {
  const expected = response({ list: [connection()], total: 38 })
  const fixture = harness({ respond: () => expected })
  const result = await fixture.actions.request({ keyword: '  总部  ', status: '2', page: '3', page_size: '20' })
  assert.equal(result, expected)
  assert.equal(fixture.calls[0].method, 'get')
  assert.equal(fixture.calls[0].args[0], '/admin/feishu/connection/list')
  assert.deepEqual(fixture.calls[0].args[1].params, { keyword: '总部', status: 2, page: 3, page_size: 20 })
  assert.equal(fixture.getConnectionQuery({ status: 'all' }).status, undefined)
  assert.equal(fixture.getConnectionQuery({ status: '3' }).status, 3)
  assert.deepEqual(fixture.getConnectionQuery({ status: 0, page: 0, page_size: -1 }), {
    keyword: '',
    status: undefined,
    page: 1,
    page_size: 20,
  })
})

test('编辑兼容空租户字段，空密钥不覆盖已有配置，提交只包含可编辑字段', () => {
  const fixture = harness()
  const values = fixture.createConnectionForm(connection())
  assert.equal(values.tenant_key, '')
  assert.equal(values.remark, '')
  assert.equal(values.app_secret, '')
  const payload = fixture.toConnectionInput({ ...values, name: '  总部  ', app_secret: '  ', id: 9, status: 1 })
  assert.equal(payload.name, '总部')
  assert.equal('app_secret' in payload, false)
  assert.equal('id' in payload, false)
  assert.equal('status' in payload, false)
  assert.equal(fixture.toConnectionInput({ ...values, app_secret: '  example-only  ' }).app_secret, 'example-only')
  const newItems = fixture.getFormItems()
  assert.equal(newItems.find(item => item.prop === 'app_secret').itemProps.rules.required, true)
  assert.equal(
    fixture.getFormItems(connection()).find(item => item.prop === 'app_secret').itemProps.rules.required,
    false,
  )
})

test('连接地址校验支持本地 HTTP 和 HTTPS，拒绝非 HTTP 协议', async () => {
  const fixture = harness()
  for (const prop of ['base_url', 'redirect_uri']) {
    const rule = fixture
      .getFormItems()
      .find(item => item.prop === prop)
      .itemProps.rules.find(item => item.validator)
    assert.equal(await rule.validator('https://api.example.com/callback'), undefined)
    assert.equal(await rule.validator('http://127.0.0.1:9601/admin/passport/feishu/callback'), undefined)
    assert.match(await rule.validator('javascript:alert(1)'), /HTTP/)
    assert.match(await rule.validator('not-a-url'), /HTTP/)
  }
})

test('禁用状态 2 调用启用接口，启用状态 1 调用禁用接口', async () => {
  const fixture = harness()
  await fixture.actions.runAction(connection({ status: 2 }), 'status')
  await fixture.actions.runAction(connection({ status: 1 }), 'status')
  assert.deepEqual(
    fixture.calls.map(call => call.args[0]),
    ['/admin/feishu/connection/enable/7', '/admin/feishu/connection/disable/7'],
  )
  assert.deepEqual(
    fixture.calls.map(call => call.method),
    ['put', 'put'],
  )
  assert.equal(fixture.refreshes(), 2)
  await fixture.actions.runAction(connection({ status: 3 }), 'status')
  await fixture.actions.runAction(connection({ status: 2, last_test_status: null }), 'status')
  assert.equal(fixture.calls.length, 2)
  assert.match(fixture.messages.at(-1).message, /先测试通过/)
})

test('HTTP 成功但凭据测试失败时显示失败，并刷新服务端更新的状态', async () => {
  const fixture = harness({ respond: () => response({ success: false }) })
  await fixture.actions.runAction(connection({ status: 1 }), 'test')
  assert.equal(fixture.calls[0].args[0], '/admin/feishu/connection/test/7')
  assert.equal(fixture.calls[0].args[2].timeout, 20000)
  assert.equal(
    fixture.messages.some(message => message.kind === 'success'),
    false,
  )
  assert.match(fixture.messages[0].message, /未通过/)
  assert.equal(fixture.refreshes(), 1)
})

test('同一连接测试期间不能重复测试或切换状态，完成后释放操作锁', async () => {
  let resolveTest
  const deferred = new Promise(resolve => {
    resolveTest = resolve
  })
  const fixture = harness({
    respond: (_method, url) => (url.endsWith('/test') ? deferred : response({ updated: true })),
  })
  const pending = fixture.actions.runAction(connection(), 'test')
  await fixture.actions.runAction(connection(), 'test')
  await fixture.actions.runAction(connection(), 'status')
  assert.equal(fixture.calls.length, 1)
  resolveTest(response({ success: true }))
  await pending
  await fixture.actions.runAction(connection(), 'status')
  assert.equal(fixture.calls.length, 2)
  assert.equal(fixture.refreshes(), 2)
})

test('保存成功调用标准 refresh，失败保留服务端错误且返回未保存', async () => {
  const fixture = harness()
  const input = fixture.toConnectionInput(fixture.createConnectionForm(connection()))
  assert.equal(await fixture.actions.save(connection(), input), true)
  assert.equal(fixture.calls[0].method, 'put')
  assert.equal(fixture.calls[0].args[0], '/admin/feishu/connection/save/7')
  assert.equal(fixture.refreshes(), 1)
  const rejected = { message: 'App ID 已存在' }
  const failed = harness({
    respond: () => {
      throw rejected
    },
  })
  assert.equal(await failed.actions.save(null, input), false)
  assert.equal(failed.calls[0].method, 'post')
  assert.equal(failed.calls[0].args[0], '/admin/feishu/connection/create')
  assert.equal(failed.messages[0].message, 'App ID 已存在')
  assert.equal(failed.refreshes(), 0)
  await assert.rejects(
    failed.actions.request({}),
    error => error.message === rejected.message && error.cause === rejected,
  )
})

test('当前菜单权限分别限制查看、创建、编辑和测试', async () => {
  const denied = harness({ permissions: [] })
  await assert.rejects(denied.actions.request({}), /查看权限/)
  assert.equal(await denied.actions.save(null, {}), false)
  await denied.actions.runAction(connection(), 'test')
  assert.equal(denied.calls.length, 0)
  const editor = harness({ permissions: ['feishu:connection:list', 'feishu:connection:update'] })
  assert.equal(await editor.actions.save(null, {}), false)
  await editor.actions.runAction(connection(), 'test')
  assert.equal(editor.calls.length, 0)
  await editor.actions.runAction(connection(), 'status')
  assert.equal(editor.calls.length, 1)
})

test('只有删除权限时仍显示操作列，删除处理中禁用同一行的所有操作', () => {
  const fixture = harness()
  let selected
  const options = {
    pending: {},
    canEdit: false,
    canTest: false,
    canDelete: true,
    onEdit: () => {},
    onTest: () => {},
    onToggleStatus: () => {},
    onDelete: row => {
      selected = row
    },
  }
  const actions = fixture.getTableColumns(options).find(column => column.type === 'operation')
    .operationConfigure.actions
  const row = connection()
  const remove = actions.find(action => action.name === 'delete')
  assert.equal(remove.show({ row }), true)
  assert.equal(remove.text({ row }), '删除')
  remove.onClick({ row })
  assert.equal(selected, row)
  assert.equal(
    fixture.getTableColumns({ ...options, canDelete: false }).some(column => column.type === 'operation'),
    false,
  )
  const locked = fixture
    .getTableColumns({ ...options, canEdit: true, canTest: true, pending: { 'delete-7': true } })
    .find(column => column.type === 'operation').operationConfigure.actions
  assert.equal(
    locked.every(action => action.disabled({ row })),
    true,
  )
  assert.equal(locked.find(action => action.name === 'delete').text({ row }), '删除中…')
})

test('删除使用现有 DELETE 接口和 ids 请求体，成功后刷新列表', async () => {
  const fixture = harness({
    permissions: ['feishu:connection:list', 'feishu:connection:delete'],
    respond: () => response(null),
  })
  assert.equal(await fixture.actions.runAction(connection({ status: 3 }), 'delete'), true)
  assert.deepEqual(fixture.calls, [
    { method: 'delete', args: ['/admin/feishu/connection/delete', { data: { ids: [7] } }] },
  ])
  assert.equal(fixture.refreshes(), 1)
  assert.deepEqual(fixture.messages, [{ kind: 'success', message: '连接已删除' }])
  for (const permissions of [
    [],
    ['feishu:connection:delete'],
    ['feishu:connection:list', 'feishu:connection:update'],
  ]) {
    const denied = harness({ permissions })
    assert.equal(await denied.actions.runAction(connection(), 'delete'), false)
    assert.equal(denied.calls.length, 0)
    assert.equal(denied.refreshes(), 0)
    assert.match(denied.messages[0].message, /权限/)
  }
})

test('删除期间拦截重复删除、测试和启停，完成后释放行操作锁', async () => {
  let resolveDelete
  const deferred = new Promise(resolve => {
    resolveDelete = resolve
  })
  const fixture = harness({ respond: method => (method === 'delete' ? deferred : response({ success: true })) })
  const removing = fixture.actions.runAction(connection(), 'delete')
  for (const action of ['delete', 'test', 'status']) {
    assert.equal(await fixture.actions.runAction(connection(), action), false)
  }
  assert.equal(fixture.calls.length, 1)
  resolveDelete(response(null))
  assert.equal(await removing, true)
  await fixture.actions.runAction(connection(), 'test')
  assert.equal(fixture.calls.length, 2)
  assert.equal(fixture.refreshes(), 2)
})

test('删除失败保留错误且不刷新列表，并允许重新提交', async () => {
  let failed = true
  const fixture = harness({
    respond: () => {
      if (failed) throw { message: '连接删除失败' }
      return response(null)
    },
  })
  assert.equal(await fixture.actions.runAction(connection(), 'delete'), false)
  assert.equal(fixture.refreshes(), 0)
  assert.deepEqual(fixture.messages, [{ kind: 'error', message: '连接删除失败' }])
  failed = false
  assert.equal(await fixture.actions.runAction(connection(), 'delete'), true)
  assert.equal(fixture.calls.length, 2)
  assert.equal(fixture.refreshes(), 1)
})
