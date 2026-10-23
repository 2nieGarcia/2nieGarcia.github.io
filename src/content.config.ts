import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';

export const AREAS = ['ml', 'gamedev', 're', 'quant', 'math', 'leadership', 'career', 'web', 'hardware'] as const;

const LOGIN = '2nieGarcia';
const TOPIC = 'portfolio';
const IMAGE = /\.(png|jpe?g|webp|gif|avif)$/i;

// shortcut: first 100 repos, no pagination. Add pagination past 100 public repos.
const QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(privacy: PUBLIC, isFork: false, first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes {
        name url homepageUrl description pushedAt openGraphImageUrl
        repositoryTopics(first: 20) { nodes { topic { name } } }
        summary: object(expression: "HEAD:docs/summary.md") { ... on Blob { text } }
        readme: object(expression: "HEAD:README.md") { ... on Blob { text } }
        shots: object(expression: "HEAD:docs/screenshots") { ... on Tree { entries { name } } }
      }
    }
  }
}`;

type Repo = {
  name: string;
  url: string;
  homepageUrl: string | null;
  description: string | null;
  pushedAt: string;
  openGraphImageUrl: string;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  summary: { text: string } | null;
  readme: { text: string } | null;
  shots: { entries: { name: string }[] } | null;
};

// Without docs/summary.md, use the README's opening prose and lists (no headings, badges, HTML, code, quotes or tables).
function readmeIntro(md: string) {
  return md
    .split(/\n\s*\n/)
    .map((b) => b.trim().replace(/!\[[^\]]*\]\([^)]*\)/g, ''))
    .filter((b) => b.length > 60 && !/^(#|<|\||```|>)/.test(b))
    .slice(0, 6)
    .join('\n\n');
}

// shortcut: FEATURE_REPOS=Nura=ml,JuryBee=ml previews repos locally before they get the topic. Unused in CI.
const preview = new Map(
  (process.env.FEATURE_REPOS ?? '').split(',').filter(Boolean).map((s) => s.split('=') as [string, string | undefined]),
);

const githubProjects: Loader = {
  name: 'github-projects',
  async load({ store, parseData, renderMarkdown, logger }) {
    const token = process.env.GH_TOKEN;
    if (!token) throw new Error('GH_TOKEN is not set. Locally: GH_TOKEN=$(gh auth token) npm run dev');

    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(`GitHub GraphQL ${res.status}: ${JSON.stringify(json.errors ?? json)}`);

    const repos: Repo[] = json.data.user.repositories.nodes;
    store.clear();
    for (const repo of repos) {
      if (!repo.repositoryTopics.nodes.some((n) => n.topic.name === TOPIC) && !preview.has(repo.name)) continue;
      try {
        const body = repo.summary?.text ?? (repo.readme ? readmeIntro(repo.readme.text) : '');
        const rendered = body ? await renderMarkdown(body) : undefined;
        const fm = (rendered?.metadata?.frontmatter ?? {}) as Record<string, unknown>;
        const screenshots = (repo.shots?.entries ?? [])
          .map((e) => e.name)
          .filter((n) => IMAGE.test(n))
          .sort()
          .map((n) => `https://raw.githubusercontent.com/${LOGIN}/${repo.name}/HEAD/docs/screenshots/${encodeURIComponent(n)}`);
        const id = repo.name.toLowerCase(); // Pages URLs are case-sensitive
        const data = await parseData({
          id,
          data: {
            title: repo.readme?.text.match(/^#\s+(.+)$/m)?.[1].replace(/<[^>]+>|[*_`]/g, '').trim() || repo.name,
            tagline: repo.description ?? undefined,
            demo: repo.homepageUrl || undefined,
            area: preview.get(repo.name),
            ...fm,
            repo: repo.url,
            pushedAt: repo.pushedAt,
            ogImage: repo.openGraphImageUrl,
            screenshots,
          },
        });
        store.set({ id, data, rendered });
      } catch (e) {
        logger.warn(`Skipping ${repo.name}: ${(e as Error).message}`);
      }
    }
    logger.info(`Loaded ${store.keys().length} projects with topic "${TOPIC}"`);
  },
};

const projects = defineCollection({
  loader: githubProjects,
  schema: z.object({
    title: z.string(),
    tagline: z.string().optional(),
    area: z.enum(AREAS).default('web'),
    stack: z.array(z.string()).default([]),
    note: z.string().optional(), // one real highlight, e.g. "Built in 24 hours, 4-person team"
    order: z.number().default(99),
    demo: z.url().optional(),
    repo: z.url(),
    pushedAt: z.string(),
    ogImage: z.url(),
    screenshots: z.array(z.url()),
  }),
});

const about = defineCollection({
  loader: glob({ base: './src/content/about', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    area: z.enum(AREAS),
    order: z.number().default(99),
    exploring: z.boolean().default(false),
  }),
});

export const collections = { projects, about };
