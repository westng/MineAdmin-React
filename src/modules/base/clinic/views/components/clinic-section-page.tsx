import { FileText } from 'lucide-react'
import { Badge } from '@/components/reui/primitives/badge'
import { Button } from '@/components/reui/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/reui/primitives/card'
import { clinicSections, type ClinicSection } from '../data'

export default function ClinicSectionPageView({ section }: { section: ClinicSection }) {
  const config = clinicSections[section]
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
        <Button className="hidden sm:inline-flex">
          {section === 'customers' ? 'Add Patient' : section === 'payments' ? 'New invoice' : 'New Booking'}
        </Button>
      </div>
      <div className="grid gap-4 @2xl:grid-cols-3">
        {config.metrics.map(metric => (
          <Card key={metric.label} className="shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl tracking-tight">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{metric.note}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{section === 'settings' ? 'Practice configuration' : `${config.title} activity`}</CardTitle>
          <CardDescription>
            {section === 'settings'
              ? 'Choose a section from the sidebar to update your practice.'
              : 'Connect this view to the MineAdmin API when the module is migrated.'}
          </CardDescription>
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
