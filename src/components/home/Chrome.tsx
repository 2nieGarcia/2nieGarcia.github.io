// Page chrome shared by every page: GridScan background, target cursor, Lenis smooth scroll (synced with GSAP).
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import GridScan from '../rb/GridScan/GridScan';
import TargetCursor from '../rb/TargetCursor/TargetCursor';
import './chrome.css';

gsap.registerPlugin(ScrollTrigger);

export const ACCENT = '#ff7a66';

let lenis: Lenis | undefined;
export const getLenis = () => lenis;

export default function Chrome() {
  useEffect(() => {
    lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => lenis!.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = undefined;
    };
  }, []);
  return (
    <>
      <div className="chrome-bg" aria-hidden="true"><GridScan linesColor="#1f2831" scanColor={ACCENT} /></div>
      <TargetCursor cursorColor={ACCENT} />
    </>
  );
}
