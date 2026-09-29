import { createContext } from 'react'
import type { TableRequestSnapshot, TableRequestStore } from '../types/request'

/** Application-owned server state; standalone tables retain their local request implementation. */
export const TableRequestContext = createContext<((id: string) => TableRequestStore) | null>(null)
export const idleTableRequest: TableRequestSnapshot = { loading: false, active: false }
export const getIdleTableRequest = () => idleTableRequest
export const subscribeIdleTableRequest = () => () => {}
