// Build-time embedding index: passages from projects and about docs, embedded with MiniLM for in-browser retrieval.
import os from 'node:os';
import path from 'node:path';
import { getCollection } from 'astro:content';
import { pipeline, env } from '@huggingface/transformers';
import type { Passage, Space } from './space-types';
import { AREA_LABEL, expand } from './expand';
import { rank } from './rank';

export const MODEL = 'Xenova/all-MiniLM-L6-v2';
env.cacheDir = path.join(os.homedir(), '.cache', 'huggingface'); // cached by CI, see deploy.yml

const MAX_PER_DOC = 12;

// Retrieval self-check: each question's best match must be one of its slugs, or the build fails.
// Slugs absent from the index are ignored. The first three are the hero's suggestion chips.
const ML = ['ai-powered-lead-generation', 'nura', 'jurybee'];
const CHECKS: [string, string[]][] = [
  ['What ML projects have you shipped?', ML],
  ['Have you led a team?', ['leadership']],
  ['Anything with hardware?', ['bantay-dagitab']],
  ['where did you study?', ['experience']],
  ['what RAG systems have you built?', ['ai-powered-lead-generation', 'nura']],
  ['healthcare chatbot in Filipino languages', ['nura']],
  ['legal contract analysis with agents', ['jurybee']],
  ['energy monitoring with sensors', ['bantay-dagitab']],
  ['are you into quant trading?', ['quant']],
];

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");

// rendered HTML -> paragraph and list-item passages
function passagesOf(html: string) {
  return decode(html.replace(/<\/(p|li|h\d|td)>/g, '\n\n').replace(/<[^>]+>/g, ''))
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 40)
    .slice(0, MAX_PER_DOC);
}

const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

async function build(): Promise<Space> {
  const projects = await getCollection('projects');
  const about = await getCollection('about');
  const docs = [
    ...projects.map((p) => ({ slug: p.id, title: p.data.title, area: p.data.area, href: `/projects/${p.id}/`, html: p.rendered?.html ?? '', lead: p.data.tagline })),
    ...about.map((a) => ({ slug: a.id, title: a.data.title, area: a.data.area, href: `/#${a.id}`, html: a.rendered?.html ?? '', lead: undefined })),
  ];

  const raw = docs.flatMap((d) => {
    // the title rides along so "tell me about Nura" lands on Nura's passages
    const texts = passagesOf(d.html).map((text) => ({ text, embed: `${d.title}: ${text}` }));
    // projects get one overview passage that names their area, so "what ML have you shipped?" finds them
    // (it displays the tagline, or the first real passage when there is none, never just the title again)
    if (d.href.startsWith('/projects/'))
      texts.unshift({ text: d.lead ?? texts[0]?.text ?? d.title, embed: `${d.title}: a ${AREA_LABEL[d.area] ?? d.area} project I built and shipped. ${d.lead ?? ''}` });
    return texts.map((t, i) => ({ id: `${d.slug}-${i}`, slug: d.slug, title: d.title, area: d.area, href: d.href, ...t }));
  });
  if (raw.length < 4) throw new Error(`Embedding index needs at least 4 passages, got ${raw.length}`);

  const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  const vecs = (await extractor(raw.map((p) => p.embed), { pooling: 'mean', normalize: true })).tolist() as number[][];

  const passages: Passage[] = raw.map(({ embed, ...p }, i) => ({ ...p, vec: vecs[i].map((x) => round(x)) }));

  const ids = new Set(passages.map((p) => p.slug));
  const failed = [];
  for (const [question, slugs] of CHECKS.filter(([, s]) => s.some((x) => ids.has(x)))) {
    const [q] = (await extractor(expand(question), { pooling: 'mean', normalize: true })).tolist() as number[][];
    const top = rank(q, question, passages).slice(0, 3);
    if (!slugs.includes(top[0].passage.slug)) failed.push(`"${question}" expected ${slugs.join('|')}, got ${top.map((h) => `${h.passage.slug} ${h.score.toFixed(2)}`).join(', ')}`);
  }
  if (failed.length) throw new Error(`Retrieval self-check failed:\n${failed.join('\n')}`);

  return { model: MODEL, passages };
}

let cached: Promise<Space> | undefined;
export const getSpace = () => (cached ??= build());
