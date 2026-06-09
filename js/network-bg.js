(function () {
  'use strict';

  const canvas = document.getElementById('network-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let atoms = [];
  let bonds = [];
  let rings = [];
  let sparks = [];
  let drift = 0;
  let mouse = { x: 0.5, y: 0.5 };
  let animId = 0;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PALETTE = {
    dark: {
      bg0: '#010409',
      bg1: '#04101f',
      bg2: '#0c1a33',
      atomA: '#22d3ee',
      atomB: '#a78bfa',
      atomC: '#38bdf8',
      atomCore: '#f0f9ff',
      bond: 'rgba(34, 211, 238, 0.22)',
      bondHot: 'rgba(167, 139, 250, 0.55)',
      glow: 'rgba(56, 189, 248, 0.14)',
      ring: 'rgba(129, 140, 248, 0.2)',
      spark: '#67e8f9'
    },
    light: {
      bg0: '#e8f4fc',
      bg1: '#dbeafe',
      bg2: '#c7d2fe',
      atomA: '#0284c7',
      atomB: '#7c3aed',
      atomC: '#0ea5e9',
      atomCore: '#ffffff',
      bond: 'rgba(2, 132, 199, 0.2)',
      bondHot: 'rgba(124, 58, 237, 0.4)',
      glow: 'rgba(14, 165, 233, 0.12)',
      ring: 'rgba(99, 102, 241, 0.18)',
      spark: '#0369a1'
    }
  };

  function colors() {
    return document.documentElement.getAttribute('data-theme') === 'light'
      ? PALETTE.light
      : PALETTE.dark;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function makeRing(cx, cy, radius, speed) {
    const nodes = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n;
      nodes.push({
        ox: Math.cos(ang) * radius,
        oy: Math.sin(ang) * radius,
        phase: Math.random() * Math.PI * 2
      });
    }
    return { cx, cy, radius, speed, angle: Math.random() * Math.PI * 2, nodes };
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    drift = 0;

    const count = Math.min(48, Math.max(20, Math.floor((w * h) / 32000)));
    atoms = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: rand(-0.12, 0.12),
      vy: rand(-0.12, 0.12),
      r: rand(2.2, 4.2),
      hue: i % 3,
      phase: Math.random() * Math.PI * 2,
      orbit: rand(8, 18),
      hub: i < 7
    }));

    bonds = [];
    rings = [
      makeRing(w * 0.18, h * 0.28, rand(36, 52), 0.0012),
      makeRing(w * 0.78, h * 0.62, rand(42, 58), -0.001),
      makeRing(w * 0.55, h * 0.18, rand(28, 40), 0.0016),
      makeRing(w * 0.32, h * 0.72, rand(34, 46), -0.0014)
    ];
    sparks = [];
  }

  function drawAurora(c) {
    const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, c.bg2);
    g.addColorStop(0.45, c.bg1);
    g.addColorStop(1, c.bg0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.82, h * 0.78, 0, w * 0.82, h * 0.78, w * 0.55);
    g2.addColorStop(0, 'rgba(167, 139, 250, 0.12)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    const g3 = ctx.createRadialGradient(w * 0.12, h * 0.85, 0, w * 0.12, h * 0.85, w * 0.4);
    g3.addColorStop(0, 'rgba(34, 211, 238, 0.1)');
    g3.addColorStop(1, 'transparent');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);
  }

  function atomColor(c, hue) {
    if (hue === 1) return c.atomB;
    if (hue === 2) return c.atomC;
    return c.atomA;
  }

  function drawRing(ring, c) {
    if (!prefersReduced) ring.angle += ring.speed;

    const parX = (mouse.x - 0.5) * 18;
    const parY = (mouse.y - 0.5) * 18;
    const cx = ring.cx + parX;
    const cy = ring.cy + parY;
    const cos = Math.cos(ring.angle);
    const sin = Math.sin(ring.angle);
    const pts = [];

    for (const n of ring.nodes) {
      const rx = n.ox * cos - n.oy * sin;
      const ry = n.ox * sin + n.oy * cos;
      const x = cx + rx;
      const y = cy + ry;
      pts.push({ x, y, phase: n.phase });
    }

    ctx.strokeStyle = c.ring;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      const bulge = 6 + Math.sin(drift * 0.02 + i) * 2;
      if (i === 0) ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(mx + bulge * 0.15, my - bulge * 0.15, q.x, q.y);
    }
    ctx.closePath();
    ctx.stroke();

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const col = i % 2 === 0 ? c.atomA : c.atomB;
      const pulse = 0.9 + Math.sin(drift * 0.04 + p.phase) * 0.1;

      ctx.beginPath();
      ctx.fillStyle = c.glow;
      ctx.arc(p.x, p.y, 10 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.arc(p.x, p.y, 3.2 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = c.atomCore;
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function spawnSpark(ax, ay, bx, by) {
    if (sparks.length > 36) return;
    sparks.push({
      ax, ay, bx, by,
      t: 0,
      speed: rand(0.006, 0.014)
    });
  }

  function draw() {
    const c = colors();
    drawAurora(c);
    if (!prefersReduced) drift += 1;

    const parX = (mouse.x - 0.5) * 24;
    const parY = (mouse.y - 0.5) * 24;

    for (const ring of rings) drawRing(ring, c);

    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      if (!prefersReduced) {
        a.x += a.vx;
        a.y += a.vy;
        a.phase += 0.018;
        if (a.x < -20 || a.x > w + 20) a.vx *= -1;
        if (a.y < -20 || a.y > h + 20) a.vy *= -1;
      }

      for (let j = i + 1; j < atoms.length; j++) {
        const b = atoms[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        const max = a.hub || b.hub ? 190 : 125;
        if (dist < max) {
          const alpha = 1 - dist / max;
          ctx.beginPath();
          ctx.strokeStyle = a.hub || b.hub ? c.bondHot : c.bond;
          ctx.globalAlpha = alpha * 0.9;
          ctx.lineWidth = a.hub || b.hub ? 1.4 : 0.7;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (!prefersReduced && Math.random() < 0.0015) spawnSpark(a.x, a.y, b.x, b.y);
        }
      }
    }

    for (const s of sparks) {
      if (!prefersReduced) s.t += s.speed;
      if (s.t >= 1) continue;
      const px = s.ax + (s.bx - s.ax) * s.t;
      const py = s.ay + (s.by - s.ay) * s.t;
      ctx.beginPath();
      ctx.fillStyle = c.spark;
      ctx.globalAlpha = 1 - s.t;
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sparks = sparks.filter((s) => s.t < 1);

    for (const a of atoms) {
      const col = atomColor(c, a.hue);
      const pulse = 0.88 + Math.sin(a.phase) * 0.12;
      const x = a.x + parX * (a.hub ? 0.08 : 0.03);
      const y = a.y + parY * (a.hub ? 0.08 : 0.03);

      ctx.beginPath();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.8;
      ctx.ellipse(x, y, a.orbit * pulse, a.orbit * 0.45 * pulse, a.phase * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.fillStyle = c.glow;
      ctx.arc(x, y, a.r * 5.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.arc(x, y, a.r * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = c.atomCore;
      ctx.arc(x, y, a.r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  draw();

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX / Math.max(1, w);
    mouse.y = e.clientY / Math.max(1, h);
  }, { passive: true });

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    cancelAnimationFrame(animId);
    draw();
  });
})();