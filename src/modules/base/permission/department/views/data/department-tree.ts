import type { DepartmentVo } from '../../api/department'

export type DepartmentRow = { department: DepartmentVo; depth: number; name?: string }

export function flattenDepartments(departments: DepartmentVo[], collapsedIds: number[] = [], depth = 0, rows: DepartmentRow[] = []) {
  departments.forEach(department => {
    rows.push({ department, depth })
    if (department.id && collapsedIds.includes(department.id)) return
    if (department.children?.length) flattenDepartments(department.children, collapsedIds, depth + 1, rows)
  })
  return rows
}

export function paginateDepartments(departments: DepartmentVo[], currentPage: number, pageSize: number, collapsedIds: number[] = []) {
  const pageCount = Math.max(1, Math.ceil(departments.length / pageSize))
  const page = Math.min(Math.max(1, currentPage), pageCount)
  const start = (page - 1) * pageSize
  return {
    currentPage: page,
    rows: flattenDepartments(departments.slice(start, start + pageSize), collapsedIds),
  }
}
