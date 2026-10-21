/* Studio Impacto · site.js
   Tudo aqui acrescenta movimento a uma página que já está completa sem script. */
(() => {
  'use strict';

  /* Contato: preencha o número do WhatsApp (só dígitos, com DDI e DDD, ex.: 5534999999999).
     Enquanto estiver vazio, os botões de WhatsApp levam para a página do diagnóstico. */
  const CONTACT = { whatsapp: '', email: 'contato@studioimpacto.com.br' };

  const html = document.documentElement;
  const mq = (q) => window.matchMedia(q).matches;
  const reduce = mq('(prefers-reduced-motion: reduce)');
  const fine = mq('(hover: hover) and (pointer: fine)');
  const phone = () => mq('(max-width: 767px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const hasGsap = () => !!(window.gsap && window.ScrollTrigger);
  // espera a Foun e a Instrument Sans de fato carregarem (document.fonts.ready resolve cedo se nenhuma fonte foi pedida ainda)
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([Promise.all([document.fonts.load('400 1em Foun'), document.fonts.load('400 1em "Instrument Sans"')]).then(() => document.fonts.ready).catch(() => {}), new Promise((r) => setTimeout(r, 3000))])
    : Promise.resolve();

  /* ---------- WhatsApp e e-mail ---------- */
  const waLink = (text) => CONTACT.whatsapp ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}` : null;
  $$('[data-wa]').forEach((a) => {
    const href = waLink('Oi! Vim pelo site do Studio Impacto e quero falar sobre a minha marca.');
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }
  });

  /* ---------- rolagem suave (Lenis), só com mouse e sem redução de movimento ---------- */
  let lenis = null;
  function startSmooth() {
    if (lenis || reduce || !fine || !window.Lenis || !hasGsap()) return;
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true, anchors: { offset: -72 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    html.classList.add('is-smooth');
  }
  const scrollToY = (y) => { if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); };
  $$('[data-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); scrollToY(0); const t = $('#conteudo'); if (t) t.focus({ preventScroll: true }); }));

  /* ---------- cabeçalho: cor do capítulo e esconder ao descer ---------- */
  const header = $('[data-header]');
  const inked = $$('[data-ink]').filter((el) => !el.closest('[data-header]') && !el.classList.contains('menu-sheet'));
  const hero = $('.hero');
  const inkMap = { dark: 'dark', graphite: 'graphite', light: 'light', mist: 'mist', orange: 'orange', ember: 'ember' };
  const inkOf = (el) => {
    if (el.classList.contains('f-grafite')) return 'graphite';
    if (el.classList.contains('f-nevoa')) return 'mist';
    if (el.classList.contains('f-brasa')) return 'ember';
    return inkMap[el.dataset.ink] || 'dark';
  };
  let lastY = window.scrollY, menuOpen = false;
  function updateHeader() {
    if (!header) return;
    const hb = header.getBoundingClientRect().bottom || 64;
    const y = hb - 2;
    let cur = null;
    for (const s of inked) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = s; }
    let ink = cur ? inkOf(cur) : 'dark';
    if (cur && cur === hero) {
      const st = hero.querySelector('.hero__stage').getBoundingClientRect();
      const seam = parseFloat(getComputedStyle(hero).getPropertyValue('--seam')) / 100;
      ink = st.top + seam * st.height <= y ? 'orange' : 'dark';
    }
    const sy = window.scrollY;
    // um salto grande (âncora, tecla Home/End) troca a cor na hora, sem transição
    if (!menuOpen && header.dataset.ink !== ink) {
      const jump = Math.abs(sy - lastY) > innerHeight * 0.75;
      if (jump) header.classList.add('no-tr');
      header.dataset.ink = ink;
      if (jump) requestAnimationFrame(() => requestAnimationFrame(() => header.classList.remove('no-tr')));
    }
    const down = sy > lastY + 4, up = sy < lastY - 4;
    if (!menuOpen && sy > 140 && down) header.classList.add('is-hidden');
    else if (up || sy <= 140) header.classList.remove('is-hidden');
    if (Math.abs(sy - lastY) > 4) lastY = sy;
  }
  let hTick = false;
  window.addEventListener('scroll', () => { if (!hTick) { hTick = true; requestAnimationFrame(() => { updateHeader(); hTick = false; }); } }, { passive: true });
  header && header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------- menu (telefone) ---------- */
  const menuBtn = $('.menu-btn'), sheet = $('#menu');
  function setMenu(open) {
    if (!sheet || !menuBtn) return;
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      sheet.hidden = false; sheet.classList.add('is-open');
      $$('li', sheet).forEach((li, i) => li.style.setProperty('--i', i));
      header.dataset.ink = 'dark'; header.classList.remove('is-hidden');
      document.body.style.overflow = 'hidden'; if (lenis) lenis.stop();
      const cur = $$('a', sheet).find((a) => a.getAttribute('href') === location.pathname);
      if (cur) cur.setAttribute('aria-current', 'page');
      const first = $('a', sheet); if (first) first.focus();
    } else {
      sheet.classList.remove('is-open'); sheet.hidden = true;
      document.body.style.overflow = ''; if (lenis) lenis.start();
      updateHeader();
    }
  }
  if (menuBtn && sheet) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
    window.addEventListener('resize', () => { if (menuOpen && !phone()) setMenu(false); });
  }

  /* ---------- botões: o ponto cresce de onde o ponteiro entrou ---------- */
  if (fine) document.addEventListener('pointerover', (e) => {
    const b = e.target.closest('.btn'); if (!b || b.contains(e.relatedTarget)) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--bx', (e.clientX - r.left) + 'px');
    b.style.setProperty('--by', (e.clientY - r.top) + 'px');
    b.style.setProperty('--bs', Math.ceil((Math.hypot(r.width, r.height) * 2) / 12) + 1);
  });

  /* ---------- entradas ----------
     Uma peça só se esconde ("arma") quando está chegando perto da tela e volta a aparecer se sair dessa faixa
     sem ter entrado: quem pula direto para um trecho (âncora, tecla End, rolagem rápida) nunca encontra buraco. */
  const hasIO = 'IntersectionObserver' in window;
  const onIn = new WeakMap();
  const showIO = hasIO ? new IntersectionObserver((ents) => {
    for (const e of ents) {
      if (!e.isIntersecting) continue;
      const el = e.target; showIO.unobserve(el); armIO.unobserve(el);
      el.classList.add('is-in');
      const f = onIn.get(el); if (f) f(el);
      if (el.closest('.intro')) setTimeout(cutIntro, 1000);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 }) : null;
  const armIO = hasIO ? new IntersectionObserver((ents) => {
    for (const e of ents) {
      const el = e.target; if (el.classList.contains('is-in')) continue;
      if (e.isIntersecting) { el.classList.add('is-armed'); showIO.observe(el); }
      else if (el.classList.contains('is-armed')) { el.classList.remove('is-armed'); showIO.unobserve(el); }
    }
  }, { rootMargin: '0px 0px 60% 0px', threshold: 0 }) : null;
  const reveal = (el, f) => {
    if (f) onIn.set(el, f);
    if (hasIO && !reduce) armIO.observe(el); else { el.classList.add('is-in'); if (f) f(el); }
  };
  const unwatch = (el) => { if (!hasIO) return; armIO.unobserve(el); showIO.unobserve(el); el.classList.remove('is-armed'); };
  $$('[data-rise], [data-open], .preco__sentence').forEach((el) => reveal(el));

  /* títulos que sobem linha por linha */
  function splitLines() {
    const els = $$('[data-lines]');
    if (!els.length || reduce || !hasIO) return;
    const restore = (el) => { el.textContent = el.dataset.text; el.classList.remove('is-split', 'is-in'); };
    const split = (el) => {
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      el.dataset.text = text; el.setAttribute('aria-label', text); el.textContent = '';
      const words = text.split(' ').map((w) => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = w; el.append(s, ' '); return s; });
      const lines = [];
      for (const w of words) { const last = lines[lines.length - 1]; if (last && Math.abs(last.top - w.offsetTop) < 4) last.words.push(w.textContent); else lines.push({ top: w.offsetTop, words: [w.textContent] }); }
      el.textContent = '';
      lines.forEach((ln, i) => { const m = document.createElement('span'); const inner = document.createElement('span'); m.className = 'line'; m.setAttribute('aria-hidden', 'true'); inner.style.setProperty('--i', i); inner.textContent = ln.words.join(' '); m.append(inner); el.append(m, ' '); });
      el.classList.add('is-split');
    };
    const done = (el) => {
      const last = el.querySelector('.line:last-of-type > span');
      if (last) last.addEventListener('transitionend', () => { restore(el); el.removeAttribute('aria-label'); }, { once: true });
    };
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) return; // já está na tela: fica como está
      split(el); reveal(el, done);
    });
    let w = innerWidth;
    addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; els.filter((el) => el.matches('.is-split:not(.is-in)')).forEach((el) => { unwatch(el); restore(el); }); });
  }

  /* números que rolam */
  function rollFigures() {
    const els = $$('[data-roll]'); if (!els.length) return;
    els.forEach((el) => {
      const value = el.textContent.trim();
      const shown = document.createElement('span'); shown.className = 'roll__digits'; shown.setAttribute('aria-hidden', 'true');
      let i = 0;
      for (const ch of value) {
        if (!/\d/.test(ch)) { shown.append(ch); continue; }
        const col = document.createElement('span'); col.className = 'roll__col';
        const strip = document.createElement('span'); strip.className = 'roll__strip';
        strip.style.setProperty('--d', ch); strip.style.setProperty('--i', i++);
        for (let n = 0; n < 10; n++) { const s = document.createElement('span'); s.textContent = n; strip.append(s); }
        col.append(strip); shown.append(col);
      }
      el.classList.add('roll'); el.replaceChildren(shown);
    });
    els.forEach((el) => reveal(el));
  }

  /* ---------- entrelinha que respeita o acento ----------
     A Foun em caixa-alta com entrelinha apertada faz o til, o circunflexo e o agudo da linha de baixo
     sumirem dentro da letra de cima (NÃO vira NAO). Onde um acento cai embaixo de uma letra, a entrelinha
     daquele título abre só o necessário; a cedilha faz o mesmo com a linha de baixo. */
  const ACC_TOP = { 'Á': 1.064, 'À': 1.149, 'Â': 1.082, 'Ã': 1.055, 'É': 1.061, 'Ê': 1.09, 'Í': 1.057, 'Ó': 1.075, 'Ô': 1.086, 'Õ': 1.005, 'Ú': 1.075 };
  const CEDILHA = 0.862 + 0.139;
  const LEAD_SEL = 'h1, h2, h3, .names, .vocab__list, .preco__sentence, .row__title, .menu-sheet__nav a, .footer__mail, .front__name, .menu__name, .nm, [data-ui] p, [data-ui] b';
  function accentLeading(root) {
    const els = root ? [...root.querySelectorAll(LEAD_SEL)] : $$(LEAD_SEL);
    for (const el of els) {
      if (!/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(el.textContent)) continue;
      el.style.removeProperty('line-height');
      const cs = getComputedStyle(el);
      if (!/Foun/i.test(cs.fontFamily) || cs.textTransform !== 'uppercase') continue;
      const fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) / fs || 1;
      const chars = [], range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.parentElement.closest('.sr-only, .cut--paper')) continue;
        const t = n.nodeValue;
        for (let i = 0; i < t.length; i++) {
          if (/\s/.test(t[i])) continue;
          range.setStart(n, i); range.setEnd(n, i + 1);
          const r = range.getBoundingClientRect(); if (!r.width) continue;
          chars.push({ c: t[i].toUpperCase(), l: r.left, r: r.right, t: r.top });
        }
      }
      if (chars.length < 2) continue;
      chars.sort((a, b) => a.t - b.t);
      const lines = [];
      for (const ch of chars) { const last = lines[lines.length - 1]; if (last && Math.abs(ch.t - last.t) < fs * 0.3) last.cs.push(ch); else lines.push({ t: ch.t, cs: [ch] }); }
      if (lines.length < 2) continue;
      const over = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1;
      let need = 0;
      lines.forEach((ln, i) => {
        for (const ch of ln.cs) {
          if (i > 0 && ACC_TOP[ch.c] && lines[i - 1].cs.some((up) => over(up, ch))) need = Math.max(need, ACC_TOP[ch.c] + 0.03);
          if (i < lines.length - 1 && ch.c === 'Ç' && lines[i + 1].cs.some((dn) => over(dn, ch))) need = Math.max(need, CEDILHA + 0.03);
        }
      });
      if (need > lh) el.style.lineHeight = need.toFixed(3);
    }
  }

  /* ---------- texto do rodapé ajustado à largura ---------- */
  function fitText() {
    $$('[data-fit]').forEach((el) => {
      const box = el.parentElement.getBoundingClientRect().width - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
      el.style.fontSize = '100px';
      const spans = $$('span', el);
      const w = Math.max(...spans.map((s) => s.getBoundingClientRect().width));
      if (w > 0) el.style.fontSize = Math.min(240, Math.floor((100 * box) / w * 0.995)) + 'px';
    });
  }

  /* ---------- intro: a segunda linha do título atravessa a imagem ---------- */
  function cutIntro() {
    const l2 = $('.intro__l2'), pic = $('.intro__pic'), paper = $('.cut--paper');
    if (!l2 || !pic || !paper) return;
    const a = l2.getBoundingClientRect(), b = pic.getBoundingClientRect();
    // valores negativos deixam o recorte passar da caixa da linha: acentos e cedilha também trocam de cor sobre a imagem
    const t = b.top - a.top, l = b.left - a.left, r = a.right - b.right, bo = a.bottom - b.bottom;
    paper.style.setProperty('--cut-clip', `inset(${t}px ${r}px ${bo}px ${l}px)`);
  }

  /* ---------- herói: do ponto ao impacto ---------- */
  const heroScene = { view: null, slot: null, rect: null, W: 0, H: 0, p: 0, open: reduce ? 1 : 0 };
  function heroMeasure() {
    if (!hero) return;
    const stage = $('.hero__stage', hero), slot = $('.hero__ink .slot', hero);
    const s = stage.getBoundingClientRect(), r = slot.getBoundingClientRect();
    heroScene.W = s.width; heroScene.H = s.height;
    // a posição do slot no palco não depende da rolagem (o palco é fixo durante a cena)
    heroScene.rect = { x: r.left - s.left, y: r.top - s.top - (parseFloat(getComputedStyle(slot.closest('.hl__in')).transform.split(',')[5]) || 0), w: r.width, h: r.height };
    heroDraw(heroScene.p);
  }
  function heroDraw(p) {
    const v = heroScene.view; if (!v || !heroScene.rect) return;
    const { W, H, rect: R } = heroScene;
    const t = ease(clamp(p / 0.86));
    const fx = lerp(R.x, 0, t), fy = lerp(R.y, 0, t), fw = lerp(R.w, W, t), fh = lerp(R.h, H, t);
    const seamFrac = (parseFloat(getComputedStyle(hero).getPropertyValue('--seam-rest')) || 56) / 100;
    const seam = lerp(seamFrac, -0.02, smooth(0.08, 0.8, p));
    const maxR = Math.hypot(W, H) * 0.75;
    const r0 = 0.38 * fh;
    const r = lerp(r0, maxR, Math.pow(smooth(0.42, 1, p), 1.6));
    v.set({
      top: 'preto', bottom: 'laranja', seamPx: seam * H,
      dotPx: [fx + fw * 0.5, fy + fh * 0.5], rPx: r,
      x0Px: fx + fw * 0.5, x1Px: fx + fw,
      fw: lerp(Math.max(9, R.h * 0.13), 48, t), mag: 1.7, glow: lerp(0.45, 0.25, t), edge: true, soft: lerp(0.8, 1.6, t),
      hi: 0.11, shade: 0.36, scissor: [fx - 2, fy - 2, fw + 4, fh + 4],
    });
    const c = v.canvas;
    // abertura no carregamento: o quadro nasce do centro do slot
    const o = ease(clamp(heroScene.open));
    const cx = fx + fw / 2, cy = fy + fh / 2;
    const ow = p > 0 ? fw : fw * o, oh = p > 0 ? fh : fh * lerp(0.12, 1, o);
    c.style.clipPath = `inset(${(cy - oh / 2).toFixed(2)}px ${(W - cx - ow / 2).toFixed(2)}px ${(H - cy - oh / 2).toFixed(2)}px ${(cx - ow / 2).toFixed(2)}px round ${p > 0 ? 0 : (1 - o) * 999}px)`;
    if (p > 0) hero.style.setProperty('--seam', (seam * 100).toFixed(3) + '%'); else hero.style.removeProperty('--seam');
    const lead = $('.hero__lead', hero); if (lead) lead.style.opacity = String(1 - clamp(p / 0.22));
    // a primeira linha (com o ponto) sai por cima; IMPACTO fica e cresce um pouco no centro
    const k1 = smooth(0.14, 0.6, p), k2 = smooth(0.2, 0.9, p);
    hero.style.setProperty('--l1y', (-k1 * 130).toFixed(2) + '%');
    hero.style.setProperty('--l1o', (1 - smooth(0.2, 0.55, p)).toFixed(3));
    hero.style.setProperty('--l2y', (-k2 * 62).toFixed(2) + '%');
    hero.style.setProperty('--l2s', (1 + k2 * 0.18).toFixed(4));
  }
  function setupHero() {
    if (!hero) return;
    const cv = $('.hero__glass', hero);
    heroScene.view = window.Glass ? window.Glass.create(cv, { drift: 7 }) : null;
    if (!heroScene.view) { hero.classList.add('no-gl'); return; }
    heroScene.view.pointer($('.hero__stage', hero), { phase: 36, dot: 0 });
    if (heroScene.open < 1) {
      const t0 = performance.now() + 260, dur = 900;
      const step = (now) => { heroScene.open = clamp((now - t0) / dur); heroDraw(heroScene.p); if (heroScene.open < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    heroScene.view.onresize = () => { heroMeasure(); };
    fontsReady.then(() => { heroMeasure(); setTimeout(heroMeasure, 1200); });
    addEventListener('resize', () => { heroMeasure(); });
  }

  /* ---------- cenas com GSAP ---------- */
  function liveScene(root, hold, onUpdate, phoneHold) {
    if (!hasGsap() || reduce) { root.classList.add('is-rest'); return null; }
    const mm = gsap.matchMedia();
    mm.add({ phone: '(max-width: 767px)', any: 'all' }, (c) => {
      const h = c.conditions.phone ? (phoneHold ?? hold) : hold;
      if (!h) { root.classList.add('is-rest'); return () => root.classList.remove('is-rest'); }
      root.classList.remove('is-rest'); root.classList.add('is-live'); root.style.setProperty('--hold', h);
      const st = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', onUpdate: (self) => onUpdate(self.progress), onRefresh: (self) => onUpdate(self.progress) });
      return () => { st.kill(); root.classList.remove('is-live'); root.style.removeProperty('--hold'); onUpdate(0); };
    });
    return mm;
  }

  function setupDistances() {
    const root = $('.dist'); if (!root) return;
    const cv = $('.dist__frame canvas', root);
    const view = window.Glass ? window.Glass.create(cv) : null;
    const words = $$('.w', root), steps = $$('.dist__steps li', root), count = $('[data-count]', root);
    const zooms = [{ z: 1, x: 0.5, y: 0.5 }, { z: 1.9, x: 0.5, y: 0.5 }, { z: 3.7, x: 0.6, y: 0.44 }];
    const cam = { z: 1, x: 0.5, y: 0.5 };
    let cur = -1, tw = null;
    const show = (i) => {
      if (i === cur) return; cur = i;
      words.forEach((w, k) => w.classList.toggle('is-on', k <= i));
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      if (count) count.textContent = String(i + 1);
      if (!view) return;
      const to = zooms[i];
      if (tw) tw.kill();
      if (window.gsap && !reduce) tw = gsap.to(cam, { z: to.z, x: to.x, y: to.y, duration: 0.8, ease: 'power3.inOut', onUpdate: () => view.set({ zoom: cam.z, zx: cam.x, zy: cam.y }) });
      else view.set({ zoom: to.z, zx: to.x, zy: to.y });
    };
    const mm = liveScene(root, 2, (p) => show(Math.min(2, Math.floor(p * 3))), 2);
    if (!mm) { words.forEach((w) => w.classList.add('is-on')); steps.forEach((s) => s.classList.add('is-on')); }
    else show(0);
  }

  /* ---------- método: o ponto desce a escada ---------- */
  function setupStair() {
    const stair = $('[data-stair]'); if (!stair) return;
    const steps = $$('.stair__step', stair), dot = $('.stair__dot', stair);
    if (!hasGsap() || reduce) { steps.forEach((s) => s.classList.add('is-lit')); return; }
    stair.classList.add('is-live');
    let pts = [];
    const measure = () => {
      const base = stair.getBoundingClientRect();
      const ds = dot.getBoundingClientRect().width || 20;
      // o ponto fica no canto superior direito de cada palavra, como uma notificação
      pts = steps.map((s) => { const rg = document.createRange(); rg.selectNodeContents($('.stair__word', s)); const w = rg.getBoundingClientRect(); return [w.right - base.left + ds * 0.3, w.top - base.top + w.height * 0.06]; });
    };
    const place = (p) => {
      if (!pts.length) return;
      const n = pts.length - 1, f = clamp(p) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
      const a = pts[i], b = pts[Math.min(n, i + 1)];
      const hop = Math.sin(Math.PI * k) * Math.min(70, Math.abs(b[1] - a[1]) * 0.5 + 24);
      dot.style.setProperty('--dx', lerp(a[0], b[0], k).toFixed(1) + 'px');
      dot.style.setProperty('--dy', (lerp(a[1], b[1], k) - hop).toFixed(1) + 'px');
      steps.forEach((s, j) => s.classList.toggle('is-lit', j <= Math.round(f)));
    };
    measure();
    ScrollTrigger.create({ trigger: stair, start: 'top 72%', end: 'bottom 62%', scrub: true, onUpdate: (self) => place(self.progress), onRefresh: (self) => { measure(); place(self.progress); } });
    place(0);
  }

  /* ---------- de onde viemos ---------- */
  function setupNames() {
    const root = $('[data-names]'); if (!root) return;
    const btns = $$('.nm-btn', root), type = $('[data-name-type]'), desc = $('[data-name-desc]');
    const pick = (b) => {
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      if (type) type.textContent = b.dataset.type; if (desc) desc.textContent = b.dataset.desc;
    };
    btns.forEach((b) => { b.addEventListener('click', () => pick(b)); if (fine) b.addEventListener('pointerenter', () => pick(b)); b.addEventListener('focus', () => pick(b)); });
  }

  /* ---------- uma ideia, todos os canais ---------- */
  const SEG = {
    empresa: { site: 'Atendimento sob medida, perto de você.', post: 'Agenda aberta.', story: 'Toque e agende', cta: 'Fale no WhatsApp', ad: 'Atendimento sob medida', wa: 'Oi! Vi sua mensagem e já separei um horário para você.', board: 'Atendimento sob medida' },
    clinica: { site: 'Cuidado de verdade, do primeiro contato à consulta.', post: 'Agende sua avaliação.', story: 'Toque e agende sua avaliação', cta: 'Agendar avaliação', ad: 'Agende sua avaliação', wa: 'Oi! Já separei um horário para a sua avaliação. Pode ser quinta?', board: 'Agende sua avaliação' },
    restaurante: { site: 'Mesa reservada em dois toques.', post: 'Hoje tem.', story: 'Reserve sua mesa', cta: 'Reservar mesa', ad: 'Reserve sua mesa', wa: 'Oi! Sua mesa para hoje está reservada. Até mais tarde!', board: 'Reserve sua mesa' },
    artista: { site: 'Agenda, vídeos e contato para contratantes.', post: 'Agenda aberta para shows.', story: 'Contrate o show', cta: 'Contratar show', ad: 'Agenda de shows aberta', wa: 'Oi! Te mando o rider e a proposta do show por aqui?', board: 'Ao vivo. Agenda aberta' },
  };
  function setupLab() {
    const lab = $('[data-lab]'); if (!lab) return;
    const input = $('#lab-nome', lab), outs = $('.outs', lab), form = $('.lab__form', lab);
    const cv = $('.lab__glass canvas', lab);
    const view = window.Glass ? window.Glass.create(cv) : null;
    if (view) view.pointer($('.lab__glass', lab), { phase: 30, dot: 16 });
    const go = $('[data-lab-go]', lab);
    const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    let seg = 'empresa', name = '', pulseT = 0;
    const render = (pulse) => {
      const shown = name.trim() || 'Sua marca';
      $$('[data-name]', outs).forEach((el) => { el.textContent = shown; });
      $$('[data-name-t]', outs).forEach((el) => { el.textContent = shown; });
      $$('[data-slug]', outs).forEach((el) => { el.textContent = (slugify(shown) || 'suamarca') + '.com.br'; });
      const copy = SEG[seg] || SEG.empresa;
      $$('[data-copy]', outs).forEach((el) => { const k = el.dataset.copy; if (copy[k]) el.textContent = copy[k]; });
      if (view) view.text({ text: shown, size: 0.2, x: 0.07, y: 0.78, color: 'branco', max: 0.9 });
      accentLeading(outs);
      if (go) { const q = new URLSearchParams(); if (name.trim()) q.set('marca', name.trim()); if (seg !== 'empresa') q.set('seg', seg); go.href = '/diagnostico' + (q.toString() ? '?' + q : '') + '#formulario'; }
      if (pulse && !reduce) {
        $$('.nm, [data-copy]', outs).forEach((el, i) => el.style.setProperty('--i', i % 8));
        outs.classList.remove('is-pulse'); void outs.offsetWidth; outs.classList.add('is-pulse');
        clearTimeout(pulseT); pulseT = setTimeout(() => outs.classList.remove('is-pulse'), 1200);
      }
    };
    let typing = 0;
    input.addEventListener('input', () => { name = input.value.slice(0, 18); clearTimeout(typing); typing = setTimeout(() => render(true), 120); });
    form.addEventListener('change', (e) => { if (e.target.name === 'seg') { seg = e.target.value; render(true); } });
    form.addEventListener('submit', (e) => { e.preventDefault(); input.blur(); render(true); });
    render(false);
  }

  /* ---------- serviços: índice das frentes ---------- */
  function setupStory() {
    const nav = $$('.story__nav a'); if (!nav.length || !('IntersectionObserver' in window)) return;
    const map = new Map(nav.map((a) => [a.dataset.for, a]));
    const io = new IntersectionObserver((ents) => {
      for (const e of ents) if (e.isIntersecting) { nav.forEach((a) => a.classList.remove('is-on')); const a = map.get(e.target.id); if (a) a.classList.add('is-on'); }
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.front').forEach((f) => io.observe(f));
    nav[0].classList.add('is-on');
  }

  /* ---------- palco: o kit passa de lado ---------- */
  function setupKit() {
    const root = $('.kit'); if (!root || !hasGsap() || reduce) return;
    const track = $('[data-kit-track]', root), count = $('[data-kit-count]', root), n = $$('.kit__item', root).length;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1100px)', () => {
      let dx = 0;
      const measure = () => {
        root.classList.add('is-live');
        track.style.transform = '';
        dx = Math.max(0, track.scrollWidth - track.clientWidth);
        root.style.setProperty('--hold', Math.max(0.6, dx / innerHeight).toFixed(3));
      };
      measure();
      ScrollTrigger.addEventListener('refreshInit', measure);
      const st = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
        onUpdate: (self) => { track.style.transform = `translate3d(${(-self.progress * dx).toFixed(1)}px,0,0)`; if (count) count.textContent = String(1 + Math.round(self.progress * (n - 1))); } });
      return () => { st.kill(); ScrollTrigger.removeEventListener('refreshInit', measure); root.classList.remove('is-live'); root.style.removeProperty('--hold'); track.style.transform = ''; };
    });
  }

  /* ---------- manifesto: a tinta preenche as palavras ---------- */
  function inkFill() {
    if (reduce || !(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'))) return;
    $$('[data-fill]').forEach((box) => {
      $$('p', box).forEach((p) => {
        const words = p.textContent.trim().split(/\s+/);
        p.setAttribute('aria-label', p.textContent.trim());
        p.textContent = '';
        words.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = w; p.append(s, i < words.length - 1 ? ' ' : ''); });
      });
      box.classList.add('is-filling');
    });
  }

  /* ---------- diagnóstico (formulário em etapas) ---------- */
  function setupDiag() {
    const form = $('[data-diag]'); if (!form) return;
    const steps = $$('.dg-step', form), back = $('[data-back]', form), next = $('[data-next]', form), send = $('[data-send]', form);
    const count = $('[data-step-count]', form), live = $('[data-live]', form), done = $('[data-done]');
    let i = 0;
    const qs = new URLSearchParams(location.search);
    if (qs.get('seg')) { const r = $(`input[name="segmento"][data-seg="${CSS.escape(qs.get('seg'))}"]`, form); if (r) r.checked = true; }
    if (qs.get('marca')) { const m = $('input[name="empresa"]', form); if (m) m.value = qs.get('marca'); }
    const show = (n, focus = true) => {
      i = clamp(n, 0, steps.length - 1);
      steps.forEach((s, k) => { s.hidden = k !== i; });
      if (count) count.textContent = `${i + 1} de ${steps.length}`;
      back.hidden = i === 0; next.hidden = i === steps.length - 1; send.hidden = i !== steps.length - 1;
      if (focus) { const f = $('legend, h3', steps[i]); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); } }
      form.classList.remove('is-step'); void form.offsetWidth; form.classList.add('is-step');
    };
    const valid = (step) => {
      const req = $$('[required]', step);
      for (const el of req) {
        if (el.type === 'radio') { if (!$(`input[name="${el.name}"]:checked`, step)) return { el, msg: 'Escolha uma opção para continuar.' }; }
        else if (!el.value.trim()) return { el, msg: 'Preencha este campo para continuar.' };
        else if (el.name === 'whatsapp' && el.value.replace(/\D/g, '').length < 10) return { el, msg: 'Confira o número: DDD e telefone.' };
      }
      const group = $('[data-min]', step);
      if (group && $$('input:checked', group).length < +group.dataset.min) return { el: $('input', group), msg: 'Marque pelo menos uma opção.' };
      return null;
    };
    const fail = (err) => { if (live) live.textContent = err.msg; err.el.setAttribute('aria-invalid', 'true'); err.el.focus(); err.el.closest('fieldset, .dg-field')?.classList.add('is-error'); };
    let dirty = false, sent = false;
    form.addEventListener('input', (e) => { dirty = true; e.target.removeAttribute('aria-invalid'); e.target.closest('.is-error')?.classList.remove('is-error'); if (live) live.textContent = ''; });
    // quem já começou a responder é avisado antes de sair da página
    addEventListener('beforeunload', (e) => { if (dirty && !sent && i > 0) { e.preventDefault(); e.returnValue = ''; } });
    next.addEventListener('click', () => { const err = valid(steps[i]); if (err) return fail(err); show(i + 1); });
    back.addEventListener('click', () => show(i - 1));
    $('input[name="whatsapp"]', form)?.addEventListener('input', (e) => {
      const d = e.target.value.replace(/\D/g, '').slice(0, 11);
      e.target.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = valid(steps[i]); if (err) return fail(err);
      const fd = new FormData(form);
      const get = (k) => (fd.getAll(k).filter(Boolean).join(', ') || '-');
      const msg = [
        'Oi! Quero agendar o Diagnóstico de Impacto.', '',
        `Nome: ${get('nome')}`, `Marca ou empresa: ${get('empresa')}`, `Cidade: ${get('cidade')}`,
        `Segmento: ${get('segmento')}`, `Porte: ${get('porte')}`, `Quero resolver primeiro: ${get('objetivo')}`,
        `Prazo: ${get('prazo')}`, `WhatsApp: ${get('whatsapp')}`, `Instagram ou site: ${get('link')}`,
      ].join('\n');
      sent = true;
      const wa = waLink(msg);
      const href = wa || `mailto:${CONTACT.email}?subject=${encodeURIComponent('Diagnóstico de Impacto: ' + get('empresa'))}&body=${encodeURIComponent(msg)}`;
      if (done) {
        const a = $('[data-done-link]', done); if (a) { a.href = href; a.textContent = wa ? 'Abrir o WhatsApp de novo' : 'Abrir o e-mail de novo'; }
        form.hidden = true; done.hidden = false; const h = $('h2, h3', done); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      }
      window.open(href, wa ? '_blank' : '_self');
    });
    show(0, false);
  }

  /* ---------- início ---------- */
  function boot() {
    if (window.Glass) window.Glass.auto();
    setupHero();
    rollFigures();
    setupNames();
    setupLab();
    setupDiag();
    setupStory();
    inkFill();
    const dg = $('.diagram'); if (dg) reveal(dg);
    if (hasGsap()) {
      gsap.registerPlugin(ScrollTrigger);
      startSmooth();
      if (hero) liveScene(hero, 1, (p) => { heroScene.p = p; heroDraw(p); updateHeader(); }, 1);
      setupDistances();
      setupStair();
      setupKit();
      addEventListener('load', () => ScrollTrigger.refresh());
    } else {
      if (hero) hero.classList.add('is-rest');
      setupDistances();
      setupStair();
    }
    // tudo que mede texto espera a fonte certa
    const typeset = () => { accentLeading(); fitText(); cutIntro(); if (hasGsap()) ScrollTrigger.refresh(); };
    fontsReady.then(() => { splitLines(); typeset(); });
    if (document.fonts) document.fonts.addEventListener('loadingdone', typeset);
    let rt, rw = innerWidth; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== rw) { rw = innerWidth; accentLeading(); } fitText(); cutIntro(); }, 120); });
    updateHeader();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
