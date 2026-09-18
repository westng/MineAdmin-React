import type { PluginDefinition } from '@/provider/plugins/host'
import { HelloPanel } from './hello-panel'
export const helloPlugin: PluginDefinition = {
  manifest: { id: 'example.hello', version: '1.0.0', coreApi: 1, capabilities: ['toolbar', 'locale'] },
  setup(ctx) {
    ctx.registerToolbar({ id: 'example.hello.toolbar', slot: 'shell.toolbar', component: HelloPanel })
    ctx.registerLocale({
      id: 'example.hello.zh_CN',
      locale: 'zh_CN',
      namespace: 'example.hello',
      messages: { title: '示例' },
    })
  },
}
