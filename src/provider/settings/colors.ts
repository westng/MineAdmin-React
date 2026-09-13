export const themeColors = [
  { value: '#2563EB', label: '经典蓝' },
  { value: '#7C3AED', label: '优雅紫' },
  { value: '#0891B2', label: '清新青' },
  { value: '#16A34A', label: '活力绿' },
  { value: '#EA580C', label: '暖橙' },
  { value: '#DB2777', label: '玫瑰粉' },
  { value: '#18181B', label: '经典黑' },
] as const

export type ThemeColor = (typeof themeColors)[number]['value']
