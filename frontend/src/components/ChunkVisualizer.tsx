import React, { useState, useEffect } from 'react'
import {
  Sliders,
  FileText,
  Copy,
  Sparkles,
  RefreshCw,
  Layers,
  Code,
} from 'lucide-react'
import type { DocumentDetail, ChunkPreviewResult } from '../types'
import { previewChunks } from '../api'

interface ChunkVisualizerProps {
  document: DocumentDetail | null
  onRefreshDocument: () => void
}

const STRATEGIES = [
  {
    id: 'fixed_window',
    title: 'Fixed Window',
    description: 'Sliding window with uniform character size & stride.',
    badge: 'Baseline',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
  },
  {
    id: 'recursive',
    title: 'Recursive Delimiter',
    description: 'Splits on paragraph (\\n\\n), line, sentence, & words.',
    badge: 'LangChain Standard',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
  },
  {
    id: 'semantic',
    title: 'Semantic Boundary',
    description: 'Identifies topic shifts via cosine similarity drops.',
    badge: 'Context-Aware',
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  },
  {
    id: 'markdown',
    title: 'Markdown Hierarchy',
    description: 'Preserves headers (#, ##) as breadcrumbs & keeps code blocks.',
    badge: 'Structure-Aware',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
  },
]

export const ChunkVisualizer: React.FC<ChunkVisualizerProps> = ({ document }) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('recursive')
  const [chunkSize, setChunkSize] = useState<number>(350)
  const [overlap, setOverlap] = useState<number>(60)
  const [simThreshold, setSimThreshold] = useState<number>(0.35)
  const [loading, setLoading] = useState<boolean>(false)
  const [previewData, setPreviewData] = useState<ChunkPreviewResult | null>(null)
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null)

  useEffect(() => {
    if (document) {
      loadChunks()
    }
  }, [document, selectedStrategy, chunkSize, overlap, simThreshold])

  const loadChunks = async () => {
    if (!document) return
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (selectedStrategy === 'fixed_window') {
        params.chunk_size = chunkSize
        params.overlap = overlap
      } else if (selectedStrategy === 'recursive') {
        params.chunk_size = chunkSize
        params.overlap = overlap
      } else if (selectedStrategy === 'semantic') {
        params.similarity_threshold = simThreshold
        params.max_chunk_size = chunkSize
      } else if (selectedStrategy === 'markdown') {
        params.max_chunk_size = chunkSize
      }

      const res = await previewChunks({
        document_id: document.id,
        strategy_name: selectedStrategy,
        parameters: params,
      })
      setPreviewData(res)
    } catch (err) {
      console.error('Failed to preview chunks:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!document) {
    return (
      <div className="text-center py-24 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>No document selected. Please select or create a document.</p>
      </div>
    )
  }

  const activeChunk =
    activeChunkIndex !== null && previewData?.chunks
      ? previewData.chunks.find((c) => c.chunk_index === activeChunkIndex)
      : null

  return (
    <div className="space-y-6">
      {/* Document Header & Strategy Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Corpus Active
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">{document.title}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
              <span>{document.token_count.toLocaleString()} estimated tokens</span>
              <span>•</span>
              <span>{document.char_count.toLocaleString()} characters</span>
              <span>•</span>
              <span>{document.query_sets?.[0]?.queries?.length || 0} benchmark queries available</span>
            </p>
          </div>

          {/* Strategy Quick Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStrategy(s.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedStrategy === s.id
                    ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{s.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${s.color}`}>
                    {s.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Hyperparameter Controls & Realtime Diagnostics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 items-center">
          {/* Controls */}
          <div className="md:col-span-2 flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-3">
              <label htmlFor="chunk-size-slider" className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Chunk Size:</span>
                <span className="font-mono text-indigo-400 font-semibold">{chunkSize} chars</span>
              </label>
              <input
                id="chunk-size-slider"
                name="chunk_size"
                aria-label="Chunk Size"
                type="range"
                min="150"
                max="800"
                step="25"
                value={chunkSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value)
                  setChunkSize(newSize)
                  if (overlap >= newSize) {
                    setOverlap(Math.max(0, newSize - 50))
                  }
                }}
                className="w-32 accent-indigo-500 cursor-pointer"
              />
            </div>

            {(selectedStrategy === 'fixed_window' || selectedStrategy === 'recursive') && (
              <div className="flex items-center space-x-3">
                <label htmlFor="overlap-slider" className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Overlap:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{overlap} chars</span>
                </label>
                <input
                  id="overlap-slider"
                  name="overlap"
                  aria-label="Overlap"
                  type="range"
                  min="0"
                  max={Math.max(0, chunkSize - 25)}
                  step="10"
                  value={Math.min(overlap, chunkSize - 25)}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  className="w-28 accent-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {selectedStrategy === 'semantic' && (
              <div className="flex items-center space-x-3">
                <label htmlFor="sim-threshold-slider" className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sim Threshold:</span>
                  <span className="font-mono text-purple-400 font-semibold">{simThreshold}</span>
                </label>
                <input
                  id="sim-threshold-slider"
                  name="sim_threshold"
                  aria-label="Similarity Threshold"
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={simThreshold}
                  onChange={(e) => setSimThreshold(Number(e.target.value))}
                  className="w-28 accent-purple-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Diagnostic Metrics Pills */}
          <div className="md:col-span-2 flex items-center justify-end space-x-3">
            <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total Chunks</span>
              <span className="text-base font-bold font-mono text-white">
                {previewData?.total_chunks || 0}
              </span>
            </div>
            <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Avg Est. Tokens</span>
              <span className="text-base font-bold font-mono text-indigo-400">
                {previewData && previewData.total_chunks > 0
                  ? Math.round(previewData.total_tokens / previewData.total_chunks)
                  : 0}
              </span>
            </div>
            <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Redundancy</span>
              <span
                className={`text-base font-bold font-mono ${
                  (previewData?.redundancy_ratio || 0) > 0.35 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {Math.round((previewData?.redundancy_ratio || 0) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View: Document Content vs Chunk Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document Text Pane */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-white">Document Text Viewer</h3>
            </div>
            {activeChunk && (
              <div className="text-xs text-indigo-400 font-mono flex items-center space-x-2">
                <span>Highlighting Chunk #{activeChunk.chunk_index}</span>
                <span>[{activeChunk.start_char}..{activeChunk.end_char}]</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-3 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
            {activeChunk ? (
              <>
                <span className="text-slate-500">
                  {document.content.slice(0, activeChunk.start_char)}
                </span>
                <mark className="bg-indigo-500/30 text-indigo-100 rounded px-1 py-0.5 border border-indigo-500/50">
                  {document.content.slice(activeChunk.start_char, activeChunk.end_char)}
                </mark>
                <span className="text-slate-500">
                  {document.content.slice(activeChunk.end_char)}
                </span>
              </>
            ) : (
              document.content
            )}
          </div>
        </div>

        {/* Chunks Stream List */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">
                Generated Chunks ({previewData?.total_chunks || 0})
              </h3>
            </div>
            <span className="text-xs text-slate-400">Click or hover chunk to highlight span</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Generating chunks...</span>
              </div>
            ) : previewData?.chunks.length ? (
              previewData.chunks.map((c) => (
                <div
                  key={c.id}
                  onMouseEnter={() => setActiveChunkIndex(c.chunk_index)}
                  onClick={() => setActiveChunkIndex(c.chunk_index)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeChunkIndex === c.chunk_index
                      ? 'bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        #{c.chunk_index}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {c.token_count} est. tokens
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      chars {c.start_char}..{c.end_char}
                    </span>
                  </div>

                  {/* Metadata breadcrumbs */}
                  {c.metadata?.breadcrumb && (
                    <div className="text-[11px] text-amber-400/90 font-medium mb-1.5 flex items-center space-x-1">
                      <Code className="w-3 h-3 text-amber-500" />
                      <span>{c.metadata.breadcrumb}</span>
                    </div>
                  )}

                  {c.metadata?.similarity_at_boundary !== undefined && (
                    <div className="text-[11px] text-purple-400 font-mono mb-1.5">
                      Cosine drop: {c.metadata.similarity_at_boundary}
                    </div>
                  )}

                  <p className="text-xs text-slate-300 font-sans line-clamp-3 leading-relaxed">
                    {c.text}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500">No chunks generated</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
