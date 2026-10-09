import React, { useState } from 'react'
import { X, FileText, Plus, Trash2 } from 'lucide-react'
import { createDocument } from '../api'

interface DocumentModalProps {
  isOpen: boolean
  onClose: () => void
  onDocumentCreated: (docId: string) => void
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onDocumentCreated,
}) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [queries, setQueries] = useState<
    { query_text: string; relevant_keywords: string[]; difficulty: string }[]
  >([
    { query_text: '', relevant_keywords: [''], difficulty: 'medium' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddQuery = () => {
    setQueries([...queries, { query_text: '', relevant_keywords: [''], difficulty: 'medium' }])
  }

  const handleRemoveQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index))
  }

  const handleQueryChange = (index: number, text: string) => {
    const updated = [...queries]
    updated[index].query_text = text
    setQueries(updated)
  }

  const handleKeywordsChange = (index: number, kwText: string) => {
    const updated = [...queries]
    updated[index].relevant_keywords = kwText.split(',').map((k) => k.trim()).filter(Boolean)
    setQueries(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Title and Content are required.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const validQueries = queries.filter((q) => q.query_text.trim() && q.relevant_keywords.length > 0)
      const res = await createDocument({
        title,
        content,
        queries: validQueries.length > 0 ? validQueries : undefined,
      })
      onDocumentCreated(res.id)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Ingest New Document</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus & Raft Architecture"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Content (Markdown or Plain Text)
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Section 1&#10;Paste technical specification or corpus here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Test Queries Builder */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold text-white">Evaluation Queries (Optional)</h4>
                <p className="text-[11px] text-slate-400">
                  Golden queries and ground truth keywords to evaluate retrieval accuracy.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuery}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-indigo-400 hover:bg-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Query</span>
              </button>
            </div>

            <div className="space-y-3">
              {queries.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-3"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Query text (e.g. What is the leader election timeout?)"
                      value={q.query_text}
                      onChange={(e) => handleQueryChange(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Ground truth keywords (comma-separated: leader election, timeout, heartbeat)"
                      value={q.relevant_keywords.join(', ')}
                      onChange={(e) => handleKeywordsChange(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {queries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuery(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Ingesting...' : 'Ingest Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
