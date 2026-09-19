import { useEffect } from 'react'
import { Bell, ChevronsUpDown, LogOut, Monitor, Moon, Palette, Settings, Sun, UserRound } from 'lucide-react'
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
import { ThemeColorPicker } from '@/components/reui/theme-color-picker'
import { useSession } from '@/hooks/framework/use-session'
import { useShell } from '@/hooks/shell/use-shell'
import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useSettingStore } from '@/provider/settings'
import { themeColors } from '@/provider/settings/colors'
import { cn } from '@/utils/cn'

const tx = createTextTranslator('shell.ui')

interface ProfileMenuProps {
  compact?: boolean
  contentClassName?: string
  onNavigate?: () => void
}

export function ProfileMenu({ compact = false, contentClassName, onNavigate }: ProfileMenuProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision
  const userInfo = useSession(state => state.userInfo)
  const logout = useSession(state => state.logout)
  const { colorMode, primaryColor } = useSettingStore(state => state.settings.app)
  const setColorMode = useSettingStore(state => state.setColorMode)
  const setPrimaryColor = useSettingStore(state => state.setPrimaryColor)
  const { setNotificationsOpen } = useShell()
  const navigate = useNavigate()
  const displayName = userInfo?.nickname || userInfo?.username || tx('管理员')
  const email = userInfo?.email || tx('未绑定邮箱')

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.repeat) return
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        onNavigate?.()
        navigate('/settings')
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault()
        void logout()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [navigate, logout, onNavigate])

  const avatar = (size: 'sm' | 'default', muted = false) => (
    <Avatar size={size}>
      {userInfo?.avatar && <AvatarImage src={userInfo.avatar} alt={displayName} />}
      <AvatarFallback
        className={cn(
          'text-xs font-semibold',
          muted ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        {Array.from(displayName.trim())[0]?.toUpperCase() || 'M'}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              'flex cursor-pointer items-center outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring',
              compact
                ? 'size-7 justify-center rounded-full'
                : 'h-12 w-full gap-2 rounded-md px-2 text-left transition-colors',
            )}
            aria-label={tx('打开 {0} 的个人菜单', { '0': displayName })}
          />
        }
      >
        {avatar('sm', compact)}
        {!compact && (
          <>
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className={cn('w-56', contentClassName)}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 px-1.5 py-2 font-normal">
            {avatar('default')}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm leading-5 font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs leading-4 text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<NavLink to="/settings" onClick={onNavigate} />}>
          <UserRound aria-hidden="true" />
          {tx('个人资料')}
          <span className="ml-auto text-xs text-muted-foreground">⇧⌘P</span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<NavLink to="/settings/account" onClick={onNavigate} />}>
          <Settings aria-hidden="true" />
          {tx('账号设置')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
          <Bell aria-hidden="true" />
          {tx('通知')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex h-10 items-center gap-1.5 px-1.5 py-1 text-sm">
          <Palette className="size-4" aria-hidden="true" />
          {tx('主题')}
          <div
            role="radiogroup"
            aria-label={tx('主题')}
            className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5"
          >
            {(
              [
                { value: 'light', label: tx('浅色'), icon: Sun },
                { value: 'dark', label: tx('深色'), icon: Moon },
                { value: 'autoMode', label: tx('跟随系统'), icon: Monitor },
              ] as const
            ).map(({ value, label, icon: Icon }, index, options) => (
              <Button
                key={value}
                type="button"
                role="radio"
                aria-checked={colorMode === value}
                aria-label={label}
                title={label}
                tabIndex={colorMode === value ? 0 : -1}
                variant="ghost"
                size="icon-xs"
                className={cn(
                  'rounded-full',
                  colorMode === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setColorMode(value)}
                onKeyDown={event => {
                  const offset = ['ArrowRight', 'ArrowDown'].includes(event.key)
                    ? 1
                    : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                      ? -1
                      : 0
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
                <Icon aria-hidden="true" />
              </Button>
            ))}
          </div>
        </div>
        <div
          className="flex h-10 items-center gap-1.5 px-1.5 py-1 text-sm"
          onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.stopPropagation()
          }}
        >
          <Palette className="size-4" aria-hidden="true" />
          {tx('配色')}
          <ThemeColorPicker
            colors={themeColors}
            value={primaryColor}
            onChange={setPrimaryColor}
            compact
            className="ml-auto gap-1"
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut aria-hidden="true" />
          {tx('退出登录')}
          <span className="ml-auto text-xs text-muted-foreground">⇧⌘Q</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
