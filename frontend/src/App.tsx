import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { ChunkVisualizer } from './components/ChunkVisualizer'
import { QueryPlayground } from './components/QueryPlayground'
import { BenchmarkLeaderboard } from './components/BenchmarkLeaderboard'
import { RunHistory } from './components/RunHistory'
import { DocumentModal } from './components/DocumentModal'
import type {
  HealthInfo,
  DocumentListItem,
  DocumentDetail,
  BenchmarkRunResponse,
} from './types'
import { getHealth, getDocuments, getDocumentDetail } from './api'
import { FileText, AlertCircle, RefreshCw } from 'lucide-react'

export function App() {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'playground' | 'leaderboard' | 'history'>(
    'visualizer'
  )
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [activeDocument, setActiveDocument] = useState<DocumentDetail | null>(null)
  const [latestRun, setLatestRun] = useState<BenchmarkRunResponse | null>(null)
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (selectedDocId) {
      loadDocumentDetail(selectedDocId)
    }
  }, [selectedDocId])

  const initializeApp = async () => {
    setLoading(true)
    setError(null)
    try {
      const [h, docs] = await Promise.all([getHealth(), getDocuments()])
      setHealth(h)
      setDocuments(docs)
      if (docs.length > 0) {
        setSelectedDocId(docs[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to RAGBench backend API.')
    } finally {
      setLoading(false)
    }
  }

  const loadDocumentDetail = async (id: string) => {
    try {
      const doc = await getDocumentDetail(id)
      setActiveDocument(doc)
    } catch (err: any) {
      console.error('Failed to load document detail:', err)
    }
  }

  const handleDocumentCreated = async (newDocId: string) => {
    const docs = await getDocuments()
    setDocuments(docs)
    setSelectedDocId(newDocId)
  }

  const handleSelectHistoricalRun = (runDetail: any) => {
    setLatestRun({
      run_id: runDetail.id,
      document_id: runDetail.document_id,
      query_set_id: runDetail.query_set_id,
      top_k: 3,
      strategies: runDetail.strategies,
    })
    setActiveTab('leaderboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium">Initializing RAGBench Studio...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onOpenDocModal={() => setIsDocModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Document Selector Bar */}
        {documents.length > 0 && (
          <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/80 px-4 py-3 rounded-xl">
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Corpus:
              </span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 text-xs font-semibold text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.token_count} tokens)
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline font-mono">
              Deterministic Retrieval • Local Embeddings
            </span>
          </div>
        )}

        {/* Main Tab Views */}
        {activeTab === 'visualizer' && (
          <ChunkVisualizer
            document={activeDocument}
            onRefreshDocument={() => selectedDocId && loadDocumentDetail(selectedDocId)}
          />
        )}

        {activeTab === 'playground' && (
          <QueryPlayground document={activeDocument} />
        )}

        {activeTab === 'leaderboard' && (
          <BenchmarkLeaderboard
            document={activeDocument}
            latestRun={latestRun}
            setLatestRun={setLatestRun}
          />
        )}

        {activeTab === 'history' && (
          <RunHistory onSelectRun={handleSelectHistoricalRun} />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>
          RAGBench Studio • 100% On-Device AI Diagnostic Platform • Windows AVX2 / GTX 1650 Compatible • ₹0 Cloud Cost
        </p>
      </footer>

      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onDocumentCreated={handleDocumentCreated}
      />
    </div>
  )
}

export default App
