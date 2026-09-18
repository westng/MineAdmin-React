import { useStore } from 'zustand'
import type { UserState } from '@/services/auth/session-manager'
import { useRuntime } from './use-runtime'
export function useSession<T = UserState>(selector: (state: UserState) => T = state => state as unknown as T) {
  return useStore(useRuntime().session, selector)
}
