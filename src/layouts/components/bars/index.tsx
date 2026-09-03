import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Tabbar from './tabbar'

const labels: Record<string, string> = {
  dashboard: 'Overview',
  uc: '用户中心',
  index: '个人资料',
  settings: '设置',
  account: '账号设置',
}

export default function Bars() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  return (
    <>
      <div className="flex min-h-9 items-center gap-1 border-b bg-card px-4 text-xs text-muted-foreground md:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-foreground" aria-label="首页">
          <Home className="size-3.5" />
        </Link>
        {segments.map((segment, index) => (
          <span key={`${segment}-${index}`} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3" />
            <span className={index === segments.length - 1 ? 'font-medium text-foreground' : undefined}>{labels[segment] || segment}</span>
          </span>
        ))}
      </div>
      <Tabbar />
    </>
  )
}
