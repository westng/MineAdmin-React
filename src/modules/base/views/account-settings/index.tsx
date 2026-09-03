import { useState, type ReactNode } from 'react'
import { Check, KeyRound, LoaderCircle, MessageSquare, MessagesSquare, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { Switch } from '@base-ui/react/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { updateCurrentUser } from '@/modules/base/api/user'
import { useUserStore, type UserInfo } from '@/store/modules/useUserStore'
import { PasswordForm } from '../user-center/components/password-form'

interface AccountSettings {
  receiveMessages: boolean
  multiDeviceLogin: boolean
  feishuAccount: string
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
    receiveMessages: typeof account.receiveMessages === 'boolean' ? account.receiveMessages : true,
    multiDeviceLogin: typeof account.multiDeviceLogin === 'boolean' ? account.multiDeviceLogin : false,
    feishuAccount: typeof account.feishuAccount === 'string' ? account.feishuAccount : '',
  }
}

function mergeAccountSettings(userInfo: UserInfo | null | undefined, account: AccountSettings) {
  const backendSetting = isRecord(userInfo?.backend_setting) ? userInfo.backend_setting : {}
  return { ...backendSetting, account }
}

function responseMessage(response: { data?: { code?: number; message?: string } }) {
  return response.data?.message || '操作失败'
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function PreferenceRow({ icon: Icon, label, description, checked, onCheckedChange }: { icon: typeof MessageSquare; label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
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

function SettingsRow({ icon: Icon, label, description, children }: { icon: typeof MessageSquare; label: string; description: string; children: ReactNode }) {
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
      <div className="min-w-0 shrink-0">{children}</div>
    </div>
  )
}

export default function AccountSettingsPage({ userInfo, onUserInfoChange }: AccountSettingsPageProps) {
  const storeUserInfo = useUserStore(state => state.userInfo)
  const setStoreUserInfo = useUserStore(state => state.setUserInfo)
  const activeUserInfo = userInfo ?? storeUserInfo
  const [settings, setSettings] = useState(() => readAccountSettings(activeUserInfo))
  const [saving, setSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function updateSetting<Key extends keyof AccountSettings>(key: Key, value: AccountSettings[Key]) {
    setSettings(current => ({ ...current, [key]: value }))
    setMessage(null)
  }

  async function saveSettings() {
    setSaving(true)
    setMessage(null)
    try {
      const backendSetting = mergeAccountSettings(activeUserInfo, settings)
      const response = await updateCurrentUser({ backend_setting: backendSetting })
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      const nextUserInfo = { ...(activeUserInfo || {}), backend_setting: backendSetting }
      onUserInfoChange?.(nextUserInfo)
      if (!userInfo) setStoreUserInfo(nextUserInfo)
      setMessage({ type: 'success', text: '账号设置已保存' })
    }
    catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, '账号设置保存失败') })
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-0 border-b px-4 py-3">
          <CardTitle>账号偏好</CardTitle>
          <CardDescription>这些设置仅作用于当前账号。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PreferenceRow icon={MessageSquare} label="是否接收消息" description="接收系统通知和工作区消息。" checked={settings.receiveMessages} onCheckedChange={checked => updateSetting('receiveMessages', checked)} />
          <PreferenceRow icon={MonitorSmartphone} label="是否多设备登录" description="允许账号同时在多个设备上保持登录。" checked={settings.multiDeviceLogin} onCheckedChange={checked => updateSetting('multiDeviceLogin', checked)} />
          <SettingsRow icon={MessagesSquare} label="飞书账号" description="绑定后可用于飞书通知和协作。">
            <div className="flex items-center gap-2">
              <Badge variant={settings.feishuAccount.trim() ? 'default' : 'outline'}>{settings.feishuAccount.trim() ? '已绑定' : '未绑定'}</Badge>
              {settings.feishuAccount.trim() && <span className="truncate text-sm text-muted-foreground">{settings.feishuAccount}</span>}
            </div>
          </SettingsRow>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {message && (
            <div className={`mr-auto flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-success-foreground' : 'text-destructive'}`} role="status">
              {message.type === 'success' && <Check className="size-4" aria-hidden="true" />}
              {message.text}
            </div>
          )}
          <Button variant="outline" onClick={() => setSettings(readAccountSettings(activeUserInfo))} disabled={saving}>取消</Button>
          <Button onClick={() => void saveSettings()} disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {saving ? '保存中…' : '保存设置'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-0 border-b px-4 py-3">
          <CardTitle>账号安全</CardTitle>
          <CardDescription>定期修改密码，保护您的账号安全。</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground"><ShieldCheck className="size-4" aria-hidden="true" /></div>
            <div>
              <p className="text-sm font-medium">登录密码</p>
              <p className="mt-0.5 text-xs text-muted-foreground">使用当前密码验证后设置新密码。</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}><KeyRound aria-hidden="true" />修改密码</Button>
        </CardContent>
      </Card>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>请输入当前密码和新的登录密码。</DialogDescription>
          </DialogHeader>
          <PasswordForm onSuccess={() => setPasswordOpen(false)} onCancel={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
