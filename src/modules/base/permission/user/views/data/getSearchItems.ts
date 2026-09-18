import { createTextTranslator } from '@/provider/i18n'
import type { MaSearchItem } from '@/components/ma-search'
import type { UserVo } from '../../api/user'

const tx = createTextTranslator('base.permission.user.ui')

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
    { label: tx('用户名'), prop: 'username', render: 'Input', renderProps: { placeholder: tx('搜索用户名') } },
    { label: tx('昵称'), prop: 'nickname', render: 'Input', renderProps: { placeholder: tx('搜索昵称') } },
    { label: tx('手机号'), prop: 'phone', render: 'Input', renderProps: { placeholder: tx('搜索手机号') } },
    { label: tx('邮箱'), prop: 'email', render: 'Input', renderProps: { placeholder: tx('搜索邮箱') } },
    {
      label: tx('状态'),
      prop: 'status',
      render: 'Select',
      renderProps: {
        options: [
          { label: tx('启用'), value: '1' },
          { label: tx('禁用'), value: '2' },
        ],
      },
    },
  ]
}
