import { createRef } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { MaDialog, useMaFormDialog, type MaDialogProps } from '../src/components/ma-dialog'
import { MaDrawer } from '../src/components/ma-drawer'
import { MaDownload, type MaDownloadRequest } from '../src/components/ma-download'
import { MaEmpty, type MaEmptyProps } from '../src/components/ma-empty'
import { MaAccess, type MaAccessProps } from '../src/components/ma-access'
import { MaIcon, type MaIconProps } from '../src/components/ma-icon'
import { MaDateRangePicker, type MaDateRangePickerProps } from '../src/components/ma-date-range-picker'
import { MaTreeSelect, type MaTreeSelectProps } from '../src/components/ma-tree-select'
import { MaForm, type MaFormItem } from '../src/components/ma-form'
import type { MaTableExpose, MaTableOptions } from '../src/components/ma-table'
import { MaProTable, type MaProTableExpose } from '../src/components/ma-pro-table'
import { DialogTrigger } from '../src/components/reui/primitives/dialog'
import { SheetTrigger } from '../src/components/reui/primitives/sheet'

type Row = { id: number; name: string }
type Payload = { title: string }
type SearchFilters = { keyword: string; ids: number[] }
const accessProps: MaAccessProps = { allowed: true, children: '可见内容' }
const iconProps: MaIconProps = { name: 'lucide:search', label: '搜索' }
const dateRangeProps: MaDateRangePickerProps = { value: [new Date(), new Date()], valueFormat: 'date' }
const treeSelectProps: MaTreeSelectProps = { multiple: true, items: [], value: ['1'], max: 2 }
export const reorganizedComponents = [
  <MaAccess key="access" {...accessProps} />,
  <MaIcon key="icon" {...iconProps} />,
  <MaDateRangePicker key="date" {...dateRangeProps} />,
  <MaTreeSelect key="tree" {...treeSelectProps} />,
]
// @ts-expect-error Multiple selection cannot accept a scalar value.
export const invalidTreeMultiple = <MaTreeSelect multiple items={[]} value="1" />
// @ts-expect-error Single selection cannot configure a multiple selection limit.
export const invalidTreeSingle = <MaTreeSelect items={[]} max={2} />
const emptyProps: MaEmptyProps = { type: 'search', size: 'sm', title: <strong>未找到结果</strong> }
export const emptyStates = [
  <MaEmpty key="default" />,
  <MaEmpty key="search" {...emptyProps} actions={<button type="button">重试</button>} />,
  <MaEmpty
    key="simple"
    type="simple"
    image={null}
    title={null}
    description="暂无记录"
    ref={createRef<HTMLDivElement>()}
  />,
]
// @ts-expect-error Only registered built-in illustration types are supported.
export const unsupportedEmptyType = <MaEmpty type="unknown" />
// @ts-expect-error Slot class names must use the documented slot keys.
export const unsupportedEmptySlot = <MaEmpty classNames={{ unknown: 'p-0' }} />
// @ts-expect-error Only documented size presets are supported.
export const unsupportedEmptySize = <MaEmpty size="lg" />
const downloadRequest: MaDownloadRequest = async ({ signal }) => ({
  blob: new Blob([signal.aborted ? '' : 'report']),
  filename: 'report.txt',
})
export const downloadControls = [
  <MaDownload key="url" url="/files/report.pdf" filename="报告.pdf" variant="link" />,
  <MaDownload key="blob" blob={new Blob(['report'])} filename="report.txt" />,
  <MaDownload key="request" request={downloadRequest} onError={error => error.message.toUpperCase()} />,
]
// @ts-expect-error A download requires exactly one source.
export const missingDownloadSource = <MaDownload />
// @ts-expect-error URL and request sources are mutually exclusive.
export const conflictingDownloadSources = <MaDownload url="/report" request={downloadRequest} />
// @ts-expect-error Requests must return binary content, not an API JSON envelope.
export const invalidDownloadResponse = <MaDownload request={async () => ({ code: 200 })} />
export const multiFileField: MaFormItem<{ files: string[] }> = {
  prop: 'files',
  render: 'Upload',
  renderProps: {
    multiple: true,
    accept: '.pdf,.zip',
    maxCount: 5,
    request: async file => `/files/${file.name}`,
    onChange: urls => urls.forEach(url => url.toUpperCase()),
  },
}
export const uploadAndDictionaryFields: MaFormItem<{ avatar: string; platform: string }>[] = [
  {
    prop: 'avatar',
    render: 'Upload',
    renderProps: { request: async (_file, { signal }) => (signal.aborted ? '' : '/avatar.png') },
  },
  { prop: 'platform', render: 'DictSelect', renderProps: { dictName: 'PLATFORM', clearable: true } },
]
const filteredTableRef = createRef<MaProTableExpose<Row, SearchFilters>>()
export const filteredTable = (
  <MaProTable<Row, SearchFilters>
    ref={filteredTableRef}
    data={[{ id: 1, name: 'row' }]}
    schema={{ searchItems: [{ prop: 'keyword', label: 'Keyword' }], tableColumns: [{ prop: 'name', label: 'Name' }] }}
    options={{ onSearchSubmit: form => ({ keyword: form.keyword.trim(), ids: form.ids.join(',') }) }}
    onSelectionChange={rows => rows.map(row => row.name.toUpperCase())}
  />
)
filteredTableRef.current?.setSearchForm({ keyword: 'search' })
// @ts-expect-error Search filters must not be treated as response rows.
filteredTableRef.current?.setSearchForm({ name: 'row' })
const handle = Dialog.createHandle<Payload>()
export const dialogTrigger = <DialogTrigger handle={handle} payload={{ title: '对话框' }} />
export const drawerTrigger = <SheetTrigger handle={handle} payload={{ title: '抽屉' }} />

