import { useEffect } from 'react'
import { Bell, LogOut, Monitor, Moon, Palette, Settings, Sun, UserRound } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'
import { Button } from '@/components/reui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/reui/primitives/dropdown-menu'
import { useSession } from '@/hooks/framework/use-session'
import { createTextTranslator, useTranslate } from '@/provider/i18n'
import { useSettingStore } from '@/provider/settings'
import { cn } from '@/utils/cn'
import { useVerveNavigation } from './navigation-context'

const tx = createTextTranslator('shell.ui')

export function VerveProfileMenu() {
  const t = useTranslate()
  const userInfo = useSession(state => state.userInfo)
  const logout = useSession(state => state.logout)
  const colorMode = useSettingStore(state => state.settings.app.colorMode)
  const setColorMode = useSettingStore(state => state.setColorMode)
  const { setNotificationsOpen, clearSection } = useVerveNavigation()
  const navigate = useNavigate()
  const displayName = userInfo?.nickname || userInfo?.username || t('管理员')
  const email = userInfo?.email || t('未绑定邮箱')
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.repeat) return
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        clearSection()
        navigate('/settings')
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault()
        void logout()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [navigate, logout, clearSection])
  const avatar = (size: 'sm' | 'default') => (
    <Avatar size={size}>
      {userInfo?.avatar && <AvatarImage src={userInfo.avatar} alt={displayName} />}
      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
        {Array.from(displayName)[0]?.toUpperCase() || 'B'}
      </AvatarFallback>
    </Avatar>
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tx('打开 {0} 的个人菜单', { '0': displayName })}
          />
        }
      >
        {avatar('sm')}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="verve-profile w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 px-1.5 py-2 font-normal">
            {avatar('default')}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm leading-5 font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs leading-4 text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<NavLink to="/settings" onClick={clearSection} />}>
            <UserRound />
            {t('个人资料')}
            <span className="ml-auto text-xs text-muted-foreground">⇧⌘P</span>
          </DropdownMenuItem>
          <DropdownMenuItem render={<NavLink to="/settings/account" onClick={clearSection} />}>
            <Settings />
            {t('账号设置')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
            <Bell />
            {t('通知')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex h-10 items-center gap-1.5 px-1.5 py-1 text-sm">
            <Palette className="size-4" />
            {t('主题')}
            <div
              role="radiogroup"
              aria-label={t('主题')}
              className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5"
            >
              {(
                [
                  { value: 'light', label: t('浅色'), icon: Sun },
                  { value: 'dark', label: t('深色'), icon: Moon },
                  { value: 'autoMode', label: t('跟随系统'), icon: Monitor },
                ] as const
              ).map(({ value, label, icon: Icon }, index, options) => (
                <Button
                  key={value}
                  role="radio"
                  aria-checked={colorMode === value}
                  aria-label={label}
                  title={label}
                  tabIndex={colorMode === value ? 0 : -1}
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    'size-7 rounded-full',
                    colorMode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                  onClick={() => setColorMode(value)}
                  onKeyDown={event => {
                    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
                    if (!offset) return
                    event.preventDefault()
                    event.stopPropagation()
                    const next = (index + offset + options.length) % options.length
                    setColorMode(options[next].value)
                    const buttons =
                      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                    buttons?.[next]?.focus()
                  }}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void logout()}>
            <LogOut />
            {t('退出登录')}
            <span className="ml-auto text-xs text-muted-foreground">⇧⌘Q</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
