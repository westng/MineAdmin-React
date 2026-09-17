import { Component, createElement, lazy, Suspense, useMemo, useState, type ComponentType, type ReactNode } from 'react'

type ViewModule = { default?: ComponentType }

class ViewLoadBoundary extends Component<{ children: ReactNode; label: string; retry: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? createElement('div', { role: 'alert', className: 'flex min-h-[30vh] flex-col items-center justify-center gap-3 text-sm' },
        `${this.props.label}加载失败，请重试。`,
        createElement('button', { type: 'button', onClick: this.props.retry, className: 'rounded-md border px-3 py-1.5' }, '重试'),
        createElement('button', { type: 'button', onClick: () => window.location.reload(), className: 'text-muted-foreground' }, '刷新页面'))
      : this.props.children
  }
}

/** Cache the route wrapper, but recreate rejected lazy promises on explicit retry. */
export function lazyView(loader: () => Promise<ViewModule>, label = '页面') {
  const load = async () => {
    const module = await loader()
    if (!module.default) throw new Error(`${label}组件缺少默认导出`)
    return { default: module.default }
  }
  return function LazyView(props: Record<string, unknown>) {
    const [attempt, setAttempt] = useState(0)
    const loaded = useMemo(() => ({ attempt, Component: lazy(load) }), [attempt])
    const LazyComponent = loaded.Component
    return createElement(ViewLoadBoundary, { key: loaded.attempt, label, retry: () => setAttempt(value => value + 1), children:
      createElement(Suspense,
        { fallback: createElement('div', { className: 'flex min-h-[30vh] items-center justify-center text-sm text-muted-foreground' }, `正在加载${label}…`) },
        createElement(LazyComponent, props)),
    })
  }
}
