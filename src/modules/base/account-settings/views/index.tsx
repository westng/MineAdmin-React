import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { toast } from '@/components/reui/use-toast'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useBlocker } from 'react-router-dom'
import {
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  MessageSquare,
  Monitor,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
} from 'lucide-react'
import { Switch } from '@base-ui/react/switch'
import { Button } from '@/components/reui/primitives/button'
import { IconTile } from '@/components/reui/icon-tile'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/reui/primitives/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'
import { updateCurrentUser } from '@/modules/base/account-settings/api/account'
import { useSession } from '@/hooks/framework/use-session'
import type { UserInfo } from '@/services/auth/session-manager'
import type { AppSettings } from '@/types/global'
import { PasswordForm } from '@/modules/base/user-center/views/components/password-form'
import { ThemeColorPicker } from '@/components/reui/theme-color-picker'
import { useSettingStore } from '@/provider/settings'
import { themeColors } from '@/provider/settings/colors'
import { settingsModes } from '@/modules/base/settings/views/data'
import { layoutRegistry } from '@/layouts/builtins'
import { cn } from '@/utils/cn'

const tx = createTextTranslator('base.account-settings.ui')

interface AccountSettings {
  multiDeviceLogin: boolean
}

interface AccountSettingsPageProps {
  userInfo?: UserInfo | null
  onUserInfoChange?: (userInfo: UserInfo) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readAccountSettings(userInfo: UserInfo | null | undefined): AccountSettings {
  const backendSetting = userInfo?.backend_setting
  const account = isRecord(backendSetting) && isRecord(backendSetting.account) ? backendSetting.account : {}
  return {
    multiDeviceLogin: typeof account.multiDeviceLogin === 'boolean' ? account.multiDeviceLogin : false,
  }
}

function mergeAccountSettings(userInfo: UserInfo | null | undefined, account: AccountSettings, app: AppSettings) {
  const backendSetting = isRecord(userInfo?.backend_setting) ? userInfo.backend_setting : {}
  const previousApp = isRecord(backendSetting.app) ? { ...backendSetting.app } : {}
  const previous = isRecord(backendSetting.account) ? { ...backendSetting.account } : {}
  return { ...backendSetting, app: { ...previousApp, ...app }, account: { ...previous, ...account } }
}

function appearanceSettings(app: AppSettings) {
  return { colorMode: app.colorMode, primaryColor: app.primaryColor, layout: app.layout }
}

function isColorMode(value: unknown): value is AppSettings['colorMode'] {
  return value === 'light' || value === 'dark' || value === 'autoMode'
}

function savedAppearanceSettings(userInfo: UserInfo | null | undefined, fallback: AppSettings) {
  const backendSetting = userInfo?.backend_setting
  const app = isRecord(backendSetting) && isRecord(backendSetting.app) ? backendSetting.app : {}
  return {
    colorMode: isColorMode(app.colorMode) ? app.colorMode : fallback.colorMode,
    primaryColor: typeof app.primaryColor === 'string' ? app.primaryColor : fallback.primaryColor,
    layout: typeof app.layout === 'string' ? app.layout : fallback.layout,
  }
}

function responseMessage(response: { data?: { code?: number; message?: string } }) {
  return response.data?.message || tx('操作失败')
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
    return error.message
  return fallback
}

function PreferenceRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof MessageSquare
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <div className="flex items-center justify-between gap-6 border-b px-4 py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </IconTile>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        nativeButton
        render={<button type="button" aria-label={label} />}
        className="flex h-5 w-9 shrink-0 items-center rounded-full border border-input bg-muted p-0.5 transition-colors outline-none data-checked:border-primary data-checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Switch.Thumb className="size-3.5 rounded-full bg-foreground transition-transform data-checked:translate-x-4 data-checked:bg-primary-foreground" />
      </Switch.Root>
    </div>
  )
}

