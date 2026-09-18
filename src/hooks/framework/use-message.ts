export type MessageLevel = 'success' | 'error' | 'warning' | 'info'

export interface MessagePayload {
  level: MessageLevel
  message: string
}

function emit(payload: MessagePayload) {
  window.dispatchEvent(new CustomEvent('mine:message', { detail: payload }))
}

export function useMessage() {
  return {
    success: (message: string) => emit({ level: 'success', message }),
    error: (message: string) => emit({ level: 'error', message }),
    warning: (message: string) => emit({ level: 'warning', message }),
    info: (message: string) => emit({ level: 'info', message }),
  }
}

export default useMessage
