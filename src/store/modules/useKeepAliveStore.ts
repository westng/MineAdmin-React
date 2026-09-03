import { create } from 'zustand'

interface KeepAliveState {
  names: string[]
  add: (name: string) => void
  remove: (name: string) => void
  clean: () => void
  has: (name: string) => boolean
}

export const useKeepAliveStore = create<KeepAliveState>((set, get) => ({
  names: [],
  add: name => set(state => state.names.includes(name) ? state : { names: [...state.names, name] }),
  remove: name => set(state => ({ names: state.names.filter(item => item !== name) })),
  clean: () => set({ names: [] }),
  has: name => get().names.includes(name),
}))

export default useKeepAliveStore
