// Studio Impacto · build
// node build.mjs                -> monta ./site (desenvolvimento, sem minificar)
// node build.mjs --prod         -> monta ./dist (versão final, minificada, com GSAP e Lenis hospedados no próprio site)
// VENDOR=cdn node build.mjs --prod  -> igual, mas carrega GSAP e Lenis do jsDelivr com SRI
// SITE_URL=https://seu-dominio node build.mjs --prod  -> troca o endereço usado nas tags de compartilhamento
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const SRC = path.join(ROOT, 'src');
const SITE = path.join(ROOT, 'site');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://studio-impacto.vercel.app').replace(/\/+$/, '');
const prod = process.argv.includes('--prod');
const cdn = process.env.VENDOR === 'cdn';

const partials = {};
for (const f of fs.readdirSync(path.join(SRC, 'partials'))) {
  partials[f.replace(/\.(html|svg)$/, '')] = fs.readFileSync(path.join(SRC, 'partials', f), 'utf8').trim();
}
const include = (s, depth = 0) => s.replace(/\{\{>([\w-]+)\}\}/g, (_, n) => {
  if (!(n in partials)) throw new Error('partial ausente: ' + n);
  return depth > 5 ? '' : include(partials[n], depth + 1);
});

const org = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Studio Impacto',
  slogan: 'Do ponto ao impacto.',
  description: 'Estúdio criativo de estratégia, design, audiovisual, tráfego e tecnologia.',
  url: SITE_URL + '/',
  logo: SITE_URL + '/assets/img/apple-touch-icon.png',
  image: SITE_URL + '/assets/img/og.jpg',
  address: { '@type': 'PostalAddress', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
  areaServed: 'Triângulo Mineiro',
  knowsAbout: ['Estratégia de marca', 'Identidade visual', 'Produção audiovisual', 'Tráfego pago', 'Sites sob medida', 'CRM e WhatsApp', 'Produção para shows e artistas'],
};

const pages = fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
const out = prod ? DIST : SITE;
if (prod) fs.rmSync(DIST, { recursive: true, force: true }); // dist sempre sai limpo, sem sobras de builds antigos
const written = [];
for (const f of pages) {
  const raw = fs.readFileSync(path.join(SRC, 'pages', f), 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->/);
  if (!m) throw new Error('sem front matter: ' + f);
  const meta = JSON.parse(m[1]);
  let body = raw.slice(m[0].length);
  const jsonld = `<script type="application/ld+json">${JSON.stringify(meta.key === 'home' ? org : Object.assign({}, org, { '@type': 'ProfessionalService' }))}</script>`;
  let head = partials.head
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{ogTitle}}', meta.ogTitle || meta.title)
    .replaceAll('{{description}}', meta.description)
    .replaceAll('{{path}}', meta.path === '/404' ? '/' : meta.path)
    .replaceAll('{{site}}', SITE_URL)
    .replace('{{jsonld}}', jsonld);
  let header = partials.header.replace(/\{\{cur:(\w+)\}\}/g, (_, k) => (k === meta.key ? ' aria-current="page"' : ''));
  let html = `${head}\n<body class="page-${meta.key}">\n${partials.sprite}\n${header}\n${body.trim()}\n${partials.footer}\n${partials.scripts}\n</body>\n</html>\n`;
  html = include(html);
  if (prod && cdn) {
    // GSAP e Lenis pelo CDN, com integridade
    html = html.replace('</title>', '</title>\n<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>');
    html = html.replace(/<script src="(\/assets\/vendor\/[^"]+)" defer data-cdn="([^"]+)"><\/script>/g, (_, local, cdn) => {
      const buf = fs.readFileSync(path.join(SITE, local));
      const sri = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
      return `<script src="${cdn}" defer integrity="${sri}" crossorigin="anonymous"></script>`;
    });
  } else {
    html = html.replace(/ data-cdn="[^"]+"/g, '');
  }
  const dest = meta.path === '/' ? 'index.html' : meta.path === '/404' ? '404.html' : meta.path.replace(/^\//, '') + '/index.html';
  const file = path.join(out, dest);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (prod) {
    const { minify } = require('html-minifier-terser');
    html = await minify(html, { collapseWhitespace: true, conservativeCollapse: true, removeComments: true, minifyCSS: false, minifyJS: true, removeRedundantAttributes: true, sortAttributes: false, keepClosingSlash: false });
  }
  fs.writeFileSync(file, html);
  written.push(dest);
}

if (prod) {
  const esbuild = require('esbuild');
  const copy = (rel) => { const s = path.join(SITE, rel), d = path.join(DIST, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); };
  for (const dir of ['assets/fonts', 'assets/img']) {
    if (!fs.existsSync(path.join(SITE, dir))) continue;
    for (const f of fs.readdirSync(path.join(SITE, dir))) copy(path.join(dir, f));
  }
  for (const f of ['robots.txt']) if (fs.existsSync(path.join(SITE, f))) copy(f);
  if (!cdn) for (const f of fs.readdirSync(path.join(SITE, 'assets/vendor'))) copy(path.join('assets/vendor', f));
  fs.mkdirSync(path.join(DIST, 'assets/css'), { recursive: true });
  fs.mkdirSync(path.join(DIST, 'assets/js'), { recursive: true });
  const css = fs.readFileSync(path.join(SITE, 'assets/css/site.css'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'assets/css/site.css'), (await esbuild.transform(css, { loader: 'css', minify: true, target: ['chrome111', 'safari16.4', 'firefox128'] })).code);
  for (const js of ['glass.js', 'site.js']) {
    const src = fs.readFileSync(path.join(SITE, 'assets/js', js), 'utf8');
    fs.writeFileSync(path.join(DIST, 'assets/js', js), (await esbuild.transform(src, { loader: 'js', minify: true, target: 'es2020' })).code);
  }
}
console.log((prod ? 'dist' : 'site') + ':', written.join(', '));
