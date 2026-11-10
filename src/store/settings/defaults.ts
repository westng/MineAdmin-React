import type { SystemSettings } from '@/store/settings/types'
import { themeColors } from './colors'

const globalConfigSettings: Partial<SystemSettings> = {}

export default globalConfigSettings

export const defaultSettings: Omit<SystemSettings, 'dashboardPage'> = {
  app: {
    colorMode: 'autoMode',
    useLocale: 'zh_CN',
    whiteRoute: ['login'],
    layout: 'classic',
    contentWidth: 'bounded',
    pageAnimate: 'ma-slide-down',
    enableWatermark: false,
    primaryColor: themeColors[0].value,
    asideDark: false,
    showBreadcrumb: true,
    loadUserSetting: true,
    watermarkText: '',
  },
  mainAside: { showIcon: true, showTitle: true, enableOpenFirstRoute: false },
  subAside: { showIcon: true, showTitle: true, fixedAsideState: false, showCollapseButton: true },
  tabbar: { enable: true, mode: 'rectangle' },
  toolBars: [],
  copyright: {
    enable: true,
    dates: new Date().getFullYear().toString(),
    company: 'MineAdmin',
    website: 'https://www.mineadmin.com',
    putOnRecord: '',
  },
}
