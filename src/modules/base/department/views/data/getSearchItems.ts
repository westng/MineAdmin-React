import type { MaSearchItem } from '@/components/ma-search'
import type { TextTranslator } from '@/services/i18n/translator'
import type { UserVo } from '../../../user/api/user'
import type { PositionVo } from '../../api/position'
import type { DepartmentRow } from './department-tree'
export function getSearchItems(tx: TextTranslator): MaSearchItem<DepartmentRow>[] {
  return [{ prop: 'name', label: tx('部门名称'), render: 'Input' }]
}
export function getLeaderSearchItems(tx: TextTranslator): MaSearchItem<UserVo>[] {
  return [
    { prop: 'username', label: tx('用户名'), render: 'Input' },
    { prop: 'nickname', label: tx('昵称'), render: 'Input' },
  ]
}
export function getPositionSearchItems(tx: TextTranslator): MaSearchItem<PositionVo>[] {
  return [{ prop: 'name', label: tx('岗位名称'), render: 'Input' }]
}
