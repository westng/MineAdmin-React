import { createPluginHost } from './host'
import { routeRegistry } from '@/router/registry'
import { localeRegistry } from '@/provider/i18n/registry'
import { registerDictionary } from '@/provider/dictionary'
import { shellSlots } from '@/layouts/slots'
export const pluginHost = createPluginHost({
  route: (owner, route) => routeRegistry.register(owner, [route]),
  locale: localeRegistry.register,
  dictionary: registerDictionary,
  slot: shellSlots.register,
  toolbar: value => shellSlots.register({ ...value, slot: 'shell.toolbar' }),
})