function LayoutPreview({ kind }: { kind: string }) {
  if (kind === 'columns') {
    return (
      <span aria-hidden="true" className="flex h-10 w-[4.5rem] gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5">
        <span className="w-1.5 shrink-0 rounded-[2px] bg-primary" />
        <span className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[3px] border border-primary/30">
          <span className="h-1.5 shrink-0 border-b border-primary/20 bg-primary/10" />
          <span className="flex min-h-0 flex-1">
            <span className="w-1/4 border-r border-primary/20 bg-primary/45" />
            <span className="min-w-0 flex-1 bg-primary/15" />
          </span>
        </span>
      </span>
    )
  }

  if (kind === 'mixed') {
    return (
      <span className="flex h-10 w-[4.5rem] flex-col gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5">
        <span className="h-1/5 rounded-[2px] bg-primary" />
        <span className="flex min-h-0 flex-1 gap-0.5">
          <span className="w-1/4 rounded-[2px] bg-primary/55" />
          <span className="min-w-0 flex-1 rounded-[2px] bg-primary/15" />
        </span>
      </span>
    )
  }

  return (
    <span className="flex h-10 w-[4.5rem] gap-0.5 overflow-hidden rounded-[3px] bg-muted/30 p-0.5">
      <span className="w-1/4 rounded-[2px] bg-primary" />
      <span className="min-w-0 flex-1 rounded-[2px] bg-primary/25" />
    </span>
  )
}

