import * as React from 'react'
import { ChevronDown, ChevronUp, RotateCcw, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaForm } from '../ma-form'
import { cn } from '@/lib/utils'
import { readText } from './utils'
import type { MaFormExpose, MaFormOptions, MaSearchExpose, MaSearchItem, MaSearchModel, MaSearchOptions, MaSearchProps } from './types'

type MaModel = MaSearchModel

function resolveShow(show: MaSearchOptions['show']): boolean {
  return typeof show === 'function' ? show() : show !== false
}

function getViewportColumns(options: MaSearchOptions, width: number): number {
  if (width < 768) return options.cols?.xs ?? 1
  if (width < 992) return options.cols?.sm ?? 2
  if (width < 1200) return options.cols?.md ?? 2
  if (width < 1920) return options.cols?.lg ?? 3
  return options.cols?.xl ?? 4
}

function MaSearchInner<T extends MaModel>({ options: initialOptions = {}, formOptions: initialFormOptions = {}, searchItems, items, className, children, beforeActions, afterActions, actions, onSearch, onReset, onFold }: MaSearchProps<T>, ref: React.ForwardedRef<MaSearchExpose<T>>) {
  const [options, setOptionsState] = React.useState<MaSearchOptions>(initialOptions)
  const [formOptions, setFormOptionsState] = React.useState<MaFormOptions>(initialFormOptions)
  const [currentItems, setCurrentItems] = React.useState<MaSearchItem<T>[]>(searchItems ?? items ?? [])
  const [folded, setFolded] = React.useState(initialOptions.fold ?? false)
  const [viewportColumns, setViewportColumns] = React.useState(() => typeof window === 'undefined' ? 1 : getViewportColumns(initialOptions, window.innerWidth))
  const formRef = React.useRef<MaFormExpose<T>>(null)
  const optionsRef = React.useRef(options)
  const itemsRef = React.useRef(currentItems)
  React.useEffect(() => {
    optionsRef.current = options
    itemsRef.current = currentItems
  }, [currentItems, options])
  React.useEffect(() => {
    const handleResize = () => setViewportColumns(getViewportColumns(optionsRef.current, window.innerWidth))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleFold = React.useCallback(() => {
    setFolded(current => {
      const next = !current
      onFold?.(next)
      return next
    })
  }, [onFold])

  const visibleItems = React.useMemo(() => {
    const foldRows = options.foldRows ?? 2
    return currentItems.map((item, index) => {
      const originalHide = item.hide
      return {
        ...item,
        hide: (itemContext: MaSearchItem<T>, model: T) => {
          const hiddenByItem = typeof originalHide === 'function' ? originalHide(itemContext, model) : originalHide === true
          return hiddenByItem || (folded && index >= foldRows)
        },
        cols: item.cols ?? { span: item.span ? item.span * 24 / viewportColumns : 24 / viewportColumns },
      }
    })
  }, [currentItems, folded, options.foldRows, viewportColumns])

  const handleSearch = React.useCallback(async (form: T) => {
    await onSearch?.(form)
  }, [onSearch])

  const handleReset = React.useCallback(async () => {
    formRef.current?.resetFields()
    const form = formRef.current?.getValues() ?? {} as T
    await onReset?.(form)
  }, [onReset])

  React.useImperativeHandle(ref, () => ({
    getMaFormRef: () => formRef.current,
    foldToggle: toggleFold,
    getFold: () => folded,
    setSearchForm: form => { if (form === null) formRef.current?.setValues(null); else formRef.current?.setValues(form) },
    getSearchForm: () => formRef.current?.getValues() ?? {} as T,
    setShowState: show => setOptionsState(current => ({ ...current, show })),
    getShowState: () => resolveShow(optionsRef.current.show),
    setOptions: nextOptions => setOptionsState(current => ({ ...current, ...nextOptions })),
    getOptions: () => optionsRef.current,
    setFormOptions: nextOptions => setFormOptionsState(current => ({ ...current, ...nextOptions })),
    getFormOptions: () => formOptions,
    setItems: nextItems => setCurrentItems(nextItems),
    getItems: () => itemsRef.current,
    appendItem: item => setCurrentItems(current => [...current, item]),
    removeItem: prop => setCurrentItems(current => current.filter(item => item.prop !== prop)),
    getItemByProp: prop => currentItems.find(item => item.prop === prop) ?? null,
    setSearchBtnProps: props => setOptionsState(current => ({ ...current, searchBtnProps: { ...current.searchBtnProps, ...props } })),
    setResetBtnProps: props => setOptionsState(current => ({ ...current, resetBtnProps: { ...current.resetBtnProps, ...props } })),
  }), [currentItems, folded, formOptions, toggleFold])

  if (!resolveShow(options.show)) return null

  const searchButtonProps = (options.searchBtnProps ?? {}) as React.ComponentProps<typeof Button>
  const resetButtonProps = (options.resetBtnProps ?? {}) as React.ComponentProps<typeof Button>
  const foldButtonVisible = (options.foldButtonShow ?? true) && currentItems.length > (options.foldRows ?? 2)

  return (
    <div className={cn('w-full rounded-lg border bg-card p-4', className)}>
      <MaForm ref={formRef} items={visibleItems} options={{ ...formOptions, layout: 'grid', grid: { ...formOptions.grid, columns: viewportColumns, gap: formOptions.grid?.gap ?? '1rem' } }} defaultValue={options.defaultValue as Partial<T>} onSubmit={handleSearch}>
        {children}
        <div className="flex flex-wrap items-center justify-end gap-2" style={{ gridColumn: '1 / -1' }}>
          {actions ?? <>
            {beforeActions}
            <Button type="submit" {...searchButtonProps}><SearchIcon className="size-4" aria-hidden="true" />{readText(options.text?.searchBtn, '搜索')}</Button>
            <Button type="button" variant="outline" onClick={() => void handleReset()} {...resetButtonProps}><RotateCcw className="size-4" aria-hidden="true" />{readText(options.text?.resetBtn, '重置')}</Button>
            {afterActions}
          </>}
          {foldButtonVisible && <Button type="button" variant="ghost" size="sm" onClick={toggleFold}>{folded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}{folded ? readText(options.text?.notFoldBtn, '展开') : readText(options.text?.isFoldBtn, '折叠')}</Button>}
        </div>
      </MaForm>
    </div>
  )
}

export const MaSearch = React.forwardRef(MaSearchInner) as <T extends MaModel = MaModel>(props: MaSearchProps<T> & { ref?: React.ForwardedRef<MaSearchExpose<T>> }) => React.ReactElement
