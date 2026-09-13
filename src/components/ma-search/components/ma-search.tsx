import * as React from 'react'
import { ChevronDown, ChevronUp, RotateCcw, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaForm } from '../../ma-form'
import { readLabel, resolveProp } from '../../ma-form/utils/form-utils'
import { cn } from '@/lib/utils'
import { usePropState } from '../../shared/use-prop-state'
import { readText } from '../utils/search-utils'
import type { MaFormExpose, MaFormOptions, MaSearchExpose, MaSearchItem, MaSearchModel, MaSearchOptions, MaSearchProps } from '../types'

type MaModel = MaSearchModel
const emptyItems: MaSearchItem[] = []
const emptyOptions: MaSearchOptions = {}
const emptyFormOptions: MaFormOptions = {}

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

function getItemSpan<T extends MaModel>(item: MaSearchItem<T>, columns: number): number {
  const configuredSpan = item.cols?.span ?? (item.span ? item.span * 24 / columns : 24 / columns)
  return Math.max(1, Math.min(columns, Math.ceil((configuredSpan / 24) * columns)))
}

function getFoldRow<T extends MaModel>(items: MaSearchItem<T>[], index: number, columns: number): number {
  let row = 0
  let usedColumns = 0
  for (let itemIndex = 0; itemIndex <= index; itemIndex += 1) {
    const item = items[itemIndex]
    if (item.hide === true) continue
    const span = getItemSpan(item, columns)
    const offset = item.cols?.offset ?? (item.offset ? item.offset * 24 / columns : 0)
    const offsetColumns = Math.max(0, Math.min(columns - span, Math.ceil((offset / 24) * columns)))
    if (usedColumns > 0 && usedColumns + offsetColumns + span > columns) {
      row += 1
      usedColumns = 0
    }
    if (itemIndex === index) return row
    usedColumns += offsetColumns + span
    if (usedColumns >= columns) {
      row += Math.floor(usedColumns / columns)
      usedColumns %= columns
    }
  }
  return row
}

function resolveLabelText<T extends MaModel>(label: MaSearchItem<T>['label']): string | undefined {
  const resolved = readLabel(label)
  return typeof resolved === 'string' || typeof resolved === 'number' ? String(resolved) : undefined
}

function supportsLabelPrefix<T extends MaModel>(item: MaSearchItem<T>): boolean {
  const component = item.component ?? item.render
  return typeof component !== 'string' || !['Select', 'Checkbox', 'Switch', 'Radio'].includes(component)
}

