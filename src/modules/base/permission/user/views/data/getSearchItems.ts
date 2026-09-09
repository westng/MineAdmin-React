import type { MaSearchItem } from '@/components/ma-search'
import type { UserVo } from '../../api/user'

export type UserSearchState = {
  username: string
  nickname: string
  phone: string
  email: string
  status: string
}

export const emptySearch: UserSearchState = {
  username: '',
  nickname: '',
  phone: '',
  email: '',
  status: '',
}

export function getSearchItems(): MaSearchItem<UserVo>[] {
  return [
    { label: '用户名', prop: 'username', render: 'Input', renderProps: { placeholder: '搜索用户名' } },
    { label: '昵称', prop: 'nickname', render: 'Input', renderProps: { placeholder: '搜索昵称' } },
    { label: '手机号', prop: 'phone', render: 'Input', renderProps: { placeholder: '搜索手机号' } },
    { label: '邮箱', prop: 'email', render: 'Input', renderProps: { placeholder: '搜索邮箱' } },
    {
      label: '状态',
      prop: 'status',
      render: 'Select',
      renderProps: { options: [{ label: '启用', value: '1' }, { label: '禁用', value: '2' }] },
    },
  ]
}
