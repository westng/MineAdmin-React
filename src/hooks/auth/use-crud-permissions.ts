import { usePermission } from './use-permission'

export interface CrudPermissionCodes {
  create: string
  edit: string
  delete: string
}

export function useCrudPermissions(codes: CrudPermissionCodes) {
  const { hasAuth } = usePermission()

  return {
    canCreate: hasAuth(codes.create),
    canEdit: hasAuth(codes.edit),
    canDelete: hasAuth(codes.delete),
  }
}
