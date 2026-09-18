import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { toast } from '@/components/reui/use-toast'
import { useState } from 'react'
import { KeyRound, LoaderCircle, MessageSquare, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { Switch } from '@base-ui/react/switch'
import { Button } from '@/components/reui/primitives/button'
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
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'
import { updateCurrentUser } from '@/modules/base/account-settings/api/account'
import { useSession } from '@/hooks/framework/use-session'
import type { UserInfo } from '@/services/auth/session-manager'
import { PasswordForm } from '@/modules/base/user-center/views/components/password-form'

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

function mergeAccountSettings(userInfo: UserInfo | null | undefined, account: AccountSettings) {
  const backendSetting = isRecord(userInfo?.backend_setting) ? userInfo.backend_setting : {}
  const previous = isRecord(backendSetting.account) ? { ...backendSetting.account } : {}
  return { ...backendSetting, account: { ...previous, ...account } }
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
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
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

export default function AccountSettingsPage({ userInfo, onUserInfoChange }: AccountSettingsPageProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const storeUserInfo = useSession(state => state.userInfo)
  const setStoreUserInfo = useSession(state => state.setUserInfo)
  const activeUserInfo = userInfo ?? storeUserInfo
  const [settings, setSettings] = useState(() => readAccountSettings(activeUserInfo))
  const [saving, setSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  function updateSetting<Key extends keyof AccountSettings>(key: Key, value: AccountSettings[Key]) {
    setSettings(current => ({ ...current, [key]: value }))
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const backendSetting = mergeAccountSettings(activeUserInfo, settings)
      const response = await updateCurrentUser({ backend_setting: backendSetting })
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      const nextUserInfo = { ...(activeUserInfo || {}), backend_setting: backendSetting }
      onUserInfoChange?.(nextUserInfo)
      if (!userInfo) setStoreUserInfo(nextUserInfo)
      toast.success(tx('账号设置已保存'))
    } catch (error) {
      toast.error(errorMessage(error, tx('账号设置保存失败')))
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
          <PreferenceRow
            icon={MonitorSmartphone}
            label={tx('是否多设备登录')}
            description={tx('允许账号同时在多个设备上保持登录。')}
            checked={settings.multiDeviceLogin}
            onCheckedChange={checked => updateSetting('multiDeviceLogin', checked)}
          />
          <ShellSlotOutlet slot="account.bindings" userId={activeUserInfo?.id} />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => setSettings(readAccountSettings(activeUserInfo))} disabled={saving}>
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
            <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </div>
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
