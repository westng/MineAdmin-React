import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './primitives/button'
export interface ErrorBoundaryProps {
  children: ReactNode
  label?: string
  onError?: (error: unknown, info: ErrorInfo) => void
  fallback?: (retry: () => void) => ReactNode
}
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      this.props.onError?.(error, info)
    } catch {
      /* Reporting must not break the error fallback. */
    }
  }
  retry = () => this.setState(state => ({ failed: false, attempt: state.attempt + 1 }))
  render() {
    if (this.state.failed)
      return (
        this.props.fallback?.(this.retry) ?? (
          <div role="alert" className="flex min-h-32 flex-col items-center justify-center gap-3 p-4 text-sm">
            <p>{this.props.label ?? '页面'}暂时无法显示。</p>
            <Button variant="outline" onClick={this.retry}>
              重试
            </Button>
          </div>
        )
      )
    return this.props.children
  }
}
