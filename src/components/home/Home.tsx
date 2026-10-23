// The home page: TechText name, pinned word reveal, pinned project row with the stack marquee, photo reel,
// and Ask Antonio, which searches the site's own embedding index in the browser (retrieval only, no LLM).
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import TechText from '../rb/TechText/TechText';
import ScrambledText from '../rb/ScrambledText/ScrambledText';
import StrokeText from '../rb/StrokeText/StrokeText';
import TextType from '../rb/TextType/TextType';
import CircularGallery from '../rb/CircularGallery/CircularGallery';
import LogoLoop from '../rb/LogoLoop/LogoLoop';
import Chrome, { ACCENT, getLenis } from './Chrome';
import { ask, loadSpace } from '../../scripts/search';
import './home.css';

export type Project = { slug: string; title: string; tagline: string; href: string; image: string; stack: string[]; note?: string };
export type Photo = { src: string; caption: string };

const NAME = 'Antonio B. Garcia Jr.';
const DISPLAY = "'Chakra Petch', sans-serif";
const GLYPHS = '01<>/\\{}[]#$%&*';

// Edit freely: the stack marquee, the timeline, and the intro paragraph.
const STACK = ['Python', 'TypeScript', 'FastAPI', 'Django', 'React', 'pgvector', 'Supabase', 'Vertex AI', 'Gemini', 'Groq', 'Google ADK', 'n8n', 'Docker', 'PostgreSQL', 'OpenCV', 'ESP8266', 'Kotlin', 'C++'];

const EXPERIENCE = [
  { when: 'Now', what: 'Machine learning track', where: 'FlyRank, an AI-native organic search platform' },
  { when: '', what: 'Data Science Fellow, Data Modeling track', where: 'Eskwelabs' },
  { when: '', what: 'Co-founder', where: 'Joy Bread Studios' },
  { when: '3rd year', what: 'BSCS, Machine Learning track', where: 'National University Manila' },
];

// *starred* words take the accent (one star pair per word, punctuation stays plain)
const REVEAL = "I'm a BSCS student working on *AI* *engineering*, full-stack development, and the *hardware* side of things. I build *autonomous* *agents*, web platforms, and sensor rigs that measure something real. Most of it came from *hackathons*, where you can't afford to overthink it.";

/* ---------- jumps: pinned sections need their own scroll math ---------- */

/** window scroll position that shows `el` at its best: the reveal fully revealed, a project card centred in the pinned row */
function scrollTargetFor(el: HTMLElement) {
  const reveal = ScrollTrigger.getById('reveal');
  if (reveal && el.id === 'about') return reveal.end - 4;
  const work = ScrollTrigger.getById('work');
  const card = el.closest<HTMLElement>('.hm-panel-card');
  if (work && card) {
    const track = card.parentElement!;
    const pad = parseFloat(getComputedStyle(track).paddingLeft);
    const max = Math.max(track.scrollWidth - innerWidth + 64, 1);
    const p = Math.min(1, Math.max(0, (card.offsetLeft - track.offsetLeft - pad) / max));
    return work.start + p * (work.end - work.start);
  }
  if (work && el.id === 'work') return work.start;
  return el.getBoundingClientRect().top + scrollY - 40;
}

function jump(target: string) {
  const el = document.querySelector<HTMLElement>(target);
  if (!el) return;
  const y = scrollTargetFor(el);
  const lenis = getLenis();
  lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: 'smooth' });
  const lit = el.closest<HTMLElement>('.hm-panel-card') ?? el;
  setTimeout(() => {
    lit.classList.add('hm-pinged');
    setTimeout(() => lit.classList.remove('hm-pinged'), 2400);
  }, 1200);
}

/* ---------- headings: scramble on hover ---------- */

const Heading = ({ text }: { text: string }) => (
  <h2><ScrambledText scrambleColor={ACCENT} scrambleChars={GLYPHS}>{text}</ScrambledText></h2>
);

