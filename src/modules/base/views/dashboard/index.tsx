import { AlertTriangle, CalendarCheck2, Clock3, Gauge, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const kpis = [
  {
    eyebrow: 'Schedule',
    title: 'Booked Today',
    metricLabel: 'Appointments',
    value: '18',
    note: '94%',
    noteFor: 'kept',
    icon: CalendarCheck2,
    iconClass: 'bg-neutral-950',
    good: true,
  },
  {
    eyebrow: 'Capacity',
    title: 'Chair Load',
    metricLabel: 'Utilisation',
    value: '78%',
    note: '11h 15m',
    noteFor: 'of 14h 25m',
    icon: Gauge,
    iconClass: 'bg-indigo-600',
    good: true,
  },
  {
    eyebrow: 'Open Time',
    title: 'Still Sellable',
    metricLabel: 'Unbooked',
    value: '2h 45m',
    note: '22%',
    noteFor: '5 slots',
    icon: Clock3,
    iconClass: 'bg-cyan-600',
    good: true,
  },
  {
    eyebrow: 'Risk',
    title: 'Watchlist',
    metricLabel: 'Needs Desk',
    value: '3',
    note: '2',
    noteFor: 'unpaid',
    icon: AlertTriangle,
    iconClass: 'bg-amber-400',
    good: false,
  },
]

const procedureMix = [
  { name: 'Checkup', completed: 34, scheduled: 62 },
  { name: 'Scaling', completed: 30, scheduled: 74 },
  { name: 'Whitening', completed: 52, scheduled: 33 },
  { name: 'Filling', completed: 22, scheduled: 48 },
  { name: 'Root Canal', completed: 43, scheduled: 68 },
  { name: 'Extraction', completed: 18, scheduled: 58 },
  { name: 'Crown', completed: 56, scheduled: 35 },
  { name: 'Braces', completed: 38, scheduled: 64 },
  { name: 'Implant', completed: 14, scheduled: 28 },
]

const patientVolume = [
  { month: 'Jan', appointments: 1820, newPatients: 1640 },
  { month: 'Feb', appointments: 2340, newPatients: 2160 },
  { month: 'Mar', appointments: 1960, newPatients: 1880 },
  { month: 'Apr', appointments: 2780, newPatients: 2540 },
  { month: 'May', appointments: 2100, newPatients: 1920 },
  { month: 'Jun', appointments: 3120, newPatients: 2880 },
  { month: 'Jul', appointments: 2540, newPatients: 2320 },
  { month: 'Aug', appointments: 3480, newPatients: 3160 },
  { month: 'Sep', appointments: 2860, newPatients: 2580 },
  { month: 'Oct', appointments: 2420, newPatients: 2140 },
  { month: 'Nov', appointments: 3240, newPatients: 2960 },
  { month: 'Dec', appointments: 2680, newPatients: 2440 },
]

const breakdownRows = [
  { bucket: 'Morning', detail: '08:00 – 12:00', code: 'AM', bookings: 8, completed: 5, scheduled: 3, unpaid: 1, cancelled: 0, group: true },
  { bucket: 'Chair 01', detail: 'Dr. Sarah Chen', code: 'C01', bookings: 3, completed: 2, scheduled: 1, unpaid: 0, cancelled: 0 },
  { bucket: 'Chair 02', detail: 'Dr. Nick Bold', code: 'C02', bookings: 3, completed: 2, scheduled: 1, unpaid: 1, cancelled: 0 },
  { bucket: 'Chair 03', detail: 'Dr. Emma Stone', code: 'C03', bookings: 2, completed: 1, scheduled: 1, unpaid: 0, cancelled: 0 },
  { bucket: 'Afternoon', detail: '13:00 – 18:00', code: 'PM', bookings: 10, completed: 4, scheduled: 6, unpaid: 1, cancelled: 1, group: true },
  { bucket: 'Chair 01', detail: 'Dr. Sarah Chen', code: 'C01', bookings: 4, completed: 2, scheduled: 2, unpaid: 0, cancelled: 0 },
  { bucket: 'Chair 02', detail: 'Dr. Nick Bold', code: 'C02', bookings: 3, completed: 1, scheduled: 2, unpaid: 1, cancelled: 0 },
  { bucket: 'Chair 03', detail: 'Dr. Emma Stone', code: 'C03', bookings: 3, completed: 1, scheduled: 2, unpaid: 0, cancelled: 1 },
]

const procedureChartConfig = {
  completed: { label: 'Completed', color: 'var(--color-blue-600)' },
  scheduled: { label: 'Scheduled', color: 'var(--color-sky-300)' },
} satisfies ChartConfig

const patientChartConfig = {
  appointments: { label: 'Appointments', color: 'var(--color-yellow-500)' },
  newPatients: { label: 'New Patients', color: 'var(--color-emerald-500)' },
} satisfies ChartConfig

function CornerMarks() {
  return (
    <>
      <span aria-hidden="true" className="absolute left-0 top-0 size-2 border-l border-t border-foreground/65" />
      <span aria-hidden="true" className="absolute bottom-0 right-0 size-2 border-b border-r border-foreground/65" />
    </>
  )
}

function KpiCard({ kpi }: { kpi: (typeof kpis)[number] }) {
  const Icon = kpi.icon

  return (
    <Card className="relative overflow-hidden p-0 shadow-none">
      <CornerMarks />
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-background bg-gradient-to-b from-white/30 to-transparent shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] ${kpi.iconClass}`}>
            <Icon className="size-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-sm leading-tight text-muted-foreground">{kpi.eyebrow}</p>
            <h3 className="truncate text-sm font-medium leading-tight">{kpi.title}</h3>
          </div>
        </div>
        <div className="mt-5 space-y-1.5">
          <p className="text-sm leading-tight text-muted-foreground">{kpi.metricLabel}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xl font-medium tracking-tight tabular-nums">{kpi.value}</span>
            <span className={`text-sm font-medium ${kpi.good ? 'text-teal-600' : 'text-rose-600'}`}>
              {kpi.note} ({kpi.noteFor})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProcedureMixCard() {
  return (
    <Card className="relative overflow-hidden p-0 shadow-none">
      <CornerMarks />
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm leading-4">Procedure Mix</CardTitle>
            <p className="text-xs leading-4 text-muted-foreground">Chair Demand</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-muted-foreground sm:justify-end">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600" aria-hidden="true" />Completed</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-300" aria-hidden="true" />Scheduled</span>
          </div>
        </div>
        <ChartContainer config={procedureChartConfig} className="h-56 w-full min-w-0">
            <BarChart accessibilityLayer data={procedureMix} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={3} barCategoryGap={8}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.75} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} tick={{ fontSize: 10 }} />
              <YAxis hide domain={[0, 78]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="completed" fill="var(--color-blue-600, #2563eb)" stroke="var(--color-blue-600, #2563eb)" strokeWidth={1} radius={[5, 5, 5, 5]} isAnimationActive={false} />
              <Bar dataKey="scheduled" fill="var(--color-sky-300, #7dd3fc)" stroke="var(--color-sky-300, #7dd3fc)" strokeWidth={1} radius={[5, 5, 5, 5]} isAnimationActive={false} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function PatientVolumeCard() {
  return (
    <Card className="relative overflow-hidden p-0 shadow-none">
      <CornerMarks />
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-sm leading-4">Patient Volume</CardTitle>
            <p className="text-xs leading-4 text-muted-foreground">Appointments and new patients</p>
          </div>
          <Badge variant="success-light" radius="full">+12.8%</Badge>
        </div>
        <ChartContainer config={patientChartConfig} className="h-56 min-w-0">
            <AreaChart accessibilityLayer data={patientVolume} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.75} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={value => String(value).slice(0, 3)} tick={{ fontSize: 10 }} />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Area type="natural" dataKey="newPatients" fill="var(--color-emerald-500, #10b981)" fillOpacity={0.14} stroke="var(--color-emerald-500, #10b981)" strokeWidth={1.25} stackId="a" isAnimationActive={false} />
              <Area type="natural" dataKey="appointments" fill="var(--color-yellow-500, #eab308)" fillOpacity={0.14} stroke="var(--color-yellow-500, #eab308)" strokeWidth={1.25} stackId="a" isAnimationActive={false} />
            </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function DayBreakdown() {
  const [lens, setLens] = useState('chair')
  const [search, setSearch] = useState('')
  const filteredRows = breakdownRows.filter(row => row.bucket.toLowerCase().includes(search.toLowerCase()) || row.detail.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card className="w-full gap-0 p-0 shadow-none">
      <CardHeader className="flex flex-col items-start gap-3 border-b py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-base">Day Breakdown</CardTitle>
          <p className="text-xs text-muted-foreground">Every booking on the sheet, against the state it is in.</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Bookings</span><Badge variant="secondary">18</Badge></div>
          <div className="flex items-center gap-2 sm:border-l sm:pl-3"><span className="text-xs font-medium text-muted-foreground">Needs desk</span><Badge variant="destructive-light">3</Badge></div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={lens} onValueChange={value => setLens(value)}>
          <TabsList variant="line" className="gap-5 px-4 pt-2">
            <TabsTrigger value="chair" className="px-0 pb-3 text-sm">By chair</TabsTrigger>
            <TabsTrigger value="procedure" className="px-0 pb-3 text-sm">By procedure</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm"><SlidersHorizontal className="size-3.5" />Everything</Button>
            <div className="relative w-full min-w-0 sm:w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search buckets" aria-label="Search buckets" className="pl-8" />
            </div>
          </div>
          <Button variant="outline" size="sm">Expand</Button>
        </div>
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="h-10 border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 text-left font-medium">Bucket</th>
                <th className="px-4 text-right font-medium">Bookings</th>
                <th className="px-4 text-right font-medium">Completed</th>
                <th className="px-4 text-right font-medium">Scheduled</th>
                <th className="px-4 text-right font-medium">Unpaid</th>
                <th className="px-4 text-right font-medium">Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={`${row.code}-${row.bucket}-${index}`} className={`h-11 border-b last:border-0 ${row.group ? 'font-semibold' : ''}`}>
                  <td className={`px-4 ${row.group ? '' : 'ps-10'}`}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{row.bucket}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">{row.detail}</span>
                    </div>
                  </td>
                  <td className="px-4 text-right tabular-nums">{row.bookings}</td>
                  <td className="px-4 text-right tabular-nums"><Badge variant="success-light">{row.completed}</Badge></td>
                  <td className="px-4 text-right tabular-nums"><Badge variant="info">{row.scheduled}</Badge></td>
                  <td className="px-4 text-right tabular-nums"><Badge variant={row.unpaid > 0 ? 'warning-light' : 'secondary'}>{row.unpaid}</Badge></td>
                  <td className="px-4 text-right tabular-nums"><Badge variant={row.cancelled > 0 ? 'destructive-light' : 'secondary'}>{row.cancelled}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="@container flex w-full flex-col gap-4 text-foreground">
      <h1 className="sr-only">Clinic overview</h1>
      <section aria-label="Today at a glance" className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {kpis.map(kpi => <KpiCard key={kpi.title} kpi={kpi} />)}
      </section>
      <section aria-label="Demand and volume" className="grid grid-cols-1 gap-4 @5xl:grid-cols-2">
        <ProcedureMixCard />
        <PatientVolumeCard />
      </section>
      <section aria-label="Day breakdown">
        <DayBreakdown />
      </section>
    </div>
  )
}
