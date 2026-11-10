export const themeColors = [
  { value: '#3B5BFF', label: '经典蓝' },
  { value: '#8B3DFF', label: '优雅紫' },
  { value: '#0085AD', label: '清新青' },
  { value: '#008B5D', label: '活力绿' },
  { value: '#E54800', label: '暖橙' },
  { value: '#E11D48', label: '玫瑰粉' },
  { value: '#202124', label: '经典黑' },
] as const

export type ThemeColor = (typeof themeColors)[number]['value']
