import React, { useState } from 'react'
import {
  Search,
  Zap,
  Clock,
  Sparkles,
  Sliders,
  Code,
} from 'lucide-react'
import type { DocumentDetail, QuerySearchResponse } from '../types'
import { searchQueries } from '../api'

interface QueryPlaygroundProps {
  document: DocumentDetail | null
}

export const QueryPlayground: React.FC<QueryPlaygroundProps> = ({ document }) => {
  const [query, setQuery] = useState<string>('How does product quantization reduce vector memory?')
  const [topK, setTopK] = useState<number>(3)
  const [loading, setLoading] = useState<boolean>(false)
  const [searchResults, setSearchResults] = useState<QuerySearchResponse | null>(null)

  const handleSearch = async (queryText?: string) => {
    if (!document) return
    const activeQuery = queryText || query
    if (!activeQuery.trim()) return

    setLoading(true)
    try {
      const res = await searchQueries({
        document_id: document.id,
        query: activeQuery,
        top_k: topK,
      })
      setSearchResults(res)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sampleQueries = document?.query_sets?.[0]?.queries || []

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter evaluation query (e.g. How does product quantization compress vectors?)"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-between">
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <Sliders className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">Top-K:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-transparent text-xs font-mono font-bold text-indigo-400 focus:outline-none cursor-pointer"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>

            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Compare 4 Strategies'}</span>
            </button>
          </div>
        </div>

        {/* Quick Sample Queries */}
        {sampleQueries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium block mb-2">
              Seeded Evaluation Queries (Click to test):
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sq) => (
                <button
                  key={sq.id}
                  onClick={() => {
                    setQuery(sq.query_text)
                    handleSearch(sq.query_text)
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition text-left flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{sq.query_text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4-Column Side-by-Side Strategy Comparison */}
      {searchResults ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {searchResults.strategies.map((strat) => {
            const strategyTitles: Record<string, { name: string; tag: string; border: string }> = {
              fixed_window: { name: 'Fixed Window', tag: 'Baseline', border: 'border-blue-500/30' },
              recursive: { name: 'Recursive Delimiter', tag: 'LangChain', border: 'border-emerald-500/30' },
              semantic: { name: 'Semantic Boundary', tag: 'Topic-Shift', border: 'border-purple-500/30' },
              markdown: { name: 'Markdown Hierarchy', tag: 'Structured', border: 'border-amber-500/30' },
            }
            const info = strategyTitles[strat.strategy_name] || {
              name: strat.strategy_name,
              tag: 'Custom',
              border: 'border-slate-700',
            }

            return (
              <div
                key={strat.strategy_name}
                className={`bg-slate-900/60 border ${info.border} rounded-2xl p-4 flex flex-col`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{info.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{info.tag}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                    <Clock className="w-3 h-3" />
                    <span>{strat.latency_ms} ms</span>
                  </div>
                </div>

                {/* Retrieved Chunks List */}
                <div className="space-y-3 flex-1">
                  {strat.results.map((res) => (
                    <div
                      key={res.chunk_id}
                      className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold font-mono text-slate-300">
                            #{res.rank}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Chunk #{res.chunk_index}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                          {res.score.toFixed(4)}
                        </span>
                      </div>

                      {res.metadata?.breadcrumb && (
                        <div className="text-[11px] text-amber-400/90 font-medium mb-1.5 flex items-center space-x-1">
                          <Code className="w-3 h-3 text-amber-500" />
                          <span className="truncate">{res.metadata.breadcrumb}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
                        {res.text}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{res.token_count} tokens</span>
                        <span>chars {res.start_char}..{res.end_char}</span>
                      </div>
                    </div>
                  ))}

                  {strat.results.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No chunks retrieved.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center text-slate-500">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
          <p className="text-sm font-medium text-slate-400">
            Run a search query to compare retrieval accuracy and context coherence across all 4 strategies.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Top-K chunks are ranked simultaneously using local float32 cosine similarity.
          </p>
        </div>
      )}
    </div>
  )
}
