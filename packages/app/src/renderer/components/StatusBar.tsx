import { useEffect, useState } from 'react'
import type { StatusInfo } from '@spool/core'

interface Props {
  syncStatus: { phase: string; count: number; total: number } | null
}

export default function StatusBar({ syncStatus }: Props) {
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!window.spool) return
    window.spool.getStatus().then(setStatus).catch(console.error)
  }, [syncStatus])

  const statusText = getSyncStatusText(syncStatus, status)
  const isOk = !syncStatus || syncStatus.phase === 'done'

  return (
    <div className="flex-none border-t border-neutral-100 dark:border-neutral-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-1.5 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-none ${isOk ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        <span className="text-xs text-neutral-400 dark:text-neutral-500 flex-1 truncate">{statusText}</span>
        <svg
          width="10" height="10"
          viewBox="0 0 10 10"
          className={`text-neutral-300 transition-transform ${expanded ? '' : 'rotate-180'}`}
        >
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>

      {expanded && status && (
        <div className="px-4 pb-2 text-xs text-neutral-400 space-y-0.5">
          <div className="flex justify-between">
            <span>Claude</span><span>{status.claudeSessions} sessions</span>
          </div>
          <div className="flex justify-between">
            <span>Codex</span><span>{status.codexSessions} sessions</span>
          </div>
          <div className="flex justify-between">
            <span>DB size</span><span>{formatBytes(status.dbSizeBytes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Location</span><span className="font-mono text-[10px] truncate max-w-48">{status.dbPath}</span>
          </div>
        </div>
      )}
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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
