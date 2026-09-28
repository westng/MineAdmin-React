import type { PluginConfig } from '@/provider/plugins/host'

export default {
  config: { enable: true, info: { name: 'Report example', version: '1.0.0' } },
  views: [
    {
      name: 'example:report:help',
      path: '/examples/help',
      component: () => import('./views/help'),
      meta: { title: '插件帮助' },
    },
  ],
} satisfies PluginConfig
