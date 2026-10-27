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
  { when: '', what: 'Data Science Fellow, Data Modeling track', where: 'Eskwelabs' },
  { when: '3rd year', what: 'BSCS, Machine Learning track', where: 'National University Manila' },
];

// *starred* words take the accent (one star pair per word, punctuation stays plain).
// The explanation behind the quote is the /bio/ page, from src/content/about/philosophy.md.
const QUOTE = 'What stands in the *way* becomes the *way*.';
const QUOTE_BY = 'Marcus Aurelius, Meditations 5.20';

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

/* ---------- the big reveal: a viewfinder locks onto the painting, opens to full bleed, then the quote lights up ---------- */

// the viewfinder starts centred on the angel's eye (33.75% 33% of the painting, see .rv-art) and grows to full bleed
const VIEW_FROM = { top: '15%', right: '47.5%', bottom: '49%', left: '15%' };

function Reveal({ art }: { art: string }) {
  const root = useRef<HTMLElement>(null);
  const zoom = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const { top, right, bottom, left } = VIEW_FROM;
      gsap.timeline({ scrollTrigger: { id: 'reveal', trigger: root.current, pin: true, start: 'top top', end: '+=180%', scrub: 0.6 } })
        .fromTo('.rv-panel', { clipPath: `inset(${top} ${right} ${bottom} ${left})` }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 })
        .fromTo('.rv-frame', VIEW_FROM, { top: '2%', right: '2%', bottom: '2%', left: '2%', ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo('.rv-art', { scale: 1.25 }, {
          scale: 3.2, ease: 'power1.inOut', duration: 1.7,
          onUpdate() { if (zoom.current) zoom.current.textContent = `x${(gsap.getProperty('.rv-art', 'scale') as number).toFixed(2)}`; },
        }, 0)
        // the scan "decodes" the duotone back into the painting's own colours
        .fromTo('.rv-art', { filter: 'grayscale(1) brightness(0.6) contrast(1.15)' }, { filter: 'grayscale(0.15) brightness(0.62) contrast(1.08)', ease: 'none', duration: 1.2 }, 0.3)
        .fromTo('.rv-tint', { opacity: 0.85 }, { opacity: 0.12, ease: 'none', duration: 1.2 }, 0.3)
        .fromTo('.rv-sweep', { top: '-8%' }, { top: '108%', ease: 'none', duration: 1.2 }, 0.3)
        .fromTo('.rv-reticle', { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, ease: 'power3.out', duration: 0.6 }, 0.5)
        .fromTo('.rv-word', { opacity: 0.07, filter: 'blur(10px)', yPercent: 40 }, { opacity: 1, filter: 'blur(0px)', yPercent: 0, stagger: 0.06, ease: 'power3.out', duration: 0.35 }, 0.95)
        .fromTo('.rv-after', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, 1.5);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section id="about" ref={root} className="rv">
      <div className="rv-panel">
        <img className="rv-art" src={art} alt="" aria-hidden="true" />
        <div className="rv-tint" aria-hidden="true" />
        <div className="rv-shade" aria-hidden="true" />
        <div className="rv-grid" aria-hidden="true" />
        <div className="rv-sweep" aria-hidden="true" />
        <div className="rv-reticle" aria-hidden="true"><span>lock</span></div>
        <div className="rv-inner">
          <blockquote className="rv-quote">
            <p className="rv-text">
              {QUOTE.split(' ').map((tok, i) => {
                const [, hot, punct] = tok.match(/^\*(.+)\*([,.]?)$/) ?? [];
                return hot ? (
                  <span key={i} className="rv-word"><span className="rv-hot">{hot}</span>{punct} </span>
                ) : (
                  <span key={i} className="rv-word">{tok} </span>
                );
              })}
            </p>
            <footer className="rv-after">
              <cite>{QUOTE_BY}</cite>
              <a className="rv-why cursor-target" href="/bio/">
                What this means to me <span aria-hidden="true">→</span>
              </a>
            </footer>
          </blockquote>
        </div>
        <p className="rv-credit">Alexandre Cabanel, The Fallen Angel, 1847</p>
      </div>
      <div className="rv-frame" aria-hidden="true">
        <span>img // cabanel_1847</span>
        <span>zoom <b ref={zoom}>x1.25</b></span>
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
  { label: 'About me', target: '#philosophy', say: 'Opening the longer version of me.' },
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
      <button type="button" className="mm-tab cursor-target" aria-expanded={open} aria-controls="mm-panel" onClick={() => setOpen(true)}>
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

type HomeProps = { projects: Project[]; photos: Photo[]; leadershipHtml: string; art: string; resume?: string; cv?: string };

export default function Home({ projects, photos, leadershipHtml, art, resume, cv }: HomeProps) {
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
          <p className="hm-role"><ScrambledText scrambleColor={ACCENT} scrambleChars={GLYPHS}>AI/ML engineer · PM · solving real problems for people</ScrambledText></p>
          {(resume || cv) && (
            <p className="hm-docs">
              <a className="rv-why cursor-target" href="/resume/">Résumé &amp; CV <span aria-hidden="true">→</span></a>
            </p>
          )}
          <a className="hm-scroll cursor-target" href="#about" aria-label="Scroll to the introduction">
            <span>scroll</span>
            <i aria-hidden="true" />
          </a>
        </header>

        <Reveal art={art} />

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
          <Heading text="Leadership" />
          <div dangerouslySetInnerHTML={{ __html: leadershipHtml }} />
        </section>

        <section id="experience" className="hm-section">
          <Heading text="Where I've been" />
          <ol className="hm-timeline">
            {EXPERIENCE.map((e) => <li key={e.what}><span>{e.when}</span><strong>{e.what}</strong><em>{e.where}</em></li>)}
          </ol>
        </section>

        <section id="philosophy" className="hm-section hm-about hm-me">
          <Heading text="About me" />
          <div>
            <p>AI/ML engineer, part-time PM, full-time problem solver. The longer (and less serious) version is one click away.</p>
            <blockquote>
              <p>Think of yourself as dead. You have lived your life. Now take what's left and live it properly.</p>
              <p>Marcus Aurelius, Meditations 7.56</p>
            </blockquote>
          </div>
          <a className="rv-why cursor-target" href="/bio/">Read the longer version <span aria-hidden="true">→</span></a>
        </section>

        <footer id="contact" className="hm-section hm-close">
          <div className="hm-close-stroke">
            <StrokeText text="Building things that (hopefully) work." trigger="scroll" fontSize={Math.round(Math.min(innerWidth * 0.046, 80))} fontWeight={600} fontFamily={DISPLAY} strokeColor={ACCENT} fillColor="#d8dee6" marching />
            <h2 className="sr-only">Building things that (hopefully) work.</h2>
          </div>
          <p className="hm-muted">Studying and ready to work: open to AI/ML internships and roles I can take on while finishing my BSCS.</p>
          <p className="hm-contact"><a className="cursor-target" href="mailto:garciaantoniojrb@gmail.com">garciaantoniojrb@gmail.com</a><a className="cursor-target" href="https://www.linkedin.com/in/2nie/">LinkedIn</a><a className="cursor-target" href="https://github.com/2nieGarcia">GitHub</a>{(resume || cv) && <a className="cursor-target" href="/resume/">Résumé &amp; CV</a>}</p>
        </footer>
      </main>

      <AskAntonio hasGallery={photos.length > 0} />
    </>
  );
}
