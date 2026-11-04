# SEO e indexação — 3dXess

Este documento descreve a estrutura publicada e as tarefas que ainda dependem do proprietário do domínio ou da conta de ferramentas de busca.

## Estrutura de páginas

Cada idioma tem URLs próprias, HTML independente e conteúdo no idioma correspondente. A troca de idioma é manual: o site não força redirecionamentos por IP ou idioma do navegador.

| Conteúdo | Português | English | Español | 简体中文 |
| --- | --- | --- | --- | --- |
| Início | `/` | `/en/` | `/es/` | `/zh-cn/` |
| Sobre | `/sobre/` | `/en/about/` | `/es/acerca/` | `/zh-cn/about/` |
| Aprender | `/aprender/` | `/en/learn/` | `/es/aprender/` | `/zh-cn/learn/` |
| Praticar | `/praticar/` | `/en/practice/` | `/es/practica/` | `/zh-cn/practice/` |
| Desafios | `/desafios/` | `/en/challenges/` | `/es/desafios/` | `/zh-cn/challenges/` |
| Regras | `/regras/` | `/en/rules/` | `/es/reglas/` | `/zh-cn/rules/` |
| Jogar | `/jogar/` | `/en/play/` | `/es/jugar/` | `/zh-cn/play/` |

## Boas práticas implementadas

- HTML independente por URL e idioma, com atributo `lang` correto.
- `title`, descrição, URL canônica e metadados Open Graph/Twitter específicos por página.
- Ligações `hreflang` recíprocas entre as versões linguísticas equivalentes e `x-default`.
- Navegação por links HTML reais, seletor de idioma e rotas diretas compatíveis com GitHub Pages.
- Sitemap com as 28 URLs e as respectivas anotações de idioma.
- Conteúdo principal visível sem depender de JavaScript; scripts são usados para navegação, tabuleiro e interações.
- Layout responsivo, estados de foco, skip link, navegação semântica e respeito a `prefers-reduced-motion`.
- O motor de xadrez valida as jogadas dos exercícios. O progresso usa armazenamento local e não é apresentado como ranking global.
- O modo de jogo fica em uma rota dedicada; a home funciona como portal de jogo e aprendizado.

## Search Console e SEO internacional

1. Adicione uma única propriedade de prefixo de URL: `https://vitormartinsalves.github.io/3dXess/`. Ela cobre os quatro idiomas e todas as rotas abaixo desse caminho.
2. Verifique a propriedade por meta tag ou arquivo HTML. Essa etapa exige acesso à conta Google do proprietário.
3. Envie `https://vitormartinsalves.github.io/3dXess/sitemap.xml`. O sitemap contém as 28 URLs e as variantes `hreflang`; não é necessário criar um sitemap separado por idioma.
4. Na Inspeção de URL, teste pelo menos as quatro páginas iniciais (`/`, `/en/`, `/es/` e `/zh-cn/`) e uma rota de jogo. Confira se cada URL está acessível, se a canônica selecionada é a própria versão e se não há bloqueio de indexação.
5. Depois do rastreamento, use o relatório de desempenho com filtros de página (`/en/`, `/es/`, `/zh-cn/`) e país para comparar impressões, cliques e consultas de cada idioma.

O envio do sitemap é uma indicação de rastreamento, não uma garantia de indexação ou posicionamento. A indexação depende da avaliação do Google e pode levar dias ou semanas. Evite pedir indexação repetidamente para a mesma URL; use o sitemap para descoberta em lote e a inspeção para poucas páginas prioritárias.

Também é possível cadastrar o site no [Bing Webmaster Tools](https://www.bing.com/webmasters).

## O que ainda não é automático

- O Google decide quando e como rastrear/indexar cada URL; o sitemap não garante indexação ou posição.
- A verificação do Search Console e o envio do sitemap precisam ser feitos na conta do proprietário.
- O GitHub Pages não fornece métricas de produto. Configure analytics com consentimento e política de privacidade apropriados se precisar medir tráfego.
- A versão atual não tem contas, sincronização de progresso, ranking global, nem back-end de desafios competitivos.
- A tradução do lobby do jogo cobre os principais rótulos e mensagens comuns. Mensagens novas adicionadas ao jogo precisam ser incluídas no dicionário `game-i18n.js`.

## Próximas melhorias de conteúdo

O treinador atualmente inclui quatro posições de demonstração. Para escalar a biblioteca de exercícios, mantenha um catálogo de posições FEN com metadados (tema, dificuldade, solução, variantes, idioma e fonte/licença), acrescente testes para cada posição e evite carregar toda a coleção no primeiro acesso. Um arquivo JSON versionado e carregado sob demanda é suficiente para a próxima etapa, sem introduzir um backend prematuramente.

Não publique posições copiadas de outros sites sem conferir a licença e atribuição. Dados de puzzles como o conjunto do Lichess podem ser uma fonte futura, mas a licença e os termos devem ser preservados.

## Divulgação e manutenção

- Adicione os tópicos do repositório: `chess`, `xadrez`, `3d`, `webgl`, `threejs`, `webrtc`, `chess-puzzles`.
- Atualize o `lastmod` do sitemap quando houver uma alteração real de conteúdo.
- Se mudar o domínio, atualize canonical, Open Graph, URLs absolutas, sitemap e robots.txt.
- Priorize páginas úteis, texto original e links internos naturais; não repita palavras-chave artificialmente.
