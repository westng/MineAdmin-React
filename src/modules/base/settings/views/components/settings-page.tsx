import { Monitor, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingStore } from '@/provider/settings'
import { settingsModes } from '../data'

export default function SettingsPageView() {
  const { settings, setColorMode } = useSettingStore()
  const currentMode = settings.app.colorMode === 'autoMode' ? 'light' : settings.app.colorMode

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>系统设置</CardTitle>
          <CardDescription>调整 MineAdmin Overview 的外观和显示方式。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">主题模式</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {settingsModes.map(({ value, label, icon: Icon }) => (
                <Button key={value} type="button" variant={currentMode === value ? 'default' : 'outline'} onClick={() => setColorMode(value)}>
                  <Icon />
                  {label}
                </Button>
              ))}
              <Button type="button" variant="outline" disabled>
                <Monitor />
                跟随系统
              </Button>
            </div>
          </section>
          <p className="text-sm text-muted-foreground">菜单、导航和用户信息沿用当前 MineAdmin 路由权限配置。</p>
        </CardContent>
      </Card>
    </div>
  )
}
