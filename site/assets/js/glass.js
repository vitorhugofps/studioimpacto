/* Studio Impacto · glass.js
   Vidro canelado em WebGL: cada canelura é uma pequena lente cilíndrica que mostra, comprimida e
   espelhada, a fatia de luz que está atrás dela. A cena (campos, ponto laranja, brilho e texto) é
   desenhada no próprio shader, então nenhuma imagem é baixada.

   Glass.create(canvas, state)  -> view   cria uma vista num <canvas>
   view.set(partial)                      atualiza o estado (em px CSS e frações) e redesenha
   view.text({ text, size, x, y, color }) desenha um texto atrás do vidro (Foun)
   view.pointer(el, { phase, dot })       o ponteiro desliza o vidro e o ponto
   Sem WebGL, o canvas some e o elemento pai recebe .glass-fb (versão em CSS). */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = {
    laranja: '#FF5B1F', preto: '#0A0A0A', grafite: '#1C1A19', fumaca: '#2B2826', concreto: '#8E8984',
    asfalto: '#6B6661', nevoa: '#DAD6D1', branco: '#F5F5F3', brasa: '#C93A0A', branco100: '#FFFFFF',
  };
  const rgb = (v) => {
    const h = (C[v] || v || '#000000').replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const noLig = (s) => s.replace(/C(?=O)|O(?=O)|S(?=S)/g, (m) => m + '‌');

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 uRes;uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uDotC;
uniform float uSeam;uniform vec2 uDot;uniform float uRad;uniform float uGlow;
uniform float uFw;uniform float uMag;uniform float uX0;uniform float uX1;uniform float uPhase;
uniform float uSoft;uniform float uHi;uniform float uShade;uniform float uCA;uniform float uEdge;
uniform float uZoom;uniform vec2 uZc;uniform sampler2D uTex;uniform float uUseTex;uniform float uDpr;
vec3 scene(vec2 q,float s){
  float aa=.75*uDpr;
  float m=smoothstep(uSeam-s-aa,uSeam+s+aa,q.y);
  vec3 c=mix(uTop,uBot,m);
  float d=length(q-uDot);
  if(uGlow>0.){float g=exp(-pow(max(d-uRad,0.)/(uRad*.9+1.),2.))*uGlow;c=mix(c,uDotC,clamp(g*.62,0.,1.));}
  float a=1.-smoothstep(uRad-s-aa,uRad+s+aa,d);
  c=mix(c,uDotC,a);
  if(uUseTex>.5){vec4 t=texture2D(uTex,q/uRes);c=c*(1.-t.a)+t.rgb;}
  return c;
}
vec3 soft(vec2 q,float s){
  if(uUseTex<.5||s<.5)return scene(q,s);
  vec3 a=scene(q,s)*.36;
  a+=scene(q+vec2(s,0.),s)*.16+scene(q-vec2(s,0.),s)*.16;
  a+=scene(q+vec2(0.,s),s)*.16+scene(q-vec2(0.,s),s)*.16;
  return a;
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 z=uZc+(p-uZc)/uZoom;
  vec3 col;
  if(z.x<uX0||z.x>uX1){
    col=scene(z,0.);
    if(uEdge>.5&&z.x<uX0){col*=1.-smoothstep(uX0-26.*uDpr,uX0,z.x)*.3;}
  }else{
    float fx=z.x-uX0+uPhase;
    float l=fract(fx/uFw);
    float u=l*2.-1.;
    float ctr=uX0-uPhase+(floor(fx/uFw)+.5)*uFw;
    float off=sin(u*1.5707963)*.5*uFw*uMag;
    float ca=uCA*u*uDpr;
    vec3 c;
    c.r=soft(vec2(ctr+off+ca,z.y),uSoft).r;
    c.g=soft(vec2(ctr+off,z.y),uSoft).g;
    c.b=soft(vec2(ctr+off-ca,z.y),uSoft).b;
    float hi=(1.-smoothstep(0.,.17,l))*uHi;
    float sh=smoothstep(.6,1.,l)*uShade;
    float sp=exp(-pow((l-.07)/.028,2.))*uHi*.55;
    c=c*(1.-sh)+hi+sp;
    if(uEdge>.5){float e=1.-smoothstep(0.,1.6*uDpr,abs(z.x-uX0));c=mix(c,vec3(1.),e*.24);}
    col=c;
  }
  gl_FragColor=vec4(col,1.);
}`;

  const DEFAULT = {
    top: 'preto', bottom: 'preto', seam: 1.2, // fração da altura; > 1 = um campo só
    dotX: 0.5, dotY: 0.5, r: 0.34, dotColor: 'laranja', glow: 0.35,
    fw: 22, mag: 1.65, x0: 0, x1: 1, phase: 0, soft: 1.2, hi: 0.1, shade: 0.34, ca: 0.6, edge: false,
    zoom: 1, zx: 0.5, zy: 0.5, drift: 0,
    // campos em px sobrepõem as frações quando definidos (cena do herói)
    seamPx: null, dotPx: null, rPx: null, x0Px: null, scissor: null,
  };

  const views = new Set();
  let raf = 0, last = 0;
  // o vidro desliza só enquanto há alguém mexendo na página (e para depois de alguns segundos)
  const still = navigator.webdriver || /[?&]still\b/.test(location.search);
  let lastActive = performance.now();
  const wake = () => { lastActive = performance.now(); kick(); };
  ['pointermove', 'scroll', 'keydown', 'touchstart', 'wheel'].forEach((ev) => addEventListener(ev, wake, { passive: true }));
  const awake = () => !still && performance.now() - lastActive < 9000;

  function loop(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    let again = false;
    for (const v of views) {
      if (!v.visible || v.lost) continue;
      if (v.tick(dt)) again = true;
      if (v.dirty) v.draw();
    }
    if (again) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    for (const e of ents) {
      const v = e.target.__glass; if (!v) continue;
      v.visible = e.isIntersecting;
      if (v.visible) { v.dirty = true; kick(); }
    }
  }, { rootMargin: '120px 0px' }) : null;

  const ro = 'ResizeObserver' in window ? new ResizeObserver((ents) => {
    for (const e of ents) { const v = e.target.__glass; if (v) { v.resize(); kick(); } }
  }) : null;

  class View {
    constructor(canvas, state) {
      this.canvas = canvas;
      this.s = Object.assign({}, DEFAULT, state || {});
      this.t = { phase: 0, dot: 0 }; // alvos do ponteiro
      this.p = { phase: 0, dot: 0 };
      this.drifted = 0;
      this.visible = !io;
      this.dirty = true;
      this.textCanvas = null;
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('no webgl');
      this.gl = gl;
      this.init();
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; }, false);
      canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.init(); if (this.textCanvas) this.upload(); this.dirty = true; kick(); }, false);
      canvas.__glass = this;
      this.resize();
      views.add(this);
      if (io) io.observe(canvas);
      if (ro) ro.observe(canvas);
      kick();
    }
    init() {
      const gl = this.gl;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      ['uRes', 'uTop', 'uBot', 'uDotC', 'uSeam', 'uDot', 'uRad', 'uGlow', 'uFw', 'uMag', 'uX0', 'uX1', 'uPhase', 'uSoft', 'uHi', 'uShade', 'uCA', 'uEdge', 'uZoom', 'uZc', 'uTex', 'uUseTex', 'uDpr']
        .forEach((n) => { this.u[n] = gl.getUniformLocation(pr, n); });
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      gl.uniform1i(this.u.uTex, 0);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      let d = DPR();
      const max = 2.6e6;
      if (r.width * r.height * d * d > max) d = Math.sqrt(max / Math.max(1, r.width * r.height));
      this.d = d;
      this.cw = Math.max(2, r.width); this.ch = Math.max(2, r.height);
      const w = Math.max(2, Math.round(r.width * d)), h = Math.max(2, Math.round(r.height * d));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      if (this.textOpts) this.paintText();
      this.dirty = true;
      if (this.onresize) this.onresize(this);
    }
    set(partial) { Object.assign(this.s, partial); this.dirty = true; kick(); return this; }
    tick(dt) {
      let moving = false;
      if (!reduce && this.s.drift && awake()) { this.drifted += this.s.drift * dt; this.dirty = true; moving = true; }
      for (const k of ['phase', 'dot']) {
        const dv = this.t[k] - this.p[k];
        if (Math.abs(dv) > 0.05) { this.p[k] += dv * Math.min(1, dt * 6); this.dirty = true; moving = true; }
      }
      return moving;
    }
    pointer(el, amt = {}) {
      if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return this;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        this.t.phase = nx * (amt.phase || 0);
        this.t.dot = nx * (amt.dot || 0);
        kick();
      });
      el.addEventListener('pointerleave', () => { this.t.phase = 0; this.t.dot = 0; kick(); });
      return this;
    }
    text(opts) {
      this.textOpts = Object.assign({ text: '', size: 0.3, x: 0.07, y: 0.62, color: 'branco', max: 0.86, align: 'left' }, opts);
      const go = () => { this.paintText(); this.dirty = true; kick(); };
      if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('100px Foun'), new Promise((r) => setTimeout(r, 1500))]).then(go, go);
      else go();
      return this;
    }
    paintText() {
      const o = this.textOpts, W = this.canvas.width, H = this.canvas.height;
      if (!this.textCanvas) this.textCanvas = document.createElement('canvas');
      const c = this.textCanvas; c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.clearRect(0, 0, W, H);
      const lines = noLig(String(o.text || ' ').toUpperCase()).split('\n');
      let size = o.size * H;
      x.font = `${size}px Foun, "Arial Narrow", sans-serif`;
      const wMax = Math.max(...lines.map((l) => x.measureText(l).width));
      if (wMax > W * o.max) { size *= (W * o.max) / wMax; x.font = `${size}px Foun, "Arial Narrow", sans-serif`; }
      x.fillStyle = C[o.color] || o.color;
      x.textBaseline = 'alphabetic';
      const lh = size * 0.92, total = lh * lines.length;
      lines.forEach((l, i) => {
        const tw = x.measureText(l).width;
        const tx = o.align === 'center' ? (W - tw) / 2 : W * o.x;
        const ty = H * o.y - total / 2 + lh * (i + 0.9);
        x.fillText(l, tx, ty);
      });
      this.upload();
    }
    upload() {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textCanvas);
      this.hasText = true;
    }
    draw() {
      if (this.lost) return;
      this.dirty = false;
      const gl = this.gl, s = this.s, u = this.u, d = this.d;
      const W = this.canvas.width, H = this.canvas.height;
      gl.viewport(0, 0, W, H);
      if (s.scissor) {
        const [sx, sy, sw, sh] = s.scissor; // px CSS, origem no topo
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(Math.floor(sx * d), Math.floor(H - (sy + sh) * d), Math.ceil(sw * d) + 1, Math.ceil(sh * d) + 1);
      } else gl.disable(gl.SCISSOR_TEST);
      const minWH = Math.min(this.cw, this.ch);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform3fv(u.uTop, rgb(s.top));
      gl.uniform3fv(u.uBot, rgb(s.bottom));
      gl.uniform3fv(u.uDotC, rgb(s.dotColor));
      gl.uniform1f(u.uSeam, (s.seamPx != null ? s.seamPx : s.seam * this.ch) * d);
      const dx = (s.dotPx ? s.dotPx[0] : s.dotX * this.cw) + this.p.dot;
      const dy = s.dotPx ? s.dotPx[1] : s.dotY * this.ch;
      gl.uniform2f(u.uDot, dx * d, dy * d);
      gl.uniform1f(u.uRad, (s.rPx != null ? s.rPx : s.r * minWH) * d);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uFw, Math.max(4, s.fw) * d);
      gl.uniform1f(u.uMag, s.mag);
      gl.uniform1f(u.uX0, (s.x0Px != null ? s.x0Px : s.x0 * this.cw) * d);
      gl.uniform1f(u.uX1, (s.x1Px != null ? s.x1Px : s.x1 * this.cw) * d + 1);
      gl.uniform1f(u.uPhase, (s.phase + this.p.phase + this.drifted) * d);
      gl.uniform1f(u.uSoft, s.soft * d);
      gl.uniform1f(u.uHi, s.hi);
      gl.uniform1f(u.uShade, s.shade);
      gl.uniform1f(u.uCA, s.ca);
      gl.uniform1f(u.uEdge, s.edge ? 1 : 0);
      gl.uniform1f(u.uZoom, Math.max(0.05, s.zoom));
      gl.uniform2f(u.uZc, s.zx * W, s.zy * H);
      gl.uniform1f(u.uUseTex, this.hasText ? 1 : 0);
      gl.uniform1f(u.uDpr, d);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  // Leitura das opções no HTML: data-glass='{"top":"preto","x0":0.5}'
  const parse = (el) => { try { return JSON.parse(el.dataset.glass || '{}'); } catch (e) { return {}; } };

  const Glass = {
    supported: (() => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl'))); } catch (e) { return false; } })(),
    create(canvas, state) {
      if (!canvas) return null;
      if (canvas.__glass) return canvas.__glass;
      try {
        if (!Glass.supported) throw new Error('no webgl');
        const v = new View(canvas, Object.assign(parse(canvas), state || {}));
        canvas.classList.add('is-gl');
        return v;
      } catch (e) {
        canvas.classList.add('is-fb');
        if (canvas.parentElement) canvas.parentElement.classList.add('glass-fb');
        return null;
      }
    },
    // Toda <canvas data-glass> sem data-glass-manual vira uma vista estática.
    auto() {
      document.querySelectorAll('canvas[data-glass]:not([data-glass-manual])').forEach((cv) => {
        const v = Glass.create(cv);
        if (v && cv.dataset.pointer) {
          const host = cv.closest(cv.dataset.pointer) || cv.parentElement;
          v.pointer(host, { phase: 40, dot: 18 });
        }
      });
    },
    kick,
    views,
    colors: C,
  };
  window.Glass = Glass;
})();
