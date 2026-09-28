import { useCallback, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useQueryTable } from '@/hooks/query/use-query-table'
import { usePermission } from '@/hooks/auth/use-permission'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { MaForm } from '@/components/ma-form'
import { MaDialog, useMaFormDialog, useMaConfirm } from '@/components/ma-dialog'
import { Button } from '@/components/reui/primitives/button'
import { useToast } from '@/components/reui/use-toast'
import { createApi, type PositionVo } from '../../api/position'
import { createViewData as createRelatedTableColumnsViewData } from '../data/related-table-columns'
import { createViewData as createDepartmentErrorViewData } from '../data/department-error'
import { getPositionFormItems, type PositionForm } from '../data/getPositionFormItems'

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentPositionsDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const tx = useTextTranslator('base.permission.department.ui')
  const { toast } = useToast()
  const { hasAuth } = usePermission()
  const api = useRuntimeFactory(createApi)
  const { getPositionTableColumns } = useRuntimeFactory(createRelatedTableColumnsViewData)
  const { departmentErrorMessage } = useRuntimeFactory(createDepartmentErrorViewData)
  const tableRef = useRef<MaProTableExpose<PositionVo>>(null)
  const queryOptions = useCallback(
    (params: Record<string, unknown>) =>
      api.page.queryOptions({
        dept_id: departmentId,
        page: Number(params.page ?? 1),
        page_size: Number(params.page_size ?? 10),
        name: typeof params.name === 'string' ? params.name.trim() : undefined,
      }),
    [api, departmentId],
  )
  const query = useQueryTable<PositionVo>(queryOptions)
  const refresh = useCallback(async () => {
    await tableRef.current?.search()
    await onChanged()
  }, [onChanged])
  const editor = useMaFormDialog<PositionForm, PositionVo | null>({
    defaultValues: () => ({ name: '' }),
    toValues: position => ({ name: position?.name ?? '' }),
    canSubmit: position => hasAuth(position?.id ? 'permission:position:update' : 'permission:position:save'),
    onSubmit: async (values, position) => {
      const payload = { dept_id: departmentId, name: values.name.trim() }
      const response = position?.id ? await api.save(position.id, payload) : await api.create(payload)
      if (response.data.code !== 200) throw new Error(response.data.message || tx('岗位保存失败'))
    },
    onSuccess: async (_values, position) => {
      toast.success(position?.id ? tx('岗位更新成功') : tx('岗位创建成功'))
      await refresh()
    },
    onError: error => toast.error(departmentErrorMessage(error, tx('岗位保存失败，请重试'))),
  })
  const confirm = useMaConfirm({
    onError: error => toast.error(departmentErrorMessage(error, tx('岗位删除失败，请重试'))),
  })
  const busy = Boolean(editor.dialogProps.loading || confirm.dialogProps.loading)
  const removePosition = useCallback(
    (position: PositionVo) => {
      if (!position.id || busy || query.loading || !hasAuth('permission:position:delete')) return
      const id = position.id
      confirm.open({
        title: tx('删除岗位'),
        description: tx('确认删除当前部门的岗位“{0}”吗？', { '0': position.name || id }),
        okVariant: 'destructive',
        onConfirm: async () => {
          if (!hasAuth('permission:position:delete')) return false
          const response = await api.deleteByIds([id])
          if (response.data.code !== 200) throw new Error(response.data.message || tx('岗位删除失败'))
          toast.success(tx('岗位删除成功'))
          await refresh()
        },
      })
    },
    [busy, query.loading, hasAuth, confirm, api, refresh, toast, tx],
  )
  useEffect(() => {
    tableRef.current?.setTableColumns(
      getPositionTableColumns({
        canEdit: hasAuth('permission:position:update'),
        canDelete: hasAuth('permission:position:delete'),
        busy,
        onEdit: editor.open,
        onDelete: removePosition,
      }),
    )
  }, [getPositionTableColumns, hasAuth, busy, editor.open, removePosition])
  return (
    <MaDialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose()
      }}
      title={tx('管理岗位')}
      description={`${tx('维护“')}${departmentName}${tx('”的岗位，新增、编辑和删除后立即生效。')}`}
      showFullscreenButton={false}
      showCloseButton={!busy}
      contentClassName="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
      footer={false}
    >
      <MaProTable<PositionVo>
        ref={tableRef}
        data={query.data}
        loading={query.loading}
        error={query.error}
        schema={{ tableColumns: [], searchItems: [{ prop: 'name', label: tx('岗位名称'), render: 'Input' }] }}
        options={{
          toolbar: true,
          searchOptions: { defaultValue: { name: '' }, foldButtonShow: false },
          onSearchReset: () => {
            toast(tx('筛选条件已重置'))
          },
          requestOptions: { api: query.request, requestKey: query.sessionVersion, requestPage: { size: 10 } },
          tableOptions: { pagination: { total: query.total }, rowKey: 'id', emptyText: tx('暂无符合条件的部门岗位') },
        }}
        toolbarLeft={
          hasAuth('permission:position:save') && (
            <Button size="sm" disabled={busy} onClick={() => editor.open(null)}>
              <Plus aria-hidden="true" />
              {tx('新增岗位')}
            </Button>
          )
        }
      />
      <div className="flex justify-end">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          {tx('关闭')}
        </Button>
      </div>
      <MaDialog
        {...editor.dialogProps}
        title={editor.data?.id ? tx('编辑岗位') : tx('新增岗位')}
        okText={tx('保存岗位')}
        cancelText={tx('取消')}
      >
        <MaForm key={editor.formKey} {...editor.formProps} items={getPositionFormItems(tx)} />
      </MaDialog>
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </MaDialog>
  )
}
