# SEO e indexação — Xadrez 3D Online

Checklist do que já está no projeto e do que só o dono do repositório pode fazer.

## O que já está implementado

| Item | Onde |
| --- | --- |
| Título e descrição otimizados para busca | `index.html` (`<title>`, `meta description`) |
| URL canônica | `index.html` (`rel="canonical"`) |
| Open Graph e Twitter Card (prévia em WhatsApp, X, Facebook, Discord) | `index.html` + `og-image.png` |
| Dados estruturados (WebApplication + FAQPage) | JSON-LD no `<head>` |
| Um único `<h1>` com a palavra-chave principal | lobby |
| Conteúdo textual estático (sobre, como jogar, FAQ) | seção “Sobre o jogo…” no lobby |
| `sitemap.xml` com imagem | raiz |
| `robots.txt` liberando o rastreamento e apontando o sitemap | raiz |
| Manifest + ícones (instalável no celular) | `site.webmanifest`, `icon-*.png` |
| Favicon | `favicon.svg`, `favicon-32.png` |
| Carregamento adiado dos scripts e `preconnect` no CDN | `index.html` |
| Deploy incluindo os arquivos novos | `.github/workflows/pages.yml` |

## Passo 1 — Google Search Console (obrigatório)

1. Abra <https://search.google.com/search-console>.
2. Adicione a propriedade **Prefixo do URL**: `https://vitormartinsalves.github.io/3dXess/`.
3. Escolha a verificação por **tag HTML** e copie a meta tag.
4. Cole a meta tag no `<head>` do `index.html`, por exemplo:
   ```html
   <meta name="google-site-verification" content="SEU_CODIGO_AQUI" />
   ```
5. Faça commit e push, volte ao Search Console e clique em **Verificar**.
6. Em **Sitemaps**, envie `sitemap.xml`.
7. Em **Inspeção de URL**, cole a URL do site e peça **Solicitar indexação**.

Também vale cadastrar no [Bing Webmaster Tools](https://www.bing.com/webmasters) — ele importa direto do Search Console.

## Passo 2 — Tornar o repositório “encontrável”

- No GitHub, em **Settings → Topics**, adicione: `chess`, `xadrez`, `3d`, `webgl`, `threejs`, `game`, `p2p`, `webrtc`, `html5-game`.
- O campo **About → Website** do repositório deve apontar para o site publicado.
- Um README claro com as palavras “jogar xadrez online”, “xadrez 3D” e “grátis” ajuda o repositório a ranquear no próprio GitHub.

## Passo 3 — Backlinks (o fator que mais pesa)

Ser encontrado não depende só do código: o Google precisa ver outros sites apontando para o seu.

- Publique em comunidades: Reddit (`r/xadrez`, `r/chess`, `r/InternetIsBeautiful`), fóruns de xadrez, grupos de Telegram/Discord.
- Divulgue em agregadores: Hacker News (Show HN), Product Hunt, Indie Hackers.
- Peça para blogs/newsletters de xadrez e de projetos open source citarem o jogo.
- Crie conteúdo externo (um post explicando como o tabuleiro 3D foi feito) e link para o site.
- Um link de um site com autoridade vale muito mais do que dezenas de links aleatórios.

## Passo 4 — Conteúdo que atrai buscas de cauda longa

As buscas mais fáceis de ganhar não são “jogar xadrez”, e sim:

- “jogar xadrez online com amigo sem cadastro”
- “xadrez 3D no navegador”
- “jogar xadrez contra o computador grátis”
- “xadrez online sem instalar aplicativo”
- “como jogar xadrez no celular pelo navegador”

A seção de FAQ da página já cobre parte disso. Se quiser crescer, crie páginas separadas para cada tema (ex.: `/como-jogar.html`, `/xadrez-contra-o-bot.html`) com conteúdo único e link interno entre elas.

## Expectativa realista

“Primeiro lugar para quem quer jogar xadrez” é uma disputa direta com chess.com, lichess.org e Chess24, que têm milhões de acessos e anos de autoridade. Isso não acontece em dias.

O caminho realista é:

1. **Primeiras semanas:** site indexado e aparecendo para o nome “Xadrez 3D Online”.
2. **1 a 3 meses:** aparecendo para buscas de cauda longa (as da lista acima).
3. **6 meses ou mais:** disputar posições boas em “jogar xadrez online”, dependendo de backlinks e conteúdo.

## Manutenção

- Ao mudar o conteúdo, atualize `<lastmod>` no `sitemap.xml`.
- Se um dia usar domínio próprio, troque a URL em: `canonical`, `og:url`, `og:image`, `twitter:image`, JSON-LD, `robots.txt` e `sitemap.xml`.
- Evite publicar páginas de teste: o workflow já exclui `test-*.html`, `*-test.html` e `gltest.html`.
- Não use texto escondido nem repetição artificial de palavras-chave — isso pode gerar penalização.
