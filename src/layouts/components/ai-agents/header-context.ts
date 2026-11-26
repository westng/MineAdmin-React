import { createContext } from 'react'

/** Shell supplies heading semantics and locale labels; standalone headers need no Runtime. */
export const AiAgentsHeaderContext = createContext({
  titleId: undefined as string | undefined,
  drawer: false,
  newSessionLabel: '新建会话',
  historyLabel: '历史会话',
})
