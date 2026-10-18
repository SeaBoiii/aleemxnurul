import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/hooks';

export function burstHearts(x: number, y: number, count = 5) {
  window.dispatchEvent(new CustomEvent('love-burst', { detail: { x, y, count } }));
}

export function rainHearts() {
  window.dispatchEvent(new CustomEvent('love-rain'));
}

type Heart = {
  x: number; y: number; vx: number; vy: number;
  age: number; duration: number; size: number;
};

export default function StarField({ active = true }: { active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const heartCanvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    const heartElement = heartCanvas.current;
    const heartContext = heartElement?.getContext('2d');
    if (!element || !ctx || !heartElement || !heartContext) return;

    let width = innerWidth;
    let height = innerHeight;
    let frame = 0;
    let last = 0;
    let visible = true;
    let ambientTime = performance.now();
    let backgroundDirty = true;
    let hearts: Heart[] = [];
    let reducedClear: ReturnType<typeof setTimeout> | undefined;
    let rainInterval: ReturnType<typeof setInterval> | undefined;
    let rainTimeout: ReturnType<typeof setTimeout> | undefined;
    const pointer = { x: 0, y: 0 };
    const stars = Array.from({ length: 170 }, (_, index) => ({
      x: ((index * 73.137) % 100) / 100,
      y: ((index * 31.819) % 100) / 100,
      radius: index % 7 === 0 ? 1.25 : 0.55,
      phase: index * 1.73,
    }));

    // Bake the dense dust once; only the small foreground field twinkles.
    const dust = document.createElement('canvas');
    dust.width = 360;
    dust.height = 720;
    const dustContext = dust.getContext('2d');
    if (!dustContext) return;
    dustContext.save();
    dustContext.translate(180, 360);
    dustContext.rotate(0.57);
    const haze = dustContext.createLinearGradient(-110, 0, 110, 0);
    haze.addColorStop(0, '#f4b6c200');
    haze.addColorStop(0.35, '#d9b47208');
    haze.addColorStop(0.52, '#f4b6c212');
    haze.addColorStop(0.7, '#d9b47207');
    haze.addColorStop(1, '#f4b6c200');
    dustContext.fillStyle = haze;
    dustContext.fillRect(-110, -620, 220, 1240);
    dustContext.restore();
    for (let index = 0; index < 600; index++) {
      const x = (index * 47.83) % 360;
      const y = (index * 131.63) % 720;
      const distance = Math.abs(y - (630 - x * 1.55));
      if (distance >= 70) continue;
      dustContext.globalAlpha = (1 - distance / 70) * 0.19;
      dustContext.fillStyle = index % 3 === 0 ? '#F4B6C2' : '#F1DDB0';
      dustContext.fillRect(x, y, index % 13 === 0 ? 1 : 0.6, 0.6);
    }

    function draw(now: number) {
      if (!ctx || !heartContext || document.hidden) return;
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (visible && !reduced) ambientTime = now;
      if (visible || backgroundDirty) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(dust, reduced ? 0 : Math.sin(ambientTime * 0.00004) * 6, 0, width, height);
        const starCount = width < 768 ? 100 : 170;
        for (let index = 0; index < starCount; index++) {
          const star = stars[index];
          ctx.globalAlpha = reduced ? 0.55 : 0.38 + Math.sin(ambientTime * 0.00045 + star.phase) * 0.22;
          ctx.fillStyle = star.radius > 1 ? '#F1DDB0' : '#c7d5dc';
          ctx.beginPath();
          ctx.arc(star.x * width + pointer.x * star.radius, star.y * height + pointer.y * star.radius, star.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        backgroundDirty = false;
      }
      heartContext.clearRect(0, 0, width, height);
      hearts = hearts.filter((heart) => heart.age < heart.duration);
      for (const heart of hearts) {
        if (!reduced) {
          heart.x += heart.vx * delta;
          heart.y += heart.vy * delta;
          heart.age += delta;
        }
        heartContext.globalAlpha = Math.max(0, Math.min(1, (heart.duration - heart.age) / 0.6));
        heartContext.fillStyle = '#F4B6C2';
        heartContext.font = `${heart.size}px serif`;
        heartContext.fillText('♥', heart.x, heart.y);
      }
      heartContext.globalAlpha = 1;
    }

    function tick(now: number) {
      frame = 0;
      if (document.hidden) return;
      draw(now);
      // Ambient movement pauses below the sky; user-triggered hearts may finish there.
      if (!reduced && active && (visible || hearts.length > 0)) frame = requestAnimationFrame(tick);
    }

    function start() {
      if (frame || document.hidden) return;
      last = 0;
      if (!reduced && active && (visible || hearts.length > 0)) frame = requestAnimationFrame(tick);
      else draw(performance.now());
    }

    function resize() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      width = innerWidth;
      height = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      element!.width = width * dpr;
      element!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      heartElement!.width = width * dpr;
      heartElement!.height = height * dpr;
      heartContext!.setTransform(dpr, 0, 0, dpr, 0, 0);
      backgroundDirty = true;
      draw(performance.now());
      start();
    }

    function onBurst(event: Event) {
      const { x, y, count = 5 } = (event as CustomEvent<{ x: number; y: number; count?: number }>).detail;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const quantity = Math.min(Math.max(0, Math.floor(count)), 40 - hearts.length);
      for (let index = 0; index < quantity; index++) {
        hearts.push({
          x: x + (reduced ? (Math.random() - 0.5) * 65 : 0),
          y: y + (reduced ? (Math.random() - 0.5) * 40 : 0),
          vx: (Math.random() - 0.5) * 162,
          vy: -66 - Math.random() * 120,
          age: 0, duration: 1.4, size: 10 + Math.random() * 11,
        });
      }
      if (reduced) {
        clearTimeout(reducedClear);
        draw(performance.now());
        reducedClear = setTimeout(() => { hearts = []; draw(performance.now()); }, 600);
      } else start();
    }

    function onRain() {
      if (reduced) {
        onBurst(new CustomEvent('love-burst', { detail: { x: width / 2, y: height / 2, count: 12 } }));
        return;
      }
      clearInterval(rainInterval);
      clearTimeout(rainTimeout);
      const endsAt = performance.now() + 4000;
      const spawn = () => {
        if (document.hidden || hearts.length >= 40) return;
        hearts.push({
          x: Math.random() * width, y: -20,
          vx: (Math.random() - 0.5) * 36, vy: 144 + Math.random() * 120,
          age: 0, duration: Math.max(0.1, (endsAt - performance.now()) / 1000),
          size: 13 + Math.random() * 12,
        });
        start();
      };
      spawn();
      rainInterval = setInterval(spawn, 90);
      rainTimeout = setTimeout(() => clearInterval(rainInterval), 4000);
    }

    function onPointer(event: PointerEvent) {
      if (reduced || !visible) return;
      pointer.x = (event.clientX / width - 0.5) * 7;
      pointer.y = (event.clientY / height - 0.5) * 7;
    }

    function onGyro(event: DeviceOrientationEvent) {
      if (reduced || !visible) return;
      pointer.x = Math.max(-4, Math.min(4, (event.gamma || 0) * 0.12));
      pointer.y = Math.max(-4, Math.min(4, (event.beta || 0) * 0.08));
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && hearts.length === 0) { cancelAnimationFrame(frame); frame = 0; }
      start();
    });
    const watchSky = () => {
      const sky = document.querySelector('.sky');
      if (!sky) return false;
      observer.observe(sky);
      return true;
    };
    const insertionObserver = new MutationObserver(() => {
      if (watchSky()) insertionObserver.disconnect();
    });
    if (!watchSky()) insertionObserver.observe(document.body, { childList: true, subtree: true });

    function onVisibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else start();
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onGyro);
    window.addEventListener('love-burst', onBurst);
    window.addEventListener('love-rain', onRain);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(reducedClear);
      clearInterval(rainInterval);
      clearTimeout(rainTimeout);
      observer.disconnect();
      insertionObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onGyro);
      window.removeEventListener('love-burst', onBurst);
      window.removeEventListener('love-rain', onRain);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced, active]);

  return <>
    <canvas ref={canvas} className="starfield" aria-hidden="true" />
    <canvas ref={heartCanvas} className="heartfield" aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }} />
  </>;
}