function LayoutPicker({
  layouts,
  value,
  onChange,
}: {
  layouts: readonly { id: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={tx('布局')} className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">
      {layouts.map((layout, index) => {
        const selected = value === layout.id
        return (
          <button
            key={layout.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={layout.label}
            title={layout.label}
            tabIndex={selected || (!layouts.some(item => item.id === value) && index === 0) ? 0 : -1}
            onClick={() => onChange(layout.id)}
            onKeyDown={event => {
              const delta = ['ArrowRight', 'ArrowDown'].includes(event.key)
                ? 1
                : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                  ? -1
                  : 0
              if (!delta) return
              event.preventDefault()
              const next = (index + delta + layouts.length) % layouts.length
              onChange(layouts[next].id)
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
            }}
            className={cn(
              'flex h-[3.75rem] w-[5.25rem] items-center justify-center rounded-md border-2 bg-background p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50',
            )}
          >
            <LayoutPreview kind={layout.id} />
          </button>
        )
      })}
    </div>
  )
}

export default function AccountSettingsPage({ userInfo, onUserInfoChange }: AccountSettingsPageProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const storeUserInfo = useSession(state => state.userInfo)
  const setStoreUserInfo = useSession(state => state.setUserInfo)
  const activeUserInfo = userInfo ?? storeUserInfo
  const appSettings = useSettingStore(state => state.settings.app)
  const setColorMode = useSettingStore(state => state.setColorMode)
  const setPrimaryColor = useSettingStore(state => state.setPrimaryColor)
  const setSystemSettings = useSettingStore(state => state.setSettings)
  const layouts = useSyncExternalStore(layoutRegistry.subscribe, layoutRegistry.getSnapshot, layoutRegistry.getSnapshot)
  const [settings, setSettings] = useState(() => readAccountSettings(activeUserInfo))
  const [selectedLayout, setSelectedLayout] = useState(appSettings.layout)
  const [savedSettings, setSavedSettings] = useState(() => ({
    account: readAccountSettings(activeUserInfo),
    app: savedAppearanceSettings(activeUserInfo, appSettings),
  }))
  const [saving, setSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const hasUnsavedChanges =
    settings.multiDeviceLogin !== savedSettings.account.multiDeviceLogin ||
    appSettings.colorMode !== savedSettings.app.colorMode ||
    appSettings.primaryColor !== savedSettings.app.primaryColor ||
    selectedLayout !== savedSettings.app.layout
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (hasUnsavedChanges || saving) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  )

  useEffect(() => {
    if (!hasUnsavedChanges && !saving) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsavedChanges, saving])

  function discardChanges() {
    setSettings(savedSettings.account)
    setSelectedLayout(savedSettings.app.layout)
    setSystemSettings({ app: { ...useSettingStore.getState().settings.app, ...savedSettings.app } })
    setColorMode(savedSettings.app.colorMode)
  }

  function updateSetting<Key extends keyof AccountSettings>(key: Key, value: AccountSettings[Key]) {
    setSettings(current => ({ ...current, [key]: value }))
  }

  function updateLayout(layout: string) {
    setSelectedLayout(layout)
    setSystemSettings({ app: { ...useSettingStore.getState().settings.app, layout } })
  }

  async function saveSettings(leaveAfterSave = false) {
    setSaving(true)
    try {
      const nextAppSettings = { ...appSettings, layout: selectedLayout }
      const backendSetting = mergeAccountSettings(activeUserInfo, settings, nextAppSettings)
      const response = await updateCurrentUser({ backend_setting: backendSetting })
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      const nextUserInfo = { ...(activeUserInfo || {}), backend_setting: backendSetting }
      onUserInfoChange?.(nextUserInfo)
      if (!userInfo) setStoreUserInfo(nextUserInfo)
      setSavedSettings({ account: settings, app: appearanceSettings(nextAppSettings) })
      // Continue the blocked navigation before applying a layout that may remount this page.
      if (leaveAfterSave && blocker.state === 'blocked') blocker.proceed()
      setSystemSettings({ app: { ...useSettingStore.getState().settings.app, layout: selectedLayout } })
      toast.success(tx('账号设置已保存'))
      return true
    } catch (error) {
      toast.error(errorMessage(error, tx('账号设置保存失败')))
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-0 border-b px-4 py-3">
          <CardTitle>{tx('账号偏好')}</CardTitle>
          <CardDescription>{tx('这些设置仅作用于当前账号。')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ShellSlotOutlet slot="account.preferences" />
          <fieldset disabled={saving} className="min-w-0">
            <div className="border-b px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <Palette className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tx('主题')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择浅色、深色或跟随系统。')}</p>
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">
                  {settingsModes.map(({ value, icon: Icon }) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={appSettings.colorMode === value ? 'default' : 'outline'}
                      onClick={() => setColorMode(value)}
                    >
                      <Icon aria-hidden="true" />
                      {tx(value === 'light' ? '浅色' : '深色')}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={appSettings.colorMode === 'autoMode' ? 'default' : 'outline'}
                    onClick={() => setColorMode('autoMode')}
                  >
                    <Monitor aria-hidden="true" />
                    {tx('跟随系统')}
                  </Button>
                </div>
              </div>
            </div>
            <div className="border-b px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <Palette className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tx('配色')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择界面的主题配色。')}</p>
                </div>
                <ThemeColorPicker
                  className="ml-auto shrink-0"
                  colors={themeColors}
                  value={appSettings.primaryColor}
                  onChange={setPrimaryColor}
                />
              </div>
            </div>
            <div className="border-b px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tx('布局')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择主导航布局。')}</p>
                </div>
                <LayoutPicker
                  layouts={layouts.filter(layout => layout.enabled !== false)}
                  value={layoutRegistry.resolve(selectedLayout).id}
                  onChange={updateLayout}
                />
              </div>
            </div>
            <PreferenceRow
              icon={MonitorSmartphone}
              label={tx('是否多设备登录')}
              description={tx('允许账号同时在多个设备上保持登录。')}
              checked={settings.multiDeviceLogin}
              onCheckedChange={checked => updateSetting('multiDeviceLogin', checked)}
            />
          </fieldset>
          <ShellSlotOutlet slot="account.bindings" userId={activeUserInfo?.id} />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={discardChanges} disabled={saving}>
            {tx('取消')}
          </Button>
          <Button onClick={() => void saveSettings()} disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {saving ? tx('保存中…') : tx('保存设置')}
          </Button>
        </CardFooter>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-0 border-b px-4 py-3">
          <CardTitle>{tx('账号安全')}</CardTitle>
          <CardDescription>{tx('定期修改密码，保护您的账号安全。')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <IconTile variant="elevated" size="sm" className="text-muted-foreground">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </IconTile>
            <div>
              <p className="text-sm font-medium">{tx('登录密码')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{tx('使用当前密码验证后设置新密码。')}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound aria-hidden="true" />
            {tx('修改密码')}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={open => {
          if (!open && !saving && blocker.state === 'blocked') blocker.reset()
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>{tx('是否保存账号偏好？')}</DialogTitle>
            <DialogDescription>{tx('您有尚未保存的修改，离开前是否保存？')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => blocker.state === 'blocked' && blocker.reset()}>
              {tx('继续编辑')}
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                discardChanges()
                if (blocker.state === 'blocked') blocker.proceed()
              }}
            >
              {tx('放弃修改')}
            </Button>
            <Button disabled={saving} onClick={() => void saveSettings(true)}>
              {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {saving ? tx('保存中…') : tx('保存并离开')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tx('修改密码')}</DialogTitle>
            <DialogDescription>{tx('请输入当前密码和新的登录密码。')}</DialogDescription>
          </DialogHeader>
          <PasswordForm onSuccess={() => setPasswordOpen(false)} onCancel={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
