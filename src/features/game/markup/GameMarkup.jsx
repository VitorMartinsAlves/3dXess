export function GameBoardStage() { return (<div id="app"><div id="board-2d" className="board-stage"></div><div id="board-3d" className="board-stage hidden"></div></div>); }

export function GameLobby() { return (<div id="lobby" className="screen">
    <a className="game-skip-link" href="#lobby-intro">Pular para o conteúdo</a>
    <div className="lobby-wrap" role="main">
      <header className="lobby-head">
        <div className="brand big">
          <span className="brand-icon" aria-hidden="true">&#9822;</span>
          <div>
            <h1>Xadrez 3D <span className="tag">Online</span></h1>
            <p>Salas, partidas rápidas e links de convite</p>
          </div>
        </div>
        <div className="lobby-head-actions">
          <a href="/3dXess/" className="site-return-link">← Início</a>
          <select id="game-language-switch" className="lobby-language" aria-label="Idioma">
            <option value="pt-BR">PT · Português</option>
            <option value="en">EN · English</option>
            <option value="es">ES · Español</option>
            <option value="zh-CN">中文 · 简体</option>
          </select>
          <button id="open-settings-lobby" className="icon-btn" type="button" title="Configurações" aria-label="Configurações">&#9881;</button>
        </div>
      </header>

      <nav className="game-site-nav" aria-label="Navegação do site">
        <a className="game-nav-link" data-game-route="home" href="/3dXess/">Início</a>
        <a className="game-nav-link" data-game-route="learn" href="/3dXess/aprender/">Aprender</a>
        <a className="game-nav-link" data-game-route="practice" href="/3dXess/praticar/">Praticar</a>
        <a className="game-nav-link" data-game-route="challenges" href="/3dXess/desafios/">Desafios</a>
        <a className="game-nav-link" data-game-route="account" href="/3dXess/conta/" target="_blank" rel="noopener noreferrer" aria-label="Abrir a conta em uma nova aba">Conta</a>
      </nav>

      <div className="live-stats" id="live-stats" aria-label="Atividade agora no site">
        <span className="live-item" title="Pessoas com o jogo aberto agora">
          <span className="live-dot"></span><strong id="live-online">—</strong>&nbsp;online
        </span>
        <span className="live-item" title="Pessoas procurando partida rápida agora">
          <span className="live-dot searching"></span><strong id="live-searching">—</strong>&nbsp;na fila
        </span>
        <span className="live-item" title="Partidas em andamento agora">
          <span className="live-dot playing"></span><strong id="live-playing">—</strong>&nbsp;em partida
        </span>
      </div>

      <section className="lobby-preferences" aria-label="Preferências da partida">
        <div className="nick-row">
          <label htmlFor="nickname">Seu nome</label>
          <input id="nickname" type="text" maxLength="20" placeholder="Jogador" autoComplete="nickname" />
          <span id="net-status" className="fb-status" title="Status da conexão P2P">conectando P2P…</span>
        </div>

        <section className="board-mode-picker" aria-labelledby="board-mode-label">
          <div className="board-mode-picker-copy">
            <strong id="board-mode-label">Visual do tabuleiro</strong>
            <small>Você pode trocar depois</small>
          </div>
          <div className="board-mode-options" role="group" aria-label="Visual do tabuleiro">
            <button className="board-mode-option active" type="button" data-board-mode="2d" aria-pressed="true">
              <span className="board-mode-option-name">2D · Leve</span>
              <span className="board-mode-option-description">Menos uso de recursos</span>
            </button>
            <button className="board-mode-option" type="button" data-board-mode="3d" aria-pressed="false">
              <span className="board-mode-option-name">3D · Imersivo</span>
              <span className="board-mode-option-description">Peças e câmera 3D</span>
            </button>
          </div>
        </section>
      </section>

      <div id="lobby-intro" className="lobby-intro" tabIndex="-1">
        <h2>Escolha como jogar</h2>
        <p>Partidas online, desafios contra o bot ou salas com amigos.</p>
      </div>

      <nav className="tabs" role="tablist" aria-label="Modos de jogo">
        <button id="tab-btn-quick" className="tab active" data-tab="quick" type="button" role="tab" aria-controls="tab-quick" aria-selected="true" tabIndex="0">Partida rápida</button>
        <button id="tab-btn-bot" className="tab" data-tab="bot" type="button" role="tab" aria-controls="tab-bot" aria-selected="false" tabIndex="-1">Contra o bot</button>
        <button id="tab-btn-create" className="tab" data-tab="create" type="button" role="tab" aria-controls="tab-create" aria-selected="false" tabIndex="-1">Criar sala</button>
        <button id="tab-btn-join" className="tab" data-tab="join" type="button" role="tab" aria-controls="tab-join" aria-selected="false" tabIndex="-1">Entrar</button>
        <button id="tab-btn-public" className="tab" data-tab="public" type="button" role="tab" aria-controls="tab-public" aria-selected="false" tabIndex="-1">Salas públicas</button>
      </nav>

      <section id="tab-quick" className="tab-panel active" role="tabpanel" aria-labelledby="tab-btn-quick" aria-hidden="false" tabIndex="0">
        <div className="panel-intro">
          <h2>Encontre um adversário</h2>
          <p>Busque automaticamente alguém com as mesmas preferências. Os dois precisam estar online ao mesmo tempo.</p>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="quick-tc">Controle de tempo</label>
            <select id="quick-tc">
              <option value="1+0">1 min</option>
              <option value="3+0">3 min</option>
              <option value="3+2">3 min + 2s</option>
              <option value="5+0">5 min</option>
              <option value="5+3">5 min + 3s</option>
              <option value="10+0">10 min</option>
              <option value="10+5">10 min + 5s</option>
              <option value="15+10">15 min + 10s</option>
              <option value="unlimited">Sem tempo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="quick-color">Cor</label>
            <select id="quick-color">
              <option value="random">Aleatória</option>
              <option value="w">Brancas</option>
              <option value="b">Pretas</option>
            </select>
          </div>
        </div>
        <button id="quick-match" className="primary big-btn" type="button">Buscar partida</button>
        <button id="cancel-match" className="ghost big-btn hidden" type="button">Cancelar busca</button>
        <div className="local-play-card">
          <div>
            <strong>Jogar no mesmo dispositivo</strong>
            <small>Uma partida local, sem internet ou conta.</small>
          </div>
          <button id="local-play" className="ghost" type="button">Jogar local</button>
        </div>
        <div id="match-status" className="match-status hidden"></div>
      </section>

      <section id="tab-bot" className="tab-panel" role="tabpanel" aria-labelledby="tab-btn-bot" aria-hidden="true" tabIndex="0">
        <div className="panel-intro">
          <h2>Desafie o computador</h2>
          <p>Escolha a dificuldade, o estilo de jogo, sua cor e o tempo da partida.</p>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="bot-level">Dificuldade</label>
            <select id="bot-level">
              <option value="1">Muito fácil · Patinho (~400)</option>
              <option value="2">Fácil · Aprendiz (~800)</option>
              <option value="3">Médio · Tático (~1200)</option>
              <option value="4">Difícil · Veterano (~1600)</option>
              <option value="5">Muito difícil · Mestre (~2000)</option>
              <option value="6">Mestre · Grão-mestre (~2300)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bot-style">Estilo do bot</label>
            <select id="bot-style">
              <option value="balanced">Equilibrado</option>
              <option value="aggressive">Agressivo</option>
              <option value="defensive">Defensivo</option>
              <option value="positional">Posicional</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bot-color">Sua cor</label>
            <select id="bot-color">
              <option value="random">Aleatória</option>
              <option value="w">Brancas</option>
              <option value="b">Pretas</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bot-tc">Controle de tempo</label>
            <select id="bot-tc">
              <option value="1+0">1 min</option>
              <option value="3+0">3 min</option>
              <option value="3+2">3 min + 2s</option>
              <option value="5+0">5 min</option>
              <option value="5+3">5 min + 3s</option>
              <option value="10+0">10 min</option>
              <option value="10+5">10 min + 5s</option>
              <option value="15+10">15 min + 10s</option>
              <option value="unlimited">Sem tempo</option>
            </select>
          </div>
        </div>
        <div id="bot-level-desc" className="bot-desc"></div>
        <button id="bot-play" className="primary big-btn" type="button">Jogar contra o bot</button>
        <p className="hint small">O bot usa o mesmo motor de regras e não precisa de internet nem de conta.</p>
      </section>

      <section id="tab-create" className="tab-panel" role="tabpanel" aria-labelledby="tab-btn-create" aria-hidden="true" tabIndex="0">
        <div className="panel-intro">
          <h2>Crie uma sala</h2>
          <p>Configure a partida e compartilhe o convite com outra pessoa.</p>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="create-name">Nome da sala</label>
            <input id="create-name" type="text" maxLength="30" placeholder="Sala do campeonato" />
          </div>
          <div className="field">
            <label htmlFor="create-tc">Controle de tempo</label>
            <select id="create-tc">
              <option value="1+0">1 min</option>
              <option value="3+0">3 min</option>
              <option value="3+2">3 min + 2s</option>
              <option value="5+0">5 min</option>
              <option value="5+3">5 min + 3s</option>
              <option value="10+0">10 min</option>
              <option value="10+5">10 min + 5s</option>
              <option value="15+10">15 min + 10s</option>
              <option value="unlimited">Sem tempo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="create-color">Sua cor</label>
            <select id="create-color">
              <option value="random">Aleatória</option>
              <option value="w">Brancas</option>
              <option value="b">Pretas</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="create-visibility">Visibilidade</label>
            <select id="create-visibility">
              <option value="public">Pública (aparece na lista)</option>
              <option value="private">Privada (só por link)</option>
            </select>
          </div>
        </div>
        <button id="create-room" className="primary big-btn" type="button">Criar sala</button>
        <p className="hint small">Você recebe um código e um link para convidar quem quiser.</p>
      </section>

      <section id="tab-join" className="tab-panel" role="tabpanel" aria-labelledby="tab-btn-join" aria-hidden="true" tabIndex="0">
        <div className="panel-intro">
          <h2>Entre com um convite</h2>
          <p>Digite o código da sala ou abra diretamente o link que recebeu. O anfitrião precisa estar online.</p>
        </div>
        <div className="join-row">
          <input id="join-code" type="text" maxLength="8" placeholder="CÓDIGO" autoCapitalize="characters" spellCheck="false" />
          <button id="join-btn" className="primary" type="button">Entrar</button>
        </div>
      </section>

      <section id="tab-public" className="tab-panel" role="tabpanel" aria-labelledby="tab-btn-public" aria-hidden="true" tabIndex="0">
        <div className="panel-intro">
          <h2>Salas disponíveis</h2>
          <p>Entre em uma partida pública que esteja aguardando outro jogador.</p>
        </div>
        <div className="public-head">
          <span id="public-count">Carregando salas…</span>
          <button id="refresh-public" className="icon-btn small" type="button" title="Atualizar">&#8635;</button>
        </div>
        <div id="public-rooms" className="public-rooms">
          <div className="empty-state">As salas aparecem aqui enquanto o anfitrião estiver online.</div>
        </div>
      </section>

      <footer className="lobby-foot">
        <span>100% navegador · conexão P2P (WebRTC)</span>
        <span id="uid-label" className="muted"></span>
      </footer>

      
      
    </div>
  </div>); }

