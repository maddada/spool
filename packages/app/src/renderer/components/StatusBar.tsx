import { useEffect, useState } from 'react'
import type { StatusInfo } from '@spool/core'

interface Props {
  syncStatus: { phase: string; count: number; total: number } | null
}

export default function StatusBar({ syncStatus }: Props) {
  const [status, setStatus] = useState<StatusInfo | null>(null)

  useEffect(() => {
    if (!window.spool) return
    window.spool.getStatus().then(setStatus).catch(console.error)
  }, [syncStatus])

  const statusText = getSyncStatusText(syncStatus, status)
  const isOk = !syncStatus || syncStatus.phase === 'done'

  return (
    <div className="flex-none h-[30px] bg-warm-surface dark:bg-dark-surface border-t border-warm-border dark:border-dark-border flex items-center justify-between px-4">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-none ${isOk ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        <span className="text-[11px] font-mono text-warm-muted dark:text-dark-muted truncate">
          {statusText}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-[11px] text-warm-faint hover:text-warm-text dark:text-dark-muted dark:hover:text-dark-text transition-colors">
          ⌘K Capture
        </button>
        <button className="text-[11px] text-warm-faint hover:text-warm-text dark:text-dark-muted dark:hover:text-dark-text transition-colors">
          Sources +
        </button>
      </div>
    </div>
  )
}

function getSyncStatusText(
  syncStatus: { phase: string; count: number; total: number } | null,
  status: StatusInfo | null,
): string {
  if (syncStatus) {
    if (syncStatus.phase === 'scanning') return `Scanning for sessions…`
    if (syncStatus.phase === 'syncing') return `Indexing ${syncStatus.count}/${syncStatus.total}…`
    if (syncStatus.phase === 'done') return `Synced · ${status?.totalSessions ?? '…'} sessions`
  }
  if (!status) return 'Loading…'
  const lastSync = status.lastSyncedAt ? formatTimeAgo(status.lastSyncedAt) : 'never'
  return `Synced ${lastSync} · ${status.totalSessions} sessions`
}

function formatTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  } catch {
    return iso
  }
}
