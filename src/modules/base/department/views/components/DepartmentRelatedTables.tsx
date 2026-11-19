import { useMemo, type Ref } from 'react'
import { MaProTable, type MaProTableProps, type MaProTableExpose } from '@/components/ma-pro-table'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import type { LeaderRecord } from '../../api/leader'
import type { PositionVo } from '../../api/position'
import { createRelatedTableViewData } from '../data/getTableColumns'
import { getPositionSearchItems } from '../data/getSearchItems'

type Factory = ReturnType<typeof createRelatedTableViewData>
type LeaderProps = Parameters<Factory['getLeaderTableColumns']>[0] &
  Omit<MaProTableProps<LeaderRecord>, 'schema'> & { ref?: Ref<MaProTableExpose<LeaderRecord>> }
export function DepartmentLeaderTable({ canRemove, busy, onRemove, ...tableProps }: LeaderProps) {
  const { getLeaderTableColumns } = useRuntimeFactory(createRelatedTableViewData)
  const localeRevision = useLocaleRevision()
  const columns = useMemo(() => {
    void localeRevision
    return getLeaderTableColumns({ canRemove, busy, onRemove })
  }, [localeRevision, getLeaderTableColumns, canRemove, busy, onRemove])
  return <MaProTable<LeaderRecord> {...tableProps} schema={{ tableColumns: columns }} />
}

type PositionProps = Parameters<Factory['getPositionTableColumns']>[0] &
  Omit<MaProTableProps<PositionVo>, 'schema'> & { ref?: Ref<MaProTableExpose<PositionVo>> }
export function DepartmentPositionTable({ canEdit, canDelete, busy, onEdit, onDelete, ...tableProps }: PositionProps) {
  const { getPositionTableColumns } = useRuntimeFactory(createRelatedTableViewData)
  const tx = useTextTranslator('base.permission.department.ui')
  const columns = useMemo(() => {
    void tx
    return getPositionTableColumns({ canEdit, canDelete, busy, onEdit, onDelete })
  }, [tx, getPositionTableColumns, canEdit, canDelete, busy, onEdit, onDelete])
  const searchItems = useMemo(() => getPositionSearchItems(tx), [tx])
  return <MaProTable<PositionVo> {...tableProps} schema={{ tableColumns: columns, searchItems }} />
}