function MaSearchInner<T extends MaModel>({ options: initialOptions = emptyOptions, formOptions: initialFormOptions = emptyFormOptions, searchItems, items, className, children, beforeActions, afterActions, actions, onSearch, onReset, onFold }: MaSearchProps<T>, ref: React.ForwardedRef<MaSearchExpose<T>>) {
  const [options, setOptionsState] = usePropState(initialOptions)
  const [formOptions, setFormOptionsState] = usePropState(initialFormOptions)
  const [currentItems, setCurrentItems] = usePropState(searchItems ?? items ?? emptyItems as MaSearchItem<T>[])
  const [folded, setFolded] = usePropState(options.fold ?? false)
  const [viewportColumns, setViewportColumns] = React.useState(() => typeof window === 'undefined' ? 1 : getViewportColumns(initialOptions, window.innerWidth))
  const formRef = React.useRef<MaFormExpose<T>>(null)
  const optionsRef = React.useRef(options)
  const formOptionsRef = React.useRef(formOptions)
  const itemsRef = React.useRef(currentItems)
  React.useEffect(() => {
    optionsRef.current = options
    formOptionsRef.current = formOptions
    itemsRef.current = currentItems
  }, [currentItems, formOptions, options])
  React.useEffect(() => {
    const handleResize = () => setViewportColumns(getViewportColumns(optionsRef.current, window.innerWidth))
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [options.cols])

  const updateOptions = React.useCallback((nextOptions: MaSearchOptions) => {
    const merged = { ...optionsRef.current, ...nextOptions }
    optionsRef.current = merged
    setOptionsState(merged)
    if (typeof window !== 'undefined') setViewportColumns(getViewportColumns(merged, window.innerWidth))
  }, [setOptionsState])

  const updateFormOptions = React.useCallback((nextOptions: MaFormOptions) => {
    const merged = { ...formOptionsRef.current, ...nextOptions }
    formOptionsRef.current = merged
    setFormOptionsState(merged)
  }, [setFormOptionsState])

  const toggleFold = React.useCallback(() => {
    setFolded(!folded)
    onFold?.(!folded)
  }, [folded, onFold, setFolded])

  const visibleItems = React.useMemo(() => {
    const foldRows = options.foldRows ?? 2
    const labelInside = (options.labelPlacement ?? 'inside') === 'inside'
    return currentItems.map((item, index) => {
      const originalHide = item.hide
      const labelText = labelInside ? resolveLabelText(item.label) : undefined
      const renderProps = { ...(item.renderProps ?? {}) }
      if (labelText) {
        if (supportsLabelPrefix(item) && renderProps.prefix === undefined) renderProps.prefix = labelText
        if (!supportsLabelPrefix(item) && renderProps.placeholder === undefined) renderProps.placeholder = labelText
        if (renderProps['aria-label'] === undefined) renderProps['aria-label'] = labelText
      }
      return {
        ...item,
        showLabel: labelInside ? false : item.showLabel,
        renderProps: labelInside && labelText ? renderProps : item.renderProps,
        hide: (itemContext: MaSearchItem<T>, model: T) => {
          const hiddenByItem = typeof originalHide === 'function' ? originalHide(itemContext, model) : originalHide === true
          return hiddenByItem || (folded && getFoldRow(currentItems, index, viewportColumns) >= foldRows)
        },
        cols: item.cols ?? { span: item.span ? item.span * 24 / viewportColumns : 24 / viewportColumns },
      } as MaSearchItem<T>
    })
  }, [currentItems, folded, options.foldRows, options.labelPlacement, viewportColumns])

  const foldButtonVisible = React.useMemo(() => {
    const foldRows = options.foldRows ?? 2
    return (options.foldButtonShow ?? true) && currentItems.some((item, index) => getFoldRow(currentItems, index, viewportColumns) >= foldRows && item.hide !== true)
  }, [currentItems, options.foldButtonShow, options.foldRows, viewportColumns])

  const handleSearch = React.useCallback(async (form: T) => {
    await onSearch?.(form)
  }, [onSearch])

  const handleReset = React.useCallback(async () => {
    const form = formRef.current?.resetFields() ?? (optionsRef.current.defaultValue ?? {}) as T
    await onReset?.(form)
  }, [onReset])

  React.useImperativeHandle(ref, () => ({
    getMaFormRef: () => formRef.current,
    foldToggle: toggleFold,
    getFold: () => folded,
    setSearchForm: form => { if (form === null) formRef.current?.setValues(null); else formRef.current?.setValues(form) },
    getSearchForm: () => formRef.current?.getValues() ?? {} as T,
    setShowState: show => updateOptions({ show }),
    getShowState: () => resolveShow(optionsRef.current.show),
    setOptions: updateOptions,
    getOptions: () => optionsRef.current,
    setFormOptions: updateFormOptions,
    getFormOptions: () => formOptionsRef.current,
    setItems: nextItems => { itemsRef.current = nextItems; setCurrentItems(nextItems) },
    getItems: () => itemsRef.current,
    appendItem: item => { itemsRef.current = [...itemsRef.current, item]; setCurrentItems(itemsRef.current) },
    removeItem: prop => { itemsRef.current = itemsRef.current.filter(item => resolveProp(item.prop, formRef.current?.getValues() ?? {} as T) !== prop); setCurrentItems(itemsRef.current) },
    getItemByProp: prop => itemsRef.current.find(item => resolveProp(item.prop, formRef.current?.getValues() ?? {} as T) === prop) ?? null,
    setSearchBtnProps: props => updateOptions({ searchBtnProps: { ...optionsRef.current.searchBtnProps, ...props } }),
    setResetBtnProps: props => updateOptions({ resetBtnProps: { ...optionsRef.current.resetBtnProps, ...props } }),
  }), [folded, setCurrentItems, toggleFold, updateFormOptions, updateOptions])

  if (!resolveShow(options.show)) return null

  const searchButtonProps = (options.searchBtnProps ?? {}) as React.ComponentProps<typeof Button>
  const resetButtonProps = (options.resetBtnProps ?? {}) as React.ComponentProps<typeof Button>
  return (
    <div className={cn('w-full rounded-lg border bg-card p-4', className)}>
      <MaForm ref={formRef} items={visibleItems} options={{ ...formOptions, layout: 'grid', grid: { ...formOptions.grid, columns: viewportColumns, gap: formOptions.grid?.gap ?? '1rem' } }} defaultValue={options.defaultValue as Partial<T>} onSubmit={handleSearch}>
        {children}
        <div className="flex flex-wrap items-center justify-start gap-2" style={{ gridColumn: '1 / -1', marginTop: formOptions.grid?.gap ?? '1rem' }}>
          {actions ?? <>
            {beforeActions}
            <Button type="submit" {...searchButtonProps}><SearchIcon className="size-4" aria-hidden="true" />{readText(options.text?.searchBtn, '搜索')}</Button>
            <Button type="button" variant="outline" onClick={() => void handleReset()} {...resetButtonProps}><RotateCcw className="size-4" aria-hidden="true" />{readText(options.text?.resetBtn, '重置')}</Button>
            {afterActions}
          </>}
          {foldButtonVisible && <Button type="button" variant="ghost" size="sm" aria-expanded={!folded} onClick={toggleFold}>{folded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}{folded ? readText(options.text?.notFoldBtn, '展开') : readText(options.text?.isFoldBtn, '折叠')}</Button>}
        </div>
      </MaForm>
    </div>
  )
}

export const MaSearch = React.forwardRef(MaSearchInner) as <T extends MaModel = MaModel>(props: MaSearchProps<T> & { ref?: React.ForwardedRef<MaSearchExpose<T>> }) => React.ReactElement
