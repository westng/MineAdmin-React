import { createTextTranslator } from '@/provider/i18n'
import { useCallback, useRef, useState } from 'react'
import { useToast } from '@/components/reui/use-toast'
import { hasAuth } from '@/hooks/framework/use-permission'
import { deleteById, type AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { copyText } from '@/utils/clipboard'
import { attachmentError, attachmentUrl } from './attachment'

const tx = createTextTranslator('base.data-center.attachment.ui')

export function useAttachmentActions(refresh: () => void, loading: boolean) {
  const { toast } = useToast()
  const deletingRef = useRef(false)
  const [deleteRows, setDeleteRows] = useState<AttachmentVo[]>([])
  const [deleteErrors, setDeleteErrors] = useState<Record<number, string>>({})
  const [deleting, setDeleting] = useState(false)
  const [detail, setDetail] = useState<AttachmentVo | null>(null)

  const requestDelete = useCallback(
    (rows: AttachmentVo[]) => {
      if (deletingRef.current || !rows.length) return
      if (!hasAuth('dataCenter:attachment:delete')) {
        toast(tx('暂无删除权限，请联系管理员'), 'destructive')
        return
      }
      if (loading) {
        toast(tx('附件正在加载，请稍后操作'), 'warning')
        return
      }
      setDeleteRows([...new Map(rows.map(row => [row.id, row])).values()])
      setDeleteErrors({})
    },
    [loading, toast],
  )

  const closeDelete = useCallback(() => {
    if (deletingRef.current) return
    setDeleteRows([])
    setDeleteErrors({})
  }, [])

  const confirmDelete = useCallback(async () => {
    if (deletingRef.current || !deleteRows.length) return
    deletingRef.current = true
    setDeleting(true)
    const errors: Record<number, string> = {}
    const deleted = new Set<number>()
    try {
      for (const row of deleteRows) {
        if (!hasAuth('dataCenter:attachment:delete')) {
          for (const remaining of deleteRows)
            if (!deleted.has(remaining.id) && !errors[remaining.id]) errors[remaining.id] = tx('暂无删除权限')
          break
        }
        try {
          const response = await deleteById(row.id)
          if (response.data.code !== 200) throw new Error(response.data.message || tx('删除失败'))
          deleted.add(row.id)
        } catch (error) {
          errors[row.id] = attachmentError(error, tx('删除失败，请重试'))
          if (error && typeof error === 'object' && 'code' in error && [401, 403].includes(Number(error.code))) {
            for (const remaining of deleteRows)
              if (!deleted.has(remaining.id) && !errors[remaining.id]) errors[remaining.id] = errors[row.id]
            break
          }
        }
      }
      setDeleteErrors(errors)
      setDeleteRows(deleteRows.filter(row => !deleted.has(row.id)))
      if (deleted.size) {
        setDetail(current => (current && deleted.has(current.id) ? null : current))
        refresh()
      }
      const failed = deleteRows.length - deleted.size
      toast(
        failed
          ? tx('已删除 {0} 条，{1} 条删除失败，请查看详情后重试', { '0': deleted.size, '1': failed })
          : tx('已删除 {0} 条附件记录', { '0': deleted.size }),
        failed ? 'destructive' : 'success',
      )
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }, [deleteRows, refresh, toast])

  const copyUrl = useCallback(
    async (value: string) => {
      const url = attachmentUrl(value)
      if (!url) {
        toast(tx('附件地址无效或未提供'), 'warning')
        return
      }
      try {
        if (!(await copyText(url))) throw new Error(tx('当前环境无法复制，请在详情中手动复制地址'))
        toast(tx('附件地址已复制'), 'success')
      } catch (error) {
        toast(attachmentError(error, tx('复制失败，请在详情中手动复制地址')), 'destructive')
      }
    },
    [toast],
  )

  return { deleteRows, deleteErrors, deleting, detail, setDetail, requestDelete, closeDelete, confirmDelete, copyUrl }
}
