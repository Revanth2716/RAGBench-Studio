import React, { useState } from 'react'
import {
  Trophy,
  Play,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react'
import type { DocumentDetail, BenchmarkRunResponse } from '../types'
import { runBenchmark } from '../api'

interface BenchmarkLeaderboardProps {
  document: DocumentDetail | null
  latestRun: BenchmarkRunResponse | null
  setLatestRun: (run: BenchmarkRunResponse) => void
}

export const BenchmarkLeaderboard: React.FC<BenchmarkLeaderboardProps> = ({
  document,
  latestRun,
  setLatestRun,
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
            <p className="text-xs text-slate-400 mt-1">
              Deterministic evaluation against {querySet?.queries?.length || 8} golden queries using MRR, Hit Rate@3, NDCG@3, and Latency.
            </p>
          </div>

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
                    (Top Score on Corpus)
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

      {/* Comparative Leaderboard Table */}
      {strategies.length > 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Comparative Benchmark Leaderboard</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Evaluated on {querySet?.queries?.length || 8} queries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Strategy</th>
                  <th className="py-3 px-4">MRR (Mean Reciprocal Rank)</th>
                  <th className="py-3 px-4">Hit Rate @ 3</th>
                  <th className="py-3 px-4">NDCG @ 3</th>
                  <th className="py-3 px-4">Precision / Recall</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Redundancy</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {strategies.map((strat, index) => {
                  const isTop = index === 0
                  return (
                    <tr
                      key={strat.strategy_name}
                      className={`hover:bg-slate-800/30 transition ${
                        selectedStrategyDetail === strat.strategy_name ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        {isTop ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            #1
                          </span>
                        ) : (
                          `#${index + 1}`
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white capitalize">
                        {strat.strategy_name.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-200">{strat.mrr.toFixed(4)}</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.round(strat.mrr * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {(strat.hit_rate * 100).toFixed(0)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {strat.ndcg.toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        P: {strat.precision_at_k.toFixed(2)} | R: {strat.recall_at_k.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400">
                        {strat.avg_latency_ms} ms
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {strat.total_chunks}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={strat.redundancy_ratio > 0.3 ? 'text-amber-400' : 'text-slate-400'}
                        >
                          {(strat.redundancy_ratio * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStrategyDetail(strat.strategy_name)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
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
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30 text-amber-400" />
          <p className="text-sm font-medium text-slate-400">No benchmark run executed yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "Run 8-Query Benchmark" above to evaluate all 4 strategies simultaneously.
          </p>
        </div>
      )}

      {/* Query-by-Query Drill Down */}
      {activeStrategyData && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white capitalize flex items-center space-x-2">
                <span>Per-Query Audit: {activeStrategyData.strategy_name.replace('_', ' ')} Strategy</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect rank position, reciprocal rank score, and target chunk hit status for each query.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              MRR: {activeStrategyData.mrr.toFixed(4)}
            </span>
          </div>

          <div className="space-y-2.5">
            {activeStrategyData.per_query_details.map((qd) => {
              const isExpanded = expandedQueryId === qd.query_id
              return (
                <div
                  key={qd.query_id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedQueryId(isExpanded ? null : qd.query_id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition"
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

                    <div className="flex items-center space-x-4 shrink-0 font-mono text-xs">
                      <span className="text-slate-400">
                        RR: <span className="font-bold text-white">{qd.reciprocal_rank.toFixed(2)}</span>
                      </span>
                      <span className="text-slate-400">
                        NDCG: <span className="text-indigo-400">{qd.ndcg.toFixed(2)}</span>
                      </span>
                      <span className="text-cyan-400 text-[11px]">{qd.latency_ms}ms</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-900/40 border-t border-slate-900 text-xs">
                      <div className="text-[11px] font-mono text-slate-400 mb-1">
                        Top Matched Context Snippet:
                      </div>
                      <p className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 font-sans text-slate-300 leading-relaxed">
                        {qd.top_match_preview || 'No chunk text preview available'}
                      </p>
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
