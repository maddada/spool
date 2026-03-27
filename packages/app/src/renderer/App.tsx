import { useEffect, useState, useCallback, useRef, type MouseEvent } from 'react'
import type { FragmentResult, StatusInfo } from '@spool/core'
import SearchBar from './components/SearchBar.js'
import FragmentResults from './components/FragmentResults.js'
import HomeView from './components/HomeView.js'
import SessionDetail from './components/SessionDetail.js'
import StatusBar from './components/StatusBar.js'

type View = 'search' | 'session'

// Height of the titlebar zone in px — must match h-10 (40px) used in compact topbar
const TITLEBAR_HEIGHT = 40

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FragmentResult[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [view, setView] = useState<View>('search')
  const [isSearching, setIsSearching] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ phase: string; count: number; total: number } | null>(null)
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragState = useRef<{ lastX: number; lastY: number } | null>(null)

  const isHomeMode = !query.trim() && view === 'search' && !selectedSession

  useEffect(() => {
    if (!window.spool) return
    window.spool.getStatus().then(setStatus).catch(console.error)
  }, [syncStatus])

  useEffect(() => {
    if (!window.spool) return () => {}
    const offProgress = window.spool.onSyncProgress((e) => {
      setSyncStatus(e)
      if (e.phase === 'done') {
        setTimeout(() => setSyncStatus(null), 3000)
        window.spool.getStatus().then(setStatus).catch(console.error)
        if (query.trim()) doSearch(query)
      }
    })
    const offNew = window.spool.onNewSessions(() => {
      window.spool.getStatus().then(setStatus).catch(console.error)
      if (query.trim()) doSearch(query)
    })
    return () => { offProgress(); offNew() }
  }, [query])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setIsSearching(false); return }
    setIsSearching(true)
    try {
      const res = window.spool ? await window.spool.search(q, 20) : []
      setResults(res)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(q), 200)
  }, [doSearch])

  const handleOpenSession = useCallback((uuid: string) => {
    setSelectedSession(uuid); setView('session')
  }, [])

  const handleBack = useCallback(() => {
    setView('search'); setSelectedSession(null)
  }, [])

  // Drag via root div + clientY guard — NOT a z-index overlay.
  //
  // Why NOT an overlay: an absolute div with z-20 sits on top of the search input
  // (z-10). When the user clicks the input, the browser dispatches mousedown to the
  // TOPMOST element (the overlay), so e.target = overlay div, NOT the input.
  // `closest('input')` on the overlay returns null → drag starts → input can never
  // be focused by clicking.
  //
  // With the handler on the root div and NO overlay: the input receives mousedown
  // first (hit test finds it directly), then the event bubbles up to the root div.
  // At that point e.target = input → closest('input') returns it → guard bails.
  // Non-interactive content in the top 40px → closest returns null → drag starts.
  const handleDragMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, input, a, select, textarea')) return
    if (e.clientY > TITLEBAR_HEIGHT) return   // only drag from titlebar zone
    dragState.current = { lastX: e.screenX, lastY: e.screenY }
  }, [])

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragState.current) return
      const dx = e.screenX - dragState.current.lastX
      const dy = e.screenY - dragState.current.lastY
      dragState.current.lastX = e.screenX
      dragState.current.lastY = e.screenY
      window.spool?.moveWindow(dx, dy)
    }
    const onUp = () => { dragState.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div
      onMouseDown={handleDragMouseDown}
      className="flex flex-col h-screen bg-warm-bg dark:bg-dark-bg text-warm-text dark:text-dark-text"
    >
      <div key={isHomeMode ? 'home' : 'results'} className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-150">
        {isHomeMode ? (
          <HomeView
            query={query}
            onChange={handleQueryChange}
            claudeCount={status?.claudeSessions ?? null}
            codexCount={status?.codexSessions ?? null}
          />
        ) : (
          <>
            {/*
              Compact results topbar — h-10 (40px) = TITLEBAR_HEIGHT.
              pl-[72px]: traffic lights span x:16–x:~68 with trafficLightPosition:{x:16};
              content must start at x:72+ to avoid rendering behind the buttons.
              The S. wordmark and empty space to its left are the drag handles.
            */}
            <div className="flex items-center gap-3 pl-[72px] pr-4 h-10 flex-none">
              <span className="text-base font-bold tracking-[-0.04em] flex-none select-none">
                S<span className="text-accent">.</span>
              </span>
              <SearchBar
                query={query}
                onChange={handleQueryChange}
                {...(view === 'session' ? { onBack: handleBack } : {})}
                isSearching={isSearching}
                variant="compact"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {view === 'session' && selectedSession
                ? <SessionDetail sessionUuid={selectedSession} />
                : <FragmentResults results={results} query={query} onOpenSession={handleOpenSession} />
              }
            </div>
          </>
        )}
      </div>

      <StatusBar syncStatus={syncStatus} />
    </div>
  )
}