/* ---------- the big reveal: a panel opens to full bleed, then the description lights up word by word ---------- */

function Reveal() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { id: 'reveal', trigger: root.current, pin: true, start: 'top top', end: '+=260%', scrub: 0.6 } })
        .fromTo('.rv-panel', { clipPath: 'inset(30% 28% 30% 28% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 })
        .fromTo('.rv-glow', { scale: 0.3, opacity: 0 }, { scale: 1.3, opacity: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('.rv-word', { opacity: 0.07, filter: 'blur(10px)', yPercent: 40 }, { opacity: 1, filter: 'blur(0px)', yPercent: 0, stagger: 0.035, ease: 'power3.out', duration: 0.35 }, 0.55);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section id="about" ref={root} className="rv">
      <div className="rv-panel">
        <div className="rv-glow" aria-hidden="true" />
        <div className="rv-grid" aria-hidden="true" />
        <div className="rv-inner">
          <p className="rv-text">
            {REVEAL.split(' ').map((tok, i) => {
              const [, hot, punct] = tok.match(/^\*(.+)\*([,.]?)$/) ?? [];
              return hot ? (
                <span key={i} className="rv-word"><span className="rv-hot">{hot}</span>{punct} </span>
              ) : (
                <span key={i} className="rv-word">{tok} </span>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- projects: pinned sideways track, stack marquee riding along ---------- */

function Pinned({ projects }: { projects: Project[] }) {
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // never negative: with few (or no) projects the row fits on screen and the pin just holds briefly
      const distance = () => Math.max(track.current!.scrollWidth - innerWidth + 64, 1);
      gsap.to(track.current, { x: () => -distance(), ease: 'none', scrollTrigger: { id: 'work', trigger: pin.current, pin: true, start: 'top top', end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true } });
    });
    return () => ctx.revert();
  }, []);
  return (
    <div ref={pin} className="hm-pinned">
      <div className="hm-pinned-head"><Heading text="Things I've built" /></div>
      <div id="stack" className="hm-marquee">
        <LogoLoop logos={STACK.map((s) => ({ node: <span className="hm-chip">{s}</span>, title: s }))} speed={50} gap={16} logoHeight={30} fadeOutColor="#07090b" ariaLabel="Tools I use" />
      </div>
      <div ref={track} className="hm-track">
        {projects.length === 0 && <p className="hm-muted">Projects are syncing from GitHub. Check back soon, or see <a className="cursor-target" href="https://github.com/2nieGarcia">github.com/2nieGarcia</a>.</p>}
        {projects.map((p, i) => (
          <article key={p.slug} data-slug={p.slug} className="hm-panel-card">
            <img src={p.image} alt="" />
            <div className="hm-card-body">
              <span className="hm-index">{String(i + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}</span>
              <h3>{p.title}</h3>
              <p>{p.tagline}</p>
              {p.note && <p className="hm-note">{p.note}</p>}
              <ul className="hm-stack">{p.stack.map((s) => <li key={s}>{s}</li>)}</ul>
              <a className="cursor-target hm-more" href={p.href}>Read the build →</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------- Ask Antonio: "hack" the site. Buttons jump instantly; typed questions run a real semantic search ---------- */

const ALL_PLACES = [
  { label: 'About me', target: '#about', say: 'Opening the short version of me.' },
  { label: 'Projects', target: '#work', say: 'Opening the build log.' },
  { label: 'Gallery', target: '#gallery', say: 'Opening photos from the field.' },
  { label: 'Leadership', target: '#leadership', say: 'Opening how I lead teams.' },
  { label: 'Experience', target: '#experience', say: "Opening where I've worked and studied." },
  { label: 'Contact', target: '#contact', say: 'Opening contact channels. Email is fastest.' },
];
const PROMPTS = ['has he shipped RAG systems?', 'has he led a team?', 'anything with hardware?', 'tell me about Nura'];

type Line =
  | { id: number; kind: 'sys' | 'ok' | 'err' | 'you'; text: string }
  | { id: number; kind: 'hit'; title: string; text: string; meta: string };

// a matched passage jumps to its card or section; about-docs this page doesn't render fall back to the intro
const targetForSlug = (slug: string) =>
  document.querySelector(`[data-slug="${slug}"]`) ? `[data-slug="${slug}"]` : document.getElementById(slug) ? `#${slug}` : '#about';

function AskAntonio({ hasGallery }: { hasGallery: boolean }) {
  const PLACES = hasGallery ? ALL_PLACES : ALL_PLACES.filter((p) => p.target !== '#gallery');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const booted = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const id = useRef(0);

  const push = (...add: (Omit<Extract<Line, { kind: 'hit' }>, 'id'> | { kind: 'sys' | 'ok' | 'err' | 'you'; text: string })[]) =>
    setLines((ls) => [...ls, ...add.map((l) => ({ ...l, id: id.current++ }) as Line)].slice(-8));
  useEffect(() => void log.current?.scrollTo({ top: log.current.scrollHeight }), [lines]);

  // first open: connect to the site and report the real size of its index
  useEffect(() => {
    if (!open || booted.current) return;
    booted.current = true;
    push({ kind: 'sys', text: 'connecting to antonio.sys …' });
    loadSpace()
      .then((s) => {
        push({ kind: 'ok', text: 'ACCESS GRANTED · clearance: guest' }, { kind: 'sys', text: `${s.passages.length} records indexed. Ask anything, or pick a section.` });
      })
      .catch(() => push({ kind: 'err', text: 'index offline · sections still work' }));
  }, [open]);

  // "/" opens it from anywhere, Escape closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => input.current?.focus());
      } else if (e.key === 'Escape') setOpen(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const query = async (text: string) => {
    setBusy(true);
    setQ('');
    push({ kind: 'you', text }, { kind: 'sys', text: 'scanning records …' });
    try {
      const a = await ask(text, (line) => push({ kind: 'sys', text: line }));
      const top = a.hits[0];
      push({ kind: 'hit', title: top.passage.title, text: top.passage.text.length > 170 ? `${top.passage.text.slice(0, 170).replace(/\s+\S*$/, '')}…` : top.passage.text, meta: `match ${top.score.toFixed(2)}${a.known ? '' : ' · low confidence'}` });
      push({ kind: 'ok', text: '→ jumping to record' });
      jump(targetForSlug(top.passage.slug));
    } catch {
      push({ kind: 'err', text: 'search model failed to load · use the sections above' });
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim() && !busy) query(q.trim());
  };
  const open_ = (p: (typeof ALL_PLACES)[number]) => {
    push({ kind: 'you', text: p.label.toLowerCase() }, { kind: 'ok', text: p.say });
    jump(p.target);
  };

  return (
    <div
      ref={box}
      className={`mm${open ? ' is-open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !box.current?.contains(document.activeElement) && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => !box.current?.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button type="button" className="mm-tab cursor-target" aria-expanded={open} aria-controls="mm-panel" onClick={() => setOpen(!open)}>
        <span className="mm-led" aria-hidden="true" />
        <span>Ask Antonio</span>
        <kbd>/</kbd>
      </button>
      <div id="mm-panel" className="mm-panel" role="dialog" aria-label="Ask Antonio: search this site">
        <div className="mm-bar" aria-hidden="true">
          <span>ANTONIO.SYS // QUERY</span>
          <span className="mm-status"><i />{busy ? 'scanning' : 'secure link'}</span>
        </div>
        <ol ref={log} className="mm-log" aria-live="polite">
          {lines.map((l) =>
            l.kind === 'hit' ? (
              <li key={l.id} className="mm-hit">
                <div className="mm-hit-head"><span>RECORD FOUND</span><span>{l.meta}</span></div>
                <strong>{l.title}</strong>
                <TextType text={l.text} loop={false} showCursor={false} typingSpeed={6} />
              </li>
            ) : (
              <li key={l.id} className={`mm-${l.kind}`}>
                {l.kind === 'you' ? <><span className="mm-ps">guest@antonio.sys:~$</span> {l.text}</> : <TextType as="span" text={l.text} loop={false} showCursor={false} typingSpeed={12} />}
              </li>
            ),
          )}
        </ol>
        <div className="mm-places">
          {PLACES.map((p, i) => (
            <button key={p.label} type="button" className="cursor-target" onClick={() => open_(p)}>
              <span className="mm-n">{String(i + 1).padStart(2, '0')}</span>{p.label}
            </button>
          ))}
        </div>
        <form className="mm-line" onSubmit={submit}>
          <span aria-hidden="true">guest:~$</span>
          <span className="mm-field">
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} aria-label="Ask anything about Antonio's work" />
            {!q && !busy && <TextType className="mm-ph" text={PROMPTS} loop typingSpeed={50} deletingSpeed={25} pauseDuration={1600} cursorCharacter="█" />}
          </span>
        </form>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Home({ projects, photos, leadershipHtml }: { projects: Project[]; photos: Photo[]; leadershipHtml: string }) {
  const size = Math.round(Math.min(innerWidth * 0.068, 116));

  return (
    <>
      <Chrome />

      <main className="hm-main">
        <header className="hm-hero">
          <div className="hm-tech">
            <TechText text={NAME} fontSize={size} fontWeight={600} fontFamily={DISPLAY} color="#d8dee6" accentColor={ACCENT} intro="metrics" align="left" guides labels />
            <h1 className="sr-only">{NAME}</h1>
          </div>
          <p className="hm-role"><ScrambledText scrambleColor={ACCENT} scrambleChars={GLYPHS}>AI engineer · NU Manila · hackathon team lead</ScrambledText></p>
          <a className="hm-scroll cursor-target" href="#about" aria-label="Scroll to the introduction">
            <span>scroll</span>
            <i aria-hidden="true" />
          </a>
        </header>

        <Reveal />

        <section id="work" className="hm-work">
          <Pinned projects={projects} />
        </section>

        {photos.length > 0 && (
          <section id="gallery" className="hm-section">
            <Heading text="In the field" />
            <p className="hm-muted">Drag the reel.</p>
            <div className="hm-gallery">
              <CircularGallery items={photos.map((p) => ({ image: p.src, text: p.caption }))} textColor="#d8dee6" bend={2} autoScroll={0.35} font={`600 30px ${DISPLAY}`} />
            </div>
          </section>
        )}

        <section id="leadership" className="hm-section hm-about">
          <Heading text="Leading teams" />
          <div dangerouslySetInnerHTML={{ __html: leadershipHtml }} />
        </section>

        <section id="experience" className="hm-section">
          <Heading text="Where I've been" />
          <ol className="hm-timeline">
            {EXPERIENCE.map((e) => <li key={e.what}><span>{e.when}</span><strong>{e.what}</strong><em>{e.where}</em></li>)}
          </ol>
        </section>

        <footer id="contact" className="hm-section hm-close">
          <div className="hm-close-stroke">
            <StrokeText text="Building things that (hopefully) work." trigger="scroll" fontSize={Math.round(Math.min(innerWidth * 0.046, 80))} fontWeight={600} fontFamily={DISPLAY} strokeColor={ACCENT} fillColor="#d8dee6" marching />
            <h2 className="sr-only">Building things that (hopefully) work.</h2>
          </div>
          <p className="hm-muted">Open to full-time AI engineering roles, fellowships, and interesting problems.</p>
          <p className="hm-contact"><a className="cursor-target" href="mailto:garciaantoniojrb@gmail.com">garciaantoniojrb@gmail.com</a><a className="cursor-target" href="https://www.linkedin.com/in/2nie/">LinkedIn</a><a className="cursor-target" href="https://github.com/2nieGarcia">GitHub</a></p>
        </footer>
      </main>

      <AskAntonio hasGallery={photos.length > 0} />
    </>
  );
}
