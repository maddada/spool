import { useState, useEffect } from 'react'
import { DEFAULT_SEARCH_SORT_ORDER, SEARCH_SORT_OPTIONS, type SearchSortOrder } from '../../shared/searchSort.js'

/** Must match SUPPORTED_TERMINALS in main/terminal.ts */
const TERMINAL_OPTIONS = [
  { value: '', label: 'Auto-detect' },
  { value: 'Terminal', label: 'Terminal' },
  { value: 'iTerm2', label: 'iTerm2' },
  { value: 'Warp', label: 'Warp' },
  { value: 'kitty', label: 'Kitty' },
  { value: 'Alacritty', label: 'Alacritty' },
  { value: 'WezTerm', label: 'WezTerm' },
] as const

interface AgentInfo {
  id: string
  name: string
  path: string
  status: 'ready' | 'not_found' | 'not_running'
  acpMode: 'extension' | 'native' | 'websocket' | 'sdk'
}

interface SdkAgentConfig {
  apiKey?: string
  model?: string
  baseURL?: string
}

interface AgentsConfig {
  defaultAgent?: string
  defaultSearchSort?: SearchSortOrder
  sdkAgent?: SdkAgentConfig
}

interface Props {
  onClose: () => void
}

const MODE_LABELS: Record<string, string> = {
  extension: 'ACP Extension',
  native: 'ACP Native',
  websocket: 'WebSocket',
  sdk: 'Built-in SDK',
}

const SDK_MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
] as const

