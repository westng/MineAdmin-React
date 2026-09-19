import { useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { MaIcon } from '@/components/ma-icon'
import { useSidebar } from '@/components/reui/primitives/sidebar'
import { useShell } from '@/hooks/shell/use-shell'
import { useTranslate } from '@/provider/i18n'
import { getMenuLabel, getMenuPath, isVisibleMenu } from '@/router/dynamic-menu'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import { cn } from '@/utils/cn'
import { ShellSlotOutlet } from '../slot-outlet'
import { useVerveNavigation } from './navigation-context'

const itemClass =
  'flex h-7 min-w-0 items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-[12.8px] leading-[19.2px] outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'

function MenuBranch({ menu, pathname, onNavigate }: { menu: MenuVo; pathname: string; onNavigate: () => void }) {
  const path = getMenuPath(menu)
  const children = (menu.children ?? []).filter(isVisibleMenu)
  const label = getMenuLabel(menu)
  const icon = menu.icon || menu.meta?.icon
  const content = (
    <>
      <MaIcon name={icon || 'lucide:circle-dot'} className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </>
  )
  if (children.length) {
    return (
      <details
        key={`${path}-${pathname}`}
        open={children.some(child => containsPath(child, pathname))}
        className="group/branch"
      >
        <summary className={cn(itemClass, 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}>
          {content}
          <ChevronRight className="ml-auto size-3 shrink-0 transition-transform group-open/branch:rotate-90" />
        </summary>
        <div className="ml-3 space-y-0.5 border-l border-border pl-2">
          {children.map(child => (
            <MenuBranch
              key={getMenuPath(child) || getMenuLabel(child)}
              menu={child}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </details>
    )
  }
  if (!path) return null
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={({ isActive }) => cn(itemClass, isActive && 'bg-muted font-medium text-foreground')}
    >
      {content}
    </NavLink>
  )
}

function containsPath(menu: MenuVo, pathname: string): boolean {
  const path = getMenuPath(menu)
  return (
    Boolean(path && (pathname === path || pathname.startsWith(`${path}/`))) ||
    (menu.children ?? []).filter(isVisibleMenu).some(child => containsPath(child, pathname))
  )
}

export function VerveSectionNavigation({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslate()
  const { pathname } = useShell()
  const { section, width, setWidth } = useVerveNavigation()
  const { open, setOpenMobile } = useSidebar()
  const drag = useRef<{ x: number; width: number } | null>(null)
  const items = (section?.children ?? []).filter(isVisibleMenu)
  if (!section || items.length === 0) return null
  const leaves = items.filter(item => !item.children?.some(isVisibleMenu))
  const groups = [
    ...(leaves.length ? [{ label: getMenuLabel(section), items: leaves }] : []),
    ...items
      .filter(item => item.children?.some(isVisibleMenu))
      .map(item => ({ label: getMenuLabel(item), items: item.children!.filter(isVisibleMenu) })),
  ]
  const onNavigate = () => setOpenMobile(false)
  return (
    <aside
      data-verve-section=""
      aria-label={getMenuLabel(section)}
      aria-hidden={!mobile && !open}
      inert={!mobile && !open}
      className={cn(
        'relative min-h-0 shrink-0 overflow-hidden border-border bg-background transition-[width] duration-300 ease-in-out',
        mobile ? 'flex min-w-0 flex-1' : 'hidden md:flex',
        (mobile || open) && 'border-r',
      )}
      style={mobile ? undefined : { width: open ? width : 0 }}
    >
      <div className="flex min-h-0 shrink-0 flex-col" style={{ width: mobile ? '100%' : width }}>
        <nav className="min-h-0 shrink overflow-y-auto py-1">
          {groups.map((group, index) => (
            <div key={group.label}>
              {index > 0 && <div role="separator" className="my-2 border-t border-border" />}
              <p className="px-3 pt-2 pb-1 text-[11px] leading-[16.5px] font-medium text-foreground/70 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5 px-2">
                {group.items.map(menu => (
                  <MenuBranch
                    key={getMenuPath(menu) || getMenuLabel(menu)}
                    menu={menu}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div data-slot="shell-section-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
          <ShellSlotOutlet
            slot="shell.section.content"
            pathname={pathname}
            sectionPath={getMenuPath(section) ?? undefined}
            sectionLabel={getMenuLabel(section)}
          />
        </div>
      </div>
      {!mobile && open && (
        <div
          role="separator"
          aria-label={t('调整二级菜单宽度')}
          aria-orientation="vertical"
          aria-valuenow={width}
          aria-valuemin={160}
          aria-valuemax={360}
          tabIndex={0}
          className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize touch-none outline-none hover:bg-border focus-visible:bg-ring"
          onPointerDown={event => {
            event.preventDefault()
            drag.current = { x: event.clientX, width }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={event => {
            if (drag.current) setWidth(drag.current.width + event.clientX - drag.current.x)
          }}
          onPointerUp={event => {
            drag.current = null
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onLostPointerCapture={() => {
            drag.current = null
          }}
          onDoubleClick={() => setWidth(200)}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              setWidth(width + (event.key === 'ArrowRight' ? 10 : -10))
            }
          }}
        />
      )}
    </aside>
  )
}

export function VerveSectionToggle() {
  const t = useTranslate()
  const { section, width } = useVerveNavigation()
  const { open, setOpen, isMobile } = useSidebar()
  if (isMobile || !section?.children?.some(isVisibleMenu)) return null
  const label = open ? t('折叠二级菜单') : t('展开二级菜单')
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="group/rail fixed top-1/2 z-30 hidden h-12 w-7 -translate-y-1/2 cursor-pointer items-center pl-2 outline-none transition-[left] duration-300 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring lg:flex"
      style={{ left: 63 + (open ? width : 0) }}
    >
      <span className="flex flex-col items-center" aria-hidden="true">
        <span
          className={cn(
            'block h-2 w-0.5 origin-bottom rounded-t-full bg-foreground/40 transition-all duration-100 group-hover/rail:bg-foreground/60',
            open ? 'group-hover/rail:rotate-40' : 'group-hover/rail:-rotate-40',
          )}
        />
        <span
          className={cn(
            'block h-2 w-0.5 origin-top rounded-b-full bg-foreground/40 transition-all duration-100 group-hover/rail:bg-foreground/60',
            open ? 'group-hover/rail:-rotate-40' : 'group-hover/rail:rotate-40',
          )}
        />
      </span>
      <span className="pointer-events-none absolute left-full -ml-2 -translate-x-0.5 rounded-md border border-border bg-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-background opacity-0 shadow-xs transition-all duration-200 group-hover/rail:translate-x-0 group-hover/rail:opacity-100">
        {open ? t('折叠') : t('展开')}
      </span>
    </button>
  )
}
