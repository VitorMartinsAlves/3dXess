# Xadrez 3D

Jogo de xadrez 3D para navegador, com partidas **locais**, **contra o bot** e **online**. O online funciona **sem servidor, sem banco de dados e sem conta**: os navegadores se conectam diretamente por WebRTC usando [Trystero](https://github.com/dmotz/trystero) e relays públicos do protocolo Nostr apenas para a descoberta inicial. O bot também roda inteiro no navegador, sem backend.

O projeto é 100% estático e foi feito para rodar no **GitHub Pages**.

![Xadrez 3D](https://img.shields.io/badge/3D-Three.js-6ee7b7) ![P2P](https://img.shields.io/badge/online-P2P%20WebRTC-38bdf8) ![Bot](https://img.shields.io/badge/bot-local-6ee7b7) ![Sem backend](https://img.shields.io/badge/backend-nenhum-fbbf24)

## Recursos

- Tabuleiro 3D com peças animadas, câmera orbital e giro do tabuleiro.
- **Partida local** no mesmo dispositivo, sem internet.
- **Partida contra o bot** com 6 níveis de dificuldade e 4 estilos de jogo.
- **Partida rápida** com fila automática.
- **Salas privadas** com código de 5 caracteres e link de convite.
- **Salas públicas** listadas enquanto o anfitrião estiver online.
- **Contador ao vivo** de pessoas online, na fila e em partida (P2P, sem servidor).
- **Espectadores** podem entrar em salas em andamento e usar o chat.
- **Chat** entre jogadores e espectadores.
- **Relógios** com incremento (1+0, 3+0, 3+2, 5+0, 5+3, 10+0, 10+5, 15+10 e sem tempo).
- **Revanche** com troca automática de cores, inclusive contra o bot.
- Empate por acordo, desistência, abandono e tempo esgotado.
- **Desfazer** no modo local e contra o bot (remove também a resposta do bot).
- **Temas** de tabuleiro: clássico, mármore, neon, floresta, pôr do sol e gelo.
- **Skins** de peças: clássica, mármore, metal, neon, vidro e madeira.
- **Efeitos especiais** de captura, xeque e movimento, com opção de desligar.
- **Sons** gerados por Web Audio, com opção de desligar.
- Configurações e preferências do bot salvas no `localStorage` do navegador.
- Layout responsivo, com painel recolhível e tabuleiro maior no celular.

## Regras implementadas

O motor cobre as regras completas do xadrez:

- Movimentos legais de todas as peças.
- Xeque, xeque-mate e afogamento.
- Roque curto e longo, com verificação de casas atacadas.
- Captura en passant.
- Promoção com escolha de dama, torre, bispo ou cavalo.
- Empate por material insuficiente.
- Reivindicação de empate por repetição tripla.
- Reivindicação de empate após 50 lances sem captura ou movimento de peão.
- Empate automático após 75 lances sem captura ou movimento de peão ou repetição quíntupla.
- Notação dos lances no painel.
- Desfazer no modo local e contra o bot.

## Como funciona o online

```text
Navegador A (anfitrião)  <==== WebRTC (dados da partida) ====>  Navegador B
          \                                                         /
           \____ relays públicos Nostr (só descoberta/SDP) _______/
```

- Quem cria a sala é o **anfitrião autoritativo**: mantém o estado da partida em memória, valida os lances e transmite o estado aos convidados.
- O estado do jogo viaja **direto entre os navegadores**. Os relays públicos só ajudam os peers a se encontrarem; não recebem o tabuleiro nem o chat.
- Não existe persistência: se o anfitrião fechar a página, a sala termina.
- Não é necessário criar conta, configurar Firebase ou subir qualquer servidor.

### Contador de jogadores online

- Cada aba entra numa sala P2P de presença (`presence-v1-2026`) e anuncia o próprio estado a cada 5 segundos: no lobby, na fila ou em partida.
- O contador é uma **estimativa**: mostra as abas conectadas à sala de presença, não usuários únicos.
- Pode ser desativado em **Configurações → Aparecer no contador online**. Com ele desligado, o site não abre a sala de presença.
- Como toda a rede é P2P, a presença também é um mesh: em picos muito altos de público, o número de conexões cresce com o quadrado de participantes. Para escala grande, o ideal é trocar a presença por um serviço com servidor.

## Jogar localmente

1. Abra o `index.html` diretamente no navegador, ou rode um servidor estático.
2. Clique em **Entrar** → **Jogar local (mesmo dispositivo)**.
3. Clique em uma peça e depois na casa de destino.

O modo local funciona até abrindo o arquivo com `file://` — o Three.js é servido localmente pela pasta `vendor/`.

## Jogar contra o bot

1. Abra a aba **Contra o bot**.
2. Escolha a dificuldade, o estilo, a sua cor e o controle de tempo.
3. Clique em **Jogar contra o bot**.

O bot roda no próprio navegador, sem conta e sem internet depois de carregado. A busca acontece em um **Web Worker** para não travar a interface; se o worker não estiver disponível (por exemplo, abrindo via `file://`), a busca roda na thread principal.

### Níveis

| Nível | Nome | Elo aprox. | Como joga |
| --- | --- | --- | --- |
| 1 | Patinho | ~400 | Imprevisível, às vezes entrega peças. |
| 2 | Aprendiz | ~800 | Vê capturas simples, ainda erra tática. |
| 3 | Tático | ~1200 | Calcula algumas jogadas e pune peças soltas. |
| 4 | Veterano | ~1600 | Profundidade 3, erros raros. |
| 5 | Mestre | ~2000 | Busca profunda e boa avaliação posicional. |
| 6 | Grão-mestre | ~2300 | O nível mais forte, com mais tempo de busca. |

### Estilos

- **Equilibrado**: mistura ataque, defesa e posição.
- **Agressivo**: gosta de atacar o rei e criar complicações.
- **Defensivo**: protege o rei, os peões e evita riscos.
- **Posicional**: valoriza casas boas, mobilidade e peões saudáveis.

As preferências de nível, estilo, cor e tempo ficam salvas no `localStorage`. Durante a partida contra o bot também há relógio, empate, desistência, desfazer e revanche com troca de cores.

## Jogar online

### Partida rápida

1. Escolha o controle de tempo e a cor.
2. Clique em **Buscar partida**.
3. Quando outro jogador estiver procurando ao mesmo tempo, a sala é criada automaticamente.

### Criar uma sala

1. Abra a aba **Criar sala**.
2. Escolha nome, tempo, cor e visibilidade.
3. Clique em **Criar sala**.
4. Compartilhe o código ou o link de convite.

### Entrar por código ou link

- Digite o código na aba **Entrar**.
- Ou abra um link no formato `https://SEU-USUARIO.github.io/SEU-REPO/?room=CODIGO`.

### Salas públicas

A aba **Salas públicas** mostra as salas anunciadas pelos anfitriões. Salas aguardando adversário aparecem como **Entrar**; salas em andamento aparecem como **Assistir**.

> O anfitrião precisa estar online. Não há lista permanente de salas.

## Controles

- **Clique/toque** em uma peça e depois na casa de destino.
- **Arraste** para girar a câmera.
- **Scroll/pinça** para aproximar ou afastar.
- Botão **⇄** gira o tabuleiro.
- Botão **⚙** abre as configurações.
- No celular, o painel inferior começa recolhido: toque na alça para expandir e ver lances, chat e status.
- **Esc** cancela a seleção ou fecha modais.

## Publicar no GitHub Pages

### Opção 1: workflow incluído (recomendado)

1. Crie um repositório no GitHub e envie os arquivos.
2. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
3. Faça um push para a branch `main` ou `master`.
4. O workflow `.github/workflows/pages.yml` publica o site automaticamente.
5. Acesse `https://SEU-USUARIO.github.io/SEU-REPO/`.

### Opção 2: publicação manual

1. Envie os arquivos para o repositório.
2. Em **Settings → Pages**, escolha **Deploy from a branch**.
3. Selecione a branch e a pasta raiz (`/`).
4. Salve e aguarde alguns minutos.

> O modo online precisa de **HTTPS** (ou `localhost`). O GitHub Pages já fornece HTTPS.

Para indexação no Google (Search Console, sitemap, backlinks e expectativas), veja [SEO.md](SEO.md).

## Estrutura do projeto

```text
index.html          Interface (lobby, jogo, painel, modais)
style.css           Estilos, temas visuais e responsividade
engine.js           Regras do xadrez, FEN, lances legais (window.Chess)
bot.js              Avaliação, livro e busca alfa-beta do bot (window.Bot)
bot-worker.js       Worker que executa a busca fora da thread da interface
board3d.js          Cena Three.js, peças, temas, skins e efeitos (window.Board3D)
vendor/             Three.js, OrbitControls e Trystero servidos localmente
app.js              Lobby P2P, bot, salas, relógios, chat e interface (window.__xadrez)
.nojekyll           Impede o processamento Jekyll no GitHub Pages
robots.txt          Regras de rastreamento para buscadores
sitemap.xml         Mapa do site para o Google e o Bing
site.webmanifest    Metadados de aplicativo instalável (PWA)
SEO.md              Checklist de indexação e divulgação
.github/workflows/  Publicação automática no GitHub Pages
```

Dependências:

- Three.js `0.155.0` e OrbitControls `0.147.0`, servidos localmente em `vendor/`.
- Trystero `0.26.0` (estratégia Nostr, com `@trystero-p2p/core` e `@noble/secp256k1` embutidos), servido localmente em `vendor/trystero/trystero.js`. Se o arquivo local falhar, o app tenta o CDN do jsDelivr como reserva.
- A configuração de ICE inclui STUN do Google/Cloudflare e relays TURN públicos de melhor esforço (free-solutions, p2pd, BetterCrewLink e QuickBlox), definidos em `TURN_SERVERS` no início de `app.js`. Todos foram validados com uma alocação TURN real.

## Limitações importantes

- **Sem servidor próprio**: a disponibilidade depende dos relays públicos do Trystero. Se um relay bloquear eventos, o Trystero tenta outros automaticamente.
- **NAT restritivo**: alguns provedores (especialmente CGNAT de internet móvel) impedem a conexão direta entre dois navegadores. O app tenta relays TURN públicos, mas eles têm limite de tráfego e podem falhar. Para uso intenso, troque `TURN_SERVERS` por um TURN próprio (coturn) ou por credenciais temporárias de um provedor.
- **O anfitrião precisa ficar online**: fechar a aba encerra a sala.
- **Recarregar a página** durante uma partida encerra a sua participação. O anfitrião aguarda 10 segundos e depois pode encerrar por abandono.
- **Sem persistência**: partidas, chat e configurações de sala ficam em memória. Apenas as preferências visuais e as do bot ficam no `localStorage`.
- **Sem anti-cheat forte**: o anfitrião valida os lances, mas o modelo é P2P e não há árbitro externo.
- **Relógios**: o anfitrião mede o tempo; os convidados estimam o relógio localmente a partir do último estado recebido.
- **Bot**: a força é aproximada e limitada pelo tempo de busca no navegador. Em celulares mais fracos, os níveis 5 e 6 podem demorar um pouco mais.

### Se a entrada na sala não completar

O carregamento agora tem limite e mostra um erro com **Tentar novamente** e **Voltar ao lobby** em vez de girar para sempre. Se o erro aparecer:

1. Confirme com o anfitrião que a sala continua aberta e que o código está correto.
2. Desative VPN, bloqueadores de anúncio e o modo econômico do navegador.
3. Troque de rede: Wi-Fi ↔ dados móveis. Redes corporativas e escolares costumam bloquear WebRTC.
4. Se estiverem em redes diferentes, o relay TURN é o caminho; ele pode demorar alguns segundos.
5. Em último caso, os dois podem usar a mesma rede Wi-Fi para confirmar que o problema é o NAT do provedor.

O console do navegador (`F12` → Console) mostra mensagens `WebRTC:` com o motivo exato da falha de ICE.

### Aviso normal no console

Você pode ver mensagens como:

```text
Trystero: relay failure ... blocked: event kind 22209 not allowed
```

Isso é normal: significa que um relay público recusou um tipo de evento, e o Trystero continuou por outros relays.

## Testes automatizados

O motor de xadrez possui testes com o runner nativo do Node.js:

```bash
npm test
```

O workflow do GitHub Actions executa essa suíte antes de publicar no GitHub Pages.

## Desenvolvimento local

Como o projeto usa módulos dinâmicos e WebRTC, prefira servir por HTTP:

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.

Para testar o online, abra a mesma URL em dois navegadores ou em uma janela anônima. Os dois precisam estar online ao mesmo tempo.

## Solução de problemas

- **“P2P indisponível”**: verifique a internet e se o CDN `cdn.jsdelivr.net` está acessível.
- **Sala não encontrada**: confirme o código e se o anfitrião continua com a página aberta.
- **Não conecta com outra pessoa**: tente outra rede (celular como roteador, por exemplo). NAT restritivo pode bloquear o WebRTC.
- **Tabuleiro não aparece**: confira se a pasta `vendor/` foi publicada e se o navegador tem WebGL habilitado.
- **Chat não aparece no modo local**: o chat existe apenas em partidas online.
- **Bot demora ou não responde**: recarregue a página. Em `file://` o worker é desativado e a busca roda na thread principal, o que pode deixar a interface lenta nos níveis mais altos.
- **Painel ocupa muito espaço no celular**: toque na alça do painel para recolher. Ele já começa recolhido ao entrar em uma partida.

## Licença

Uso livre para estudo, diversão e adaptação. Three.js, Trystero e OrbitControls mantêm suas próprias licenças.


## Site, idiomas e treinamento

O site tem uma home editorial e rotas separadas para jogar, aprender, praticar e consultar regras. O conteúdo está disponível em português, inglês, espanhol e chinês simplificado:

| Página | Português | English | Español | 简体中文 |
| --- | --- | --- | --- | --- |
| Início | `/` | `/en/` | `/es/` | `/zh-cn/` |
| Sobre | `/sobre/` | `/en/about/` | `/es/acerca/` | `/zh-cn/about/` |
| Aprender | `/aprender/` | `/en/learn/` | `/es/aprender/` | `/zh-cn/learn/` |
| Praticar | `/praticar/` | `/en/practice/` | `/es/practica/` | `/zh-cn/practice/` |
| Desafios | `/desafios/` | `/en/challenges/` | `/es/desafios/` | `/zh-cn/challenges/` |
| Regras | `/regras/` | `/en/rules/` | `/es/reglas/` | `/zh-cn/rules/` |
| Jogar | `/jogar/` | `/en/play/` | `/es/jugar/` | `/zh-cn/play/` |

### Treinamento interativo

A página de prática oferece quatro posições validadas pelo motor: mate em um lance, captura da dama, roque e promoção. O desafio diário alterna entre elas conforme a data local. Tentativas, exercícios resolvidos e sequência ficam no `localStorage` do navegador; não há conta, sincronização entre dispositivos ou ranking global.

Os arquivos `site.css` e `site.js` definem o design system e a navegação das páginas públicas. `practice.js` integra o treinador ao motor `engine.js` e à cena `board3d.js`. `game-i18n.js` traduz os principais textos do lobby do jogo.

O sitemap e as instruções de indexação estão em [SEO.md](SEO.md). Para publicar, o workflow existente do GitHub Pages continua copiando a árvore estática do repositório e executando `npm test` antes do deploy.
