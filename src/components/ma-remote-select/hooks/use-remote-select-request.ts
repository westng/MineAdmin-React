import { useContext } from 'react'
import { MaRemoteSelectRequestContext } from '../context/request-context'

export function useMaRemoteSelectRequest() {
  return useContext(MaRemoteSelectRequestContext)
}
