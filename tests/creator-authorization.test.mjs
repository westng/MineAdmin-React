import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const result = await build({
  stdin: {
    contents: [
      "export * from './src/modules/creator/create/utils/authorization'",
      "export * from './src/modules/creator/migrate/utils/migration'",
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
})
const module = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const { identify, parseDateTime, validateAuthorization, authorizationPayload, validateMigration } = module.exports
const now = new Date(2026, 8, 12, 12)
const accounts = [
  { value: '1788000000000001', label: '原账户', disabled: false },
  { value: '1788000000000002', label: '目标账户', disabled: false },
  { value: '1788000000000003', label: '限制账户', disabled: true },
]
const shops = [{ value: '123', label: '测试店铺' }]

function form() {
  return {
    advertiser_id: [accounts[0].value],
    tiktok_data: identify('测试达人 987654321098765432 000777'),
    auth_type: 'AWEME_COOPERATOR', global_auth: 'VIDEO_PROM_GOODS',
    shop_id: '123', end_time: '2026-09-13T23:59:59',
  }
}

test('识别和提交保留长 UID、合作码，提交内容不包含预览行 ID', () => {
  const data = form()
  assert.deepEqual(validateAuthorization(data, accounts, shops, false, now), {})
  const payload = authorizationPayload(data)
  assert.equal(payload.tiktok_data[0].aweme_id, '987654321098765432')
  assert.equal(payload.tiktok_data[0].code, '000777')
  assert.equal(payload.end_time, '2026-09-13 23:59:59')
  assert.equal('id' in payload.tiktok_data[0], false)
  assert.deepEqual(payload.advertiser_id, [accounts[0].value])
})

test('识别失败不静默丢行，重复 UID 和未重新识别的内容不能提交', () => {
  assert.throws(() => identify('正确行 123 456\n错误行 789'), /第 2 行/)
  assert.throws(() => identify('达人 not-a-uid 456'), /格式错误/)
  const data = form()
  data.tiktok_data.push({ ...data.tiktok_data[0], id: 2 })
  assert.match(validateAuthorization(data, accounts, shops, false, now).tiktok_data, /重复/)
  assert.match(validateAuthorization(form(), accounts, shops, true, now).tiktok_data, /重新识别/)
})

test('日期校验日历有效性，同时支持分钟和秒格式', () => {
  assert.ok(parseDateTime('2028-02-29T12:30'))
  assert.ok(parseDateTime('2026-09-12T12:30:59'))
  assert.equal(parseDateTime('2026-02-29T12:30:00'), null)
  assert.equal(parseDateTime('2026-09-31T12:30:00'), null)
  assert.equal(parseDateTime('2026-09-12T25:00:00'), null)
  assert.equal(parseDateTime('2026-09-12'), null)
  assert.match(validateAuthorization({ ...form(), end_time: '2026-09-12T12:00:00' }, accounts, shops, false, now).end_time, /晚于当前时间/)
  assert.throws(() => authorizationPayload({ ...form(), end_time: 'invalid' }), /有效的授权时间/)
})

test('限制账户和无效店铺不能提交，直播全域不会携带残留店铺', () => {
  assert.ok(validateAuthorization({ ...form(), advertiser_id: [accounts[2].value] }, accounts, shops, false, now).advertiser_id)
  assert.ok(validateAuthorization({ ...form(), shop_id: 'missing' }, accounts, shops, false, now).shop_id)
  const live = { ...form(), global_auth: 'LIVE_PROM_GOODS', shop_id: 'missing' }
  assert.deepEqual(validateAuthorization(live, accounts, shops, false, now), {})
  assert.equal('shop_id' in authorizationPayload(live), false)
})

test('迁移只接受不同且可用的源、目标账户以及合法授权设置', () => {
  const migration = { old_advertiser_id: [accounts[0].value], advertiser_id: [accounts[1].value], auth_type: 'SELF', end_time: '2026-09-13T23:59:59' }
  assert.deepEqual(validateMigration(migration, accounts, now), {})
  assert.match(validateMigration({ ...migration, advertiser_id: migration.old_advertiser_id }, accounts, now).advertiser_id, /不能重叠/)
  assert.ok(validateMigration({ ...migration, old_advertiser_id: [] }, accounts, now).old_advertiser_id)
  assert.ok(validateMigration({ ...migration, auth_type: 'ALL' }, accounts, now).auth_type)
  assert.ok(validateMigration({ ...migration, advertiser_id: [accounts[2].value] }, accounts, now).advertiser_id)
})

async function apiHarness() {
  const calls = []
  const http = Object.fromEntries(['get', 'post', 'put', 'delete'].map(method => [
    method, (...args) => { calls.push({ method, args }); return Promise.resolve({ data: { code: 200, data: {} } }) },
  ]))
  const bundled = await build({
    stdin: {
      contents: ['list', 'info', 'allocation', 'task', 'taskLog', 'allocationOperationLog']
        .map(name => "export * as " + name + "Api from './src/modules/creator/" + name + "/api/" + name + "'").join('\n'),
      resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{
      name: 'creator-http-fixture',
      setup(build) {
        build.onResolve({ filter: /^@\/utils\/http$/ }, () => ({ path: 'http', namespace: 'creator-fixture' }))
        build.onLoad({ filter: /.*/, namespace: 'creator-fixture' }, () => ({ contents: 'export default __creatorHttpFixture' }))
      },
    }],
  })
  const loaded = { exports: {} }
  new Function('module', 'exports', '__creatorHttpFixture', bundled.outputFiles[0].text)(loaded, loaded.exports, http)
  return { api: loaded.exports, calls }
}

test('CRUD 提交保持长 ID 与授权数组，清空可选字段，删除采用 ids 对象', async () => {
  const { api, calls } = await apiHarness()
  await api.listApi.save(7, { aweme_id: '987654321098765432', advertiser_id: accounts[0].value, auth_type: ['SELF', 'VIDEO'], aweme_name: ' 测试达人 ', end_time: '' })
  assert.equal(calls[0].args[1].aweme_id, '987654321098765432')
  assert.deepEqual(calls[0].args[1].auth_type, ['SELF', 'VIDEO'])
  assert.equal(calls[0].args[1].aweme_name, '测试达人')
  assert.equal(calls[0].args[1].end_time, null)
  for (const name of ['list', 'info', 'allocation', 'task', 'taskLog', 'allocationOperationLog']) {
    await api[name + 'Api'].deleteByIds([7, 8])
    assert.equal(calls.at(-1).method, 'delete')
    assert.deepEqual(calls.at(-1).args[1], { data: { ids: [7, 8] } })
  }
})

test('日期查询覆盖当天，任务明细保留任务与结果分组条件', async () => {
  const { api, calls } = await apiHarness()
  await api.taskApi.page({ created_at: '2026-09-12', task_id: '', page: 1 })
  assert.deepEqual(calls[0].args[1].params, { created_at: ['2026-09-12 00:00:00', '2026-09-12 23:59:59'], page: 1 })
  await api.infoApi.page({ add_time: '2026-09-12' })
  assert.deepEqual(calls[1].args[1].params.add_time, ['2026-09-12 00:00:00', '2026-09-12 23:59:59'])
  await api.taskLogApi.page({ task_id: '987654321098765432', result_status: 'fail' })
  assert.deepEqual(calls[2].args[1].params, { task_id: '987654321098765432', result_status: 'fail' })
})
