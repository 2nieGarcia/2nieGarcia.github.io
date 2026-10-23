# antonio.sys

Personal portfolio of Antonio B. Garcia Jr., live at [2nieGarcia.github.io](https://2nieGarcia.github.io).

The site has no backend and no CMS. Every build pulls my public GitHub repos tagged `portfolio`, turns their `docs/summary.md` and `docs/screenshots/` into project pages, and indexes all the text for **Ask Antonio**, a search panel that runs a small embedding model (`all-MiniLM-L6-v2`) in the visitor's browser. It redeploys on every push and every 6 hours.

Stack: Astro 7, React islands, GSAP + ScrollTrigger, Lenis, transformers.js, GitHub Actions, GitHub Pages.

## Featuring a project

In the project's repo:

1. Add the `portfolio` topic.
2. Add `docs/summary.md`:

   ```markdown
   ---
   title: Nura — Filipino Healthcare Access Navigator
   tagline: One sentence, under 140 characters.
   area: ml            # ml | hardware | web | gamedev | re | quant | math | leadership | career
   stack: [FastAPI, React, Vertex AI, pgvector]
   note: Built in 24 hours, 4-person team   # one real highlight
   order: 1            # lower comes first
   demo: https://example.com                # optional
   ---

   A few short paragraphs: the problem, what I built, my role, and the result.
   ```

3. Optionally add images to `docs/screenshots/` (`01-cover.png`, `02-…`). The first one is the cover.

The next build picks it up. Remove the topic to take a project down.

## Other content

- Leadership and experience text: `src/content/about/*.md`
- Gallery photos: `src/assets/gallery/` (the file name becomes the caption; the section is hidden while empty)
- Intro paragraph, timeline and stack marquee: constants at the top of `src/components/home/Home.tsx`

## Local development

```sh
npm install
GH_TOKEN=$(gh auth token) npm run dev
```

PowerShell: `$env:GH_TOKEN = gh auth token; npm run dev`

To preview repos before they have the topic: `FEATURE_REPOS="Nura=ml,JuryBee=ml"`.

`npx astro check` type-checks the project. The build fails if Ask Antonio's retrieval self-check fails (`CHECKS` in `src/lib/space.ts`).

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages. In the repo settings, set **Pages → Source** to **GitHub Actions**. If the build can't read other repos with the default token, add a fine-grained read-only token as the `PORTFOLIO_TOKEN` secret.

More detail: [ARCHITECTURE.md](ARCHITECTURE.md).

## Credits

Some UI components in `src/components/rb/` come from [React Bits](https://github.com/DavidHDev/react-bits), used under its MIT + Commons Clause license (see `src/components/rb/LICENSE.md`).
