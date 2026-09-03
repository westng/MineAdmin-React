import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg shadow-none">
        <CardHeader>
          <ShieldAlert className="size-6 text-destructive" aria-hidden="true" />
          <CardTitle>无权访问</CardTitle>
          <CardDescription>当前用户没有访问该页面所需的角色或权限。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/dashboard" />}>返回 Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  )
}
