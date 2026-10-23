// In-browser retrieval over the build-time index. The model loads on first use, never on page load.
import type { Passage, Space } from '../lib/space-types';
import { expand } from '../lib/expand';
import { rank } from '../lib/rank';

/** score is the raw cosine similarity (what the UI shows); order comes from the hybrid rank */
export type Hit = { passage: Passage; score: number };
export type Answer = { question: string; hits: Hit[]; known: boolean };

const THRESHOLD = 0.3; // MiniLM cosine; below this the best passage is off-topic
type Extractor = (text: string, opts: object) => Promise<{ tolist(): number[][] }>;

let space: Promise<Space> | undefined;
export const loadSpace = () => (space ??= fetch('/space.json').then((r) => r.json()));

let extractor: Promise<Extractor> | undefined;
export function loadModel(model: string, log: (line: string) => void) {
  return (extractor ??= (async () => {
    log('importing transformers.js');
    const { pipeline } = await import('@huggingface/transformers');
    const seen = new Set<string>();
    let lastPct = -1;
    const ex = await pipeline('feature-extraction', model, {
      dtype: 'q8',
      progress_callback: (e: { status: string; file?: string; progress?: number }) => {
        if (e.status === 'initiate' && e.file && !seen.has(e.file)) {
          seen.add(e.file);
          log(`fetching ${e.file}`);
        } else if (e.status === 'progress' && e.file?.endsWith('.onnx') && e.progress != null) {
          const pct = Math.floor(e.progress / 20) * 20;
          if (pct > lastPct) log(`${e.file} ${(lastPct = pct)}%`);
        }
      },
    });
    log(`${model} ready`);
    return ex as unknown as Extractor;
  })());
}

export async function ask(question: string, log: (line: string) => void): Promise<Answer> {
  const s = await loadSpace();
  const ex = await loadModel(s.model, log);
  const t0 = performance.now();
  const [q] = (await ex(expand(question), { pooling: 'mean', normalize: true })).tolist();
  const ranked = rank(q, question, s.passages);
  log(`embedded + ranked ${s.passages.length} passages in ${Math.round(performance.now() - t0)} ms`);

  // best passage per project, top 3
  const hits: Hit[] = [];
  for (const h of ranked) {
    if (hits.length === 3) break;
    if (!hits.some((x) => x.passage.slug === h.passage.slug)) hits.push({ passage: h.passage, score: h.sim });
  }
  return { question, hits, known: Math.max(...ranked.slice(0, 3).map((h) => h.sim)) >= THRESHOLD };
}
