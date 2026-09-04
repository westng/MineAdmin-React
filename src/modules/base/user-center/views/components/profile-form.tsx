import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Check, LoaderCircle, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { upload } from '@/modules/base/user-center/api/attachment'
import { updateCurrentUser } from '@/modules/base/account-settings/api/account'
import type { UserInfo } from '@/store/modules/useUserStore'
import { ProfileAvatar } from './profile-avatar'

interface ProfileFormProps {
  userInfo: UserInfo
  onUserInfoChange: (userInfo: UserInfo) => void
}

function responseMessage(response: { data?: { code?: number; message?: string } }) {
  return response.data?.message || '操作失败'
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function ProfileRow({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-b px-4 py-4 md:grid-cols-[20rem_minmax(0,1fr)] md:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function ReadonlyInput({ id, value }: { id: string; value: string }) {
  return <Input id={id} value={value} readOnly aria-readonly="true" />
}

export function ProfileForm({ userInfo, onUserInfoChange }: ProfileFormProps) {
  const displayName = userInfo.nickname || userInfo.username || '管理员'
  const [nickname, setNickname] = useState(userInfo.nickname || '')
  const [signed, setSigned] = useState(userInfo.signed || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const role = userInfo.roles?.map(item => item.name || item.code).filter(Boolean).join('、') || '未设置'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const nextNickname = nickname.trim()
    if (!nextNickname) {
      setMessage({ type: 'error', text: '请输入姓名' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const nextSigned = signed.trim()
      const response = await updateCurrentUser({ nickname: nextNickname, signed: nextSigned })
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      onUserInfoChange({ ...userInfo, nickname: nextNickname, signed: nextSigned })
      setMessage({ type: 'success', text: '资料保存成功' })
    }
    catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, '资料保存失败') })
    }
    finally {
      setSaving(false)
    }
  }

  function cancelChanges() {
    setNickname(userInfo.nickname || '')
    setSigned(userInfo.signed || '')
    setSubmitted(false)
    setMessage(null)
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' })
      return
    }

    setUploading(true)
    setMessage(null)
    try {
      const uploadResponse = await upload(file)
      if (uploadResponse.data.code !== 200) throw new Error(responseMessage(uploadResponse))
      const avatar = uploadResponse.data.data?.url
      if (!avatar) throw new Error('头像上传成功，但未返回图片地址')
      const updateResponse = await updateCurrentUser({ avatar })
      if (updateResponse.data.code !== 200) throw new Error(responseMessage(updateResponse))
      onUserInfoChange({ ...userInfo, avatar })
      setMessage({ type: 'success', text: '头像更新成功' })
    }
    catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, '头像更新失败') })
    }
    finally {
      setUploading(false)
    }
  }

  async function removeAvatar() {
    if (!userInfo.avatar) return
    setUploading(true)
    setMessage(null)
    try {
      const response = await updateCurrentUser({ avatar: '' })
      if (response.data.code !== 200) throw new Error(responseMessage(response))
      onUserInfoChange({ ...userInfo, avatar: null })
      setMessage({ type: 'success', text: '头像已移除' })
    }
    catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, '头像移除失败') })
    }
    finally {
      setUploading(false)
    }
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="gap-0 border-b px-4 py-3">
        <CardTitle>我的资料</CardTitle>
        <CardDescription>公开账户详情</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form id="profile-form" onSubmit={submit} noValidate>
          <ProfileRow label="头像" description="显示在评论和提及中。">
            <div className="flex flex-wrap items-center gap-2">
              <ProfileAvatar name={displayName} avatar={userInfo.avatar} size="default" />
              <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                {uploading ? '上传中…' : '更换'}
              </Button>
              {userInfo.avatar && <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => void removeAvatar()}><X aria-hidden="true" />移除</Button>}
            </div>
          </ProfileRow>

          <ProfileRow label="姓名" description="用于工作区显示。">
            <Field data-invalid={submitted && !nickname.trim()}>
              <FieldLabel htmlFor="profile-nickname" className="sr-only">姓名</FieldLabel>
              <Input id="profile-nickname" value={nickname} maxLength={255} autoComplete="name" onChange={event => setNickname(event.target.value)} />
              {submitted && !nickname.trim() && <FieldError>请输入姓名</FieldError>}
            </Field>
          </ProfileRow>

          <ProfileRow label="邮箱地址" description="主要登录邮箱。">
            <ReadonlyInput id="profile-email" value={userInfo.email || '未绑定邮箱'} />
          </ProfileRow>

          <ProfileRow label="用户名" description="用于提及和链接。">
            <ReadonlyInput id="profile-username" value={`@${userInfo.username || '未设置'}`} />
          </ProfileRow>

          <ProfileRow label="资料详情" description="在工作区公开的详细信息。">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="profile-role">角色</FieldLabel>
                <ReadonlyInput id="profile-role" value={role} />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-timezone">时区</FieldLabel>
                <ReadonlyInput id="profile-timezone" value="未配置" />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="profile-website">网站</FieldLabel>
                <ReadonlyInput id="profile-website" value="未配置" />
              </Field>
            </div>
          </ProfileRow>

          <ProfileRow label="个人简介" description="简短的资料摘要。">
            <Field>
              <FieldLabel htmlFor="profile-signed" className="sr-only">个人简介</FieldLabel>
              <Textarea id="profile-signed" value={signed} maxLength={255} rows={3} placeholder="请输入个人简介" onChange={event => setSigned(event.target.value)} />
              <FieldDescription>最多 255 个字符。</FieldDescription>
            </Field>
          </ProfileRow>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {message && (
          <div className={`mr-auto flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-success-foreground' : 'text-destructive'}`} role="status">
            {message.type === 'success' && <Check className="size-4" aria-hidden="true" />}
            {message.text}
          </div>
        )}
        <Button type="button" variant="outline" onClick={cancelChanges} disabled={saving || uploading}>取消</Button>
        <Button type="submit" form="profile-form" disabled={saving || uploading}>
          {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {saving ? '保存中…' : '保存更改'}
        </Button>
      </CardFooter>
    </Card>
  )
}