export function GameSession() { return (<div id="game-ui" className="hidden" role="main">
    <header id="topbar">
      <button id="home-btn" className="brand compact" type="button" title="Voltar ao lobby">
        <span className="brand-icon">&#9822;</span>
        <div>
          <span className="game-title">Xadrez 3D</span>
          <p id="game-subtitle">Modo local</p>
        </div>
      </button>

      <div className="room-chip hidden" id="room-chip">
        <span className="muted">Sala</span>
        <strong id="room-code">-----</strong>
        <button id="copy-invite" className="icon-btn small" type="button" title="Copiar link de convite">&#128279;</button>
      </div>

      <div className="actions">
        <a id="game-account-link" className="site-game-account-link" data-game-route="account" href="/3dXess/conta/" target="_blank" rel="noopener noreferrer" aria-label="Abrir a conta em uma nova aba">
          <span>Conta</span><span aria-hidden="true">↗</span>
        </a>
      <div className="board-mode-switch" role="group" aria-label="Visual do tabuleiro">
        <button className="board-mode-switch-btn" type="button" data-board-mode="2d" aria-label="Modo 2D" title="Modo 2D" aria-pressed="true">2D</button>
        <button className="board-mode-switch-btn" type="button" data-board-mode="3d" aria-label="Modo 3D" title="Modo 3D" aria-pressed="false">3D</button>
      </div>
        <button id="flip-btn" className="icon-btn" type="button" title="Girar tabuleiro" aria-label="Girar tabuleiro">&#8646;</button>
        <button id="settings-btn" className="icon-btn" type="button" title="Configurações" aria-label="Configurações">&#9881;</button>
        <button id="undo-btn" className="ghost hidden" type="button" title="Desfazer">&#8630;</button>
        <button id="new-local-btn" className="ghost hidden" type="button" title="Novo jogo" aria-label="Novo jogo"><span className="wide-label">Novo jogo</span><span className="narrow-label">&#8635;</span></button>
        <button id="leave-btn" className="ghost hidden" type="button">Sair da sala</button>
      </div>
    </header>

    <aside id="panel">
      <button id="panel-toggle" className="panel-toggle" type="button" aria-label="Expandir painel" aria-expanded="false" title="Expandir painel">
        <span className="panel-grip"></span>
        <span className="panel-chevron">&#9662;</span>
      </button>

      <div className="player-card" id="player-top">
        <span className="pdot black" id="top-dot"></span>
        <div className="pinfo">
          <strong id="top-name">Pretas</strong>
          <span id="top-role" className="muted">aguardando…</span>
        </div>
        <span className="clock" id="top-clock">--:--</span>
      </div>

      <div className="panel-mid">
        <div id="turn" className="turn-line">
          <span id="turn-dot" className="dot white"></span>
          <span id="turn-text">Vez das brancas</span>
        </div>
        <div id="status" className="status">Selecione uma peça para começar.</div>
        <div id="spectators" className="muted tiny hidden"></div>
      </div>

      <div className="panel-tabs">
        <button className="ptab active" data-ptab="moves" type="button">Lances</button>
        <button className="ptab" data-ptab="chat" type="button">Chat <span id="chat-badge" className="badge hidden">0</span></button>
      </div>

      <div id="pane-moves" className="pane active">
        <div id="move-list" className="move-list">
          <div className="empty">Nenhum lance ainda</div>
        </div>
      </div>

      <div id="pane-chat" className="pane">
        <div id="chat-messages" className="chat-messages">
          <div className="empty">Sem mensagens.</div>
        </div>
        <form id="chat-form" className="chat-form" autoComplete="off">
          <input id="chat-input" type="text" maxLength="300" placeholder="Escreva uma mensagem…" />
          <button className="primary" type="submit" title="Enviar">&#10148;</button>
        </form>
      </div>

      <div className="player-card" id="player-bottom">
        <span className="pdot white" id="bottom-dot"></span>
        <div className="pinfo">
          <strong id="bottom-name">Brancas</strong>
          <span id="bottom-role" className="muted">você</span>
        </div>
        <span className="clock" id="bottom-clock">--:--</span>
      </div>
    </aside>

    <div id="room-actions" className="room-actions hidden">
      <button id="draw-btn" className="ghost" type="button">Empate</button>
      <button id="resign-btn" className="ghost danger" type="button">Desistir</button>
      <button id="rematch-btn" className="primary hidden" type="button">Revanche</button>
    </div>

    <div id="waiting-banner" className="waiting-banner hidden">
      <span className="pulse-dot"></span>
      <span id="waiting-text">Aguardando o adversário entrar…</span>
      <button id="copy-invite-2" className="ghost small" type="button">Copiar convite</button>
    </div>
  </div>); }

