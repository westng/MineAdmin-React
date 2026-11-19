import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { inspectCrudViews } from '../scripts/check-crud-view-structure.mjs'

const page = 'sales/orders/views/index.tsx'
const data = 'sales/orders/views/data/'
const table = `import { MaProTable } from '@/components/ma-pro-table'
export default function Page() { return <MaProTable schema={{ tableColumns: columns }} /> }`
const inspect = files => inspectCrudViews(Object.entries(files).map(([file, source]) => ({ file, source })))

test('CRUD columns/search/forms belong to data factories, including independent dialogs', () => {
  for (const source of [
    "const columns: MaProTableColumns<Row>[] = [{ prop: 'id', label: 'ID' }]",
    "const columns = [{ prop: 'name', label: 'Name', width: 150 }]",
    "const columns = [{ prop: 'id', label: 'ID' }]",
    "const columns = useMemo<MaTableColumn<Row>[]>(()=>[{prop:'id',label:'ID'}],[])",
    "const columns = useMemo(()=>[{prop:'id',label:'ID'}],[])",
    "function columns(): MaTableColumn<Row>[] { return [{ prop: 'name', label: 'Name' }] }",
    "const searchItems: MaSearchItem<Row>[] = [{ prop: 'name', label: 'Name', render: 'Input' }]",
    "const fields: MaFormItem<Row>[] = [{ prop: 'name', render: 'Input' }]",
    "const View = () => <MaForm items={[{ prop: 'name', label: 'Name', render: 'Input' }]} />",
    "const View = () => <MaProTable schema={{tableColumns:[{prop:'name',label:'Name'}]}} />",
    "const View = () => <MaProTable schema={{searchItems:[{prop:'name',render:'Input'}]}} />",
  ]) {
    const failures = inspect({ [page]: table, 'sales/orders/views/components/Form.tsx': source })
    assert.ok(
      failures.some(message => message.includes('belongs in views/data factories')),
      source,
    )
  }
})

test('The complete configuration uses the canonical file for its responsibility', () => {
  const failures = inspect({
    [page]: table,
    [data + 'columns.tsx']: "export const columns: MaProTableColumns<Row>[] = [{prop:'id',label:'ID'}]",
    [data + 'filters.ts']: "export const items: MaSearchItem<Row>[] = [{prop:'id',render:'Input'}]",
    [data + 'fields.ts']: "export const items: MaFormItem<Row>[] = [{prop:'name',render:'Input'}]",
  })
  assert.equal(failures.length, 3)
  assert.ok(failures.every(message => message.includes('use getTableColumns.tsx')))
})

test('Views cannot assemble operation metadata or append an extra column', () => {
  const failures = inspect({
    [page]: `${table}
      columns.splice(1, 0, {prop: 'metric', label: 'Metric', cellRender: renderMetric})
      const operations = {operationConfigure: {actions: [{name:'edit',text:'Edit',onClick:edit}]}}
    `,
  })
  assert.ok(failures.some(message => message.includes('do not append configuration')))
  assert.ok(failures.some(message => message.includes('belongs in views/data factories')))
})

test('An operation column cannot render its own buttons, even inside the correct data file', () => {
  for (const identity of ["type:'operation'", "prop:'operation'", "label: tx('操作')", "label:'Actions'"]) {
    const failures = inspect({
      [page]: table,
      [data + 'getTableColumns.tsx']:
        `export const columns = [{${identity},cellRender:({row})=><Button onClick={()=>edit(row)}>Edit</Button>}]`,
    })
    assert.ok(
      failures.some(message => message.includes('operationConfigure.actions, not cellRender')),
      identity,
    )
  }
})

test('Configuration factories reject Hooks, aliased Hooks and default application dependencies', () => {
  for (const source of [
    "import { useMemo } from 'react'; export function getTableColumns(){return useMemo(()=>[],[])}",
    "import { useState as state } from 'react'; export function getFormItems(){return state([])[0]}",
    "import React from 'react'; export function getFormItems(){return React.useContext(Context)}",
    "import app from '@application'; export const columns=app.columns",
    "import { runtime as app } from '@/app/runtime/instance'; export const columns=app.columns",
  ]) {
    assert.ok(inspect({ [page]: table, [data + 'getTableColumns.tsx']: source }).length, source)
  }
})

test('Locale-dependent configuration is created inside useMemo, not at module load or each render', () => {
  for (const source of [
    'const columns = getTableColumns({tx,hasAuth,onEdit})',
    'const searchItems = getSearchItems()',
    'function Form(){return <MaForm items={getFormItems(tx,editing)}/>}',
  ]) {
    const failures = inspect({ [page]: table + '\n' + source })
    assert.ok(
      failures.some(message => message.includes('useMemo and complete dependencies')),
      source,
    )
  }
})

