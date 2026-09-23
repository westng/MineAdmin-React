import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { CalendarDays, HardDrive, Search, SlidersHorizontal, Tag, X } from 'lucide-react'
import { Filters } from '@/components/reui/filters/filters'
import type { FilterEditorProps, FilterField, FilterLabels, FilterQuery } from '@/components/reui/filters/filters-types'
import { Button } from '@/components/reui/primitives/button'
import { Input } from '@/components/reui/primitives/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/reui/primitives/input-group'
import { useToast } from '@/components/reui/use-toast'
import { attachmentError, attachmentSearch, storageOptions } from '../data/attachment'
import { attachmentFilterParams } from '../data/library'

const tx = createTextTranslator('base.data-center.attachment.ui')

function DateRangeEditor({ value, onValueChange, commit, cancel, autoFocusProps }: FilterEditorProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const { toast } = useToast()
  const range = Array.isArray(value) ? value : ['', '']
  const apply = () => {
    try {
      attachmentSearch({ start_date: range[0], end_date: range[1] })
      if (!range[0] || !range[1]) throw new Error(tx('请选择完整的上传日期范围'))
      commit(range)
    } catch (error) {
      toast(attachmentError(error, tx('请选择有效的日期范围')), 'warning')
    }
  }
  return (
    <div className="w-64 space-y-4 p-3">
      <label className="grid gap-2 text-xs font-medium">
        {tx('开始日期')}
        <Input
          {...autoFocusProps}
          type="date"
          value={String(range[0] ?? '')}
          max={String(range[1] || '')}
          onChange={event => onValueChange([event.target.value, range[1] || ''])}
        />
      </label>
      <label className="grid gap-2 text-xs font-medium">
        {tx('结束日期')}
        <Input
          type="date"
          value={String(range[1] ?? '')}
          min={String(range[0] || '')}
          onChange={event => onValueChange([range[0] || '', event.target.value])}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          {tx('取消')}
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          {tx('应用')}
        </Button>
      </div>
    </div>
  )
}

const fields: FilterField[] = [
  {
    id: 'storage_mode',
    get label() {
      return tx('存储位置')
    },
    icon: <HardDrive />,
    type: 'select',
    options: storageOptions,
    operators: [
      {
        value: 'is',
        get label() {
          return tx('为')
        },
      },
    ],
    defaultOperator: 'is',
    searchable: false,
  },
  {
    id: 'suffix',
    get label() {
      return tx('扩展名')
    },
    icon: <Tag />,
    type: 'text',
    get placeholder() {
      return tx('例如 pdf 或 jpg,png')
    },
    operators: [
      {
        value: 'is',
        get label() {
          return tx('为')
        },
      },
    ],
    defaultOperator: 'is',
  },
  {
    id: 'created_at',
    get label() {
      return tx('上传日期')
    },
    icon: <CalendarDays />,
    type: 'range',
    operators: [
      {
        value: 'between',
        get label() {
          return tx('介于')
        },
        arity: 'range',
      },
    ],
    defaultOperator: 'between',
    editor: DateRangeEditor,
    valueText: ({ values }) => values.join(tx(' 至 ')),
  },
]

const labels: Partial<FilterLabels> = {
  get addFilter() {
    return tx('筛选')
  },
  get clearAll() {
    return tx('清除筛选')
  },
  get searchFields() {
    return tx('搜索筛选项…')
  },
  get searchOperators() {
    return tx('搜索条件…')
  },
  get searchOptions() {
    return tx('搜索选项…')
  },
  get back() {
    return tx('返回')
  },
  get clear() {
    return tx('清除')
  },
  get apply() {
    return tx('应用')
  },
  get discard() {
    return tx('取消')
  },
  get empty() {
    return tx('没有匹配的选项')
  },
  get loading() {
    return tx('加载中…')
  },
  get loadingMore() {
    return tx('加载更多…')
  },
  get loadMore() {
    return tx('加载更多')
  },
  get error() {
    return tx('加载失败')
  },
  get retry() {
    return tx('重试')
  },
  get where() {
    return tx('筛选')
  },
  get and() {
    return tx('且')
  },
  get or() {
    return tx('或')
  },
  get combinator() {
    return tx('条件关系')
  },
  get duplicate() {
    return tx('复制条件')
  },
  get negate() {
    return tx('反选条件')
  },
  get remove() {
    return tx('移除条件')
  },
  chipMenu: label => tx('{0} 的操作', { '0': label }),
  get filtersLabel() {
    return tx('附件筛选条件')
  },
  filterLabel: condition => tx('筛选：{0}', { '0': condition }),
  get readOnly() {
    return tx('只读')
  },
  pathSeparator: ' / ',
  get valuePlaceholder() {
    return tx('输入值…')
  },
  get selectPlaceholder() {
    return tx('选择选项')
  },
  get noValue() {
    return tx('未填写')
  },
  get selectCondition() {
    return tx('选择条件')
  },
  get incomplete() {
    return tx('未完成')
  },
  itemCount: count => tx('{0} 项', { '0': count }),
  get fieldsLabel() {
    return tx('筛选项')
  },
  resultsAnnouncement: count => tx('{0} 个匹配项', { '0': count }),
  get actionsLabel() {
    return tx('筛选操作')
  },
  countAnnouncement: count => tx('{0} 个筛选条件', { '0': count }),
  valueCount: count => tx('{0} 个值', { '0': count }),
  valueDetail: (summary, values) => `${summary}：${values.join('、')}`,
  valueRange: (from, to) => tx('{0} 至 {1}', { '0': from, '1': to }),
  rangeFrom: label => tx('{0}起始值', { '0': label }),
  rangeTo: label => tx('{0}结束值', { '0': label }),
  get rangeSeparator() {
    return tx('至')
  },
  negated: label => tx('不{0}', { '0': label }),
  get issueOperator() {
    return tx('请选择条件')
  },
  get issueValue() {
    return tx('请填写值')
  },
  get issueRange() {
    return tx('请填写完整范围')
  },
  get issueRangeOrder() {
    return tx('起始值不能大于结束值')
  },
  issueSummary: count => tx('{0} 个条件需要完善', { '0': count }),
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
  const localeRevision = useLocaleRevision()
  void localeRevision

  const { toast } = useToast()
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <form
        className="w-full @lg:w-72"
        role="search"
        onSubmit={event => {
          event.preventDefault()
          onSearch(search)
        }}
      >
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            disabled={disabled}
            aria-label={tx('按文件全名搜索')}
            placeholder={tx('文件全名，回车搜索…')}
            onChange={event => onSearchChange(event.target.value)}
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={tx('清除名称搜索')}
                disabled={disabled}
                onClick={() => {
                  onSearchChange('')
                  onSearch('')
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>
      </form>
      <Filters
        fields={fields}
        query={query}
        labels={labels}
        size="default"
        disabled={disabled}
        showClear={false}
        trigger={
          <Button type="button" variant="outline">
            <SlidersHorizontal aria-hidden="true" />
            {tx('筛选')}
          </Button>
        }
        onBeforeQueryChange={next => {
          try {
            attachmentFilterParams(next)
          } catch (error) {
            toast(attachmentError(error, tx('筛选条件无效')), 'warning')
            return false
          }
        }}
        onQueryChange={onQueryChange}
      />
    </div>
  )
}
