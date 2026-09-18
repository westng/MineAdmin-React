import { useTranslate } from '@/provider/i18n'
import { NavLink } from 'react-router-dom'
import { useShell } from '@/hooks/shell/use-shell'
import { getMenuPath, getMenuLabel, isVisibleMenu } from '@/router/dynamic-menu'
import { cn } from '@/utils/cn'
export default function SectionNavigation({ vertical = false }: { vertical?: boolean }) {
  const t = useTranslate()
  const { menus, activeSection, setSection } = useShell()
  return (
    <nav
      aria-label={t('shell.mainNavigation')}
      className={cn(
        'flex gap-1 overflow-auto bg-sidebar p-2',
        vertical ? 'hidden w-16 shrink-0 flex-col border-r md:flex' : 'border-b',
      )}
    >
      {menus.filter(isVisibleMenu).map(menu => {
        const path = getMenuPath(menu)
        if (!path) return null
        const className = cn(
          'rounded px-2 py-2 text-center text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring',
          menu === activeSection ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
        )
        return menu.children?.length ? (
          <button
            key={path}
            type="button"
            aria-pressed={menu === activeSection}
            className={className}
            onClick={() => setSection(path)}
          >
            {getMenuLabel(menu)}
          </button>
        ) : (
          <NavLink key={path} className={className} to={path}>
            {getMenuLabel(menu)}
          </NavLink>
        )
      })}
    </nav>
  )
}
