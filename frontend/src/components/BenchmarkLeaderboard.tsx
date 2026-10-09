import React, { useState } from 'react'
import {
  Trophy,
  Play,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Download,
  FileJson,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { DocumentDetail, BenchmarkRunResponse } from '../types'
import { runBenchmark, getBenchmarkExportUrl } from '../api'

interface BenchmarkLeaderboardProps {
  document: DocumentDetail | null
  latestRun: BenchmarkRunResponse | null
  setLatestRun: (run: BenchmarkRunResponse) => void
  embeddingModel?: string
}

export const BenchmarkLeaderboard: React.FC<BenchmarkLeaderboardProps> = ({
  document,
  latestRun,
  setLatestRun,
  embeddingModel = 'feature_hashing',
}) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedStrategyDetail, setSelectedStrategyDetail] = useState<string>('markdown')
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null)

  const handleRunBenchmark = async () => {
    if (!document || !document.query_sets?.[0]) return
    setLoading(true)
    try {
      const res = await runBenchmark({
        document_id: document.id,
        query_set_id: document.query_sets[0].id,
        top_k: 3,
        embedding_model: embeddingModel,
      })
      setLatestRun(res)
      // Pick top strategy by MRR
      if (res.strategies.length > 0) {
        const sorted = [...res.strategies].sort((a, b) => b.mrr - a.mrr)
        setSelectedStrategyDetail(sorted[0].strategy_name)
      }
    } catch (err) {
      console.error('Benchmark execution error:', err)
    } finally {
      setLoading(false)
    }
  }

  const querySet = document?.query_sets?.[0]
  const strategies = latestRun?.strategies ? [...latestRun.strategies].sort((a, b) => b.mrr - a.mrr) : []
  const winningStrategy = strategies[0]
  const runModel = latestRun?.embedding_model || embeddingModel
  const isSemantic = runModel === 'fastembed'

  const activeStrategyData = strategies.find(
    (s) => s.strategy_name === selectedStrategyDetail
  )

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trophy className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Information Retrieval (IR) Benchmarking Suite
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
              <span>
                Deterministic evaluation against {querySet?.queries?.length || 8} golden queries using MRR, Hit Rate@3, NDCG@3, and Latency.
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center space-x-1 text-slate-300 font-mono">
                {isSemantic ? (
                  <Sparkles className="w-3 h-3 text-purple-400" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-400" />
                )}
                <span>Engine: {isSemantic ? 'FastEmbed BGE-Small (384d)' : 'Feature Hashing (256d)'}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            {latestRun && (
              <div className="flex items-center space-x-2">
                <a
                  href={getBenchmarkExportUrl(latestRun.run_id, 'csv')}
                  download
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
                  title="Export results as CSV spreadsheet"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </a>
                <a
                  href={getBenchmarkExportUrl(latestRun.run_id, 'json')}
                  download
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
                  title="Export results as structured JSON"
                >
                  <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export JSON</span>
                </a>
              </div>
            )}

            <button
              onClick={handleRunBenchmark}
              disabled={loading || !querySet}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{loading ? 'Evaluating...' : `Run ${querySet?.queries?.length || 8}-Query Benchmark`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Winner Spotlight Banner */}
      {winningStrategy && (
        <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-5 shadow-lg shadow-indigo-950/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Highest Ranking Strategy
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    (Top Score on Corpus via {isSemantic ? 'FastEmbed BGE-Small' : 'Feature Hashing'})
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white capitalize">
                  {winningStrategy.strategy_name.replace('_', ' ')} Strategy
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <span className="text-[10px] uppercase text-slate-400 block font-mono">MRR</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {winningStrategy.mrr.toFixed(4)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase text-slate-400 block font-mono">Hit Rate@3</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {(winningStrategy.hit_rate * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase text-slate-400 block font-mono">NDCG@3</span>
                <span className="text-base font-bold font-mono text-indigo-400">
                  {winningStrategy.ndcg.toFixed(4)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase text-slate-400 block font-mono">Avg Latency</span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {winningStrategy.avg_latency_ms} ms
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strategies Comparison Leaderboard Table */}
      {strategies.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Comparative Strategy Scorecard</h3>
            <span className="text-xs text-slate-400 font-mono">
              Evaluated on {document?.title} • {runModel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Rank & Strategy</th>
                  <th className="py-3 px-4">MRR</th>
                  <th className="py-3 px-4">Hit Rate@3</th>
                  <th className="py-3 px-4">NDCG@3</th>
                  <th className="py-3 px-4">Precision / Recall</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Redundancy</th>
                  <th className="py-3 px-4 text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                {strategies.map((strat, idx) => {
                  const isWinner = idx === 0
                  const isSelected = selectedStrategyDetail === strat.strategy_name

                  return (
                    <tr
                      key={strat.strategy_name}
                      onClick={() => setSelectedStrategyDetail(strat.strategy_name)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-sans font-semibold text-white flex items-center space-x-2">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isWinner
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="capitalize">{strat.strategy_name.replace('_', ' ')}</span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {strat.mrr.toFixed(4)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {(strat.hit_rate * 100).toFixed(0)}%
                      </td>

                      <td className="py-3.5 px-4 text-indigo-400">
                        {strat.ndcg.toFixed(4)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        P: {strat.precision_at_k.toFixed(2)} | R: {strat.recall_at_k.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-cyan-400">
                        {strat.avg_latency_ms} ms
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {strat.total_chunks}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {(strat.redundancy_ratio * 100).toFixed(0)}%
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStrategyDetail(strat.strategy_name)
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-sans font-medium transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Inspect Queries
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Query Drilldown Section */}
      {activeStrategyData && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white capitalize">
                Per-Query Audit: {activeStrategyData.strategy_name.replace('_', ' ')} Strategy
              </h3>
              <p className="text-xs text-slate-400">
                Inspect rank position, reciprocal rank score, and target chunk hit status for each query.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1 rounded-lg">
              MRR: {activeStrategyData.mrr.toFixed(4)}
            </span>
          </div>

          <div className="space-y-2">
            {activeStrategyData.per_query_details.map((qd) => {
              const isExpanded = expandedQueryId === qd.query_id

              return (
                <div
                  key={qd.query_id}
                  className="bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedQueryId(isExpanded ? null : qd.query_id)}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition text-left"
                  >
                    <div className="flex items-center space-x-3 flex-1 pr-4">
                      {qd.hit ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-200">
                        {qd.query_text}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 font-mono text-xs shrink-0">
                      <span className="text-slate-400">
                        RR: <strong className="text-emerald-400">{qd.reciprocal_rank.toFixed(2)}</strong>
                      </span>
                      <span className="text-slate-400">
                        NDCG: <strong className="text-indigo-400">{qd.ndcg.toFixed(2)}</strong>
                      </span>
                      <span className="text-slate-500">
                        {qd.latency_ms}ms
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-900/30 border-t border-slate-800 text-xs space-y-2 font-mono">
                      <div className="flex items-center space-x-4 text-slate-400">
                        <span>Retrieved Ranks with Match: {qd.retrieved_ranks.length ? qd.retrieved_ranks.join(', ') : 'None'}</span>
                        <span>•</span>
                        <span>Precision@3: {qd.precision_at_k.toFixed(2)}</span>
                        <span>•</span>
                        <span>Recall@3: {qd.recall_at_k.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 font-sans">
                        <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Top Match Preview:</span>
                        {qd.top_match_preview || 'No chunk preview available.'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
