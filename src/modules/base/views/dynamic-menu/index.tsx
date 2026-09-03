import { ExternalLink, FileCode2, ShieldCheck } from 'lucide-react'
import { createElement } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMenuStore } from '@/store/modules/useMenuStore'
import { findMenuByPath, getMenuLabel, getMenuPath, getMenuType } from '@/router/dynamic-menu'
import { resolveView } from '@/router/component-registry'
import IframeView from '@/layouts/components/iframe'

export default function DynamicMenuPage() {
  const location = useLocation()
  const menus = useMenuStore(state => state.menus)
  const initialized = useMenuStore(state => state.initialized)
  const loading = useMenuStore(state => state.loading)
  const menu = findMenuByPath(menus, location.pathname)

  if (!initialized || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        正在加载权限菜单…
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-lg shadow-none">
          <CardHeader>
            <CardTitle>页面不存在</CardTitle>
            <CardDescription>当前地址没有对应的静态页面或动态菜单。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link to="/dashboard" />}>返回 Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const type = getMenuType(menu)
  const externalLink = menu.meta?.link || (type === 'L' ? getMenuPath(menu) : undefined)
  const resolvedView = resolveView(menu.component)

  if (type === 'I' && typeof externalLink === 'string') {
    return <IframeView src={externalLink} title={getMenuLabel(menu)} />
  }

  if (resolvedView) {
    return createElement(resolvedView)
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle>{getMenuLabel(menu)}</CardTitle>
            <Badge variant="outline">动态菜单</Badge>
          </div>
          <CardDescription>该页面来自当前登录用户的 MineAdmin 权限菜单。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-md border p-3">
            <FileCode2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">组件</span>
            <code className="ml-auto truncate text-xs">{menu.component || '未配置'}</code>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <span className="text-muted-foreground">路由</span>
            <code className="ml-auto truncate text-xs">{getMenuPath(menu) || '未配置'}</code>
          </div>
          {externalLink && (
            <Button className="sm:col-span-2 sm:w-fit" variant="outline" render={<a href={externalLink} target="_blank" rel="noreferrer" />}>
              <ExternalLink className="size-4" aria-hidden="true" />
              打开外部页面
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
