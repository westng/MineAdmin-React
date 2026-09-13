import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { URL } from 'node:url'
import { transform } from 'esbuild'

const source = await readFile(new URL('../src/router/dynamic-menu.ts', import.meta.url), 'utf8')
const { code } = await transform(source, { loader: 'ts', format: 'esm' })
const { removeRetiredMenus } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

test('缓存中的智能助手目录及其子菜单不会重新显示', () => {
  const menus = [
    { name: 'aweme', path: '/aweme' },
    { name: 'helper', path: '/helper/', children: [{ name: 'renamed-rule', path: '/custom-rule' }] },
    { name: 'settings', path: '/settings' },
  ]
  assert.deepEqual(removeRetiredMenus(menus), [menus[0], menus[2]])
})

test('移走或改名的助手页面按路径、权限名和组件路径清理', () => {
  const menus = [{
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
  }]
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
