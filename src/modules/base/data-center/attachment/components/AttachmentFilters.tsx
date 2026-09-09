import { CalendarDays, HardDrive, Search, SlidersHorizontal, Tag, X } from 'lucide-react'
import { Filters } from '@/components/reui/filters/filters'
import type { FilterEditorProps, FilterField, FilterLabels, FilterQuery } from '@/components/reui/filters/filters-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useToast } from '@/components/common/use-toast'
import { attachmentError, attachmentSearch, storageOptions } from '../utils/attachment'
import { attachmentFilterParams } from '../utils/library'

function DateRangeEditor({ value, onValueChange, commit, cancel, autoFocusProps }: FilterEditorProps) {
  const { toast } = useToast()
  const range = Array.isArray(value) ? value : ['', '']
  const apply = () => {
    try {
      attachmentSearch({ start_date: range[0], end_date: range[1] })
      if (!range[0] || !range[1]) throw new Error('请选择完整的上传日期范围')
      commit(range)
    } catch (error) { toast(attachmentError(error, '请选择有效的日期范围'), 'warning') }
  }
  return <div className="w-64 space-y-4 p-3">
    <label className="grid gap-2 text-xs font-medium">开始日期<Input {...autoFocusProps} type="date" value={String(range[0] ?? '')} max={String(range[1] || '')} onChange={event => onValueChange([event.target.value, range[1] || ''])} /></label>
    <label className="grid gap-2 text-xs font-medium">结束日期<Input type="date" value={String(range[1] ?? '')} min={String(range[0] || '')} onChange={event => onValueChange([range[0] || '', event.target.value])} /></label>
    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={cancel}>取消</Button><Button type="button" size="sm" onClick={apply}>应用</Button></div>
  </div>
}

const fields: FilterField[] = [
  { id: 'storage_mode', label: '存储位置', icon: <HardDrive />, type: 'select', options: storageOptions, operators: [{ value: 'is', label: '为' }], defaultOperator: 'is', searchable: false },
  { id: 'suffix', label: '扩展名', icon: <Tag />, type: 'text', placeholder: '例如 pdf 或 jpg,png', operators: [{ value: 'is', label: '为' }], defaultOperator: 'is' },
  { id: 'created_at', label: '上传日期', icon: <CalendarDays />, type: 'range', operators: [{ value: 'between', label: '介于', arity: 'range' }], defaultOperator: 'between', editor: DateRangeEditor, valueText: ({ values }) => values.join(' 至 ') },
]

const labels: Partial<FilterLabels> = {
  addFilter: '筛选', clearAll: '清除筛选', searchFields: '搜索筛选项…', searchOperators: '搜索条件…', searchOptions: '搜索选项…',
  back: '返回', clear: '清除', apply: '应用', discard: '取消', empty: '没有匹配的选项', loading: '加载中…', loadingMore: '加载更多…', loadMore: '加载更多', error: '加载失败', retry: '重试',
  where: '筛选', and: '且', or: '或', combinator: '条件关系', duplicate: '复制条件', negate: '反选条件', remove: '移除条件', chipMenu: label => `${label} 的操作`,
  filtersLabel: '附件筛选条件', filterLabel: condition => `筛选：${condition}`, readOnly: '只读', pathSeparator: ' / ', valuePlaceholder: '输入值…', selectPlaceholder: '选择选项', noValue: '未填写', selectCondition: '选择条件', incomplete: '未完成',
  itemCount: count => `${count} 项`, fieldsLabel: '筛选项', resultsAnnouncement: count => `${count} 个匹配项`, actionsLabel: '筛选操作', countAnnouncement: count => `${count} 个筛选条件`, valueCount: count => `${count} 个值`, valueDetail: (summary, values) => `${summary}：${values.join('、')}`, valueRange: (from, to) => `${from} 至 ${to}`, rangeFrom: label => `${label}起始值`, rangeTo: label => `${label}结束值`, rangeSeparator: '至', negated: label => `不${label}`, issueOperator: '请选择条件', issueValue: '请填写值', issueRange: '请填写完整范围', issueRangeOrder: '起始值不能大于结束值', issueSummary: count => `${count} 个条件需要完善`,
}

interface Props {
  query: FilterQuery
  onQueryChange: (query: FilterQuery) => void
  search: string
  onSearchChange: (value: string) => void
  onSearch: (value: string) => void
  disabled: boolean
}

export function AttachmentFilters({ query, onQueryChange, search, onSearchChange, onSearch, disabled }: Props) {
  const { toast } = useToast()
  return <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
    <form className="w-full @lg:w-72" role="search" onSubmit={event => { event.preventDefault(); onSearch(search) }}>
      <InputGroup>
        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput value={search} disabled={disabled} aria-label="按文件全名搜索" placeholder="文件全名，回车搜索…" onChange={event => onSearchChange(event.target.value)} />
        {search && <InputGroupAddon align="inline-end"><Button type="button" variant="ghost" size="icon-xs" aria-label="清除名称搜索" disabled={disabled} onClick={() => { onSearchChange(''); onSearch('') }}><X aria-hidden="true" /></Button></InputGroupAddon>}
      </InputGroup>
    </form>
    <Filters fields={fields} query={query} labels={labels} size="default" disabled={disabled} showClear={false} trigger={<Button type="button" variant="outline"><SlidersHorizontal aria-hidden="true" />筛选</Button>} onBeforeQueryChange={next => {
      try { attachmentFilterParams(next) } catch (error) { toast(attachmentError(error, '筛选条件无效'), 'warning'); return false }
    }} onQueryChange={onQueryChange} />
  </div>
}