test('Injected callbacks, data cell links, search factories and backend-provided fields remain valid', () => {
  assert.deepEqual(
    inspect({
      [page]: `import { MaProTable as Results } from '@/components/ma-pro-table'
        import { useMemo as memo } from 'react'
        function Page({tx,hasAuth,onEdit,fields}) {
          const columns: MaProTableColumns<Row>[] = memo(()=>getTableColumns({tx,hasAuth,onEdit}),[tx,hasAuth,onEdit])
          const items = memo(()=>getSearchItems(tx),[tx])
          const form = memo(()=>getFormItems(tx),[tx])
          const inspectCurrentColumns = () => tableRef.current?.getTableColumns()
          return <><Results schema={{tableColumns:columns,searchItems:items}}/>
            <MaForm items={form}/><MaForm items={fields}/>
            <MaDescriptions items={[{label:'Name',value:'An order'}]}/></>
        }`,
      [data + 'getTableColumns.tsx']: `
        export function getTableColumns({tx,hasAuth,onEdit}): MaProTableColumns<Row>[] {return [
          {prop:'name',label:tx('Name'),cellRender:({row})=><Link to={row.url}>{row.name}</Link>},
          {type:'operation',operationConfigure:{actions:[{name:'edit',text:tx('Edit'),show:()=>hasAuth('edit'),onClick:({row})=>onEdit(row)}]}}
        ]}`,
      [data + 'getSearchItems.ts']:
        "export function getSearchItems(tx):MaSearchItem<Row>[] {return [{prop:'name',label:tx('Name'),render:'Input'}]}",
      [data + 'getFormItems.ts']:
        `export function getFormItems(tx):MaFormItem<Row>[] {return [{prop:'name',label:tx('Name')}]}
        export function getDefaultFormItems(tx) {return [{prop:'name',label:tx('Name')}]}`,
    }),
    [],
  )
})

test('Form and search configuration ownership does not depend on a table', () => {
  for (const source of [
    'export default function Page(){return <MaForm items={[{prop:"code",render:"Input"}]}/>} ',
    'const Page=()=> <MaSearch items={[{prop:"name",label:"Name"}]}/>',
    'import {MaForm as Editor} from "@/components/ma-form"; const Page=()=> <Editor items={[{prop:"name",label:"Name"}]}/>',
    'const fields:MaFormItem<Model>[]=[{prop:"name",label:"Name"}]; const Page=()=> <MaForm items={fields}/>',
    'const fields=useMemo(()=>[{prop:"name",render:"Input"}],[]); const Page=()=> <MaForm items={fields}/>',
  ]) {
    assert.ok(
      inspect({ [page]: source }).some(message => message.includes('belongs in views/data factories')),
      source,
    )
  }
  assert.ok(
    inspect({
      [page]: 'const Page=()=> <MaForm items={fields}/>',
      [data + 'state.ts']: 'export const fields:MaFormItem<Model>[]=[{prop:"name",render:"Input"}]',
    }).some(message => message.includes('use getTableColumns.tsx')),
  )
})

test('Non-table forms accept canonical factories and backend-provided fields', () => {
  assert.deepEqual(
    inspect({
      [page]:
        'function Page({fields}){const items=useMemo(()=>getFormItems(),[]); return <><MaForm items={items}/><MaForm items={fields}/></>}',
      [data + 'getFormItems.ts']:
        'export function getFormItems():MaFormItem<Model>[]{return [{prop:"name",render:"Input"}]}',
    }),
    [],
  )
})

test('One-off event validation does not require a render Memo', () => {
  assert.deepEqual(
    inspect({
      [page]: `function Page({model,tx}) {
      const items=useMemo(()=>getFormItems(model,tx),[model,tx]);
      async function save(){await validate(); const invalid=getFormSections(modelRef.current,tx).find(x=>x.invalid)}
      const validateLatest=()=>getFormItems(modelRef.current,tx).find(x=>x.invalid);
      return <><MaForm items={items} onSubmit={save}/><Button onClick={()=>getFormItems(modelRef.current,tx)}/></>
    }`,
    }),
    [],
  )
  for (const source of [
    'const items=getFormItems(); const Page=()=> <MaForm items={items}/>',
    'function Page(){const items=getFormItems(); return <MaForm items={items}/>} ',
    'const Page=()=> <MaForm items={getFormItems()}/>',
    'function Page(){return rows.map(row=><MaForm items={getFormItems(row)}/>)}',
  ])
    assert.ok(
      inspect({ [page]: source }).some(message => message.includes('useMemo and complete dependencies')),
      source,
    )
})

test('check:modules reads ignored business sources and reports their inline configuration', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'mineadmin-crud-views-'))
  try {
    for (const [file, source] of Object.entries({
      '.gitignore': 'sales/orders/\n',
      'sales/orders/api/index.ts': 'export {}',
      'sales/orders/locales/index.ts': 'export {}',
      [page]: `${table}\nconst columns=[{prop:'name',label:'Name',width:100}]`,
    })) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
      writeFileSync(path.join(root, file), source)
    }
    const checker = fileURLToPath(new URL('../scripts/check-module-structure.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' })
    assert.ifError(result.error)
    assert.equal(result.status, 1)
    assert.match(result.stdout + result.stderr, /sales\/orders\/views\/index.tsx:.*belongs in views\/data factories/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
