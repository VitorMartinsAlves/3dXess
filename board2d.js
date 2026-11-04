/* ============================================================
   Renderizador 2D leve do 3dXess.
   Sprites SVG vetoriais em pixel art; sem WebGL, canvas ou loop.
   ============================================================ */
(function (global) {
  'use strict';

  const THEMES = {
    classic: { label: 'Clássico', bg: '#263544', light: '#d4dde5', dark: '#718ba1', accent: '#6ee7b7', accent2: '#38bdf8' },
    marble: { label: 'Mármore', bg: '#11151c', light: '#f2efe8', dark: '#8b8f98', accent: '#c4b5fd', accent2: '#93c5fd' },
    neon: { label: 'Neon', bg: '#05060a', light: '#172a4a', dark: '#080f1e', accent: '#22d3ee', accent2: '#e879f9' },
    forest: { label: 'Floresta', bg: '#0a1410', light: '#d9c9a3', dark: '#3f6b4a', accent: '#86efac', accent2: '#fde68a' },
    sunset: { label: 'Pôr do sol', bg: '#1a0f14', light: '#f0c9a8', dark: '#8a4b3f', accent: '#fca5a5', accent2: '#fdba74' },
    ice: { label: 'Gelo', bg: '#081018', light: '#dfeef7', dark: '#6b93ad', accent: '#7dd3fc', accent2: '#e0f2fe' }
  };

  const SKINS = {
    classic: { label: 'Clássica' },
    marble: { label: 'Mármore' },
    metal: { label: 'Metal' },
    neon: { label: 'Neon' },
    glass: { label: 'Vidro' },
    wood: { label: 'Madeira' }
  };

  const LABELS = {
    'pt-BR': { w: 'branca', b: 'azul', k: 'rei', q: 'dama', r: 'torre', bsh: 'bispo', n: 'cavalo', p: 'peão', square: 'Casa' },
    en: { w: 'white', b: 'blue', k: 'king', q: 'queen', r: 'rook', bsh: 'bishop', n: 'knight', p: 'pawn', square: 'Square' },
    es: { w: 'blanca', b: 'azul', k: 'rey', q: 'dama', r: 'torre', bsh: 'alfil', n: 'caballo', p: 'peón', square: 'Casilla' },
    'zh-CN': { w: '白色', b: '蓝色', k: '王', q: '后', r: '车', bsh: '象', n: '马', p: '兵', square: '格子' }
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('board2d.js', document.baseURI).href;
  const SPRITE_URL = new URL('assets/pixel-chess-pieces.svg', scriptUrl).href;

  let container = null;
  let root = null;
  let grid = null;
  let squares = [];
  let rankCoordinates = [];
  let fileCoordinates = [];
  let clickHandler = null;
  let interactive = false;
  let orientation = 'w';
  let currentTheme = 'classic';
  let currentSkin = 'classic';
  let effectsEnabled = false;
  let currentState = null;
  let lastMove = null;
  let selected = null;
  let legalMoves = [];
  let checkSquare = null;

  const language = LABELS[document.documentElement.lang] ? document.documentElement.lang : 'pt-BR';
  const labels = LABELS[language];

  function createCoordinateStrip(className, count) {
    const strip = document.createElement('div');
    strip.className = 'board2d-coordinates ' + className;
    strip.setAttribute('aria-hidden', 'true');
    return Array.from({ length: count }, function () {
      const label = document.createElement('span');
      label.className = 'board2d-coordinate';
      strip.appendChild(label);
      return label;
    });
  }

  function updateCoordinates() {
    const ranks = orientation === 'b' ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = orientation === 'b' ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    rankCoordinates.forEach(function (label, index) { label.textContent = ranks[index]; });
    fileCoordinates.forEach(function (label, index) { label.textContent = files[index]; });
  }

  function createBoard(containerElement) {
    container = containerElement;
    if (!container) throw new Error('O contêiner do tabuleiro 2D não existe.');
    container.replaceChildren();

    root = document.createElement('div');
    root.className = 'board2d-shell';
    root.setAttribute('aria-label', language === 'en' ? 'Chessboard' : language === 'es' ? 'Tablero de ajedrez' : language === 'zh-CN' ? '国际象棋棋盘' : 'Tabuleiro de xadrez');

    const layout = document.createElement('div');
    layout.className = 'board2d-layout';

    rankCoordinates = createCoordinateStrip('is-ranks', 8);
    const rankStrip = rankCoordinates[0].parentElement;

    grid = document.createElement('div');
    grid.className = 'board2d-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', root.getAttribute('aria-label'));

    squares = [];
    for (let viewRow = 0; viewRow < 8; viewRow++) {
      const row = document.createElement('div');
      row.className = 'board2d-row';
      row.setAttribute('role', 'row');
      for (let viewCol = 0; viewCol < 8; viewCol++) {
        const square = document.createElement('button');
        square.type = 'button';
        square.className = 'board2d-square';
        square.setAttribute('role', 'gridcell');
        square.dataset.viewRow = String(viewRow);
        square.dataset.viewCol = String(viewCol);
        square.innerHTML = '<span class="board2d-target" aria-hidden="true"></span><span class="board2d-piece" aria-hidden="true"></span>';
        square.addEventListener('click', function () {
          if (!interactive || !clickHandler) return;
          const position = positionForView(Number(square.dataset.viewRow), Number(square.dataset.viewCol));
          clickHandler(position.r, position.f);
        });
        square.addEventListener('keydown', onSquareKeydown);
        row.appendChild(square);
        squares.push(square);
      }
      grid.appendChild(row);
    }

    fileCoordinates = createCoordinateStrip('is-files', 8);
    const fileStrip = fileCoordinates[0].parentElement;

    layout.appendChild(rankStrip);
    layout.appendChild(grid);
    layout.appendChild(fileStrip);
    root.appendChild(layout);
    container.appendChild(root);
    applyTheme(currentTheme);
    applySkin(currentSkin);
    updateCoordinates();
    render();
  }

  function positionForView(viewRow, viewCol) {
    if (orientation === 'b') return { r: 7 - viewRow, f: 7 - viewCol };
    return { r: viewRow, f: viewCol };
  }

  function onSquareKeydown(event) {
    const row = Number(event.currentTarget.dataset.viewRow);
    const col = Number(event.currentTarget.dataset.viewCol);
    let nextRow = row;
    let nextCol = col;
    if (event.key === 'ArrowUp') nextRow -= 1;
    else if (event.key === 'ArrowDown') nextRow += 1;
    else if (event.key === 'ArrowLeft') nextCol -= 1;
    else if (event.key === 'ArrowRight') nextCol += 1;
    else return;

    event.preventDefault();
    nextRow = Math.max(0, Math.min(7, nextRow));
    nextCol = Math.max(0, Math.min(7, nextCol));
    const target = squares[nextRow * 8 + nextCol];
    if (target) target.focus();
  }

  function pieceName(piece) {
    const key = piece.type === 'b' ? 'bsh' : piece.type;
    return labels[key] || piece.type;
  }

  function createPieceSprite(piece) {
    const sprite = document.createElementNS(SVG_NS, 'svg');
    sprite.setAttribute('viewBox', '0 0 48 56');
    sprite.setAttribute('focusable', 'false');
    sprite.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    const href = SPRITE_URL + '#' + piece.type;
    use.setAttribute('href', href);
    use.setAttributeNS(XLINK_NS, 'xlink:href', href);
    sprite.appendChild(use);
    return sprite;
  }

  function render() {
    if (!grid || !currentState || !currentState.board) return;
    const files = 'abcdefgh';
    const focused = document.activeElement && document.activeElement.classList.contains('board2d-square')
      ? document.activeElement
      : null;
    const focusedR = focused ? Number(focused.dataset.viewRow) : -1;
    const focusedF = focused ? Number(focused.dataset.viewCol) : -1;

    for (let viewRow = 0; viewRow < 8; viewRow++) {
      for (let viewCol = 0; viewCol < 8; viewCol++) {
        const square = squares[viewRow * 8 + viewCol];
        const pos = positionForView(viewRow, viewCol);
        const piece = currentState.board[pos.r] && currentState.board[pos.r][pos.f];
        const light = (pos.r + pos.f) % 2 === 1;
        const pieceEl = square.lastElementChild;
        const rank = String(8 - pos.r);
        const file = files[pos.f];

        square.classList.toggle('is-light', light);
        square.classList.toggle('is-dark', !light);
        square.classList.toggle('is-selected', !!(selected && selected.r === pos.r && selected.f === pos.f));
        square.classList.toggle('is-last-move', !!(lastMove && (
          (lastMove.from && lastMove.from.r === pos.r && lastMove.from.f === pos.f) ||
          (lastMove.to && lastMove.to.r === pos.r && lastMove.to.f === pos.f)
        )));
        square.classList.toggle('is-check', !!(checkSquare && checkSquare.r === pos.r && checkSquare.f === pos.f));

        const legal = selected && legalMoves.find(function (move) {
          return move.to.r === pos.r && move.to.f === pos.f;
        });
        square.classList.toggle('is-legal', !!legal && !legal.capture);
        square.classList.toggle('is-capture', !!legal && !!legal.capture);

        square.dataset.piece = piece ? piece.color + piece.type : '';
        if (piece) {
          const spriteKey = piece.color + piece.type;
          if (pieceEl.dataset.sprite !== spriteKey) {
            pieceEl.replaceChildren(createPieceSprite(piece));
            pieceEl.dataset.sprite = spriteKey;
          }
          pieceEl.className = 'board2d-piece' + (piece.color === 'w' ? ' is-white' : ' is-black');
        } else if (pieceEl.dataset.sprite) {
          pieceEl.replaceChildren();
          pieceEl.dataset.sprite = '';
          pieceEl.className = 'board2d-piece';
        }

        const coordinate = file + rank;
        const description = piece
          ? labels.square + ' ' + coordinate + ', ' + labels[piece.color] + ' ' + pieceName(piece)
          : labels.square + ' ' + coordinate;
        square.setAttribute('aria-label', description);
        square.disabled = !interactive;
        square.tabIndex = (focusedR === viewRow && focusedF === viewCol) || (!focused && viewRow === 0 && viewCol === 0) ? 0 : -1;
      }
    }
  }

  function applyTheme(name) {
    currentTheme = Object.prototype.hasOwnProperty.call(THEMES, name) ? name : 'classic';
    const theme = THEMES[currentTheme];
    if (!root) return;
    root.style.setProperty('--board2d-bg', theme.bg);
    root.style.setProperty('--board2d-light', theme.light);
    root.style.setProperty('--board2d-dark', theme.dark);
    root.style.setProperty('--board2d-accent', theme.accent);
    root.style.setProperty('--board2d-accent2', theme.accent2);
    root.dataset.theme = currentTheme;
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-2', theme.accent2);
    document.documentElement.dataset.boardTheme = currentTheme;
  }

  function applySkin(name) {
    currentSkin = Object.prototype.hasOwnProperty.call(SKINS, name) ? name : 'classic';
    if (root) root.dataset.pieceSkin = currentSkin;
  }

  function setState(state, options) {
    options = options || {};
    currentState = state;
    lastMove = options.lastMove || null;
    selected = options.selected || null;
    legalMoves = options.legalMoves || [];
    checkSquare = options.checkSquare || null;
    render();
  }

  function setOrientation(color) {
    orientation = color === 'b' ? 'b' : 'w';
    updateCoordinates();
    render();
  }

  function setInteractive(value) {
    interactive = !!value;
    render();
  }

  global.Board2D = {
    THEMES: THEMES,
    SKINS: SKINS,
    init: createBoard,
    setState: setState,
    setTheme: applyTheme,
    setSkin: applySkin,
    setEffects: function (enabled) { effectsEnabled = !!enabled; },
    playIntro: function () {},
    setOrientation: setOrientation,
    setInteractive: setInteractive,
    onSquareClick: function (callback) { clickHandler = callback; },
    playEffect: function () {},
    resetCamera: function () {},
    getTheme: function () { return currentTheme; },
    getSkin: function () { return currentSkin; },
    getOrientation: function () { return orientation; },
    setActive: function (value) { setInteractive(!!value); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
