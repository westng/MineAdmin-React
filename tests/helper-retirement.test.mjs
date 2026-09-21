import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { test } from 'node:test'
import { build } from 'esbuild'

const result = await build({
  stdin: {
    contents:
      "export { removeRetiredMenus, registerMenuFilter } from './src/router/dynamic-menu'; export { isRetiredMenu } from './src/app/menu-policy'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  packages: 'external',
})
const { removeRetiredMenus, registerMenuFilter, isRetiredMenu } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
)
registerMenuFilter(menu => !isRetiredMenu(menu))

test('缓存中的智能助手目录及其子菜单不会重新显示', () => {
  const menus = [
    { name: 'aweme', path: '/aweme' },
    { name: 'helper', path: '/helper/', children: [{ name: 'renamed-rule', path: '/custom-rule' }] },
    { name: 'settings', path: '/settings' },
  ]
  assert.deepEqual(removeRetiredMenus(menus), [menus[0], menus[2]])
})

test('移走或改名的助手页面按路径、权限名和组件路径清理', () => {
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
  assert.deepEqual(removeRetiredMenus(menus)[0].children, [{ name: 'aweme', path: '/aweme' }])
  assert.deepEqual(menus, before)
})

test('相似名称和其他业务保留，已有下线菜单过滤继续有效', () => {
  const kept = [
    { name: 'helper-tools', path: '/helper-tools', component: 'helper-tools/views/index' },
    { name: 'helperExtra', path: '/helperExtra' },
    { name: 'ai', path: '/ai' },
    { name: 'aweme', path: '/aweme' },
  ]
  const retired = ['/marketing/calendar', '/live', '/yuntu', '/comp'].map(path => ({ path }))
  assert.deepEqual(removeRetiredMenus([...kept, ...retired]), kept)
})
