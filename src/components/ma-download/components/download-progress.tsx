import { Progress } from '@/components/reui/primitives/progress'
import type { MaDownloadProgress } from '../types'

function formatBytes(value: number) {
  const unit = value >= 1024 ** 3 ? 3 : value >= 1024 ** 2 ? 2 : value >= 1024 ? 1 : 0
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][unit]}`
}

export function DownloadProgress({ name, progress }: { name: string; progress?: MaDownloadProgress }) {
  const total = progress?.total
  const percent = total && total > 0 ? Math.min(99, Math.floor((progress.loaded / total) * 100)) : null
  return (
    <div className="w-full min-w-0 space-y-2">
      <p className="break-all">{name}</p>
      <Progress aria-label="下载进度" value={percent} />
      <p className="text-xs tabular-nums">
        {progress
          ? `${formatBytes(progress.loaded)}${total ? ` / ${formatBytes(total)} · ${percent}%` : ' · 正在接收文件'}`
          : '正在准备文件…'}
      </p>
    </div>
  )
}
