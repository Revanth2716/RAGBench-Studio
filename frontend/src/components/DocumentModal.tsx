import React, { useState, useRef } from 'react'
import { X, FileText, Plus, Trash2, Upload, FileCode, CheckCircle2 } from 'lucide-react'
import { createDocument, uploadDocument } from '../api'

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
  const [tab, setTab] = useState<'upload' | 'manual'>('upload')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState('')
  const [queries, setQueries] = useState<
    { query_text: string; relevant_keywords: string[]; difficulty: string }[]
  >([
    { query_text: '', relevant_keywords: [''], difficulty: 'medium' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!['.txt', '.md', '.markdown'].includes(ext)) {
        setError('Unsupported file type. Please upload a .txt or .md file.')
        setSelectedFile(null)
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('File exceeds 2 MB limit.')
        setSelectedFile(null)
        return
      }
      setError(null)
      setSelectedFile(file)
      if (!fileTitle) {
        // Derive clean title from filename
        const derived = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        setFileTitle(derived.charAt(0).toUpperCase() + derived.slice(1))
      }
    }
  }

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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a .txt or .md file to upload.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await uploadDocument(selectedFile, fileTitle.trim() || undefined)
      onDocumentCreated(res.id)
      onClose()
    } catch (err: any) {
      setError(err.message || 'File upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
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

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-800 px-6 pt-3 space-x-4 bg-slate-950/40">
          <button
            type="button"
            onClick={() => { setTab('upload'); setError(null); }}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 transition border-b-2 ${
              tab === 'upload'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.txt, .md)</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('manual'); setError(null); }}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 transition border-b-2 ${
              tab === 'manual'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Manual Text & Golden Queries</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Tab 1: Upload File */}
        {tab === 'upload' ? (
          <form onSubmit={handleUploadSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                selectedFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-700 hover:border-indigo-500/60 bg-slate-950/50 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown"
                onChange={handleFileChange}
                className="hidden"
                id="doc-file-upload-input"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Click or drag a file to upload</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports Markdown (<span className="font-mono text-indigo-300">.md</span>) and Plain Text (<span className="font-mono text-indigo-300">.txt</span>) up to 2 MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="upload-title-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Document Title (Optional)
              </label>
              <input
                id="upload-title-input"
                name="upload_title"
                type="text"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                placeholder="Defaults to filename if left empty"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Evaluation queries will automatically be extracted from headings and key sections.
              </p>
            </div>

            {/* Footer */}
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
                disabled={loading || !selectedFile}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {loading ? 'Uploading & Ingesting...' : 'Upload & Ingest Document'}
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Manual Text Form */
          <form onSubmit={handleManualSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            <div>
              <label htmlFor="doc-title-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Document Title
              </label>
              <input
                id="doc-title-input"
                name="doc_title"
                aria-label="Document Title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Consensus & Raft Architecture"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="doc-content-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Content (Markdown or Plain Text)
              </label>
              <textarea
                id="doc-content-input"
                name="doc_content"
                aria-label="Document Content"
                rows={7}
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
                        id={`query-text-${idx}`}
                        name={`query_text_${idx}`}
                        aria-label={`Evaluation Query Text ${idx + 1}`}
                        type="text"
                        placeholder="Query text (e.g. What is the leader election timeout?)"
                        value={q.query_text}
                        onChange={(e) => handleQueryChange(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        id={`query-kw-${idx}`}
                        name={`query_kw_${idx}`}
                        aria-label={`Ground Truth Keywords ${idx + 1}`}
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

            {/* Footer */}
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
        )}
      </div>
    </div>
  )
}

