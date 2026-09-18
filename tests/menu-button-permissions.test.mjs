import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

// 执行页面实际使用的转换函数，避免为测试重构正在使用的菜单组件。
async function readFunctions(path, names) {
  const source = ts.createSourceFile(
    String(path),
    await readFile(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return names.map(name => {
    const node = source.statements.find(
      statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
    )
    assert.ok(node, `缺少函数 ${name}`)
    return node.getText(source).replace(/^export\s+/, '')
  })
}

const pagePath = new URL(
  '../src/modules/base/permission/menu/views/components/permission-menu-page.tsx',
  import.meta.url,
)
const source = [
  ...(await readFunctions(new URL('../src/router/dynamic-menu.ts', import.meta.url), ['getMenuType'])),
  ...(await readFunctions(pagePath, ['toForm', 'toPayload'])),
  'return { toForm, toPayload }',
].join('\n')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
})
const { toForm, toPayload } = new Function(outputText)()

function menu() {
  return {
    id: 632,
    parent_id: 0,
    name: 'feishu:connection',
    path: '/feishu/connection',
    component: 'feishu/connection/views/index',
    status: 1,
    meta: { type: 'M', title: '飞书连接管理' },
    children: [
      { id: 701, name: 'feishu:connection:list', meta: { type: 'B', title: '查看飞书连接', i18n: 'feishu.view' } },
      { id: 702, name: 'feishu:connection:update', meta: { type: 'B', title: '编辑飞书连接' } },
      { id: 703, name: 'child-page', meta: { type: 'M', title: '子页面' } },
    ],
  }
}

test('编辑菜单保留按钮 ID、编码和翻译键，并提交后端必需的按钮类型', () => {
  const form = toForm(menu())
  form.title = '新的菜单名称'
  const payload = toPayload(form)
  assert.equal(payload.id, 632)
  assert.equal(payload.parent_id, 0)
  assert.equal(payload.meta.title, '新的菜单名称')
  assert.deepEqual(payload.btnPermission, [
    { id: 701, title: '查看飞书连接', code: 'feishu:connection:list', type: 'B', i18n: 'feishu.view' },
    { id: 702, title: '编辑飞书连接', code: 'feishu:connection:update', type: 'B', i18n: '' },
  ])
})

test('新增按钮补齐类型与空翻译键，转换过程不修改表单状态', () => {
  const form = toForm(menu())
  form.btnPermission.push({ title: '测试飞书连接', code: 'feishu:connection:test' })
  const before = structuredClone(form)
  assert.deepEqual(toPayload(form).btnPermission.at(-1), {
    title: '测试飞书连接',
    code: 'feishu:connection:test',
    type: 'B',
    i18n: '',
  })
  assert.deepEqual(form, before)
})

test('只删除选中的按钮，显式清空时仍提交空数组', () => {
  const form = toForm(menu())
  form.btnPermission.splice(0, 1)
  assert.deepEqual(
    toPayload(form).btnPermission.map(button => button.id),
    [702],
  )
  form.btnPermission = []
  assert.deepEqual(toPayload(form).btnPermission, [])
})
