import { useContext } from 'react'
import { ShellContext } from '@/layouts/shell-context'
export function useShell() {
  const context = useContext(ShellContext)
  if (!context) throw new Error('useShell requires ShellProvider')
  return context
}
