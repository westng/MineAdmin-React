import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'
import { Input } from '@/components/reui/primitives/input'
import { pageUsers, type UserVo } from '@/modules/base/permission/user/api/user'
import { extractList } from '@/utils/api-data'

const tx = createTextTranslator('base.permission.user.ui')

export default function UserListPane() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const [users, setUsers] = useState<UserVo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await pageUsers({ page: 1, page_size: 50 }, signal)
      if (signal.aborted) return
      const list = extractList<UserVo>(response.data.data)
      setUsers(list)
    } catch {
      if (!signal.aborted) setError(tx('用户列表加载失败'))
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void loadUsers(controller.signal), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [loadUsers])

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.username?.toLowerCase().includes(query) ||
      user.nickname?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  })

  // 按状态分组
  const activeUsers = filteredUsers.filter(u => u.status === 1)
  const inactiveUsers = filteredUsers.filter(u => u.status !== 1)

  const initials = (name: string) => {
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?'
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-(--header-height) shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-semibold text-foreground">{tx('目录')}</span>
      </div>

      <div className="border-b border-border px-3 py-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tx('搜索用户名/手机号')}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{tx('加载中...')}</div>
        ) : (
          <>
            {activeUsers.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1">
                  <span className="text-xs font-medium text-muted-foreground">{tx('活跃用户')}</span>
                </div>
                {activeUsers.map(user => (
                  <NavLink
                    key={user.id}
                    to={`/permission/user?id=${user.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
                  >
                    <div className="relative">
                      <Avatar size="sm">
                        <AvatarImage src={user.avatar || undefined} alt="" />
                        <AvatarFallback>{initials(user.nickname || user.username || '')}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 size-2 rounded-full border border-background bg-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{user.nickname || user.username}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {user.username} ·{user.phone || tx('未设置')}
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}

            {inactiveUsers.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1">
                  <span className="text-xs font-medium text-muted-foreground">{tx('已禁用')}</span>
                </div>
                {inactiveUsers.map(user => (
                  <NavLink
                    key={user.id}
                    to={`/permission/user?id=${user.id}`}
                    className="flex items-center gap-3 px-3 py-2 opacity-60 hover:bg-muted/50"
                  >
                    <div className="relative">
                      <Avatar size="sm">
                        <AvatarImage src={user.avatar || undefined} alt="" />
                        <AvatarFallback>{initials(user.nickname || user.username || '')}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{user.nickname || user.username}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {user.username} {tx('· 已禁用')}
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}

            {filteredUsers.length === 0 && !loading && (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {searchQuery ? tx('未找到匹配的用户') : tx('暂无用户数据')}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {filteredUsers.length}
          {tx('名用户')}
        </span>
      </div>
    </div>
  )
}
