// Hybrid ranking shared by the build self-check and the browser: cosine similarity, plus a small boost for passages
// whose area matches a keyword intent in the question. Embeddings alone miss category questions ("what ML projects…").
import { expand } from './expand';
import type { Passage } from './space-types';

const INTENTS: [string, RegExp][] = [
  ['ml', /machine learning|artificial intelligence|deep learning|neural|\bmodels?\b/i],
  ['hardware', /hardware|internet of things|sensors?|embedded|esp32|arduino/i],
  ['leadership', /\bteams?\b|\blead(er|ing|ership)?\b|manag/i],
  ['gamedev', /\bgames?\b|game ?dev/i],
  ['quant', /quant|trading/i],
  ['re', /reverse engineer/i],
  ['math', /\bmath|statistic|linear algebra/i],
  ['career', /\bstud(y|ied|ying)\b|school|universit|college|degree|\bjobs?\b|experience|intern|worked at|career/i],
];
const BOOST = 0.15;

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

export function rank(q: number[], question: string, passages: Passage[]) {
  const text = expand(question);
  const areas = new Set(INTENTS.filter(([, re]) => re.test(text)).map(([a]) => a));
  return passages
    .map((p) => {
      const sim = dot(q, p.vec);
      return { passage: p, sim, score: sim + (areas.has(p.area) ? BOOST : 0) };
    })
    .sort((a, b) => b.score - a.score);
}
