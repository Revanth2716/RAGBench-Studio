import React, { useState, useEffect } from 'react'
import { History, Calendar, ArrowRight, RefreshCw, Download, FileJson, Sparkles, Zap } from 'lucide-react'
import type { BenchmarkRunListItem } from '../types'
import { getBenchmarkRuns, getBenchmarkRunDetail, getBenchmarkExportUrl } from '../api'

interface RunHistoryProps {
  onSelectRun: (runDetail: any) => void
}

export const RunHistory: React.FC<RunHistoryProps> = ({ onSelectRun }) => {
  const [runs, setRuns] = useState<BenchmarkRunListItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    loadRuns()
  }, [])

  const loadRuns = async () => {
    setLoading(true)
    try {
      const data = await getBenchmarkRuns()
      setRuns(data)
    } catch (err) {
      console.error('Failed to load runs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInspect = async (runId: string) => {
    try {
      const detail = await getBenchmarkRunDetail(runId)
      onSelectRun(detail)
    } catch (err) {
      console.error('Failed to inspect run:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Persistent Benchmark Run History
            </h2>
          </div>
          <button
            onClick={loadRuns}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Every evaluation benchmark executed in RAGBench Studio is permanently stored in the local SQLite database.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-400" />
            <span>Loading benchmark history...</span>
          </div>
        ) : runs.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {runs.map((r) => {
              const topStrategy = r.strategy_summaries?.[0]
              const isSemantic = r.embedding_model === 'fastembed'
              return (
                <div
                  key={r.id}
                  className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-850/40 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {r.id.slice(0, 8)}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{r.document_title}</h4>
                      {isSemantic ? (
                        <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span>FastEmbed (384d)</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>Feature Hashing (256d)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                      </span>
                      <span>•</span>
                      <span>Suite: {r.query_set_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-5">
                    {topStrategy && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">
                          Top Strategy: <span className="text-amber-400 capitalize">{topStrategy.strategy_name.replace('_', ' ')}</span>
                        </span>
                        <div className="flex items-center space-x-3 text-xs font-mono">
                          <span className="text-emerald-400 font-bold">MRR {topStrategy.mrr.toFixed(4)}</span>
                          <span className="text-slate-400">Hit {(topStrategy.hit_rate * 100).toFixed(0)}%</span>
                          <span className="text-cyan-400">{topStrategy.avg_latency_ms}ms</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <a
                        href={getBenchmarkExportUrl(r.id, 'csv')}
                        download
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition"
                        title="Export CSV"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <a
                        href={getBenchmarkExportUrl(r.id, 'json')}
                        download
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition"
                        title="Export JSON"
                      >
                        <FileJson className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleInspect(r.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
            <p className="text-sm font-medium text-slate-400">No benchmark runs recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Run a benchmark in the IR Leaderboard tab to record your first run.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
