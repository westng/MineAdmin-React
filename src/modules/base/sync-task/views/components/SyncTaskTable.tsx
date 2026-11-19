import { useMemo, type Ref } from 'react'
import { MaProTable, type MaProTableProps, type MaProTableExpose } from '@/components/ma-pro-table'
import type { SyncTask } from '../../api'
import { getTableColumns } from '../data/getTableColumns'
import { getSearchItems } from '../data/getSearchItems'

type Props = Parameters<typeof getTableColumns>[0] &
  Omit<MaProTableProps<SyncTask>, 'schema'> & { ref?: Ref<MaProTableExpose<SyncTask>> }

export default function SyncTaskTable({ tx, hasAuth, busyId, onDetail, onAction, ...tableProps }: Props) {
  const columns = useMemo(
    () => getTableColumns({ tx, hasAuth, busyId, onDetail, onAction }),
    [tx, hasAuth, busyId, onDetail, onAction],
  )
  const searchItems = useMemo(() => getSearchItems(tx), [tx])
  return <MaProTable<SyncTask> {...tableProps} schema={{ tableColumns: columns, searchItems }} />
}
