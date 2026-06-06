(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // Year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Dark / Light mode
  const themeBtn = $('#theme-toggle');
  const metaTheme = $('#meta-theme');

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      if (metaTheme) metaTheme.content = '#f8f7fc';
    } else {
      root.removeAttribute('data-theme');
      if (metaTheme) metaTheme.content = '#050508';
    }
    localStorage.setItem('portfolio-theme', theme);
  }

  themeBtn?.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  });

  // Profile photo — fallback placeholder kalau belum ada
  const photo = $('#profile-photo');
  const placeholder = $('#photo-placeholder');
  if (photo && placeholder) {
    photo.addEventListener('error', () => {
      photo.hidden = true;
      placeholder.hidden = false;
    });
    photo.addEventListener('load', () => {
      photo.hidden = false;
      placeholder.hidden = true;
    });
  }

  // Smooth scroll
  $$('[data-scroll]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#nav')?.classList.remove('open');
    });
  });

  // Mobile nav
  const nav = $('#nav');
  const toggle = $('#nav-toggle');
  toggle?.addEventListener('click', () => nav?.classList.toggle('open'));

  // Scroll progress + nav state
  const progress = $('#scroll-progress');
  const sections = $$('section[id]');
  const navLinks = $$('.nav-links a');

  function onScroll() {
    const scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress && max > 0) {
      progress.style.width = `${(scrollY / max) * 100}%`;
    }
    nav?.classList.toggle('scrolled', scrollY > 40);

    let current = '';
    sections.forEach((sec) => {
      if (scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal on scroll
  const revealEls = $$('.reveal');
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => revealObs.observe(el));

  // Counter animation
  const counters = $$('[data-count]');
  const countObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.count) || 0;
        const duration = 1400;
        const start = performance.now();

        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * ease);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target + (target >= 75 ? '+' : '');
        }

        requestAnimationFrame(tick);
        countObs.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => countObs.observe(c));

  // Skill bars
  const bars = $$('.bar-fill');
  const barObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const w = entry.target.dataset.width || '0';
        entry.target.style.width = `${w}%`;
        barObs.unobserve(entry.target);
      });
    },
    { threshold: 0.3 }
  );
  bars.forEach((b) => barObs.observe(b));

  // Subtle tilt on project cards (desktop)
  if (window.matchMedia('(hover: hover)').matches) {
    $$('.project-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
})();