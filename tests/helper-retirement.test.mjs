import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { build } from 'esbuild'

const result = await build({
  stdin: {
    contents:
      "export { createAppRuntime } from './src/app/runtime/create-runtime'; export { isRetiredMenu } from './src/app/config/menu-policy'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
})
const compiled = { exports: {} }
new Function('module', 'exports', 'require', result.outputFiles[0].text)(
  compiled,
  compiled.exports,
  createRequire(import.meta.url),
)
const { createAppRuntime, isRetiredMenu } = compiled.exports
const runtime = createAppRuntime({ storage: { getItem: () => null, setItem() {}, removeItem() {} } })
runtime.query.setDefaultOptions({ queries: { gcTime: Infinity, retry: false } })
after(() => runtime.dispose())
runtime.menuFilters.register({ id: 'retired', filter: menu => !isRetiredMenu(menu) })
async function removeRetiredMenus(menus) {
  runtime.http.get = async url => ({ data: { data: url.includes('roles') ? [] : menus } })
  runtime.query.clear()
  const result = await runtime.navigation.getState().refreshMenus()
  const shape = nodes =>
    nodes.map(node => {
      const result = { ...node }
      delete result.meta
      if (result.children) result.children = shape(result.children)
      return result
    })
  return shape(result)
}

test('缓存中的智能助手目录及其子菜单不会重新显示', async () => {
  const menus = [
    { name: 'aweme', path: '/aweme' },
    { name: 'helper', path: '/helper/', children: [{ name: 'renamed-rule', path: '/custom-rule' }] },
    { name: 'settings', path: '/settings' },
  ]
  assert.deepEqual(await removeRetiredMenus(menus), [menus[0], menus[2]])
})

test('移走或改名的助手页面按路径、权限名和组件路径清理', async () => {
  const menus = [
    {
      name: 'group',
      path: '/group',
      children: [
        { name: 'shortcut', path: '/helper/execute/' },
        { name: 'legacy-shortcut', route: 'helper/create' },
        { name: 'helper:settings:list', path: '' },
        { name: 'helper/execute:helper_execute:list', path: '' },
        { name: 'renamed', path: '/rules', component: 'helper/views/autostop/index' },
        { name: 'renamed-module', path: '/rules2', component: 'modules/helper/views/execute/index' },
        { name: 'aweme', path: '/aweme' },
      ],
    },
  ]
  const before = JSON.parse(JSON.stringify(menus))
  assert.deepEqual((await removeRetiredMenus(menus))[0].children, [{ name: 'aweme', path: '/aweme' }])
  assert.deepEqual(menus, before)
})

test('相似名称和其他业务保留，已有下线菜单过滤继续有效', async () => {
  const kept = [
    { name: 'helper-tools', path: '/helper-tools', component: 'helper-tools/views/index' },
    { name: 'helperExtra', path: '/helperExtra' },
    { name: 'ai', path: '/ai' },
    { name: 'aweme', path: '/aweme' },
  ]
  const retired = ['/marketing/calendar', '/live', '/yuntu', '/comp'].map(path => ({ path }))
  assert.deepEqual(await removeRetiredMenus([...kept, ...retired]), kept)
})
