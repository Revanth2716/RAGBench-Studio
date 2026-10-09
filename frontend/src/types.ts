export interface HealthInfo {
  status: string
  project: string
  version: string
  available_strategies: string[]
  db_status: string
}

export interface DocumentListItem {
  id: string
  title: string
  token_count: number
  char_count: number
  created_at: string
}

export interface QueryItem {
  id: string
  query_text: string
  relevant_keywords: string[]
  difficulty: string
}

export interface QuerySet {
  id: string
  document_id: string
  name: string
  description?: string
  queries: QueryItem[]
}

export interface DocumentDetail {
  id: string
  title: string
  content: string
  token_count: number
  char_count: number
  created_at: string
  query_sets: QuerySet[]
}

export interface ChunkItem {
  id: string
  chunk_index: number
  text: string
  start_char: number
  end_char: number
  token_count: number
  metadata: Record<string, any>
}

export interface ChunkPreviewResult {
  strategy_name: string
  total_chunks: number
  total_tokens: number
  redundancy_ratio: number
  chunks: ChunkItem[]
}

export interface RetrievedChunk {
  rank: number
  chunk_id: string
  chunk_index: number
  score: number
  text: string
  start_char: number
  end_char: number
  token_count: number
  metadata: Record<string, any>
}

export interface StrategySearchResult {
  strategy_name: string
  latency_ms: number
  results: RetrievedChunk[]
}

export interface QuerySearchResponse {
  document_id: string
  query: string
  top_k: number
  strategies: StrategySearchResult[]
}

export interface QueryEvaluationDetail {
  query_id: string
  query_text: string
  reciprocal_rank: number
  hit: boolean
  ndcg: number
  precision_at_k: number
  recall_at_k: number
  retrieved_ranks: number[]
  top_match_preview: string
  latency_ms: number
}

export interface StrategyBenchmarkResult {
  strategy_name: string
  mrr: number
  hit_rate: number
  ndcg: number
  precision_at_k: number
  recall_at_k: number
  avg_latency_ms: number
  total_chunks: number
  redundancy_ratio: number
  per_query_details: QueryEvaluationDetail[]
}

export interface BenchmarkRunResponse {
  run_id: string
  document_id: string
  query_set_id: string
  top_k: number
  strategies: StrategyBenchmarkResult[]
}

export interface BenchmarkRunListItem {
  id: string
  document_id: string
  document_title: string
  query_set_id: string
  query_set_name: string
  status: string
  created_at: string
  strategy_summaries: {
    strategy_name: string
    mrr: number
    hit_rate: number
    ndcg: number
    avg_latency_ms: number
    total_chunks: number
  }[]
}
