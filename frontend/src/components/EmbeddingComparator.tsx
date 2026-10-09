import React, { useState } from 'react'
import {
  GitCompare,
  Zap,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Search,
  RefreshCw,
} from 'lucide-react'
import type { DocumentDetail, EmbeddingCompareResponse } from '../types'
import { compareEmbeddings } from '../api'

interface EmbeddingComparatorProps {
  document: DocumentDetail | null
}

const STRATEGIES = [
  { id: 'fixed_window', label: 'Fixed Window', desc: 'Strict token window with uniform overlap' },
  { id: 'recursive', label: 'Recursive Delimiter', desc: 'Paragraphs, double-newlines, sentences' },
  { id: 'semantic', label: 'Semantic Boundary', desc: 'Sentence cosine distance split points' },
  { id: 'markdown', label: 'Markdown Hierarchy', desc: 'H1/H2 header structural boundaries' },
]

export const EmbeddingComparator: React.FC<EmbeddingComparatorProps> = ({ document }) => {
  const [query, setQuery] = useState<string>('How can we compress vector embeddings to save RAM?')
  const [selectedStrategy, setSelectedStrategy] = useState<string>('recursive')
  const [topK, setTopK] = useState<number>(3)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [compareData, setCompareData] = useState<EmbeddingCompareResponse | null>(null)

  const diagnosticPresets = [
    {
      label: 'Paraphrase',
      category: 'Semantic',
      text: 'How can we compress vector embeddings to save RAM?',
      tip: 'Tests semantic synonym understanding (compression/quantization vs RAM/memory)',
    },
    {
      label: 'Technical Concept',
      category: 'Domain Terminology',
      text: 'Voronoi cells and inverted file index clustering',
      tip: 'Tests dense conceptual indexing vs keyword frequency',
    },
    {
      label: 'Exact Match',
      category: 'Lexical',
      text: 'Production RAG Architecture & Vector Indexing',
      tip: 'Verifies exact phrase retrieval on both models',
    },
    {
      label: 'Synonym Swap',
      category: 'Semantic',
      text: 'automobile motor vehicle maintenance and engine repair',
      tip: 'Tests cross-synonym recall when exact keywords are altered',
    },
    {
      label: 'Out-of-Domain',
      category: 'Rejection',
      text: 'chocolate chip cookie baking recipe ingredients',
      tip: 'Evaluates low confidence rejection on completely unrelated content',
    },
    {
      label: 'Out-of-Vocabulary',
      category: 'Robustness',
      text: 'quantum neuromorphic spintronics hyper-tensor quantization',
      tip: 'Evaluates subword tokenization vs hash hashing collision resilience',
    },
  ]

  const handleRunComparison = async (overrideQuery?: string) => {
    if (!document) return
    const activeQuery = (overrideQuery !== undefined ? overrideQuery : query).trim()
    if (!activeQuery) {
      setError('Please provide a search query to compare.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const res = await compareEmbeddings({
        document_id: document.id,
        query: activeQuery,
        strategy_name: selectedStrategy,
        top_k: topK,
      })
      setCompareData(res)
    } catch (err: any) {
      console.error('Embedding comparison failed:', err)
      setError(err.message || 'Comparison failed. Please verify that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const goldenQueries = document?.query_sets?.[0]?.queries || []

  return (
    <div className="space-y-6">
      {/* Comparator Control Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <GitCompare className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Side-by-Side Embedding Comparator
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simultaneously query <strong className="text-amber-400 font-medium">Deterministic Feature Hashing (256d)</strong> and{' '}
              <strong className="text-purple-400 font-medium">FastEmbed BGE-Small (384d Dense)</strong> across the same chunked corpus.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-slate-300 font-mono">256d Baseline</span>
            </div>
            <span className="text-slate-600 font-bold">VS</span>
            <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              <span className="text-slate-300 font-mono">384d Semantic</span>
            </div>
          </div>
        </div>

        {/* Configuration Row: Strategy & Top-K */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chunking Strategy for Evaluation</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STRATEGIES.map((strat) => (
                <button
                  key={strat.id}
                  onClick={() => setSelectedStrategy(strat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                    selectedStrategy === strat.id
                      ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">{strat.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Top-K Depth</label>
            <div className="flex items-center space-x-2">
              {[3, 5, 7, 10].map((k) => (
                <button
                  key={k}
                  onClick={() => setTopK(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    topK === k
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  K={k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Query Input & Action Button */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Diagnostic Search Query</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              Press Compare to execute dual-vector retrieval
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunComparison()
              }}
              placeholder="Enter search query or select a diagnostic preset below..."
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              onClick={() => handleRunComparison()}
              disabled={loading || !document}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Comparing...</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4" />
                  <span>Compare Embeddings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diagnostic Query Presets */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Diagnostic Presets:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {diagnosticPresets.map((preset, i) => (
              <button
                key={i}
                title={preset.tip}
                onClick={() => {
                  setQuery(preset.text)
                  handleRunComparison(preset.text)
                }}
                className="group flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-xs transition text-slate-300"
              >
                <span className="text-[10px] uppercase font-bold text-indigo-400/80 bg-indigo-500/10 px-1 py-0.5 rounded">
                  {preset.label}
                </span>
                <span className="group-hover:text-white transition font-mono truncate max-w-[200px] sm:max-w-[280px]">
                  {preset.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Golden Test Queries if document has any */}
        {goldenQueries.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Document Golden Ground Truth Queries (Calculates MRR & NDCG):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {goldenQueries.map((gq, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(gq.query_text)
                    handleRunComparison(gq.query_text)
                  }}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500 text-xs text-emerald-300 hover:text-emerald-200 transition"
                >
                  <span className="text-[10px] font-bold uppercase bg-emerald-500/20 px-1 py-0.5 rounded">
                    {gq.difficulty || 'Golden'}
                  </span>
                  <span className="font-mono truncate max-w-[240px] sm:max-w-[340px]">
                    {gq.query_text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Comparison Results Section */}
      {compareData && (
        <div className="space-y-6">
          {/* Overlap & Performance Summary Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <div className="text-slate-400 text-xs font-medium">Jaccard Top-K Overlap</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {(compareData.jaccard_overlap * 100).toFixed(0)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {compareData.shared_chunk_count} shared out of {compareData.top_k}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <div className="text-amber-400 text-xs font-medium">Baseline Query Latency</div>
                <div className="text-2xl font-bold text-amber-300 mt-1">
                  {compareData.feature_hashing.latency_ms.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">256d Hashing (Deterministic)</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <div className="text-purple-400 text-xs font-medium">FastEmbed Query Latency</div>
                <div className="text-2xl font-bold text-purple-300 mt-1">
                  {compareData.fastembed.latency_ms.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {compareData.fastembed.is_cold_start && compareData.fastembed.init_latency_ms ? (
                    <span className="text-amber-400 font-semibold">
                      Cold start: +{compareData.fastembed.init_latency_ms.toFixed(0)}ms init
                    </span>
                  ) : (
                    '384d Dense (In-Memory Warm)'
                  )}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <div className="text-slate-400 text-xs font-medium">Speedup Difference</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {compareData.fastembed.latency_ms > 0
                    ? `${(compareData.fastembed.latency_ms / Math.max(0.1, compareData.feature_hashing.latency_ms)).toFixed(1)}x`
                    : '—'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Baseline vs Neural overhead</div>
              </div>
            </div>

            {/* Evaluation Scorecard Pill if Golden Ground Truth Matched */}
            {compareData.evaluation_matched && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Ground Truth Benchmark Alignment Detected
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Relevant Keywords:{' '}
                    <span className="font-mono text-emerald-400">
                      [{compareData.relevant_keywords.join(', ')}]
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1.5 px-3">Retrieval Engine</th>
                        <th className="py-1.5 px-3">MRR</th>
                        <th className="py-1.5 px-3">Hit Rate@{compareData.top_k}</th>
                        <th className="py-1.5 px-3">NDCG@{compareData.top_k}</th>
                        <th className="py-1.5 px-3">Precision@{compareData.top_k}</th>
                        <th className="py-1.5 px-3">Recall@{compareData.top_k}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono">
                      <tr className="bg-slate-950/40">
                        <td className="py-2 px-3 text-amber-400 font-sans font-semibold">
                          Feature Hashing (256d)
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {compareData.feature_hashing.metrics?.reciprocal_rank.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {compareData.feature_hashing.metrics?.hit_rate.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {compareData.feature_hashing.metrics?.ndcg.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {compareData.feature_hashing.metrics?.precision_at_k.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {compareData.feature_hashing.metrics?.recall_at_k.toFixed(3) ?? '—'}
                        </td>
                      </tr>
                      <tr className="bg-slate-950/40">
                        <td className="py-2 px-3 text-purple-400 font-sans font-semibold">
                          FastEmbed BGE-Small (384d)
                        </td>
                        <td className="py-2 px-3 text-purple-300 font-bold">
                          {compareData.fastembed.metrics?.reciprocal_rank.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-purple-300 font-bold">
                          {compareData.fastembed.metrics?.hit_rate.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-purple-300 font-bold">
                          {compareData.fastembed.metrics?.ndcg.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-purple-300 font-bold">
                          {compareData.fastembed.metrics?.precision_at_k.toFixed(3) ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-purple-300 font-bold">
                          {compareData.fastembed.metrics?.recall_at_k.toFixed(3) ?? '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vector Space Disparity Disclaimer when Custom Query */}
            {!compareData.evaluation_matched && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-slate-300 font-medium">Vector Space Isolation Notice:</strong>{' '}
                  Feature Hashing (256d token frequency hash projection) and FastEmbed BGE-Small (384d
                  dense semantic BERT/ONNX space) operate in mathematically distinct vector coordinate
                  systems. Raw cosine similarity scores cannot be compared in absolute magnitude across
                  models. Instead, evaluate the <strong>relative rank order</strong> and ability of
                  FastEmbed to surface conceptually relevant chunks when query keywords differ from the
                  document text.
                </div>
              </div>
            )}
          </div>

          {/* Side-by-Side Result Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Feature Hashing Baseline */}
            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Deterministic Feature Hashing
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      256 Dimensions • MurmurHash3 Token Frequency
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-amber-400">
                    {compareData.feature_hashing.latency_ms.toFixed(1)} ms
                  </div>
                  <div className="text-[10px] text-slate-500">Retrieval Latency</div>
                </div>
              </div>

              {/* Chunk Result Cards */}
              <div className="space-y-3">
                {compareData.feature_hashing.results.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No chunks retrieved for this strategy.
                  </div>
                ) : (
                  compareData.feature_hashing.results.map((chunk) => {
                    // Check if this chunk is in FastEmbed
                    const feMatch = compareData.fastembed.results.find(
                      (r) => r.chunk_index === chunk.chunk_index
                    )

                    return (
                      <div
                        key={chunk.chunk_id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          feMatch
                            ? 'bg-slate-950/80 border-amber-500/40 ring-1 ring-amber-500/10'
                            : 'bg-slate-950/40 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                              Rank #{chunk.rank}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Chunk #{chunk.chunk_index}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({chunk.token_count} tok)
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 font-mono text-xs">
                            <span className="text-slate-400">Score:</span>
                            <span className="font-bold text-amber-400">
                              {chunk.score.toFixed(4)}
                            </span>
                          </div>
                        </div>

                        {/* Shared Status Badge */}
                        {feMatch && (
                          <div className="mb-2.5 flex items-center justify-between px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px]">
                            <span className="text-indigo-300 font-medium flex items-center space-x-1">
                              <span>★ Also in FastEmbed (Rank #{feMatch.rank})</span>
                            </span>
                            <span className="font-mono text-xs">
                              {feMatch.rank < chunk.rank ? (
                                <span className="text-emerald-400 flex items-center space-x-0.5">
                                  <TrendingUp className="w-3 h-3" />
                                  <span>FastEmbed +{chunk.rank - feMatch.rank}</span>
                                </span>
                              ) : feMatch.rank > chunk.rank ? (
                                <span className="text-amber-400 flex items-center space-x-0.5">
                                  <TrendingDown className="w-3 h-3" />
                                  <span>FastEmbed -{feMatch.rank - chunk.rank}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 flex items-center space-x-0.5">
                                  <Minus className="w-3 h-3" />
                                  <span>Tied Rank</span>
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          {chunk.text.slice(0, 240)}
                          {chunk.text.length > 240 ? '...' : ''}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Column: FastEmbed Semantic */}
            <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      FastEmbed: BAAI/bge-small-en-v1.5
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      384 Dimensions • ONNX Runtime Dense Semantic
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-purple-400">
                    {compareData.fastembed.latency_ms.toFixed(1)} ms
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {compareData.fastembed.is_cold_start ? 'Cold Start' : 'Warm Latency'}
                  </div>
                </div>
              </div>

              {/* If FastEmbed has error */}
              {compareData.fastembed.error ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>FastEmbed Model Unavailable</span>
                  </div>
                  <p className="text-slate-400">{compareData.fastembed.error}</p>
                </div>
              ) : (
                /* Chunk Result Cards */
                <div className="space-y-3">
                  {compareData.fastembed.results.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No chunks retrieved for this strategy.
                    </div>
                  ) : (
                    compareData.fastembed.results.map((chunk) => {
                      // Check if this chunk is in Feature Hashing
                      const fhMatch = compareData.feature_hashing.results.find(
                        (r) => r.chunk_index === chunk.chunk_index
                      )

                      return (
                        <div
                          key={chunk.chunk_id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            fhMatch
                              ? 'bg-slate-950/80 border-purple-500/40 ring-1 ring-purple-500/10'
                              : 'bg-slate-950/40 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
                                Rank #{chunk.rank}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                Chunk #{chunk.chunk_index}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({chunk.token_count} tok)
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 font-mono text-xs">
                              <span className="text-slate-400">Score:</span>
                              <span className="font-bold text-purple-400">
                                {chunk.score.toFixed(4)}
                              </span>
                            </div>
                          </div>

                          {/* Shared Status Badge */}
                          {fhMatch && (
                            <div className="mb-2.5 flex items-center justify-between px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px]">
                              <span className="text-indigo-300 font-medium flex items-center space-x-1">
                                <span>★ Also in Baseline (Rank #{fhMatch.rank})</span>
                              </span>
                              <span className="font-mono text-xs">
                                {chunk.rank < fhMatch.rank ? (
                                  <span className="text-emerald-400 flex items-center space-x-0.5">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Higher by +{fhMatch.rank - chunk.rank}</span>
                                  </span>
                                ) : chunk.rank > fhMatch.rank ? (
                                  <span className="text-amber-400 flex items-center space-x-0.5">
                                    <TrendingDown className="w-3 h-3" />
                                    <span>Lower by -{chunk.rank - fhMatch.rank}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center space-x-0.5">
                                    <Minus className="w-3 h-3" />
                                    <span>Tied Rank</span>
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            {chunk.text.slice(0, 240)}
                            {chunk.text.length > 240 ? '...' : ''}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cross-Model Rank Comparison Table */}
          {compareData.rank_comparisons && compareData.rank_comparisons.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Cross-Model Rank Alignment Matrix
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive overview of all chunks surfaced in Top-{compareData.top_k} by either model.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Total Unique Chunks: {compareData.rank_comparisons.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Chunk</th>
                      <th className="py-2 px-3">Excerpt Preview</th>
                      <th className="py-2 px-3">Tokens</th>
                      <th className="py-2 px-3 text-amber-400">Baseline (256d)</th>
                      <th className="py-2 px-3 text-purple-400">FastEmbed (384d)</th>
                      <th className="py-2 px-3">Rank Delta (Δ)</th>
                      <th className="py-2 px-3">Overlap Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {compareData.rank_comparisons.map((c) => {
                      const isShared =
                        c.rank_feature_hashing !== null &&
                        c.rank_feature_hashing !== undefined &&
                        c.rank_fastembed !== null &&
                        c.rank_fastembed !== undefined

                      return (
                        <tr
                          key={c.chunk_index}
                          className={`hover:bg-slate-800/30 transition ${
                            isShared ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-300">
                            #{c.chunk_index}
                          </td>
                          <td className="py-2.5 px-3 max-w-[280px] truncate text-slate-400 font-sans text-[11px]">
                            {c.text_preview}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{c.token_count}</td>
                          <td className="py-2.5 px-3">
                            {c.rank_feature_hashing !== null && c.rank_feature_hashing !== undefined ? (
                              <span className="text-amber-400 font-bold">
                                #{c.rank_feature_hashing}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({c.score_feature_hashing?.toFixed(3)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {c.rank_fastembed !== null && c.rank_fastembed !== undefined ? (
                              <span className="text-purple-400 font-bold">
                                #{c.rank_fastembed}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({c.score_fastembed?.toFixed(3)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {c.rank_delta !== null && c.rank_delta !== undefined ? (
                              c.rank_delta > 0 ? (
                                <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
                                  <TrendingUp className="w-3 h-3" />
                                  <span>+{c.rank_delta} (FE higher)</span>
                                </span>
                              ) : c.rank_delta < 0 ? (
                                <span className="text-rose-400 font-bold flex items-center space-x-0.5">
                                  <TrendingDown className="w-3 h-3" />
                                  <span>{c.rank_delta} (FE lower)</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 flex items-center space-x-0.5">
                                  <Minus className="w-3 h-3" />
                                  <span>Tied</span>
                                </span>
                              )
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-[11px]">
                            {isShared ? (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                Shared ({Math.round(compareData.jaccard_overlap * 100)}% Jaccard)
                              </span>
                            ) : c.rank_fastembed !== null && c.rank_fastembed !== undefined ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                Semantic Only
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Baseline Only
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
