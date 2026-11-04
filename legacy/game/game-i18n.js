(() => {
  "use strict";
  const lang = document.documentElement.lang || "pt-BR";
  const dictionaries = {
    en: {
      "Preferências da partida":"Game preferences","Modos de jogo":"Game modes","Você pode trocar depois":"You can change this later",
      "Menos uso de recursos":"Uses fewer resources","Peças e câmera 3D":"3D pieces and camera","Escolha como jogar":"Choose how to play","Partidas online, desafios contra o bot ou salas com amigos.":"Online games, bot challenges, or rooms with friends.",
      "Encontre um adversário":"Find an opponent","Busque automaticamente alguém com as mesmas preferências. Os dois precisam estar online ao mesmo tempo.":"Automatically find someone with the same preferences. Both players need to be online at the same time.",
      "Desafie o computador":"Challenge the computer","Escolha a dificuldade, o estilo de jogo, sua cor e o tempo da partida.":"Choose the difficulty, play style, your color, and the time control.",
      "Crie uma sala":"Create a room","Configure a partida e compartilhe o convite com outra pessoa.":"Set up the game and share the invite with someone else.",
      "Entre com um convite":"Join with an invite","Digite o código da sala ou abra diretamente o link que recebeu. O anfitrião precisa estar online.":"Enter the room code or open the link you received. The host needs to be online.",
      "Salas disponíveis":"Available rooms","Entre em uma partida pública que esteja aguardando outro jogador.":"Join a public game that is waiting for another player.",
      "Jogar no mesmo dispositivo":"Play on the same device","Uma partida local, sem internet ou conta.":"A local game, with no internet or account required.","Jogar local":"Local game",
      "Visual do tabuleiro":"Board view","Escolha como prefere jogar":"Choose how you want to play","2D · Leve":"2D · Lightweight","Ideal para PCs modestos":"Best for lower-end PCs","3D · Imersivo":"3D · Immersive","Vista tridimensional e peças 3D":"3D perspective and 3D pieces","Modo 2D":"2D mode","Modo 3D":"3D mode","O modo 3D não está disponível neste navegador. O jogo continuará em 2D.":"3D mode is unavailable in this browser. The game will continue in 2D.","O modo 3D não carregou. A partida foi mantida em 2D.":"3D mode could not load. The game will continue in 2D.",
      "Xadrez 3D":"3D Chess","Salas, partidas rápidas e links de convite":"Rooms, quick games and invite links","← Início":"← Home",
      "online":"online","na fila":"searching","em partida":"playing","Seu nome":"Your name","conectando P2P…":"connecting P2P…",
      "Partida rápida":"Quick game","Contra o bot":"Play the bot","Criar sala":"Create room","Entrar":"Join","Salas públicas":"Public rooms",
      "Encontre um adversário automaticamente. Os dois precisam estar online ao mesmo tempo — a conexão é direta entre os navegadores.":"Find an opponent automatically. Both players must be online at the same time — the connection is direct between browsers.",
      "Controle de tempo":"Time control","Cor":"Color","Aleatória":"Random","Brancas":"White","Pretas":"Black","Buscar partida":"Find a game","Cancelar busca":"Cancel search",
      "Jogue sozinho contra um bot que roda no seu navegador. Escolha o nível, o estilo e o tempo.":"Play against a bot running in your browser. Choose its level, style and time control.",
      "Dificuldade":"Difficulty","Muito fácil · Patinho (~400)":"Very easy · Duckling (~400)","Fácil · Aprendiz (~800)":"Easy · Learner (~800)","Médio · Tático (~1200)":"Medium · Tactical (~1200)","Difícil · Veterano (~1600)":"Hard · Veteran (~1600)","Muito difícil · Mestre (~2000)":"Very hard · Master (~2000)","Mestre · Grão-mestre (~2300)":"Expert · Grandmaster (~2300)",
      "Estilo do bot":"Bot style","Equilibrado":"Balanced","Agressivo":"Aggressive","Defensivo":"Defensive","Posicional":"Positional","Sua cor":"Your color","Jogar contra o bot":"Play against the bot","O bot usa o mesmo motor de regras e não precisa de internet nem de conta.":"The bot uses the same rules engine and needs no account or internet connection.",
      "Nome da sala":"Room name","Visibilidade":"Visibility","Pública (aparece na lista)":"Public (listed)","Privada (só por link)":"Private (invite link only)","Você recebe um código e um link para convidar quem quiser.":"You will get a code and link to invite anyone.",
      "Digite o código de 5 caracteres ou abra o link de convite. Quem criou a sala precisa estar online.":"Enter the 5-character code or open an invite link. The room host must be online.","ou":"or","Jogar local (mesmo dispositivo)":"Local game (same device)","O modo local não precisa de internet nem de conta.":"Local play does not need an account or internet.",
      "Carregando salas…":"Loading rooms…","As salas aparecem aqui enquanto o anfitrião estiver online.":"Rooms appear here while their host is online.","100% navegador · conexão P2P (WebRTC)":"Browser-based · P2P connection (WebRTC)",
      "Sobre o jogo, como jogar e perguntas frequentes":"About the game, how to play and FAQs","Xadrez 3D online grátis, direto no navegador":"Free 3D chess online, right in your browser",
      "Modo local":"Local game","Sala":"Room","Novo jogo":"New game","Sair da sala":"Leave room","aguardando…":"waiting…","Vez das brancas":"White to move","Selecione uma peça para começar.":"Select a piece to begin.","Lances":"Moves","Chat":"Chat","Nenhum lance ainda":"No moves yet","Sem mensagens.":"No messages.","você":"you","Empate":"Draw","Desistir":"Resign","Revanche":"Rematch","Aguardando o adversário entrar…":"Waiting for your opponent to join…","Copiar convite":"Copy invite",
      "Promoção":"Promotion","Escolha a peça para promover":"Choose a piece to promote","Configurações":"Settings","Efeitos especiais":"Special effects","Sons":"Sounds","Girar automático para a minha cor":"Auto-rotate to my color","Aparecer no contador online":"Show in online counter","Compartilha seu IP via P2P, como nas partidas":"Shares your IP via P2P, as in games","Tema do tabuleiro":"Board theme","Skin das peças":"Piece style","Centralizar câmera":"Reset camera","Salvar":"Save",
      "Fim de jogo":"Game over","Ver tabuleiro":"View board","Confirmar":"Confirm","Cancelar":"Cancel","Conectando…":"Connecting…","Tentar novamente":"Try again","Voltar ao lobby":"Back to lobby","Não foi possível carregar o jogo":"The game could not be loaded","Seu navegador precisa de JavaScript e WebGL habilitados. Ative a aceleração de hardware e recarregue a página.":"Your browser needs JavaScript and WebGL. Enable hardware acceleration and reload the page.",
      "Desfazer":"Undo","Expandir painel":"Expand panel","Escreva uma mensagem…":"Write a message…","Enviar":"Send","Dama":"Queen","Torre":"Rook","Bispo":"Bishop","Cavalo":"Knight","Fechar":"Close","Jogador":"Player","Atualizar":"Refresh",
      "O bot não encontrou um lance.":"The bot could not find a move.","Não foi possível conectar":"Could not connect","Trystero local indisponível, tentando CDN:":"Local Trystero unavailable, trying CDN:","WebRTC carregado. A conexão é direta entre os navegadores.":"WebRTC loaded. The connection is direct between browsers.","P2P indisponível":"P2P unavailable","Falha ao abrir a conexão WebRTC.":"Could not open the WebRTC connection.","O anfitrião recusou o lance.":"The host rejected the move.","O anfitrião encerrou a sala.":"The host closed the room.","Conexão com o anfitrião perdida. Tentando reconectar…":"Connection to host lost. Reconnecting…","Reconectando ao anfitrião…":"Reconnecting to host…","Não foi possível reconectar ao anfitrião.":"Could not reconnect to host.","Falha ao enviar a ação. Verifique a conexão.":"Could not send the action. Check your connection.","Não é a sua vez.":"It is not your turn.","Lance inválido.":"Invalid move.","Partida rápida":"Quick game","Conectando ao adversário…":"Connecting to opponent…","Não foi possível iniciar a partida. Tente de novo.":"Could not start the game. Try again.","Você já está em uma sala.":"You are already in a room.","Não foi possível criar a sala":"Could not create room","Digite um código de sala válido.":"Enter a valid room code.","Você voltou ao lobby.":"You returned to the lobby.","O bot não carregou. Recarregue a página.":"The bot did not load. Reload the page.","Lance inválido do bot.":"Invalid bot move.","O bot não conseguiu calcular um lance.":"The bot could not calculate a move.","Configurações salvas.":"Settings saved.","Sua vez. Selecione uma peça.":"Your turn. Select a piece.","O chat está disponível apenas em partidas online.":"Chat is only available in online games."
      "Início":"Home",
      "Aprender":"Learn",
      "Praticar":"Practice",
      "Desafios":"Challenges",
      "Conta":"Account",
      "Navegação do site":"Site navigation",
      "Abrir a conta em uma nova aba":"Open account in a new tab",
    },
    es: {
      "Preferências da partida":"Preferencias de partida","Modos de jogo":"Modos de juego","Você pode trocar depois":"Puedes cambiarlo después",
      "Menos uso de recursos":"Menor consumo de recursos","Peças e câmera 3D":"Piezas y cámara 3D","Escolha como jogar":"Elige cómo jugar","Partidas online, desafios contra o bot ou salas com amigos.":"Partidas en línea, desafíos contra el bot o salas con amigos.",
      "Encontre um adversário":"Encuentra un rival","Busque automaticamente alguém com as mesmas preferências. Os dois precisam estar online ao mesmo tempo.":"Busca automáticamente a alguien con las mismas preferencias. Ambos deben estar conectados al mismo tiempo.",
      "Desafie o computador":"Desafía al ordenador","Escolha a dificuldade, o estilo de jogo, sua cor e o tempo da partida.":"Elige la dificultad, el estilo de juego, tu color y el control de tiempo.",
      "Crie uma sala":"Crea una sala","Configure a partida e compartilhe o convite com outra pessoa.":"Configura la partida y comparte la invitación con otra persona.",
      "Entre com um convite":"Únete con una invitación","Digite o código da sala ou abra diretamente o link que recebeu. O anfitrião precisa estar online.":"Introduce el código de la sala o abre el enlace que recibiste. El anfitrión debe estar conectado.",
      "Salas disponíveis":"Salas disponibles","Entre em uma partida pública que esteja aguardando outro jogador.":"Únete a una partida pública que esté esperando a otro jugador.",
      "Jogar no mesmo dispositivo":"Jugar en el mismo dispositivo","Uma partida local, sem internet ou conta.":"Una partida local, sin internet ni cuenta.","Jogar local":"Jugar local",
      "Visual do tabuleiro":"Vista del tablero","Escolha como prefere jogar":"Elige cómo quieres jugar","2D · Leve":"2D · Ligero","Ideal para PCs modestos":"Ideal para equipos modestos","3D · Imersivo":"3D · Inmersivo","Vista tridimensional e peças 3D":"Perspectiva tridimensional y piezas 3D","Modo 2D":"Modo 2D","Modo 3D":"Modo 3D","O modo 3D não está disponível neste navegador. O jogo continuará em 2D.":"El modo 3D no está disponible en este navegador. La partida continuará en 2D.","O modo 3D não carregou. A partida foi mantida em 2D.":"No se pudo cargar el modo 3D. La partida continuará en 2D.",
      "Xadrez 3D":"Ajedrez 3D","Salas, partidas rápidas e links de convite":"Salas, partidas rápidas y enlaces de invitación","← Início":"← Inicio",
      "online":"en línea","na fila":"en espera","em partida":"jugando","Seu nome":"Tu nombre","conectando P2P…":"conectando P2P…",
      "Partida rápida":"Partida rápida","Contra o bot":"Contra el bot","Criar sala":"Crear sala","Entrar":"Entrar","Salas públicas":"Salas públicas",
      "Encontre um adversário automaticamente. Os dois precisam estar online ao mesmo tempo — a conexão é direta entre os navegadores.":"Encuentra un rival automáticamente. Ambos deben estar conectados al mismo tiempo; la conexión es directa entre navegadores.",
      "Controle de tempo":"Control de tiempo","Cor":"Color","Aleatória":"Aleatoria","Brancas":"Blancas","Pretas":"Negras","Buscar partida":"Buscar partida","Cancelar busca":"Cancelar búsqueda",
      "Jogue sozinho contra um bot que roda no seu navegador. Escolha o nível, o estilo e o tempo.":"Juega contra un bot que funciona en tu navegador. Elige el nivel, estilo y tiempo.",
      "Dificuldade":"Dificultad","Muito fácil · Patinho (~400)":"Muy fácil · Patito (~400)","Fácil · Aprendiz (~800)":"Fácil · Aprendiz (~800)","Médio · Tático (~1200)":"Medio · Táctico (~1200)","Difícil · Veterano (~1600)":"Difícil · Veterano (~1600)","Muito difícil · Mestre (~2000)":"Muy difícil · Maestro (~2000)","Mestre · Grão-mestre (~2300)":"Experto · Gran maestro (~2300)",
      "Estilo do bot":"Estilo del bot","Equilibrado":"Equilibrado","Agressivo":"Agresivo","Defensivo":"Defensivo","Posicional":"Posicional","Sua cor":"Tu color","Jogar contra o bot":"Jugar contra el bot","O bot usa o mesmo motor de regras e não precisa de internet nem de conta.":"El bot usa el mismo motor de reglas y no necesita internet ni cuenta.",
      "Nome da sala":"Nombre de la sala","Visibilidade":"Visibilidad","Pública (aparece na lista)":"Pública (aparece en la lista)","Privada (só por link)":"Privada (solo con enlace)","Você recebe um código e um link para convidar quem quiser.":"Recibirás un código y un enlace para invitar a quien quieras.",
      "Digite o código de 5 caracteres ou abra o link de convite. Quem criou a sala precisa estar online.":"Escribe el código de 5 caracteres o abre el enlace de invitación. El anfitrión debe estar conectado.","ou":"o","Jogar local (mesmo dispositivo)":"Jugar local (mismo dispositivo)","O modo local não precisa de internet nem de conta.":"El modo local no requiere internet ni cuenta.",
      "Carregando salas…":"Cargando salas…","As salas aparecem aqui enquanto o anfitrião estiver online.":"Las salas aparecen aquí mientras el anfitrión esté conectado.","100% navegador · conexão P2P (WebRTC)":"En el navegador · conexión P2P (WebRTC)",
      "Sobre o jogo, como jogar e perguntas frequentes":"Sobre el juego, cómo jugar y preguntas frecuentes","Xadrez 3D online grátis, direto no navegador":"Ajedrez 3D gratis en línea, directamente en el navegador",
      "Modo local":"Modo local","Sala":"Sala","Novo jogo":"Nueva partida","Sair da sala":"Salir de la sala","aguardando…":"esperando…","Vez das brancas":"Juegan blancas","Selecione uma peça para começar.":"Selecciona una pieza para empezar.","Lances":"Jugadas","Chat":"Chat","Nenhum lance ainda":"Aún no hay jugadas","Sem mensagens.":"Sin mensajes.","você":"tú","Empate":"Tablas","Desistir":"Abandonar","Revanche":"Revancha","Aguardando o adversário entrar…":"Esperando a que entre el rival…","Copiar convite":"Copiar invitación",
      "Promoção":"Promoción","Escolha a peça para promover":"Elige la pieza para promocionar","Configurações":"Configuración","Efeitos especiais":"Efectos especiales","Sons":"Sonidos","Girar automático para a minha cor":"Girar automáticamente a mi color","Aparecer no contador online":"Aparecer en el contador en línea","Compartilha seu IP via P2P, como nas partidas":"Comparte tu IP mediante P2P, como en las partidas","Tema do tabuleiro":"Tema del tablero","Skin das peças":"Estilo de las piezas","Centralizar câmera":"Centrar cámara","Salvar":"Guardar",
      "Fim de jogo":"Fin de la partida","Ver tabuleiro":"Ver tablero","Confirmar":"Confirmar","Cancelar":"Cancelar","Conectando…":"Conectando…","Tentar novamente":"Intentar de nuevo","Voltar ao lobby":"Volver al menú","Não foi possível carregar o jogo":"No se pudo cargar el juego","Seu navegador precisa de JavaScript e WebGL habilitados. Ative a aceleração de hardware e recarregue a página.":"Tu navegador necesita JavaScript y WebGL. Activa la aceleración por hardware y recarga la página.",
      "Desfazer":"Deshacer","Expandir painel":"Expandir panel","Escreva uma mensagem…":"Escribe un mensaje…","Enviar":"Enviar","Dama":"Dama","Torre":"Torre","Bispo":"Alfil","Cavalo":"Caballo","Fechar":"Cerrar","Jogador":"Jugador","Atualizar":"Actualizar",
      "O bot não encontrou um lance.":"El bot no encontró una jugada.","Não foi possível conectar":"No se pudo conectar","P2P indisponível":"P2P no disponible","Falha ao abrir a conexão WebRTC.":"No se pudo abrir la conexión WebRTC.","O anfitrião recusou o lance.":"El anfitrión rechazó la jugada.","O anfitrião encerrou a sala.":"El anfitrión cerró la sala.","Conexão com o anfitrião perdida. Tentando reconectar…":"Se perdió la conexión con el anfitrión. Reconectando…","Reconectando ao anfitrião…":"Reconectando con el anfitrión…","Não foi possível reconectar ao anfitrião.":"No se pudo reconectar con el anfitrión.","Falha ao enviar a ação. Verifique a conexão.":"No se pudo enviar la acción. Comprueba la conexión.","Não é a sua vez.":"No es tu turno.","Lance inválido.":"Jugada no válida.","Conectando ao adversário…":"Conectando con el rival…","Não foi possível iniciar a partida. Tente de novo.":"No se pudo iniciar la partida. Inténtalo de nuevo.","Você já está em uma sala.":"Ya estás en una sala.","Não foi possível criar a sala":"No se pudo crear la sala","Digite um código de sala válido.":"Introduce un código de sala válido.","Você voltou ao lobby.":"Has vuelto al menú.","O bot não carregou. Recarregue a página.":"El bot no se cargó. Recarga la página.","Lance inválido do bot.":"Jugada no válida del bot.","O bot não conseguiu calcular um lance.":"El bot no pudo calcular una jugada.","Configurações salvas.":"Configuración guardada.","Sua vez. Selecione uma peça.":"Tu turno. Selecciona una pieza.","O chat está disponível apenas em partidas online.":"El chat solo está disponible en partidas en línea."
      "Início":"Inicio",
      "Aprender":"Aprender",
      "Praticar":"Practicar",
      "Desafios":"Desafíos",
      "Conta":"Cuenta",
      "Navegação do site":"Navegación del sitio",
      "Abrir a conta em uma nova aba":"Abrir la cuenta en una pestaña nueva",
    },
    "zh-CN": {
      "Preferências da partida":"对局偏好","Modos de jogo":"游戏模式","Você pode trocar depois":"之后可以更改",
      "Menos uso de recursos":"占用资源更少","Peças e câmera 3D":"3D 棋子和视角","Escolha como jogar":"选择游戏方式","Partidas online, desafios contra o bot ou salas com amigos.":"在线对局、电脑挑战，或与朋友创建房间。",
      "Encontre um adversário":"寻找对手","Busque automaticamente alguém com as mesmas preferências. Os dois precisam estar online ao mesmo tempo.":"自动寻找具有相同偏好的对手。双方需要同时在线。",
      "Desafie o computador":"挑战电脑","Escolha a dificuldade, o estilo de jogo, sua cor e o tempo da partida.":"选择难度、对弈风格、执棋颜色和时间控制。",
      "Crie uma sala":"创建房间","Configure a partida e compartilhe o convite com outra pessoa.":"设置对局并与其他人分享邀请链接。",
      "Entre com um convite":"通过邀请加入","Digite o código da sala ou abra diretamente o link que recebeu. O anfitrião precisa estar online.":"输入房间代码或直接打开收到的链接。房主需要保持在线。",
      "Salas disponíveis":"可加入的房间","Entre em uma partida pública que esteja aguardando outro jogador.":"加入正在等待另一位玩家的公开对局。",
      "Jogar no mesmo dispositivo":"在同一设备上对弈","Uma partida local, sem internet ou conta.":"本地对局，无需互联网或账号。","Jogar local":"本地对弈",
      "Visual do tabuleiro":"棋盘视图","Escolha como prefere jogar":"选择你喜欢的玩法","2D · Leve":"2D · 轻量","Ideal para PCs modestos":"适合配置较低的电脑","3D · Imersivo":"3D · 沉浸式","Vista tridimensional e peças 3D":"三维视角和 3D 棋子","Modo 2D":"2D 模式","Modo 3D":"3D 模式","O modo 3D não está disponível neste navegador. O jogo continuará em 2D.":"此浏览器无法使用 3D 模式。游戏将继续以 2D 运行。","O modo 3D não carregou. A partida foi mantida em 2D.":"无法加载 3D 模式。游戏将继续以 2D 运行。",
      "Xadrez 3D":"3D 国际象棋","Salas, partidas rápidas e links de convite":"房间、快速对局和邀请链接","← Início":"← 首页",
      "online":"在线","na fila":"等待中","em partida":"对局中","Seu nome":"你的名字","conectando P2P…":"正在连接 P2P…",
      "Partida rápida":"快速对局","Contra o bot":"与电脑对弈","Criar sala":"创建房间","Entrar":"加入","Salas públicas":"公开房间",
      "Encontre um adversário automaticamente. Os dois precisam estar online ao mesmo tempo — a conexão é direta entre os navegadores.":"自动寻找对手。双方需要同时在线，浏览器之间直接连接。",
      "Controle de tempo":"时间控制","Cor":"执棋颜色","Aleatória":"随机","Brancas":"白方","Pretas":"黑方","Buscar partida":"寻找对局","Cancelar busca":"取消搜索",
      "Jogue sozinho contra um bot que roda no seu navegador. Escolha o nível, o estilo e o tempo.":"与在浏览器中运行的电脑对弈。选择难度、风格和时间。",
      "Dificuldade":"难度","Muito fácil · Patinho (~400)":"非常简单 · 初学者 (~400)","Fácil · Aprendiz (~800)":"简单 · 学习者 (~800)","Médio · Tático (~1200)":"中等 · 战术型 (~1200)","Difícil · Veterano (~1600)":"困难 · 老手 (~1600)","Muito difícil · Mestre (~2000)":"非常困难 · 大师 (~2000)","Mestre · Grão-mestre (~2300)":"专家 · 特级大师 (~2300)",
      "Estilo do bot":"电脑风格","Equilibrado":"均衡","Agressivo":"进攻","Defensivo":"防守","Posicional":"局面型","Sua cor":"你的颜色","Jogar contra o bot":"与电脑对弈","O bot usa o mesmo motor de regras e não precisa de internet nem de conta.":"电脑使用相同的规则引擎，无需账号或互联网。",
      "Nome da sala":"房间名称","Visibilidade":"可见性","Pública (aparece na lista)":"公开（显示在列表中）","Privada (só por link)":"私人（仅通过链接）","Você recebe um código e um link para convidar quem quiser.":"你将获得代码和邀请链接。",
      "Digite o código de 5 caracteres ou abra o link de convite. Quem criou a sala precisa estar online.":"输入 5 位房间代码或打开邀请链接。房主必须保持在线。","ou":"或","Jogar local (mesmo dispositivo)":"本地对弈（同一设备）","O modo local não precisa de internet nem de conta.":"本地模式无需互联网或账号。",
      "Carregando salas…":"正在加载房间…","As salas aparecem aqui enquanto o anfitrião estiver online.":"房主在线时，房间会显示在这里。","100% navegador · conexão P2P (WebRTC)":"浏览器运行 · P2P 连接（WebRTC）",
      "Sobre o jogo, como jogar e perguntas frequentes":"关于游戏、玩法和常见问题","Xadrez 3D online grátis, direto no navegador":"免费在线 3D 国际象棋，直接在浏览器中运行",
      "Modo local":"本地模式","Sala":"房间","Novo jogo":"新对局","Sair da sala":"离开房间","aguardando…":"等待中…","Vez das brancas":"白方走棋","Selecione uma peça para começar.":"选择一个棋子开始。","Lances":"着法","Chat":"聊天","Nenhum lance ainda":"暂无着法","Sem mensagens.":"暂无消息。","você":"你","Empate":"和棋","Desistir":"认输","Revanche":"再来一局","Aguardando o adversário entrar…":"等待对手加入…","Copiar convite":"复制邀请",
      "Promoção":"升变","Escolha a peça para promover":"选择升变棋子","Configurações":"设置","Efeitos especiais":"特殊效果","Sons":"音效","Girar automático para a minha cor":"自动旋转到我的执棋方向","Aparecer no contador online":"显示在在线人数统计中","Compartilha seu IP via P2P, como nas partidas":"与对局一样通过 P2P 共享 IP 信息","Tema do tabuleiro":"棋盘主题","Skin das peças":"棋子样式","Centralizar câmera":"重置视角","Salvar":"保存",
      "Fim de jogo":"对局结束","Ver tabuleiro":"查看棋盘","Confirmar":"确认","Cancelar":"取消","Conectando…":"正在连接…","Tentar novamente":"重试","Voltar ao lobby":"返回大厅","Não foi possível carregar o jogo":"无法加载游戏","Seu navegador precisa de JavaScript e WebGL habilitados. Ative a aceleração de hardware e recarregue a página.":"浏览器需要启用 JavaScript 和 WebGL。请启用硬件加速后刷新页面。",
      "Desfazer":"悔棋","Expandir painel":"展开面板","Escreva uma mensagem…":"输入消息…","Enviar":"发送","Dama":"后","Torre":"车","Bispo":"象","Cavalo":"马","Fechar":"关闭","Jogador":"玩家","Atualizar":"刷新",
      "O bot não encontrou um lance.":"电脑没有找到着法。","Não foi possível conectar":"连接失败","P2P indisponível":"P2P 不可用","Falha ao abrir a conexão WebRTC.":"无法建立 WebRTC 连接。","O anfitrião recusou o lance.":"房主拒绝了这步棋。","O anfitrião encerrou a sala.":"房主关闭了房间。","Conexão com o anfitrião perdida. Tentando reconectar…":"与房主的连接中断，正在重连…","Reconectando ao anfitrião…":"正在重新连接房主…","Não foi possível reconectar ao anfitrião.":"无法重新连接房主。","Falha ao enviar a ação. Verifique a conexão.":"发送操作失败，请检查连接。","Não é a sua vez.":"还没轮到你。","Lance inválido.":"无效着法。","Conectando ao adversário…":"正在连接对手…","Não foi possível iniciar a partida. Tente de novo.":"无法开始对局，请重试。","Você já está em uma sala.":"你已经在一个房间中。","Não foi possível criar a sala":"无法创建房间","Digite um código de sala válido.":"请输入有效的房间代码。","Você voltou ao lobby.":"已返回大厅。","O bot não carregou. Recarregue a página.":"电脑模块加载失败，请刷新页面。","Lance inválido do bot.":"电脑走出了无效着法。","O bot não conseguiu calcular um lance.":"电脑无法计算着法。","Configurações salvas.":"设置已保存。","Sua vez. Selecione uma peça.":"轮到你了。请选择一个棋子。","O chat está disponível apenas em partidas online.":"聊天功能仅适用于在线对局。"
      "Início":"首页",
      "Aprender":"学习",
      "Praticar":"练习",
      "Desafios":"挑战",
      "Conta":"账户",
      "Navegação do site":"网站导航",
      "Abrir a conta em uma nova aba":"在新标签页中打开账户",
    }
  };
  const dict = dictionaries[lang] || {};
  const routes = {
    "pt-BR": { home:"/3dXess/", play:"/3dXess/jogar/" },
    en: { home:"/3dXess/en/", play:"/3dXess/en/play/" },
    es: { home:"/3dXess/es/", play:"/3dXess/es/jugar/" },
    "zh-CN": { home:"/3dXess/zh-cn/", play:"/3dXess/zh-cn/play/" }
  };
  const translatedText = new WeakMap();

  const routes = {
    "pt-BR": {
      home: "/3dXess/", learn: "/3dXess/aprender/", practice: "/3dXess/praticar/",
      challenges: "/3dXess/desafios/", account: "/3dXess/conta/", play: "/3dXess/jogar/"
    },
    en: {
      home: "/3dXess/en/", learn: "/3dXess/en/learn/", practice: "/3dXess/en/practice/",
      challenges: "/3dXess/en/challenges/", account: "/3dXess/en/account/", play: "/3dXess/en/play/"
    },
    es: {
      home: "/3dXess/es/", learn: "/3dXess/es/aprender/", practice: "/3dXess/es/practica/",
      challenges: "/3dXess/es/desafios/", account: "/3dXess/es/cuenta/", play: "/3dXess/es/jugar/"
    },
    "zh-CN": {
      home: "/3dXess/zh-cn/", learn: "/3dXess/zh-cn/learn/", practice: "/3dXess/zh-cn/practice/",
      challenges: "/3dXess/zh-cn/challenges/", account: "/3dXess/zh-cn/account/", play: "/3dXess/zh-cn/play/"
    }
  };

  function translateNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const raw = node.nodeValue || "";
    if (!raw.trim() || translatedText.get(node) === raw) return;
    const key = raw.replace(/\\s+/g, " ").trim();
    if (!Object.prototype.hasOwnProperty.call(dict, key)) {
      translatedText.delete(node);
      return;
    }
    const leading = raw.match(/^\\s*/)?.[0] || "";
    const trailing = raw.match(/\\s*$/)?.[0] || "";
    const next = leading + dict[key] + trailing;
    // Remember the translated value before writing it. MutationObserver will
    // see the characterData update, but it will not translate that node twice.
    translatedText.set(node, next);
    if (next !== raw) node.nodeValue = next;
  }

  function translateText(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateNode(root);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script,style,textarea,[data-no-translate]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateNode(node);
  }

  function translateAttributes(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const selector = "input,button,a,select,[aria-label],[title]";
    const elements = [];
    if (root.matches(selector)) elements.push(root);
    elements.push(...root.querySelectorAll(selector));
    for (const element of elements) {
      for (const attribute of ["placeholder", "aria-label", "title", "alt"]) {
        const value = element.getAttribute(attribute);
        if (value && Object.prototype.hasOwnProperty.call(dict, value)) {
          element.setAttribute(attribute, dict[value]);
        }
      }
    }
  }

  function applyGameRoutes() {
    const selectedRoutes = routes[lang] || routes["pt-BR"];
    document.querySelectorAll("[data-game-route]").forEach((link) => {
      const key = link.dataset.gameRoute;
      if (selectedRoutes[key]) link.setAttribute("href", selectedRoutes[key]);
    });
    const homeLink = document.querySelector(".site-return-link");
    if (homeLink) homeLink.setAttribute("href", selectedRoutes.home);
  }

  function applyInitialTranslations() {
    if (lang !== "pt-BR") {
      translateText(document.body);
      translateAttributes(document.body);
    }
    applyGameRoutes();
    const selector = document.getElementById("game-language-switch");
    if (selector) selector.value = lang;
  }

  const switcher = document.getElementById("game-language-switch");
  if (switcher) {
    switcher.value = lang;
    switcher.addEventListener("change", () => {
      const target = routes[switcher.value];
      if (target) window.location.assign(target.play);
    });
  }

  applyInitialTranslations();

  // Process only inserted/changed nodes. Scanning the entire document after
  // every game status update was expensive and could loop forever when a
  // translation intentionally had the same text (for example, "online").
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") {
        translateNode(record.target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          translateNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          translateText(node);
          translateAttributes(node);
          applyGameRoutes();
        }
      }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
})();