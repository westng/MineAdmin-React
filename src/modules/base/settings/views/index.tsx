import { useLocale } from '@/hooks/framework/use-locale'
import { useTranslate } from '@/provider/i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
import { useSyncExternalStore } from 'react'
import { layoutRegistry } from '@/layouts/builtins'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { Monitor, Palette } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/reui/primitives/card'
import { ThemeColorPicker } from '@/components/reui/theme-color-picker'
import { useSettingStore } from '@/provider/settings'
import { themeColors } from '@/provider/settings/colors'
import { settingsModes } from './data'

export default function SettingsPageView() {
  const t = useTranslate()
  const { locale, setLocale, available } = useLocale()
  const languageLabels: Record<string, string> = { zh_CN: '简体中文', zh_TW: '繁體中文', en_US: 'English' }
  const layouts = useSyncExternalStore(layoutRegistry.subscribe, layoutRegistry.getSnapshot, layoutRegistry.getSnapshot)
  const { settings, setColorMode, setPrimaryColor, setSettings } = useSettingStore()
  const currentMode = settings.app.colorMode

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
          <CardDescription>{t('settings.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{t('settings.theme')}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {settingsModes.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={currentMode === value ? 'default' : 'outline'}
                  onClick={() => setColorMode(value)}
                >
                  <Icon />
                  {t(`settings.${value}`, label)}
                </Button>
              ))}
              <Button
                type="button"
                variant={settings.app.colorMode === 'autoMode' ? 'default' : 'outline'}
                onClick={() => setColorMode('autoMode')}
              >
                <Monitor />
                {t('settings.system')}
              </Button>
            </div>
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{t('settings.colors')}</h2>
            </div>
            <ThemeColorPicker colors={themeColors} value={settings.app.primaryColor} onChange={setPrimaryColor} />
          </section>
          <section className="space-y-3" aria-labelledby="layout-title">
            <h2 id="layout-title" className="text-sm font-medium">
              {t('settings.layout')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {layouts
                .filter(layout => layout.enabled !== false)
                .map(layout => (
                  <Button
                    key={layout.id}
                    variant={layoutRegistry.resolve(settings.app.layout).id === layout.id ? 'default' : 'outline'}
                    onClick={() => setSettings({ app: { ...settings.app, layout: layout.id } })}
                  >
                    {layout.label}
                  </Button>
                ))}
            </div>
          </section>
          <section className="space-y-3" aria-labelledby="language-title">
            <h2 id="language-title" className="text-sm font-medium">
              {t('settings.language')}
            </h2>
            <Select
              value={locale}
              onValueChange={value => {
                if (value) setLocale(value)
              }}
            >
              <SelectTrigger className="w-56" aria-labelledby="language-title">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map(code => (
                  <SelectItem key={code} value={code}>
                    {languageLabels[code] || code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
          <ShellSlotOutlet slot="settings.extensions" />
          <p className="text-sm text-muted-foreground">{t('settings.notice')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
