import { useCallback, useEffect, useState } from 'react'
import { Calendar, MessageSquare, Search, UserCircle2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pageUsers, type UserVo } from '@/modules/base/permission/user/api/user'
import { extractList } from '@/utils/api-data'

export default function UserListPane() {
  const [users, setUsers] = useState<UserVo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await pageUsers({ page: 1, page_size: 50 })
      const list = extractList<UserVo>(response.data.data)
      setUsers(list)
    }
    catch (error) {
      console.error('Failed to load users:', error)
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 0)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const filteredUsers = users.filter(user => {
    if (!searchQuery)
      return true
    const query = searchQuery.toLowerCase()
    return (user.username?.toLowerCase().includes(query)
      || user.nickname?.toLowerCase().includes(query)
      || user.phone?.toLowerCase().includes(query)
      || user.email?.toLowerCase().includes(query))
  })

  // 按状态分组
  const activeUsers = filteredUsers.filter(u => u.status === 1)
  const inactiveUsers = filteredUsers.filter(u => u.status !== 1)

  const initials = (name: string) => {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?'
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-(--header-height) shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-semibold text-foreground">目录</span>
        <Button variant="ghost" size="icon-sm" aria-label="用户操作">
          <UserCircle2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="border-b border-border px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索用户名/手机号"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading
          ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">加载中...</div>
            )
          : (
              <>
                {activeUsers.length > 0 && (
                  <div className="py-2">
                    <div className="px-3 py-1">
                      <span className="text-xs font-medium text-muted-foreground">活跃用户</span>
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
                            {user.username}
                            {' '}
                            ·
                            {user.phone || '未设置'}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-xs" aria-label="消息">
                            <MessageSquare className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" aria-label="日历">
                            <Calendar className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                )}

                {inactiveUsers.length > 0 && (
                  <div className="py-2">
                    <div className="px-3 py-1">
                      <span className="text-xs font-medium text-muted-foreground">已禁用</span>
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
                            {user.username}
                            {' '}
                            · 已禁用
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-xs" aria-label="消息">
                            <MessageSquare className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" aria-label="日历">
                            <Calendar className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                )}

                {filteredUsers.length === 0 && !loading && (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    {searchQuery ? '未找到匹配的用户' : '暂无用户数据'}
                  </div>
                )}
              </>
            )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {filteredUsers.length}
          名用户
        </span>
        {activeUsers.filter(u => u.status === 2).length > 0 && (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
            {activeUsers.filter(u => u.status === 2).length}
            {' '}
            待审核
          </Badge>
        )}
      </div>
    </div>
  )
}
