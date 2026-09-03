import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-7xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="text-2xl font-semibold">页面不存在</h1>
      <p className="max-w-md text-sm text-muted-foreground">当前地址没有对应的页面，请返回 Overview 继续操作。</p>
      <Button render={<Link to="/dashboard" />}>
        返回 Overview
      </Button>
    </div>
  )
}
