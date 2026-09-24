import { CalendarDays, CreditCard, Settings, Stethoscope, UserRound, Users, type LucideIcon } from 'lucide-react'
import type { ClinicSection } from '../../api/clinic'
export type { ClinicSection } from '../../api/clinic'

export interface ClinicSectionConfig {
  title: string
  description: string
  icon: LucideIcon
  metrics: Array<{ label: string; value: string; note: string }>
}

export const clinicSections: Record<ClinicSection, ClinicSectionConfig> = {
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
