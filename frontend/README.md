# RAGBench Studio — Frontend Dashboard

Interactive React + TypeScript dashboard for the RAGBench Studio platform.

## Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4 (dark mode theme)
- **Icons**: Lucide React
- **Linter**: Oxlint

## UI Components & Tabs

- **Chunk Visualizer** (`src/components/ChunkVisualizer.tsx`): Real-time interactive inspection of chunk boundaries, token length distribution, and redundancy overhead across all 4 strategies.
- **Query Playground** (`src/components/QueryPlayground.tsx`): 4-column side-by-side search comparing retrieved passage cards with cosine similarity scores.
- **Embedding Comparator** (`src/components/EmbeddingComparator.tsx`): Dual-model head-to-head retrieval (256d Feature Hashing vs. 384d FastEmbed), rank divergence matrix, and Jaccard Top-K overlap calculation.
- **IR Leaderboard** (`src/components/BenchmarkLeaderboard.tsx`): Canonical Information Retrieval scorecards (MRR, Hit Rate@K, NDCG@K, Precision, Recall) with CSV/JSON run export.
- **Run History** (`src/components/RunHistory.tsx`): SQLite historical run explorer with one-click re-inspection into the Leaderboard.
- **Document Modal** (`src/components/DocumentModal.tsx`): Ingestion interface supporting drag-and-drop `.txt` and `.md` file uploads alongside custom golden query authoring.

## Development & Build

```bash
# Install dependencies
npm install

# Start local dev server (port 5173 with API proxy to 127.0.0.1:8000)
npm run dev

# Run TypeScript checks and production build
npm run build

# Run linter
npm run lint
```
