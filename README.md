# Studio Impacto · site oficial

Site do Studio Impacto, estúdio criativo de Uberlândia (MG): estratégia, design, audiovisual, tráfego e tecnologia sob o mesmo teto.

**No ar (prévia):** https://studio-impacto.vercel.app
Projeto `studio-impacto` na Vercel (equipe gibson-mkt), ligado a este repositório. Enquanto for prévia, o site pede para não aparecer no Google.

## O que tem aqui

| Pasta / arquivo | Para quê |
| --- | --- |
| `src/pages/` | Uma página por arquivo: `index` (home), `servicos`, `palco`, `estudio`, `diagnostico` e `404`. Os textos se trocam aqui. |
| `src/partials/` | Partes que se repetem: `<head>`, cabeçalho, rodapé, logotipos em SVG e o stage plot do Palco. |
| `site/assets/` | CSS (`css/site.css`), JavaScript (`js/site.js`; `js/glass.js` é o vidro canelado em WebGL), fontes, imagens, GSAP e Lenis. |
| `site/*.html` | Páginas montadas para testar no computador. Não edite: são refeitas a cada build. |
| `build.mjs` | Junta páginas e partes, minifica e monta `site/` (desenvolvimento) e `dist/` (versão final). |
| `vercel.json` | Como a Vercel instala, monta e publica o site, mais os cabeçalhos de segurança e cache. |

## Editar e ver no computador

Precisa do Node.js 20 ou mais novo.

```bash
npm install        # só na primeira vez
npm run dev        # monta e abre em http://localhost:4173 (rode de novo depois de cada alteração)
npm run build      # gera a versão final em dist/
npm run preview    # gera e mostra a versão final em http://localhost:4180
```

## Publicar

Cada `git push` na branch `main` publica sozinho na Vercel: ela roda `npm install` e `npm run build` e publica a pasta `dist/` (que não vai para o Git).
Outras branches viram prévias com endereço próprio, protegidas pelo login da Vercel.

Domínio próprio: adicione o domínio no projeto da Vercel e troque o endereço na linha `SITE_URL` do `build.mjs`, para a prévia de link no WhatsApp e nas redes apontar para ele.

## Antes de divulgar

- **WhatsApp:** preencha o número em `site/assets/js/site.js` (constante `CONTACT`, no começo do arquivo). Enquanto estiver vazio, os botões levam ao diagnóstico, e o diagnóstico envia por e-mail.
- Confirme o e-mail `contato@studioimpacto.com.br` e o Instagram `@studioimpacto`.
- Fotos e vídeos reais de set, palco e equipe: hoje as imagens do site são composições desenhadas em código.
- Confirme os valores "a partir de" (Serviços e Planos), o onboarding de 7 dias e o diagnóstico abatido no fechamento.
- Clientes: Sony Music e Prefeitura de Monte Carmelo ficaram de fora até haver autorização.
- Conteúdo de exemplo: o "Artista exemplo" do Palco e os números dos mockups (relatórios, painéis e conversas).
- Para o Google indexar: apague a regra `X-Robots-Tag` do `vercel.json` e troque `site/robots.txt` por `User-agent: *` e `Allow: /`.

A fonte Foun é licenciada para o Studio Impacto e não deve ser reaproveitada em outros projetos.
