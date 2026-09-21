import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { ExternalLink, FileCode2, ShieldCheck } from 'lucide-react'
import { createElement } from 'react'
import { Link, matchRoutes, useLocation } from 'react-router-dom'
import { Badge } from '@/components/reui/primitives/badge'
import { Button } from '@/components/reui/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/reui/primitives/card'
import { useRoute } from '@/hooks/framework/use-route'
import { useSession } from '@/hooks/framework/use-session'
import { useRuntime } from '@/hooks/framework/use-runtime'
import { flattenVisibleMenus, getMenuLabel, getMenuPath, getMenuType } from '@/router/dynamic-menu'
import IframeView from '@/layouts/components/iframe'

const tx = createTextTranslator('base.dynamic-menu.ui')

export default function DynamicMenuPageView() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const location = useLocation()
  const { menus, initialized } = useRoute()
  const loading = useSession(state => state.loading)
  const { components } = useRuntime()
  const menu = matchRoutes(
    flattenVisibleMenus(menus).flatMap(menu => {
      const path = getMenuPath(menu)
      return path ? [{ path, menu }] : []
    }),
    location.pathname,
  )?.at(-1)?.route.menu

  if (!initialized || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        {tx('正在加载权限菜单…')}
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-lg shadow-none">
          <CardHeader>
            <CardTitle>{tx('页面不存在')}</CardTitle>
            <CardDescription>{tx('当前地址没有对应的静态页面或动态菜单。')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link to="/dashboard" />}>{tx('返回 Dashboard')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const type = getMenuType(menu)
  const candidateLink = menu.meta?.link || (type === 'L' ? getMenuPath(menu) : undefined)
  let externalLink: string | undefined
  try {
    const url = new URL(candidateLink || '', window.location.origin)
    if (candidateLink && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
      externalLink = url.href
  } catch {
    /* Invalid external links are not rendered as interactive URLs. */
  }
  const resolvedView = components.resolve(menu.component)

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
            <Badge variant="outline">{tx('动态菜单')}</Badge>
          </div>
          <CardDescription>{tx('该页面来自当前登录用户的 MineAdmin 权限菜单。')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-md border p-3">
            <FileCode2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">{tx('组件')}</span>
            <code className="ml-auto truncate text-xs">{menu.component || tx('未配置')}</code>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <span className="text-muted-foreground">{tx('路由')}</span>
            <code className="ml-auto truncate text-xs">{getMenuPath(menu) || tx('未配置')}</code>
          </div>
          {externalLink && (
            <Button
              className="sm:col-span-2 sm:w-fit"
              variant="outline"
              render={<a href={externalLink} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              {tx('打开外部页面')}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
