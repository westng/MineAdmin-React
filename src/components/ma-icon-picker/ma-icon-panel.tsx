import { useMemo, useState } from 'react'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { Icon } from '@iconify/react'
import { ChevronLeft, ChevronRight, CircleHelp, LoaderCircle, Search, X } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/reui/primitives/input-group'
import { TabsContent, TabsList, TabsTrigger } from '@/components/reui/primitives/tabs'
import { useIcon } from '@/components/ma-icon/use-icon'
import { useIsMobile } from '@/hooks/framework/use-mobile'
import { customIconUrls, normalizeIconName } from '@/utils/icons'
import { cn } from '@/utils/cn'
import data from '@/assets/icons/catalog.json'
import type { MaIconPanelProps } from './types'

const collections = [
  ...data.map(({ prefix, info, icons }) => ({ prefix, name: info.name, icons })),
  { prefix: 'custom', name: '自定义图标', icons: Object.keys(customIconUrls).sort() },
]

function getIconValue(prefix: string, name: string) {
  return prefix === 'custom' ? name : `${prefix}:${name}`
}

function IconOption({
  name,
  selected,
  disabled,
  onSelect,
}: {
  name: string
  selected: boolean
  disabled?: boolean
  onSelect: (value: string) => void
}) {
  const icon = useIcon(name)
  const label =
    icon.status === 'error'
      ? `${name}（加载失败或图标已失效，请检查网络或刷新页面后重试）`
      : icon.status === 'loading'
        ? `${name}（加载中）`
        : name

  return (
    <span className="min-w-0" title={label}>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-12 w-full min-w-0 p-2',
          selected && 'bg-primary/10 text-primary ring-2 ring-primary ring-inset',
        )}
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled || icon.status !== 'ready'}
        onClick={() => onSelect(name)}
      >
        {icon.status === 'ready' &&
          ('data' in icon ? (
            <Icon icon={icon.data} className="size-[26px]" aria-hidden="true" />
          ) : (
            <img src={icon.src} className="size-[26px] object-contain" alt="" />
          ))}
        {icon.status === 'loading' && (
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        )}
        {icon.status === 'error' && <CircleHelp className="size-5 text-muted-foreground" aria-hidden="true" />}
      </Button>
    </span>
  )
}

export function MaIconPanel({ value, onSelect, pageSize = 70, disabled }: MaIconPanelProps) {
  const selected = normalizeIconName(value)
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 70
  const [category, setCategory] = useState(
    () =>
      collections.find(item => item.icons.some(name => getIconValue(item.prefix, name) === selected))?.prefix ??
      collections[0].prefix,
  )
  const [keywords, setKeywords] = useState('')
  const [page, setPage] = useState(() => {
    const collection = collections.find(item => item.prefix === category)!
    const index = collection.icons.findIndex(name => getIconValue(category, name) === selected)
    return index < 0 ? 1 : Math.floor(index / size) + 1
  })
  const isMobile = useIsMobile()
  const collection = collections.find(item => item.prefix === category)!
  const filteredIcons = useMemo(() => {
    const query = keywords.trim().toLowerCase()
    return collection.icons.filter(name => getIconValue(category, name).toLowerCase().includes(query))
  }, [category, collection, keywords])
  const pageCount = Math.max(1, Math.ceil(filteredIcons.length / size))
  const currentPage = Math.min(page, pageCount)
  const pageIcons = filteredIcons.slice((currentPage - 1) * size, currentPage * size)
  const firstPage = Math.max(1, Math.min(currentPage - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index)

  function search(query: string) {
    setKeywords(query)
    setPage(1)
  }

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={isMobile ? 'horizontal' : 'vertical'}
      value={category}
      onValueChange={next => {
        if (typeof next !== 'string') return
        setCategory(next)
        setPage(1)
      }}
      className="group/tabs flex h-[min(500px,calc(100dvh-8rem))] min-h-0 gap-4 data-[orientation=horizontal]:flex-col"
    >
      <TabsList
        variant="line"
        aria-label="图标分类"
        className="max-w-full shrink-0 justify-start overflow-x-auto border-b p-0 pb-2 group-data-[orientation=horizontal]/tabs:h-auto group-data-[orientation=vertical]/tabs:h-full group-data-[orientation=vertical]/tabs:flex-col md:w-[180px] md:items-stretch md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:pr-3 md:pb-0"
      >
        {collections.map(item => (
          <TabsTrigger
            key={item.prefix}
            value={item.prefix}
            className="h-10 flex-none px-3 data-active:bg-primary/10 data-active:text-primary after:hidden md:w-full md:justify-end"
          >
            {item.name}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <InputGroup className="shrink-0">
          <InputGroupAddon>
            <Search className="size-4" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="搜索此分类下的图标"
            placeholder="搜索此分类下的图标"
            value={keywords}
            onChange={event => search(event.target.value)}
          />
          {keywords && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton aria-label="清除图标搜索" onClick={() => search('')}>
                <X aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        {collections.map(item => (
          <TabsContent
            key={item.prefix === category ? `${category}:${keywords}:${currentPage}` : item.prefix}
            value={item.prefix}
            className="min-h-0 overflow-y-auto p-1"
          >
            {item.prefix === category &&
              (pageIcons.length ? (
                <div className="grid grid-cols-5 gap-1 sm:grid-cols-8 md:grid-cols-10">
                  {pageIcons.map(name => {
                    const icon = getIconValue(category, name)
                    return (
                      <IconOption
                        key={icon}
                        name={icon}
                        selected={selected === icon}
                        disabled={disabled}
                        onSelect={onSelect}
                      />
                    )
                  })}
                </div>
              ) : (
                <div
                  className="flex h-full min-h-24 items-center justify-center px-4 text-center text-muted-foreground"
                  role="status"
                >
                  {keywords.trim() ? '未找到匹配的图标，请尝试其他关键词。' : '暂无自定义图标。'}
                </div>
              ))}
          </TabsContent>
        ))}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground" role="status">
            共 {filteredIcons.length} 个图标 · {currentPage} / {pageCount} 页
          </span>
          <nav aria-label="图标分页" className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="上一页"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            {firstPage > 1 && (
              <Button variant="ghost" size="icon-sm" aria-label="第 1 页" onClick={() => setPage(1)}>
                1
              </Button>
            )}
            {firstPage > 2 && (
              <span className="text-muted-foreground" aria-hidden="true">
                …
              </span>
            )}
            {pages.map(number => (
              <Button
                key={number}
                variant={number === currentPage ? 'default' : 'ghost'}
                size="icon-sm"
                aria-label={`第 ${number} 页`}
                aria-current={number === currentPage ? 'page' : undefined}
                disabled={!filteredIcons.length}
                onClick={() => setPage(number)}
              >
                {number}
              </Button>
            ))}
            {firstPage + pages.length < pageCount && (
              <span className="text-muted-foreground" aria-hidden="true">
                …
              </span>
            )}
            {firstPage + pages.length <= pageCount && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`第 ${pageCount} 页`}
                onClick={() => setPage(pageCount)}
              >
                {pageCount}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="下一页"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </TabsPrimitive.Root>
  )
}
