import { useQueryTable } from '@/hooks/query/use-query-table'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createUserApi } from '@/modules/base/user/api/user'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useCallback, useRef, useState } from 'react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { MaDialog } from '@/components/ma-dialog'
import { useToast } from '@/components/reui/use-toast'
import { Button } from '@/components/reui/primitives/button'
import { type UserVo } from '../../../user/api/user'
import { createViewData as createRelatedTableColumnsViewData } from '../data/related-table-columns'

interface Props {
  departmentName: string
  busy: boolean
  onClose: () => void
  onAdd: (userIds: number[]) => Promise<void>
}

export function DepartmentLeaderPicker({ departmentName, busy, onClose, onAdd }: Props) {
  const { getLeaderPickerTableColumns } = useRuntimeFactory(createRelatedTableColumnsViewData)

  const tx = useTextTranslator('base.permission.department.ui')

  const { pageUsers } = useRuntimeFactory(createUserApi)

  const localeRevision = useLocaleRevision()
  void localeRevision

  const tableRef = useRef<MaProTableExpose<UserVo>>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()
  const onSelectionChange = useCallback((rows: UserVo[]) => {
    setSelectedIds(rows.flatMap(row => (row.id && row.status === 1 ? [row.id] : [])))
  }, [])

  const queryOptions = useCallback(
    (params: Record<string, unknown>) =>
      pageUsers.queryOptions({
        page: Number(params.page ?? 1),
        page_size: Number(params.page_size ?? 10),
        status: 1,
        username: typeof params.username === 'string' ? params.username.trim() : undefined,
        nickname: typeof params.nickname === 'string' ? params.nickname.trim() : undefined,
      }),
    [pageUsers],
  )
  const query = useQueryTable<UserVo>(queryOptions)
  const pending = query.loading

  return (
    <MaDialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose()
      }}
      title={tx('添加负责人')}
      description={`${tx('为“')}${departmentName}${tx('”选择已启用的用户，可在当前页多选后添加。')}`}
      showFullscreenButton={false}
      showCloseButton={!busy}
      contentClassName="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
      footer={false}
    >
      <MaProTable<UserVo>
        ref={tableRef}
        data={query.data}
        loading={query.loading}
        error={query.error}
        schema={{
          tableColumns: getLeaderPickerTableColumns(),
          searchItems: [
            { prop: 'username', label: tx('用户名'), render: 'Input' },
            { prop: 'nickname', label: tx('昵称'), render: 'Input' },
          ],
        }}
        options={{
          toolbar: true,
          searchOptions: {
            defaultValue: { username: '', nickname: '' },
            foldButtonShow: false,
            cols: { xs: 1, sm: 2 },
          },
          onSearchReset: () => {
            toast(tx('筛选条件已重置'))
          },
          requestOptions: { api: query.request, requestKey: query.sessionVersion, requestPage: { size: 10 } },
          tableOptions: { pagination: { total: query.total }, rowKey: 'id', emptyText: tx('暂无符合条件的启用用户') },
        }}
        toolbarLeft={
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {tx('已选择')}
            {selectedIds.length} {tx('人')}
          </span>
        }
        onSelectionChange={onSelectionChange}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          {tx('取消')}
        </Button>
        <Button
          disabled={busy || pending || !selectedIds.length}
          onClick={() => {
            if (!pending && !tableRef.current?.getElTableStates().loading) void onAdd(selectedIds)
          }}
        >
          {busy ? tx('添加中…') : tx('添加所选负责人')}
        </Button>
      </div>
    </MaDialog>
  )
}
