import React, { useState } from 'react'
import {
  Search,
  Zap,
  Clock,
  Sparkles,
  Sliders,
  Code,
  Brain,
} from 'lucide-react'
import type { DocumentDetail, QuerySearchResponse } from '../types'
import { searchQueries } from '../api'

interface QueryPlaygroundProps {
  document: DocumentDetail | null
  embeddingModel?: string
  onSelectEmbeddingModel?: (model: string) => void
}

export const QueryPlayground: React.FC<QueryPlaygroundProps> = ({
  document,
  embeddingModel = 'feature_hashing',
  onSelectEmbeddingModel,
}) => {
  const [query, setQuery] = useState<string>('How does product quantization reduce vector memory?')
  const [topK, setTopK] = useState<number>(3)
  const [loading, setLoading] = useState<boolean>(false)
  const [searchResults, setSearchResults] = useState<QuerySearchResponse | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = async (queryText?: string, overrideModel?: string) => {
    if (!document) return
    const activeQuery = (queryText !== undefined ? queryText : query).trim()
    if (!activeQuery) {
      setSearchError('Please enter a non-empty search query.')
      return
    }

    const modelToUse = overrideModel || embeddingModel
    setSearchError(null)
    setLoading(true)
    try {
      const res = await searchQueries({
        document_id: document.id,
        query: activeQuery,
        top_k: topK,
        embedding_model: modelToUse,
      })
      setSearchResults(res)
    } catch (err: any) {
      console.error('Search error:', err)
      setSearchError(err.message || 'Search failed. Please verify API connection.')
    } finally {
      setLoading(false)
    }
  }

  const sampleQueries = document?.query_sets?.[0]?.queries || []
  const isSemantic = embeddingModel === 'fastembed'

  const semanticChallenges = [
    { label: 'Paraphrase (RAM)', text: 'How can we compress vector embeddings to save RAM?' },
    { label: 'Synonym (Automotive)', text: 'automobile motor vehicle maintenance and engine repair' },
    { label: 'Technical Concept', text: 'How does IVF indexing partition the geometric vector space?' },
    { label: 'Unrelated Out-of-Domain', text: 'chocolate chip cookie baking recipe ingredients' },
  ]

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        {/* Model Selector Banner within Playground */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Brain className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Active Retrieval Vector Engine:
            </span>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                onSelectEmbeddingModel?.('feature_hashing')
                handleSearch(undefined, 'feature_hashing')
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                !isSemantic
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Feature Hashing (256d)</span>
            </button>
            <button
              onClick={() => {
                onSelectEmbeddingModel?.('fastembed')
                handleSearch(undefined, 'fastembed')
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                isSemantic
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>FastEmbed BGE-Small (384d Semantic)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="search-query-input"
              name="search_query"
              aria-label="Evaluation Search Query"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (searchError) setSearchError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter evaluation query (e.g. How does product quantization compress vectors?)"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-between">
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <Sliders className="w-4 h-4 text-slate-400" />
              <label htmlFor="top-k-select" className="text-xs text-slate-300 font-medium">Top-K:</label>
              <select
                id="top-k-select"
                name="top_k"
                aria-label="Top-K count"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-transparent text-xs font-mono font-bold text-indigo-400 focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-slate-900 text-white">1</option>
                <option value={2} className="bg-slate-900 text-white">2</option>
                <option value={3} className="bg-slate-900 text-white">3</option>
                <option value={4} className="bg-slate-900 text-white">4</option>
                <option value={5} className="bg-slate-900 text-white">5</option>
              </select>
            </div>

            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{loading ? 'Searching...' : 'Compare 4 Strategies'}</span>
            </button>
          </div>
        </div>

        {searchError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {searchError}
          </div>
        )}

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

        {/* Semantic Diagnostic Challenge Queries */}
        <div className="mt-3 pt-3 border-t border-slate-800/60">
          <span className="text-xs text-purple-400 font-semibold flex items-center space-x-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semantic Diagnostic Challenges (Paraphrases, Synonyms & Out-of-Domain):</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {semanticChallenges.map((sc, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sc.text)
                  handleSearch(sc.text)
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 transition text-left flex items-center space-x-1.5"
              >
                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {sc.label}
                </span>
                <span>{sc.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Engine Status Callout */}
      {searchResults && (
        <div className="flex items-center justify-between text-xs px-4 py-2 bg-slate-900/40 border border-slate-800 rounded-xl">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Results computed via:</span>
            <span
              className={`font-semibold ${
                searchResults.embedding_model === 'fastembed' ? 'text-purple-400' : 'text-amber-400'
              }`}
            >
              {searchResults.embedding_model === 'fastembed'
                ? 'FastEmbed BAAI/bge-small-en-v1.5 (384d Dense Float32)'
                : 'Deterministic Feature Hashing (256d Signed Float32)'}
            </span>
          </div>
          <span className="text-slate-500 font-mono">
            Top-{searchResults.top_k} Cosine Distance Ranking
          </span>
        </div>
      )}

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
                    <span className="text-[11px] font-semibold text-slate-400">{info.tag}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{strat.latency_ms} ms</span>
                  </div>
                </div>

                {/* Ranked Chunks List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[560px] pr-1">
                  {strat.results.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No matching chunks retrieved.
                    </div>
                  ) : (
                    strat.results.map((res) => {
                      const scorePercent = Math.max(0, Math.min(100, Math.round(res.score * 100)))
                      const isHighMatch = res.score >= 0.7
                      const isMedMatch = res.score >= 0.4 && res.score < 0.7

                      return (
                        <div
                          key={res.chunk_id}
                          className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition space-y-2"
                        >
                          {/* Rank & Score Pill */}
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300">
                              #{res.rank} <span className="text-slate-500 font-normal">Chunk #{res.chunk_index}</span>
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-xs font-mono font-bold ${
                                  isHighMatch
                                    ? 'text-emerald-400'
                                    : isMedMatch
                                    ? 'text-indigo-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {res.score.toFixed(4)}
                              </span>
                            </div>
                          </div>

                          {/* Similarity Progress Bar */}
                          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHighMatch
                                  ? 'bg-emerald-500'
                                  : isMedMatch
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${scorePercent}%` }}
                            />
                          </div>

                          {/* Chunk Content Text */}
                          <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
                            {res.text}
                          </p>

                          {/* Metadata Tags */}
                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-900 font-mono">
                            <span>{res.token_count} tokens</span>
                            <span>chars {res.start_char}..{res.end_char}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Code className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">
            Side-by-Side Multi-Strategy Retrieval Comparison
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Run a search query to compare retrieval accuracy, relevance scoring, and latency across all 4 strategies using {isSemantic ? '384-dimensional dense semantic vectors' : 'deterministic 256-dimensional feature hashing'}.
          </p>
        </div>
      )}
    </div>
  )
}
