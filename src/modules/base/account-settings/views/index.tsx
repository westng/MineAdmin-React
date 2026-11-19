import { useEffect, useState, useSyncExternalStore } from 'react'
import { useBlocker } from 'react-router-dom'
import {
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  Maximize2,
  Monitor,
  MonitorSmartphone,
  PanelsTopLeft,
  Palette,
  ShieldCheck,
} from 'lucide-react'

import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createProfileApi } from '@/modules/base/user-center/api/profile'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { useToast } from '@/components/reui/use-toast'
import { Button } from '@/components/reui/primitives/button'
import { IconTile } from '@/components/reui/icon-tile'
import { MaDialog } from '@/components/ma-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/reui/primitives/card'

import { useSession } from '@/hooks/auth/use-session'
import type { UserInfo } from '@/services/auth/session-manager'
import type { AppSettings } from '@/store/settings/types'
import { PasswordForm } from '@/modules/base/user-center'
import { ThemeColorPicker } from '@/components/reui/theme-color-picker'
import { useSettingStore } from '@/store/settings/use-settings'
import { themeColors } from '@/store/settings/colors'
import { createSettingsViewData } from '@/modules/base/settings'
import type { AccountSettings } from '../api/account'

import {
  readAccountSettings,
  readTabbarEnabled,
  mergeAccountSettings,
  appearanceSettings,
  savedAppearanceSettings,
  errorMessage,
} from './data/account-settings'
import { PreferenceRow, LayoutPreview, ContentWidthPreview, PreviewPicker } from './components/PreferenceControls'

interface AccountSettingsPageProps {
  userInfo?: UserInfo | null
  onUserInfoChange?: (userInfo: UserInfo) => void
}

