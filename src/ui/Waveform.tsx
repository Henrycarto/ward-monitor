/**
 * Live pulse waveform at the patient's current rate. The pulse shape is the one used to test
 * the pulse-monitor firmware: a systolic peak and a smaller dicrotic wave per beat.
 * A sweep bar redraws left to right, the way bedside monitors do.
 */
import { useEffect, useRef } from 'react';

export function Waveform({ bpm, running, theme }: { bpm: number; running: boolean; theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const still = reduced || !running;
    const dpr = window.devicePixelRatio || 1;
    const secondsOnScreen = 6;
    let w = 0;
    let h = 0;
    let ys = new Float32Array(1);
    let phase = 0; // position within the current beat, 0..1
    let x = 0;
    const pulse = (ph: number) => Math.exp(-0.5 * ((ph - 0.18) / 0.045) ** 2) + 0.38 * Math.exp(-0.5 * ((ph - 0.42) / 0.06) ** 2);
    const css = getComputedStyle(canvas);
    const brand = css.getPropertyValue('--brand').trim() || '#53057f';
    const rule = css.getPropertyValue('--rule').trim() || '#e9e5ef';

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 0.5);
      ctx.lineTo(w, h - 0.5);
      ctx.stroke();
      ctx.strokeStyle = brand;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < ys.length; i++) {
        if (Math.abs(i - x) < 14) {
          ctx.stroke();
          ctx.beginPath();
          continue;
        }
        const yy = h - 8 - ys[i] * (h - 20);
        if (i === 0 || Math.abs(i - x) === 14) ctx.moveTo(i, yy);
        else ctx.lineTo(i, yy);
      }
      ctx.stroke();
    };

    const advance = (dt: number) => {
      const pxPerSec = ys.length / secondsOnScreen;
      const n = Math.max(1, Math.round(dt * pxPerSec));
      for (let k = 0; k < n; k++) {
        phase += bpmRef.current / 60 / pxPerSec;
        if (phase >= 1) phase -= 1;
        ys[Math.floor(x)] = pulse(phase);
        x = (x + 1) % ys.length;
      }
    };

    // Size the canvas to its box. On a phone the patient view is hidden until it is opened,
    // so the first measurement can be zero; the observer below measures again once it shows.
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(1, Math.ceil(w));
      if (n !== ys.length) {
        ys = new Float32Array(n);
        x = 0;
        // fill one screen of trace first, so the monitor never opens on a flat line
        for (let i = 0; i < n; i++) advance(secondsOnScreen / n);
        if (still) x = -100;
      }
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (still) return () => observer.disconnect();

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      advance(Math.min(0.1, (t - last) / 1000));
      last = t;
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [running, theme]);

  return <canvas ref={ref} aria-hidden="true" />;
}