export function GameNotifications() { return (<div id="toasts" className="toasts" aria-live="polite"></div>); }

export function GameDialogs() { return (<><div id="promotion" className="modal hidden" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="promotion-title" aria-describedby="promotion-description">
    <div className="modal-card">
      <h2 id="promotion-title">Promoção</h2>
      <p id="promotion-description">Escolha a peça para promover</p>
      <div className="promo-buttons">
        <button type="button" data-piece="q" aria-label="Dama">&#9813;</button>
        <button type="button" data-piece="r" aria-label="Torre">&#9814;</button>
        <button type="button" data-piece="b" aria-label="Bispo">&#9815;</button>
        <button type="button" data-piece="n" aria-label="Cavalo">&#9816;</button>
      </div>
    </div>
  </div>
<div id="settings" className="modal hidden" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="settings-title">
    <div className="modal-card wide">
      <div className="modal-head">
        <h2 id="settings-title">Configurações</h2>
        <button id="close-settings" className="icon-btn small" type="button" aria-label="Fechar">&times;</button>
      </div>

      <div className="settings-group">
        <label className="switch-row">
          <span>Efeitos especiais</span>
          <input id="opt-effects" type="checkbox" defaultChecked />
          <span className="switch"></span>
        </label>
        <label className="switch-row">
          <span>Sons</span>
          <input id="opt-sound" type="checkbox" defaultChecked />
          <span className="switch"></span>
        </label>
        <label className="switch-row">
          <span>Girar automático para a minha cor</span>
          <input id="opt-autofocus" type="checkbox" defaultChecked />
          <span className="switch"></span>
        </label>
        <label className="switch-row">
          <span>Aparecer no contador online<small className="switch-note">Compartilha seu IP via P2P, como nas partidas</small></span>
          <input id="opt-presence" type="checkbox" defaultChecked />
          <span className="switch"></span>
        </label>
      </div>

      <div className="settings-group">
        <div className="field">
          <label htmlFor="opt-theme">Tema do cenário e tabuleiro</label>
          <select id="opt-theme"></select>
        </div>
        <div className="field">
          <label htmlFor="opt-skin">Acabamento das peças</label>
          <select id="opt-skin"></select>
        </div>
        <p className="hint small">O tema Natal também aplica o acabamento especial às peças e ativa a neve e a decoração natalina no cenário 3D.</p>
      </div>

      <div className="settings-group">
        <div className="field">
          <label htmlFor="opt-nickname">Seu nome</label>
          <input id="opt-nickname" type="text" maxLength="20" placeholder="Jogador" />
        </div>
      </div>

      <div className="modal-foot">
        <button id="reset-camera" className="ghost" type="button">Centralizar câmera</button>
        <button id="save-settings" className="primary" type="button">Salvar</button>
      </div>
    </div>
  </div>
<div id="result" className="modal hidden" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="result-title" aria-describedby="result-text">
    <div className="modal-card">
      <h2 id="result-title">Fim de jogo</h2>
      <p id="result-text"></p>
      <div className="modal-foot center">
        <button id="result-rematch" className="primary hidden" type="button">Revanche</button>
        <button id="result-close" className="ghost" type="button">Ver tabuleiro</button>
      </div>
    </div>
  </div>
<div id="confirm" className="modal hidden" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
    <div className="modal-card">
      <h2 id="confirm-title">Confirmar</h2>
      <p id="confirm-text"></p>
      <div className="modal-foot center">
        <button id="confirm-no" className="ghost" type="button">Cancelar</button>
        <button id="confirm-yes" className="primary danger-btn" type="button">Confirmar</button>
      </div>
    </div>
  </div>
<div id="loader" className="modal hidden" hidden>
    <div className="loader-card">
      <div className="spinner"></div>
      <p id="loader-text">Conectando…</p>
      <p id="loader-hint" className="loader-hint hidden"></p>
      <div id="loader-extra" className="loader-extra hidden">
        <div className="loader-actions">
          <button id="loader-retry" className="primary" type="button">Tentar novamente</button>
          <button id="loader-cancel" className="ghost" type="button">Voltar ao lobby</button>
        </div>
      </div>
    </div>
  </div></>); }
