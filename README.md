# 3dXess

Xadrez 2D/3D no navegador, com partidas locais, bot, salas P2P e treinamento por posições. O projeto está estruturado como uma aplicação React com build Vite e publicação estática no GitHub Pages.

## Desenvolvimento

Requisitos: Node.js 22.12 ou superior.

Instale as dependências e inicie o servidor de desenvolvimento:

    npm install
    npm run dev

Comandos principais:

    npm test       # valida sintaxe e executa os testes automatizados
    npm run build  # prepara o bundle e gera as 28 rotas
    npm run preview

## Organização

    src/
      app/                  # resolução de rotas e configuração
      components/            # layout, SEO e tratamento de erros
      features/game/         # integração React para o jogo
      features/training/     # integração React para os exercícios
      pages/locales/         # páginas React por idioma
      shared/lib/            # carregador dos módulos legados
      styles/                # estilos globais e do jogo
      data/                  # metadados localizados
    legacy/
      game/                  # motor, bot, renderizadores e controlador P2P
      training/              # integração dos exercícios com o motor
      vendor/                # Three.js, OrbitControls e Trystero
    scripts/                 # preparação dos assets e rotas estáticas
    public/                  # ícones, manifest, sitemap e arquivos públicos
    test/                    # testes do motor, treino e arquitetura

## Arquitetura do jogo

A navegação, o layout, as páginas públicas, os metadados e a composição das telas usam React. As páginas são carregadas por idioma e compartilham o mesmo layout e sistema de SEO.

O motor de regras, o bot, o renderizador 2D, a cena Three.js e a comunicação P2P foram mantidos em legacy/ como módulos isolados. O controlador atual manipula elementos identificados por IDs e coordena relógios, workers, WebRTC e renderizadores. Por isso, a árvore do jogo é montada uma vez em componentes JSX e o controlador é inicializado por GameRuntime. Essa fronteira impede que o React e o controlador disputem a propriedade dos mesmos nós durante uma partida. A integração pode ser substituída gradualmente por hooks e serviços React sem reescrever o motor ou alterar o protocolo P2P.

O renderizador 3D é carregado somente quando selecionado no jogo. O treinamento carrega seus módulos quando a página correspondente é aberta.

## Funcionalidades preservadas

- Tabuleiro 2D e 3D, temas, skins, orientação e efeitos.
- Motor com movimentos legais, roque, en passant, promoção, xeque e empate.
- Bot com seis níveis, estilos e busca em Web Worker.
- Partida local, rápida, salas privadas/públicas, convite, chat e espectadores.
- Relógios, desistência, empate, revanche e histórico de lances.
- Quatro idiomas: português, inglês, espanhol e chinês simplificado.
- Páginas de apresentação, aprendizagem, prática, desafios e regras.
- Progresso de treino salvo localmente no navegador.

O modo online continua dependendo de WebRTC e de relays públicos do Trystero. O anfitrião precisa permanecer online durante a partida; redes com NAT/CGNAT restritivo ainda podem impedir a conexão.

## GitHub Pages

O workflow .github/workflows/pages.yml executa os testes, gera o bundle de produção e publica o artefato pelo GitHub Actions. Como compatibilidade com repositórios que ainda estão configurados para publicar a branch main, ele também espelha o build estático gerado na raiz da branch. Em Settings → Pages, a configuração recomendada continua sendo GitHub Actions como fonte de publicação.

O build usa a base /3dXess/, gera index.html em cada rota localizada e mantém canonical, hreflang, Open Graph, Twitter Cards e JSON-LD específicos por página.

## Testes

Os testes usam o runner nativo do Node.js. O motor de xadrez é validado por cenários de movimentos, regras especiais e perft; os testes de interface validam a estrutura React, rotas, SEO e integração com os módulos do jogo.
