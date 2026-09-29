import data from '@/assets/icons/catalog.json'
import { customIconUrls } from '@/utils/icons'

export const collections = [
  ...data.map(({ prefix, info, icons }) => ({ prefix, name: info.name, icons })),
  { prefix: 'custom', name: '自定义图标', icons: Object.keys(customIconUrls).sort() },
]
