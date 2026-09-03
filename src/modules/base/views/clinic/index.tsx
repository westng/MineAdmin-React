import { CalendarDays, CreditCard, FileText, Settings, Stethoscope, UserRound, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ClinicSection = 'calendar' | 'appointments' | 'customers' | 'staff' | 'payments' | 'settings'

const sections: Record<ClinicSection, {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  metrics: Array<{ label: string; value: string; note: string }>
}> = {
  calendar: {
    title: 'Calendar',
    description: 'Keep the day moving with a clear view of every chair.',
    icon: CalendarDays,
    metrics: [
      { label: 'Appointments', value: '18', note: 'today' },
      { label: 'Open time', value: '2h 45m', note: 'still sellable' },
      { label: 'Chairs', value: '3 / 3', note: 'available' },
    ],
  },
  appointments: {
    title: 'Appointments',
    description: 'Review upcoming visits and follow up with patients.',
    icon: Stethoscope,
    metrics: [
      { label: 'Upcoming', value: '42', note: 'this week' },
      { label: 'Kept rate', value: '94%', note: 'on schedule' },
      { label: 'Needs desk', value: '3', note: 'attention' },
    ],
  },
  customers: {
    title: 'Customers',
    description: 'A searchable directory for every patient relationship.',
    icon: Users,
    metrics: [
      { label: 'Patients', value: '1,284', note: 'active' },
      { label: 'New this month', value: '86', note: '+12.8%' },
      { label: 'Recall due', value: '24', note: 'next 7 days' },
    ],
  },
  staff: {
    title: 'Staff',
    description: 'Coordinate clinicians, chairs and availability in one place.',
    icon: UserRound,
    metrics: [
      { label: 'Clinicians', value: '8', note: 'active' },
      { label: 'On duty', value: '6', note: 'today' },
      { label: 'Open chairs', value: '3', note: 'available' },
    ],
  },
  payments: {
    title: 'Payments',
    description: 'Track invoices and the activity that keeps the practice healthy.',
    icon: CreditCard,
    metrics: [
      { label: 'Collected', value: '$18,420', note: 'this month' },
      { label: 'Outstanding', value: '$2,140', note: '12 invoices' },
      { label: 'Average ticket', value: '$286', note: '+4.2%' },
    ],
  },
  settings: {
    title: 'Settings',
    description: 'Configure the practice, team and notification preferences.',
    icon: Settings,
    metrics: [
      { label: 'Practice profile', value: 'Ready', note: 'complete' },
      { label: 'Hours', value: '6 days', note: 'configured' },
      { label: 'Notifications', value: 'On', note: 'healthy' },
    ],
  },
}

export default function ClinicSectionPage({ section }: { section: ClinicSection }) {
  const config = sections[section]
  const Icon = config.icon

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold tracking-tight">{config.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <Button className="hidden sm:inline-flex">{section === 'customers' ? 'Add Patient' : section === 'payments' ? 'New invoice' : 'New Booking'}</Button>
      </div>
      <div className="grid gap-4 @2xl:grid-cols-3">
        {config.metrics.map(metric => (
          <Card key={metric.label} className="shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl tracking-tight">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent><Badge variant="secondary">{metric.note}</Badge></CardContent>
          </Card>
        ))}
      </div>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{section === 'settings' ? 'Practice configuration' : `${config.title} activity`}</CardTitle>
          <CardDescription>{section === 'settings' ? 'Choose a section from the sidebar to update your practice.' : 'Connect this view to the MineAdmin API when the module is migrated.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid min-h-56 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-center">
              <FileText className="size-6 text-muted-foreground/60" aria-hidden="true" />
              <span>No activity to display yet.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
