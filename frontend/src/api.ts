import type {
  HealthInfo,
  ModelInfo,
  DocumentListItem,
  DocumentDetail,
  ChunkPreviewResult,
  QuerySearchResponse,
  BenchmarkRunResponse,
  BenchmarkRunListItem,
  EmbeddingCompareResponse,
} from './types'

const BASE_URL = '/api/v1'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`)
  }
  return res.json()
}

export async function getHealth(): Promise<HealthInfo> {
  const res = await fetch(`${BASE_URL}/health`)
  return handleResponse<HealthInfo>(res)
}

export async function getModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${BASE_URL}/models`)
  return handleResponse<ModelInfo[]>(res)
}

export async function preloadModel(modelId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/models/load?model_id=${encodeURIComponent(modelId)}`, {
    method: 'POST',
  })
  return handleResponse<any>(res)
}

export async function getDocuments(): Promise<DocumentListItem[]> {
  const res = await fetch(`${BASE_URL}/documents`)
  return handleResponse<DocumentListItem[]>(res)
}

export async function getDocumentDetail(id: string): Promise<DocumentDetail> {
  const res = await fetch(`${BASE_URL}/documents/${id}`)
  return handleResponse<DocumentDetail>(res)
}

export async function createDocument(payload: {
  title: string
  content: string
  queries?: { query_text: string; relevant_keywords: string[]; difficulty: string }[]
}): Promise<DocumentDetail> {
  const res = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<DocumentDetail>(res)
}

export async function uploadDocument(file: File, title?: string): Promise<DocumentDetail> {
  const formData = new FormData()
  formData.append('file', file)
  if (title && title.trim()) {
    formData.append('title', title.trim())
  }
  const res = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse<DocumentDetail>(res)
}

export async function deleteDocument(id: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'DELETE',
  })
  return handleResponse<{ status: string }>(res)
}

export async function previewChunks(payload: {
  document_id?: string
  text?: string
  strategy_name: string
  parameters?: Record<string, any>
}): Promise<ChunkPreviewResult> {
  const res = await fetch(`${BASE_URL}/chunks/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<ChunkPreviewResult>(res)
}

export async function searchQueries(payload: {
  document_id: string
  query: string
  top_k?: number
  embedding_model?: string
  strategies?: string[]
}): Promise<QuerySearchResponse> {
  const res = await fetch(`${BASE_URL}/search/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<QuerySearchResponse>(res)
}

export async function runBenchmark(payload: {
  document_id: string
  query_set_id: string
  top_k?: number
  embedding_model?: string
  strategy_params?: Record<string, Record<string, any>>
}): Promise<BenchmarkRunResponse> {
  const res = await fetch(`${BASE_URL}/benchmarks/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<BenchmarkRunResponse>(res)
}

export async function getBenchmarkRuns(): Promise<BenchmarkRunListItem[]> {
  const res = await fetch(`${BASE_URL}/benchmarks/runs`)
  return handleResponse<BenchmarkRunListItem[]>(res)
}

export async function getBenchmarkRunDetail(runId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/benchmarks/runs/${runId}`)
  return handleResponse<any>(res)
}

export function getBenchmarkExportUrl(runId: string, format: 'csv' | 'json' = 'csv'): string {
  return `${BASE_URL}/benchmarks/runs/${runId}/export?format=${format}`
}

export async function compareEmbeddings(payload: {
  document_id: string
  query: string
  strategy_name: string
  top_k?: number
  strategy_params?: Record<string, any>
}): Promise<EmbeddingCompareResponse> {
  const res = await fetch(`${BASE_URL}/search/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<EmbeddingCompareResponse>(res)
}
