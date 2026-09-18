import { createRef } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { MaDialog, type MaDialogProps } from '../src/components/ma-dialog'
import { MaDrawer } from '../src/components/ma-drawer'
import type { MaFormItem } from '../src/components/ma-form'
import type { MaTableExpose, MaTableOptions } from '../src/components/ma-table'
import { DialogTrigger } from '../src/components/reui/primitives/dialog'
import { SheetTrigger } from '../src/components/reui/primitives/sheet'

type Row = { id: number; name: string }
type Payload = { title: string }
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
