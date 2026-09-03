import { create } from 'zustand'

export interface ResourceItem {
  id: string | number
  name: string
  url: string
  type: 'image' | 'file'
  size?: number
}

interface ResourceState {
  items: ResourceItem[]
  add: (item: ResourceItem) => void
  remove: (id: ResourceItem['id']) => void
  clear: () => void
}

export const useResourceStore = create<ResourceState>((set) => ({
  items: [],
  add: item => set(state => ({ items: [...state.items.filter(existing => existing.id !== item.id), item] })),
  remove: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
  clear: () => set({ items: [] }),
}))

export default useResourceStore
