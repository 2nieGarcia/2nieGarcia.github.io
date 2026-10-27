// MiniLM embeds acronyms poorly ("ML" lands nowhere near "machine learning"), so spell them out before embedding.
// Shared by the build (self-check) and the browser (questions) so both sides embed the same text.
const ACRONYMS: Record<string, string> = {
  ml: 'machine learning',
  ai: 'artificial intelligence AI',
  rag: 'retrieval-augmented generation RAG',
  llm: 'large language model LLM',
  llms: 'large language models LLMs',
  cv: 'computer vision',
  nlp: 'natural language processing',
  iot: 'internet of things IoT hardware',
  pm: 'project manager team lead',
};

export const expand = (q: string) => q.replace(/\b[a-z]{2,4}\b/gi, (w) => ACRONYMS[w.toLowerCase()] ?? w);

export const AREA_LABEL: Record<string, string> = {
  ml: 'machine learning and AI',
  hardware: 'hardware and IoT',
  web: 'web development',
  gamedev: 'game development',
  re: 'reverse engineering',
  quant: 'quantitative trading',
  math: 'mathematics',
  leadership: 'team leadership',
  career: 'education and work experience',
  life: 'philosophy, values and life outside work',
};