export default function SettingsPanel({ onClose }: Props) {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [config, setConfig] = useState<AgentsConfig>({})
  const [dbPath] = useState('~/.spool/spool.db')

  useEffect(() => {
    if (!window.spool) return
    Promise.all([
      window.spool.getAiAgents(),
      window.spool.getAgentsConfig(),
    ]).then(([a, c]) => {
      setAgents(a)
      setConfig(c)
    }).catch(console.error)
  }, [])

  // SDK agent is always selectable; CLI agents need binary
  const sdkAgent = agents.find(a => a.acpMode === 'sdk')
  const cliAgents = agents.filter(a => a.acpMode !== 'sdk')
  const sdkConfigured = !!config.sdkAgent?.apiKey

  // The selected default: explicit config > first available
  const selectableIds = new Set([
    ...(sdkAgent ? [sdkAgent.id] : []),  // SDK always selectable
    ...cliAgents.filter(a => a.status === 'ready').map(a => a.id),
  ])
  const selectedId = config.defaultAgent && selectableIds.has(config.defaultAgent)
    ? config.defaultAgent
    : (sdkConfigured && sdkAgent ? sdkAgent.id : cliAgents.find(a => a.status === 'ready')?.id ?? '')

  const updateConfig = async (patch: Partial<AgentsConfig>) => {
    const next: AgentsConfig = { ...config, ...patch }
    setConfig(next)
    try {
      await window.spool.setAgentsConfig(next)
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[500px] max-h-[80vh] bg-warm-bg dark:bg-dark-bg border border-warm-border dark:border-dark-border rounded-[10px] shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border dark:border-dark-border">
          <h2 className="text-base font-semibold text-warm-text dark:text-dark-text">Settings</h2>
          <button onClick={onClose} className="text-warm-faint dark:text-dark-muted hover:text-warm-text dark:hover:text-dark-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ── Built-in Agent ── */}
          {sdkAgent && (
            <div className="mb-5">
              <h3 className="text-[11px] font-medium text-warm-faint dark:text-dark-muted tracking-[0.04em] uppercase mb-3">
                Built-in Agent
              </h3>
              <button
                onClick={() => updateConfig({ defaultAgent: sdkAgent.id })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-colors ${
                  selectedId === sdkAgent.id ? 'rounded-t-[8px] border-b-0 bg-accent-bg dark:bg-[#2A1800] border-accent/30 dark:border-accent-dark/30' : 'rounded-[8px] bg-warm-surface dark:bg-dark-surface border-warm-border dark:border-dark-border hover:border-warm-border2 dark:hover:border-dark-border2'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center ${
                  selectedId === sdkAgent.id ? 'border-accent dark:border-accent-dark' : 'border-warm-border2 dark:border-dark-border2'
                }`}>
                  {selectedId === sdkAgent.id && <span className="w-2 h-2 rounded-full bg-accent dark:bg-accent-dark" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-warm-text dark:text-dark-text">Built-in</span>
                    <span className="text-[9px] font-mono text-warm-faint dark:text-dark-muted px-1.5 py-0.5 bg-warm-surface2 dark:bg-dark-surface2 rounded">
                      Requires API Key
                    </span>
                  </div>
                  <span className="block text-[11px] font-mono text-warm-faint dark:text-dark-muted truncate">
                    {sdkConfigured ? `${config.sdkAgent?.model || 'claude-sonnet-4-6'} via API` : 'No CLI needed — just add your API key'}
                  </span>
                </div>
                <span className={`text-[10px] font-medium flex-none ${
                  sdkConfigured ? 'text-green-500' : 'text-amber-500 dark:text-amber-400'
                }`}>
                  {sdkConfigured ? 'ready' : 'needs key'}
                </span>
              </button>

              {/* Inline config — always visible when selected */}
              {selectedId === sdkAgent.id && (
                <div className="px-3 py-3 bg-accent-bg dark:bg-[#2A1800] border border-t-0 border-accent/30 dark:border-accent-dark/30 rounded-b-[8px] space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-warm-muted dark:text-dark-muted w-16 flex-none">API Key</span>
                    <input
                      type="password"
                      value={config.sdkAgent?.apiKey ?? ''}
                      onChange={(e) => updateConfig({ sdkAgent: { ...config.sdkAgent, apiKey: e.target.value } })}
                      placeholder="sk-ant-..."
                      className="flex-1 h-7 rounded-[6px] border border-warm-border dark:border-dark-border bg-warm-bg dark:bg-dark-bg px-2.5 text-[11px] font-mono text-warm-text dark:text-dark-text outline-none transition-colors focus:border-accent placeholder:text-warm-faint/50 dark:placeholder:text-dark-muted/50"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-warm-muted dark:text-dark-muted w-16 flex-none">Model</span>
                    <div className="relative flex-1">
                      <select
                        value={config.sdkAgent?.model ?? 'claude-sonnet-4-6'}
                        onChange={(e) => updateConfig({ sdkAgent: { ...config.sdkAgent, model: e.target.value } })}
                        className="appearance-none w-full h-7 rounded-[6px] border border-warm-border dark:border-dark-border bg-warm-bg dark:bg-dark-bg pl-2.5 pr-7 text-[11px] font-mono text-warm-text dark:text-dark-text outline-none transition-colors focus:border-accent"
                      >
                        {SDK_MODEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-warm-muted dark:text-dark-muted" fill="none">
                        <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-warm-muted dark:text-dark-muted w-16 flex-none">Base URL</span>
                    <input
                      type="text"
                      value={config.sdkAgent?.baseURL ?? ''}
                      onChange={(e) => updateConfig({ sdkAgent: { ...config.sdkAgent, baseURL: e.target.value || undefined } })}
                      placeholder="Default (Anthropic API)"
                      className="flex-1 h-7 rounded-[6px] border border-warm-border dark:border-dark-border bg-warm-bg dark:bg-dark-bg px-2.5 text-[11px] font-mono text-warm-text dark:text-dark-text outline-none transition-colors focus:border-accent placeholder:text-warm-faint/50 dark:placeholder:text-dark-muted/50"
                    />
                  </div>
                  <p className="text-[10px] text-warm-faint dark:text-dark-muted leading-relaxed">
                    Runs directly via API — no CLI install needed. Override Base URL for OpenRouter or other providers.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Installed Agents ── */}
          <div className="mb-6">
            <h3 className="text-[11px] font-medium text-warm-faint dark:text-dark-muted tracking-[0.04em] uppercase mb-3">
              Installed Agents
            </h3>
            <div className="space-y-1.5">
              {cliAgents.map(agent => {
                const isReady = agent.status === 'ready'
                const isSelected = agent.id === selectedId
                return (
                  <button
                    key={agent.id}
                    onClick={() => isReady && updateConfig({ defaultAgent: agent.id })}
                    disabled={!isReady}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-[8px] text-left transition-colors ${
                      isSelected
                        ? 'bg-accent-bg dark:bg-[#2A1800] border-accent/30 dark:border-accent-dark/30'
                        : isReady
                          ? 'bg-warm-surface dark:bg-dark-surface border-warm-border dark:border-dark-border hover:border-warm-border2 dark:hover:border-dark-border2'
                          : 'bg-warm-bg dark:bg-dark-bg border-warm-border/50 dark:border-dark-border/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center ${
                      isSelected ? 'border-accent dark:border-accent-dark' : 'border-warm-border2 dark:border-dark-border2'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-accent dark:bg-accent-dark" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          isReady ? 'text-warm-text dark:text-dark-text' : 'text-warm-faint dark:text-dark-muted'
                        }`}>{agent.name}</span>
                        <span className="text-[9px] font-mono text-warm-faint dark:text-dark-muted px-1.5 py-0.5 bg-warm-surface2 dark:bg-dark-surface2 rounded">
                          {MODE_LABELS[agent.acpMode] ?? agent.acpMode}
                        </span>
                      </div>
                      <span className="block text-[11px] font-mono text-warm-faint dark:text-dark-muted truncate">
                        {isReady ? agent.path : `${agent.id} — not found in PATH`}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium flex-none ${
                      isReady ? 'text-green-500' : 'text-warm-faint dark:text-dark-muted'
                    }`}>
                      {isReady ? 'ready' : 'not found'}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-warm-faint dark:text-dark-muted mt-2">
              Agents detected on your system.
              Add custom agents in <span className="font-mono">~/.spool/agents.json</span>.
            </p>
          </div>

          {/* Data */}
          <div className="mb-6">
            <h3 className="text-[11px] font-medium text-warm-faint dark:text-dark-muted tracking-[0.04em] uppercase mb-3">
              Data
            </h3>
            <div className="px-3 py-2.5 bg-warm-surface dark:bg-dark-surface border border-warm-border dark:border-dark-border rounded-[8px]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-muted dark:text-dark-muted">Database</span>
                <span className="text-[11px] font-mono text-warm-faint dark:text-dark-muted">{dbPath}</span>
              </div>
            </div>
            <p className="text-[11px] text-warm-faint dark:text-dark-muted mt-2">
              All data stays local. Sessions are indexed from agent history directories.
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <h3 className="text-[11px] font-medium text-warm-faint dark:text-dark-muted tracking-[0.04em] uppercase mb-3">
              Search
            </h3>
            <div className="px-3 py-2.5 bg-warm-surface dark:bg-dark-surface border border-warm-border dark:border-dark-border rounded-[8px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-warm-muted dark:text-dark-muted">Default sort</span>
                <div className="relative flex-none">
                  <select
                    value={config.defaultSearchSort ?? DEFAULT_SEARCH_SORT_ORDER}
                    onChange={(e) => updateConfig({ defaultSearchSort: e.target.value as SearchSortOrder })}
                    aria-label="Default search sort"
                    className="appearance-none h-8 rounded-full border border-warm-border dark:border-dark-border bg-warm-bg dark:bg-dark-bg pl-3 pr-9 text-xs font-medium text-warm-text dark:text-dark-text outline-none transition-colors hover:border-accent/50 hover:bg-warm-surface2 dark:hover:bg-dark-surface2 focus:border-accent"
                  >
                    {SEARCH_SORT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-warm-muted dark:text-dark-muted"
                    fill="none"
                  >
                    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-warm-faint dark:text-dark-muted mt-2">
              Choose which sort order new search results should use by default.
            </p>
          </div>

          {/* Terminal */}
          <div className="mb-6">
            <h3 className="text-[11px] font-medium text-warm-faint dark:text-dark-muted tracking-[0.04em] uppercase mb-3">
              Terminal
            </h3>
            <div className="px-3 py-2.5 bg-warm-surface dark:bg-dark-surface border border-warm-border dark:border-dark-border rounded-[8px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-warm-muted dark:text-dark-muted">Session resume</span>
                <div className="relative flex-none">
                  <select
                    value={config.terminal ?? ''}
                    onChange={(e) => updateConfig({ terminal: e.target.value || undefined })}
                    aria-label="Terminal for session resume"
                    className="appearance-none h-8 rounded-full border border-warm-border dark:border-dark-border bg-warm-bg dark:bg-dark-bg pl-3 pr-9 text-xs font-medium text-warm-text dark:text-dark-text outline-none transition-colors hover:border-accent/50 hover:bg-warm-surface2 dark:hover:bg-dark-surface2 focus:border-accent"
                  >
                    {TERMINAL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-warm-muted dark:text-dark-muted"
                    fill="none"
                  >
                    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-warm-faint dark:text-dark-muted mt-2">
              Which terminal to open when resuming a session. Auto-detect checks for running third-party terminals.
            </p>
          </div>

          {/* About */}
          <div>
            <h3 className="text-[11px] font-medium text-warm-faint dark:text-dark-muted tracking-[0.04em] uppercase mb-3">
              About
            </h3>
            <p className="text-xs text-warm-muted dark:text-dark-muted">
              Spool — a local search engine for your thinking.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