export default function AccountSettingsPage({ userInfo, onUserInfoChange }: AccountSettingsPageProps) {
  const { toast } = useToast()

  const { settingsModes } = useRuntimeFactory(createSettingsViewData)

  const tx = useTextTranslator('base.account-settings.ui')
  const { updateCurrentUser } = useRuntimeFactory(createProfileApi)

  const localeRevision = useLocaleRevision()
  void localeRevision

  const storeUserInfo = useSession(state => state.userInfo)
  const setStoreUserInfo = useSession(state => state.setUserInfo)
  const activeUserInfo = userInfo ?? storeUserInfo
  const appSettings = useSettingStore(state => state.settings.app)
  const setColorMode = useSettingStore(state => state.setColorMode)
  const setPrimaryColor = useSettingStore(state => state.setPrimaryColor)
  const setSystemSettings = useSettingStore(state => state.setSettings)
  const runtime = useRuntime()
  const tabbarEnabledInStore = useSettingStore(state => state.settings.tabbar.enable)
  const layoutRegistry = runtime.layouts
  const layouts = useSyncExternalStore(layoutRegistry.subscribe, layoutRegistry.getSnapshot, layoutRegistry.getSnapshot)
  const [settings, setSettings] = useState(() => readAccountSettings(activeUserInfo))
  const [tabbarEnabled, setTabbarEnabled] = useState(() => readTabbarEnabled(activeUserInfo, tabbarEnabledInStore))
  const [savedSettings, setSavedSettings] = useState(() => ({
    account: readAccountSettings(activeUserInfo),
    app: savedAppearanceSettings(activeUserInfo, appSettings),
    tabbarEnabled: readTabbarEnabled(activeUserInfo, tabbarEnabledInStore),
  }))
  const [saving, setSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const hasUnsavedChanges =
    settings.multiDeviceLogin !== savedSettings.account.multiDeviceLogin ||
    tabbarEnabled !== savedSettings.tabbarEnabled ||
    appSettings.colorMode !== savedSettings.app.colorMode ||
    appSettings.primaryColor !== savedSettings.app.primaryColor ||
    appSettings.layout !== savedSettings.app.layout ||
    appSettings.contentWidth !== savedSettings.app.contentWidth
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
    setTabbarEnabled(savedSettings.tabbarEnabled)
    const currentSettings = runtime.settings.getState().settings
    setSystemSettings({
      app: { ...currentSettings.app, ...savedSettings.app },
      tabbar: { ...currentSettings.tabbar, enable: savedSettings.tabbarEnabled },
    })
    setColorMode(savedSettings.app.colorMode)
  }

  function updateSetting<Key extends keyof AccountSettings>(key: Key, value: AccountSettings[Key]) {
    setSettings(current => ({ ...current, [key]: value }))
  }

  function updateLayout(layout: string) {
    setSystemSettings({ app: { ...runtime.settings.getState().settings.app, layout } })
  }

  function updateContentWidth(contentWidth: AppSettings['contentWidth']) {
    setSystemSettings({ app: { ...runtime.settings.getState().settings.app, contentWidth } })
  }

  function updateTabbarEnabled(enabled: boolean) {
    setTabbarEnabled(enabled)
    setSystemSettings({ tabbar: { ...runtime.settings.getState().settings.tabbar, enable: enabled } })
  }

  async function saveSettings(leaveAfterSave = false) {
    setSaving(true)
    try {
      const nextAppSettings = { ...appSettings }
      const backendSetting = mergeAccountSettings(activeUserInfo, settings, nextAppSettings, tabbarEnabled)
      await updateCurrentUser({ backend_setting: backendSetting })
      const nextUserInfo = { ...(activeUserInfo || {}), backend_setting: backendSetting }
      onUserInfoChange?.(nextUserInfo)
      if (!userInfo) setStoreUserInfo(nextUserInfo)
      setSavedSettings({ account: settings, app: appearanceSettings(nextAppSettings), tabbarEnabled })
      if (leaveAfterSave && blocker.state === 'blocked') blocker.proceed()
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
          <fieldset disabled={saving} className="@container min-w-0">
            <div className="border-b px-4 py-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 @2xl:grid-cols-[auto_minmax(0,1fr)_auto]">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <Palette className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tx('主题')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择浅色、深色或跟随系统。')}</p>
                </div>
                <div className="col-span-full flex min-w-0 flex-wrap justify-end gap-2 @2xl:col-span-1">
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
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 @2xl:grid-cols-[auto_minmax(0,1fr)_auto]">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <Palette className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tx('配色')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择界面的主题配色。')}</p>
                </div>
                <ThemeColorPicker
                  className="col-span-full justify-self-end @2xl:col-span-1"
                  colors={themeColors}
                  value={appSettings.primaryColor}
                  onChange={setPrimaryColor}
                />
              </div>
            </div>
            <div className="border-b px-4 py-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 @2xl:grid-cols-[auto_minmax(0,1fr)_auto]">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tx('布局')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择后即时预览，保存设置后保留。')}</p>
                </div>
                <PreviewPicker
                  label={tx('布局')}
                  options={layouts.filter(layout => layout.enabled !== false)}
                  value={layoutRegistry.resolve(appSettings.layout).id}
                  onChange={updateLayout}
                  renderPreview={kind => <LayoutPreview kind={kind} />}
                />
              </div>
            </div>
            <div className="border-b px-4 py-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 @2xl:grid-cols-[auto_minmax(0,1fr)_auto]">
                <IconTile variant="elevated" size="sm" className="mt-0.5 text-muted-foreground">
                  <Maximize2 className="size-4" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tx('内容宽度')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tx('选择限宽居中或占满可用宽度。')}</p>
                </div>
                <PreviewPicker
                  label={tx('内容宽度')}
                  options={[
                    { id: 'bounded', label: tx('限宽居中') },
                    { id: 'full', label: tx('全屏') },
                  ]}
                  value={appSettings.contentWidth}
                  onChange={updateContentWidth}
                  renderPreview={value => <ContentWidthPreview value={value} />}
                />
              </div>
            </div>
            <PreferenceRow
              icon={PanelsTopLeft}
              label={tx('是否开启标签页')}
              description={tx('在页面顶部显示已打开的页面标签。')}
              checked={tabbarEnabled}
              onCheckedChange={updateTabbarEnabled}
            />
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

      <MaDialog
        open={blocker.state === 'blocked'}
        onOpenChange={open => {
          if (!open && !saving && blocker.state === 'blocked') blocker.reset()
        }}
        title={tx('是否保存账号偏好？')}
        description={tx('您有尚未保存的修改，离开前是否保存？')}
        showFullscreenButton={false}
        showCloseButton={!saving}
        contentClassName="sm:max-w-md"
        footer={false}
      >
        <div className="flex justify-end gap-2">
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
        </div>
      </MaDialog>

      <MaDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title={tx('修改密码')}
        description={tx('请输入当前密码和新的登录密码。')}
        showFullscreenButton={false}
        contentClassName="sm:max-w-lg"
        footer={false}
      >
        <PasswordForm onSuccess={() => setPasswordOpen(false)} onCancel={() => setPasswordOpen(false)} />
      </MaDialog>
    </div>
  )
}
