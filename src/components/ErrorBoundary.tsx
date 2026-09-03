import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MineAdmin UI render error', error, errorInfo)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">页面渲染失败</h1>
          <p className="text-sm text-muted-foreground">请重试；如果问题持续，请联系管理员。</p>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    )
  }
}
