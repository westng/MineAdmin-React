import { Badge } from '@/components/reui/primitives/badge'
import { Plus, Trash2 } from 'lucide-react'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { MaProTable, type MaProTableColumns } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { Input } from '@/components/reui/primitives/input'
import type { ButtonPermission } from '../data/menu-form'

type ButtonPermissionRow = ButtonPermission & {
  onUpdate: (field: 'title' | 'code', value: string) => void
  onRemove: () => void
}

export function ButtonPermissionTable({
  value,
  onChange,
}: {
  value: ButtonPermission[]
  onChange: (value: ButtonPermission[]) => void
}) {
  const tx = useTextTranslator('base.permission.menu.ui')

  const buttonPermissionColumns: MaProTableColumns<ButtonPermissionRow>[] = [
    {
      prop: 'title',
      label: tx('按钮名称'),
      cellRender: ({ row }) => (
        <Input
          value={row.title}
          onChange={event => row.onUpdate('title', event.target.value)}
          placeholder={tx('例如：菜单列表')}
          aria-label={tx('按钮名称')}
        />
      ),
      width: 200,
      className: 'overflow-visible',
    },
    {
      prop: 'code',
      label: tx('按钮编码'),
      cellRender: ({ row }) => (
        <Input
          value={row.code}
          onChange={event => row.onUpdate('code', event.target.value)}
          placeholder={tx('例如：permission:menu:index')}
          aria-label={tx('按钮编码')}
        />
      ),
      width: 300,
      className: 'overflow-visible',
    },
    {
      type: 'operation',
      label: tx('操作'),
      width: 50,
      operationConfigure: {
        type: 'tile',
        actions: [
          {
            name: 'remove',
            text: '',
            ariaLabel: tx('删除按钮权限'),
            icon: <Trash2 aria-hidden="true" />,
            variant: 'ghost',
            size: 'icon-sm',
            onClick: ({ row }) => row.onRemove(),
          },
        ],
      },
    },
  ]

  const localeRevision = useLocaleRevision()
  void localeRevision

  function addButton() {
    onChange([...value, { title: '', code: '' }])
  }

  function removeButton(index: number) {
    const updated = [...value]
    updated.splice(index, 1)
    onChange(updated)
  }

  function updateButton(index: number, field: 'title' | 'code', fieldValue: string) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: fieldValue }
    onChange(updated)
  }

  const rows: ButtonPermissionRow[] = value.map((button, index) => ({
    ...button,
    onUpdate: (field, fieldValue) => updateButton(index, field, fieldValue),
    onRemove: () => removeButton(index),
  }))
  return (
    <MaProTable<ButtonPermissionRow>
      className="mt-5"
      data={rows}
      header={
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{tx('按钮权限')}</h3>
            <Badge variant="secondary">
              {value.length} {tx('项')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{tx('配置按钮名称和对应的权限编码。')}</p>
        </div>
      }
      toolbarRight={
        <Button type="button" size="sm" variant="outline" onClick={addButton}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          {tx('新增按钮')}
        </Button>
      }
      schema={{ tableColumns: buttonPermissionColumns }}
      options={{ tableOptions: { dense: true, showPagination: false } }}
      empty={tx('暂无按钮权限，点击右上角“新增按钮”添加。')}
    />
  )
}
