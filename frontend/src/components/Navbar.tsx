import React from 'react'
import {
  Layers,
  Search,
  Trophy,
  History,
  PlusCircle,
  Cpu,
  Database,
  CheckCircle2,
} from 'lucide-react'
import type { HealthInfo } from '../types'

interface NavbarProps {
  activeTab: 'visualizer' | 'playground' | 'leaderboard' | 'history'
  setActiveTab: (tab: 'visualizer' | 'playground' | 'leaderboard' | 'history') => void
  health: HealthInfo | null
  onOpenDocModal: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  onOpenDocModal,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  RAGBench Studio
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v{health?.version || '1.0'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                RAG Chunking & Vector Retrieval Diagnostic Platform
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'visualizer'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Chunk Visualizer</span>
            </button>
            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'playground'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Query Playground</span>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>IR Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Run History</span>
            </button>
          </nav>

          {/* System Status Badges & Action */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-3.5 h-3.5" />
                <span>SQLite WAL</span>
              </div>
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Cpu className="w-3.5 h-3.5" />
                <span>Local Offline</span>
              </div>
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>₹0 Cost</span>
              </div>
            </div>

            <button
              onClick={onOpenDocModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>New Doc</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
