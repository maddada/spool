import SearchBar from './SearchBar.js'

interface Props {
  query: string
  onChange: (q: string) => void
  claudeCount: number | null
  codexCount: number | null
}

export default function HomeView({ query, onChange, claudeCount, codexCount }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10 gap-0">
      <h1 className="text-[48px] font-bold tracking-[-0.04em] leading-none mb-2 select-none">
        Spool<span className="text-accent">.</span>
      </h1>
      <p className="text-sm text-warm-muted dark:text-dark-muted mb-8 select-none">
        A local search engine for your thinking.
      </p>
      <div className="w-full max-w-[520px] mb-5">
        <SearchBar
          query={query}
          onChange={onChange}
          isSearching={false}
          variant="home"
        />
      </div>
      <SourceChips claudeCount={claudeCount} codexCount={codexCount} />
    </div>
  )
}

interface SourceChipsProps {
  claudeCount: number | null
  codexCount: number | null
}

function SourceChips({ claudeCount, codexCount }: SourceChipsProps) {
  const sources = [
    { id: 'claude', label: 'Claude Code', color: '#6B5B8A', count: claudeCount },
    { id: 'codex',  label: 'Codex CLI',   color: '#1A6B3C', count: codexCount },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {sources.map(src => (
        <div
          key={src.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     bg-warm-surface dark:bg-dark-surface
                     border border-warm-border dark:border-dark-border
                     text-xs text-warm-muted dark:text-dark-muted select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: src.color }} />
          <span className="font-medium">{src.label}</span>
          <span className="text-warm-faint dark:text-dark-muted tabular-nums">
            {src.count === null ? '…' : src.count}
          </span>
        </div>
      ))}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                   border border-dashed border-warm-border2 dark:border-dark-border
                   text-xs text-warm-faint dark:text-dark-muted select-none"
      >
        <span>+ Connect</span>
      </div>
    </div>
  )
}