export const dialog = (
  <MaDialog
    handle={handle}
    height={560}
    maxHeight="80dvh"
    onOpenChange={(_open, details) => {
      details.cancel()
      details.preventUnmountOnClose()
    }}
  >
    {({ payload }) => payload?.title}
  </MaDialog>
)
export const drawer = (
  <MaDrawer handle={handle} popupProps={{ initialFocus: false }} portalProps={{ keepMounted: true }}>
    {({ payload }) => payload?.title}
  </MaDrawer>
)

export const legacyHandler: MaDialogProps = { onOpenChange: (_open: boolean) => {} }
export const dialogCssHeight: MaDialogProps = { height: '60dvh', maxHeight: 720 }
// @ts-expect-error 最大高度只接受 CSS 尺寸或像素数值。
export const invalidDialogHeight: MaDialogProps = { maxHeight: true }
export const formItems: MaFormItem[] = [
  { prop: 'name', render: 'Input', renderProps: { maxLength: 30, onChange: event => event.currentTarget.value } },
  {
    prop: 'tags',
    render: 'Select',
    renderProps: {
      multiple: true,
      options: [{ label: '一', value: 1 }],
      onValueChange: (_value, details) => details.cancel(),
      popupProps: { portalProps: { container: document.body }, positionerProps: { sideOffset: 8 } },
    },
  },
  {
    prop: 'count',
    render: 'InputNumber',
    renderProps: { min: 0, step: 2, onValueChange: (_value, details) => details.reason },
  },
  { prop: 'enabled', render: 'Switch', renderProps: { onCheckedChange: (_checked, details) => details.cancel() } },
  {
    prop: 'date',
    render: 'DatePicker',
    renderProps: { mode: 'range', valueFormat: 'yyyy-MM-dd', calendarProps: { numberOfMonths: 2 } },
  },
  {
    prop: 'time',
    render: 'TimePicker',
    renderProps: { minuteStep: 15, onValueChange: (_value, details) => details.cancel() },
  },
  { prop: 'custom', render: ({ value }) => String(value), renderProps: { businessField: '自定义配置继续开放' } },
]

// @ts-expect-error 内置 Select 的 multiple 只接受布尔值。
export const invalidSelect: MaFormItem = { prop: 'tags', render: 'Select', renderProps: { multiple: 'true' } }
// @ts-expect-error 内置 InputNumber 的 min 不接受字符串。
export const invalidNumber: MaFormItem = { prop: 'count', render: 'InputNumber', renderProps: { min: '1' } }
// @ts-expect-error Input 不应静默接收未知配置。
export const invalidInput: MaFormItem = { prop: 'name', render: 'Input', renderProps: { unknownSetting: true } }

export const tableOptions: MaTableOptions<Row> = {
  manualPagination: false,
  dataGridProps: {
    tableLayout: { columnsResizable: true, headerSticky: true },
    onRowClick: row => row.name,
    onCellsChange: details => details.changes,
  },
  tableOptions: { initialState: { columnOrder: ['name', 'id'] }, state: { columnVisibility: { id: false } } },
  renderTable: table => table.getRowModel().rows.length,
}
const tableRef = createRef<MaTableExpose<Row>>()
export const tableInstance = () => tableRef.current?.getTableInstance()
export const invalidTable: MaTableOptions<Row> = {
  tableOptions: {
    state: {
      // @ts-expect-error Ma 层统一持有分页，扩展配置不能悄悄覆盖分页状态。
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  },
}

export function useFormDialogTypeExample() {
  const editor = useMaFormDialog<{ name: string }, Row | null>({
    defaultValues: () => ({ name: '' }),
    toValues: row => ({ name: row?.name ?? '' }),
    onSubmit: async (values, row) => {
      void values.name
      void row?.id
    },
    onError: (_error: unknown) => {},
  })
  return (
    <MaDialog {...editor.dialogProps}>
      <MaForm key={editor.formKey} {...editor.formProps} />
    </MaDialog>
  )
}
