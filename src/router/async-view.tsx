import { createElement, useEffect, useSyncExternalStore, type ComponentType } from 'react'
import { Button } from '@/components/reui/primitives/button'
import type { ViewLoader } from './types'

type ViewSnapshot =
  { status: 'loading' } | { status: 'ready'; component: ComponentType } | { status: 'error'; error: unknown }

function createViewResource(loader: ViewLoader) {
  let snapshot: ViewSnapshot = { status: 'loading' }
  let started = false
  const listeners = new Set<() => void>()
  const publish = (next: ViewSnapshot) => {
    snapshot = next
    listeners.forEach(listener => listener())
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load(retry = false) {
      if (retry && snapshot.status === 'error') {
        started = false
        publish({ status: 'loading' })
      }
      if (started) return
      started = true
      void Promise.resolve()
        .then(loader)
        .then(module => {
          if (!module.default) throw new Error('视图缺少默认导出')
          return module.default
        })
        .then(
          component => publish({ status: 'ready', component }),
          error => publish({ status: 'error', error }),
        )
    },
  }
}

const resources = new WeakMap<ViewLoader, ReturnType<typeof createViewResource>>()
function getViewResource(loader: ViewLoader) {
  let resource = resources.get(loader)
  if (!resource) {
    resource = createViewResource(loader)
    resources.set(loader, resource)
  }
  return resource
}

/** 模块就绪时直接通知页面更新；隐藏的缓存页返回时复用同一加载结果。 */
export function AsyncView({ loader }: { loader: ViewLoader }) {
  const resource = getViewResource(loader)
  const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot)
  useEffect(() => {
    resource.load()
  }, [resource])
  if (snapshot.status === 'error')
    return (
      <div role="alert" className="flex min-h-32 flex-col items-center justify-center gap-3 p-4 text-sm">
        <p>页面加载失败，请重试。</p>
        <Button variant="outline" onClick={() => resource.load(true)}>
          重试
        </Button>
      </div>
    )
  if (snapshot.status === 'ready') return createElement(snapshot.component)
  return <p className="p-6 text-sm text-muted-foreground">正在加载页面…</p>
}
