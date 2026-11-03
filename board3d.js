/* Xadrez 3D - cena Three.js encapsulada (temas, skins e efeitos) */
(function (global) {
  'use strict';

  const C = global.Chess;

  /* ------------------------------------------------------------
     TEMAS DO TABULEIRO
     ------------------------------------------------------------ */
  const THEMES = {
    classic: {
      label: 'Clássico',
      bg: 0x0b0f14,
      light: 0xe8dcc6,
      dark: 0x6b4a35,
      frame: 0x241811,
      accent: '#6ee7b7',
      accent2: '#38bdf8',
    },
    marble: {
      label: 'Mármore',
      bg: 0x11151c,
      light: 0xf2efe8,
      dark: 0x8b8f98,
      frame: 0x2a2f38,
      accent: '#c4b5fd',
      accent2: '#93c5fd',
    },
    neon: {
      label: 'Neon',
      bg: 0x05060a,
      light: 0x172a4a,
      dark: 0x080f1e,
      frame: 0x0c1b2a,
      accent: '#22d3ee',
      accent2: '#e879f9',
    },
    forest: {
      label: 'Floresta',
      bg: 0x0a1410,
      light: 0xd9c9a3,
      dark: 0x3f6b4a,
      frame: 0x1d2b22,
      accent: '#86efac',
      accent2: '#fde68a',
    },
    sunset: {
      label: 'Pôr do sol',
      bg: 0x1a0f14,
      light: 0xf0c9a8,
      dark: 0x8a4b3f,
      frame: 0x2b1815,
      accent: '#fca5a5',
      accent2: '#fdba74',
    },
    ice: {
      label: 'Gelo',
      bg: 0x081018,
      light: 0xdfeef7,
      dark: 0x6b93ad,
      frame: 0x1a2c38,
      accent: '#7dd3fc',
      accent2: '#e0f2fe',
    },
  };

  /* ------------------------------------------------------------
     SKINS DAS PEÇAS
     ------------------------------------------------------------ */
  const SKINS = {
    classic: {
      label: 'Clássica',
      w: { color: 0xf2e8d5, roughness: 0.38, metalness: 0.06 },
      b: { color: 0x3c4049, roughness: 0.44, metalness: 0.12 },
    },
    marble: {
      label: 'Mármore',
      w: { color: 0xf8f4ec, roughness: 0.2, metalness: 0.02 },
      b: { color: 0x2f343d, roughness: 0.24, metalness: 0.06 },
    },
    metal: {
      label: 'Metal',
      w: { color: 0xe6ebf5, roughness: 0.18, metalness: 0.88 },
      b: { color: 0x6b7280, roughness: 0.22, metalness: 0.92 },
    },
    neon: {
      label: 'Neon',
      w: { color: 0x0b2b33, emissive: 0x22d3ee, emissiveIntensity: 0.95, roughness: 0.25, metalness: 0.1 },
      b: { color: 0x1b1030, emissive: 0xa855f7, emissiveIntensity: 0.95, roughness: 0.25, metalness: 0.1 },
    },
    glass: {
      label: 'Vidro',
      w: { color: 0xffffff, transmission: 0.82, thickness: 0.5, roughness: 0.06, metalness: 0, opacity: 1 },
      b: { color: 0x94a3b8, transmission: 0.78, thickness: 0.5, roughness: 0.08, metalness: 0.05, opacity: 1 },
    },
    wood: {
      label: 'Madeira',
      w: { color: 0xd8b98c, roughness: 0.72, metalness: 0.02 },
      b: { color: 0x4a3226, roughness: 0.75, metalness: 0.02 },
    },
  };

  /* ------------------------------------------------------------
     ESTADO INTERNO
     ------------------------------------------------------------ */
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let boardGroup = null;
  let piecesGroup = null;
  let highlightGroup = null;
  let effectsGroup = null;
  let frameMesh = null;
  let groundMesh = null;
  let labelsGroup = null;

  let lightSquareMat = null;
  let darkSquareMat = null;
  let frameMat = null;
  let groundMat = null;
  const pieceMaterials = {};

  let squareMeshes = [];
  let pickables = [];
  let raycaster = null;
  let pointer = null;
  let pointerDown = null;

  let clickHandler = null;
  let interactive = true;
  let currentState = null;
  let lastMove = null;
  let selected = null;
  let legalMoves = [];
  let checkSquare = null;
  let orientation = 'w';

  let currentTheme = 'classic';
  let currentSkin = 'classic';
  let effectsEnabled = true;

  const animations = [];
  const effectAnims = [];
  let clock = null;
  let containerEl = null;

  const planeGeo = new THREE.PlaneGeometry(0.94, 0.94);
  const dotGeo = new THREE.CircleGeometry(0.13, 24);
  const ringGeo = new THREE.RingGeometry(0.32, 0.44, 32);
  const selectedGeo = new THREE.RingGeometry(0.34, 0.46, 32);

  const highlightMaterials = {
    last: new THREE.MeshBasicMaterial({
      color: 0xffd166, transparent: true, opacity: 0.22, depthWrite: false,
    }),
    selected: new THREE.MeshBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide,
    }),
    move: new THREE.MeshBasicMaterial({
      color: 0x34d399, transparent: true, opacity: 0.85, depthWrite: false,
    }),
    capture: new THREE.MeshBasicMaterial({
      color: 0xfb7185, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide,
    }),
    check: new THREE.MeshBasicMaterial({
      color: 0xef4444, transparent: true, opacity: 0.45, depthWrite: false,
    }),
  };

  /* ------------------------------------------------------------
     UTILITÁRIOS
     ------------------------------------------------------------ */
  function squareToWorld(r, f) {
    return new THREE.Vector3(f - 3.5, 0, 3.5 - r);
  }

  function part(geometry, material, options) {
    options = options || {};
    const mesh = new THREE.Mesh(geometry, material);
    const x = options.x || 0;
    const y = options.y || 0;
    const z = options.z || 0;
    mesh.position.set(x, y, z);
    mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
    if (options.sy && options.sy !== 1) mesh.scale.y = options.sy;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /* ------------------------------------------------------------
     CONSTRUÇÃO DAS PEÇAS
     ------------------------------------------------------------ */
  function buildPawn(mat) {
    const g = new THREE.Group();
    g.add(part(new THREE.CylinderGeometry(0.24, 0.27, 0.08, 32), mat, { y: 0.04 }));
    g.add(part(new THREE.CylinderGeometry(0.14, 0.23, 0.09, 32), mat, { y: 0.12 }));
    g.add(part(new THREE.CylinderGeometry(0.085, 0.15, 0.22, 32), mat, { y: 0.27 }));
    g.add(part(new THREE.SphereGeometry(0.125, 24, 16), mat, { y: 0.4, sy: 0.7 }));
    g.add(part(new THREE.SphereGeometry(0.115, 24, 16), mat, { y: 0.52 }));
    return g;
  }

  function buildRook(mat) {
    const g = new THREE.Group();
    g.add(part(new THREE.CylinderGeometry(0.26, 0.29, 0.08, 32), mat, { y: 0.04 }));
    g.add(part(new THREE.CylinderGeometry(0.18, 0.24, 0.1, 32), mat, { y: 0.13 }));
    g.add(part(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 32), mat, { y: 0.33 }));
    g.add(part(new THREE.CylinderGeometry(0.24, 0.2, 0.09, 32), mat, { y: 0.52 }));
    g.add(part(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 32), mat, { y: 0.6 }));
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      g.add(part(new THREE.BoxGeometry(0.11, 0.13, 0.11), mat, {
        x: Math.cos(angle) * 0.185,
        y: 0.69,
        z: Math.sin(angle) * 0.185,
        ry: -angle,
      }));
    }
    return g;
  }

  function buildKnight(mat) {
    const g = new THREE.Group();
    g.add(part(new THREE.CylinderGeometry(0.25, 0.28, 0.08, 32), mat, { y: 0.04 }));
    g.add(part(new THREE.CylinderGeometry(0.18, 0.24, 0.1, 32), mat, { y: 0.13 }));

    const shape = new THREE.Shape();
    shape.moveTo(-0.16, 0.02);
    shape.lineTo(0.14, 0.02);
    shape.quadraticCurveTo(0.24, 0.1, 0.2, 0.26);
    shape.quadraticCurveTo(0.18, 0.4, 0.1, 0.46);
    shape.quadraticCurveTo(0.14, 0.54, 0.26, 0.56);
    shape.quadraticCurveTo(0.34, 0.58, 0.35, 0.64);
    shape.quadraticCurveTo(0.33, 0.7, 0.22, 0.71);
    shape.quadraticCurveTo(0.14, 0.72, 0.11, 0.76);
    shape.lineTo(0.14, 0.86);
    shape.lineTo(0.04, 0.8);
    shape.lineTo(0.02, 0.88);
    shape.lineTo(-0.04, 0.78);
    shape.quadraticCurveTo(-0.12, 0.66, -0.15, 0.44);
    shape.quadraticCurveTo(-0.18, 0.22, -0.16, 0.02);
    shape.closePath();

    const headGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 12,
    });
    headGeometry.translate(0, 0, -0.12);

    const head = new THREE.Mesh(headGeometry, mat);
    head.position.y = 0.09;
    head.castShadow = true;
    head.receiveShadow = true;
    g.add(head);
    return g;
  }

  function buildBishop(mat) {
    const g = new THREE.Group();
    const profile = [
      [0.0, 0.0], [0.28, 0.0], [0.28, 0.05], [0.22, 0.1],
      [0.13, 0.16], [0.095, 0.28], [0.14, 0.34], [0.14, 0.38],
      [0.1, 0.42], [0.155, 0.47], [0.185, 0.56], [0.185, 0.65],
      [0.145, 0.73], [0.09, 0.79], [0.045, 0.83], [0.0, 0.84],
    ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });

    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), mat);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    g.add(part(new THREE.SphereGeometry(0.04, 16, 12), mat, { y: 0.87 }));
    return g;
  }

  function buildQueen(mat) {
    const g = new THREE.Group();
    g.add(part(new THREE.CylinderGeometry(0.27, 0.3, 0.08, 32), mat, { y: 0.04 }));
    g.add(part(new THREE.CylinderGeometry(0.16, 0.25, 0.1, 32), mat, { y: 0.13 }));
    g.add(part(new THREE.CylinderGeometry(0.1, 0.18, 0.34, 32), mat, { y: 0.35 }));
    g.add(part(new THREE.SphereGeometry(0.14, 24, 16), mat, { y: 0.54, sy: 0.6 }));
    g.add(part(new THREE.CylinderGeometry(0.2, 0.14, 0.14, 32), mat, { y: 0.66 }));
    g.add(part(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 32), mat, { y: 0.75 }));
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      g.add(part(new THREE.SphereGeometry(0.045, 12, 10), mat, {
        x: Math.cos(angle) * 0.18,
        y: 0.8,
        z: Math.sin(angle) * 0.18,
      }));
    }
    g.add(part(new THREE.SphereGeometry(0.075, 16, 12), mat, { y: 0.85 }));
    return g;
  }

  function buildKing(mat) {
    const g = new THREE.Group();
    g.add(part(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 32), mat, { y: 0.04 }));
    g.add(part(new THREE.CylinderGeometry(0.16, 0.25, 0.1, 32), mat, { y: 0.13 }));
    g.add(part(new THREE.CylinderGeometry(0.11, 0.19, 0.36, 32), mat, { y: 0.36 }));
    g.add(part(new THREE.SphereGeometry(0.14, 24, 16), mat, { y: 0.57, sy: 0.6 }));
    g.add(part(new THREE.CylinderGeometry(0.21, 0.15, 0.13, 32), mat, { y: 0.68 }));
    g.add(part(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 32), mat, { y: 0.76 }));
    g.add(part(new THREE.BoxGeometry(0.055, 0.17, 0.055), mat, { y: 0.87 }));
    g.add(part(new THREE.BoxGeometry(0.16, 0.055, 0.055), mat, { y: 0.89 }));
    return g;
  }

  function createPiece(type, color) {
    const mat = pieceMaterials[color];
    let group;
    if (type === 'p') group = buildPawn(mat);
    else if (type === 'r') group = buildRook(mat);
    else if (type === 'n') group = buildKnight(mat);
    else if (type === 'b') group = buildBishop(mat);
    else if (type === 'q') group = buildQueen(mat);
    else group = buildKing(mat);

    group.scale.setScalar(1.15);
    group.userData = { kind: 'piece', type: type, color: color };
    return group;
  }

  /* ------------------------------------------------------------
     TABULEIRO E LABELS
     ------------------------------------------------------------ */
  function makeTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c9b79a';
    ctx.font = 'bold 82px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    sprite.scale.set(0.34, 0.34, 1);
    return sprite;
  }

  function buildLabels() {
    labelsGroup = new THREE.Group();
    const files = 'abcdefgh';
    for (let f = 0; f < 8; f++) {
      for (const z of [4.12, -4.12]) {
        const label = makeTextSprite(files[f]);
        label.position.set(f - 3.5, 0.06, z);
        labelsGroup.add(label);
      }
    }
    for (let r = 0; r < 8; r++) {
      for (const x of [-4.12, 4.12]) {
        const label = makeTextSprite(String(r + 1));
        label.position.set(x, 0.06, 3.5 - r);
        labelsGroup.add(label);
      }
    }
    scene.add(labelsGroup);
  }

  /* ------------------------------------------------------------
     TEMAS E SKINS
     ------------------------------------------------------------ */
  function applyTheme(name) {
    const t = THEMES[name] || THEMES.classic;
    currentTheme = name in THEMES ? name : 'classic';

    scene.background = new THREE.Color(t.bg);
    scene.fog.color.set(t.bg);
    lightSquareMat.color.set(t.light);
    darkSquareMat.color.set(t.dark);
    frameMat.color.set(t.frame);
    groundMat.color.set(t.bg);

    highlightMaterials.selected.color.set(t.accent2 || 0x38bdf8);
    highlightMaterials.move.color.set(t.accent || 0x34d399);

    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-2', t.accent2);
    document.documentElement.dataset.boardTheme = currentTheme;
  }

  function applySkin(name) {
    const s = SKINS[name] || SKINS.classic;
    currentSkin = name in SKINS ? name : 'classic';

    ['w', 'b'].forEach(function (color) {
      const mat = pieceMaterials[color];
      const conf = s[color];
      mat.color.set(conf.color);
      mat.roughness = conf.roughness != null ? conf.roughness : 0.4;
      mat.metalness = conf.metalness != null ? conf.metalness : 0;
      mat.emissive.set(conf.emissive || 0x000000);
      mat.emissiveIntensity = conf.emissiveIntensity || 0;
      mat.transmission = conf.transmission || 0;
      mat.thickness = conf.thickness || 0;
      mat.opacity = conf.opacity != null ? conf.opacity : 1;
      mat.transparent = mat.transmission > 0 || mat.opacity < 1;
      mat.needsUpdate = true;
    });

    document.documentElement.dataset.pieceSkin = currentSkin;
  }

  /* ------------------------------------------------------------
     DESTAQUES
     ------------------------------------------------------------ */
  function renderHighlights() {
    if (!highlightGroup) return;
    highlightGroup.clear();

    function add(geometry, material, r, f, y) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(f - 3.5, y, 3.5 - r);
      highlightGroup.add(mesh);
    }

    if (lastMove && lastMove.from && lastMove.to) {
      add(planeGeo, highlightMaterials.last, lastMove.from.r, lastMove.from.f, 0.006);
      add(planeGeo, highlightMaterials.last, lastMove.to.r, lastMove.to.f, 0.006);
    }

    if (checkSquare) {
      add(planeGeo, highlightMaterials.check, checkSquare.r, checkSquare.f, 0.009);
    }

    if (selected) {
      add(selectedGeo, highlightMaterials.selected, selected.r, selected.f, 0.014);
      for (const mv of legalMoves) {
        if (mv.capture) add(ringGeo, highlightMaterials.capture, mv.to.r, mv.to.f, 0.014);
        else add(dotGeo, highlightMaterials.move, mv.to.r, mv.to.f, 0.014);
      }
    }
  }

  /* ------------------------------------------------------------
     PEÇAS DINÂMICAS
     ------------------------------------------------------------ */
  function rebuildPieces(animate) {
    if (!piecesGroup) return;
    for (const child of piecesGroup.children.slice()) {
      piecesGroup.remove(child);
      child.traverse(function (obj) {
        if (obj.isMesh && obj.geometry) obj.geometry.dispose();
      });
    }

    animations.length = 0;
    if (!currentState) {
      refreshPickables();
      return;
    }

    const board = currentState.board;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) continue;

        const piece = createPiece(p.type, p.color);
        piece.userData.r = r;
        piece.userData.f = f;
        const target = squareToWorld(r, f);
        piece.position.copy(target);
        piecesGroup.add(piece);

        if (animate && lastMove && lastMove.to &&
            lastMove.to.r === r && lastMove.to.f === f &&
            lastMove.from && (lastMove.from.r !== r || lastMove.from.f !== f)) {
          const from = squareToWorld(lastMove.from.r, lastMove.from.f);
          piece.position.copy(from);
          animations.push({ obj: piece, from: from, to: target.clone(), t: 0, dur: 0.18 });
        }
      }
    }

    refreshPickables();
  }

  function refreshPickables() {
    pickables = squareMeshes.concat(piecesGroup ? piecesGroup.children : []);
  }

  function updateAnimations(dt) {
    for (let i = animations.length - 1; i >= 0; i--) {
      const a = animations[i];
      a.t += dt;
      const k = Math.min(a.t / a.dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      a.obj.position.lerpVectors(a.from, a.to, eased);
      if (k >= 1) animations.splice(i, 1);
    }
  }

  /* ------------------------------------------------------------
     EFEITOS ESPECIAIS
     ------------------------------------------------------------ */
  function playEffect(kind, r, f) {
    if (!effectsEnabled || !effectsGroup) return;
    const p = squareToWorld(r, f);

    if (kind === 'capture' || kind === 'explosion') {
      const count = kind === 'explosion' ? 26 : 16;
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: kind === 'explosion' ? 0xfb7185 : 0xffd166,
          transparent: true,
          opacity: 1,
        });
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 8, 6), mat);
        m.position.copy(p).add(new THREE.Vector3(0, 0.35, 0));
        effectsGroup.add(m);
        effectAnims.push({
          mesh: m,
          kind: 'particle',
          life: 0,
          dur: 0.55 + Math.random() * 0.35,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 2.4,
            Math.random() * 2.6 + 0.7,
            (Math.random() - 0.5) * 2.4
          ),
        });
      }
    }

    if (kind === 'check' || kind === 'explosion') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.32, 40),
        new THREE.MeshBasicMaterial({
          color: 0xef4444, transparent: true, opacity: 0.95,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(p).setY(0.025);
      effectsGroup.add(ring);
      effectAnims.push({ mesh: ring, kind: 'ring', life: 0, dur: 0.9 });
    }

    if (kind === 'move') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.28, 36),
        new THREE.MeshBasicMaterial({
          color: 0x6ee7b7, transparent: true, opacity: 0.7,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(p).setY(0.02);
      effectsGroup.add(ring);
      effectAnims.push({ mesh: ring, kind: 'ring', life: 0, dur: 0.6 });
    }
  }

  function updateEffects(dt) {
    for (let i = effectAnims.length - 1; i >= 0; i--) {
      const e = effectAnims[i];
      e.life += dt;
      const k = Math.min(e.life / e.dur, 1);

      if (e.kind === 'particle') {
        e.vel.y -= 6 * dt;
        e.mesh.position.addScaledVector(e.vel, dt);
        e.mesh.material.opacity = 1 - k;
        e.mesh.scale.setScalar(1 - k * 0.6);
      } else {
        const s = 1 + k * 3.2;
        e.mesh.scale.set(s, s, 1);
        e.mesh.material.opacity = (1 - k) * 0.9;
      }

      if (k >= 1) {
        effectsGroup.remove(e.mesh);
        if (e.mesh.geometry) e.mesh.geometry.dispose();
        if (e.mesh.material) e.mesh.material.dispose();
        effectAnims.splice(i, 1);
      }
    }
  }

  /* ------------------------------------------------------------
     CÂMERA / ORIENTAÇÃO
     ------------------------------------------------------------ */
  function cameraDistance() {
    const w = containerEl ? containerEl.clientWidth : window.innerWidth;
    const h = containerEl ? containerEl.clientHeight : window.innerHeight;
    const aspect = w / Math.max(h, 1);

    /* Em retrato o tabuleiro é limitado pela largura: chega bem perto
       para ocupar quase toda a tela. */
    if (aspect < 0.9) {
      return Math.max(10.8, 11.4 / Math.max(aspect, 0.45));
    }
    /* Telas quase quadradas (painel aberto no celular): recua um pouco
       para a perspectiva não cortar as laterais do tabuleiro. */
    if (aspect < 1.3) {
      return Math.max(12.8, 11.4 / aspect + 2.6);
    }
    /* Paisagem de celular: tabuleiro cabe inteiro na área à esquerda. */
    if (h < 540) {
      return Math.max(12.0, 11.4 / Math.max(aspect, 0.6) + 2.2);
    }
    return Math.max(14.2, 12.4 / Math.max(aspect, 0.35));
  }

  function resetCamera() {
    const d = cameraDistance();
    const w = containerEl ? containerEl.clientWidth : window.innerWidth;
    const h = containerEl ? containerEl.clientHeight : window.innerHeight;
    const aspect = w / Math.max(h, 1);
    const compactLandscape = h < 540 && aspect > 1;
    const highAngle = aspect < 0.95 || compactLandscape;

    /* No celular a câmera fica mais alta, deixando o tabuleiro mais
       "de frente" e aproveitando melhor o espaço vertical. */
    const yFactor = highAngle ? 0.86 : 0.67;
    const zFactor = highAngle ? 0.58 : 0.74;
    const z = orientation === 'w' ? d * zFactor : -d * zFactor;
    camera.position.set(0, d * yFactor, z);
    controls.target.set(0, 0.4, 0);
    controls.update();
  }

  function setOrientation(color) {
    const next = color === 'b' ? 'b' : 'w';
    if (orientation === next) return;
    orientation = next;
    resetCamera();
  }

  /* ------------------------------------------------------------
     INTERAÇÃO
     ------------------------------------------------------------ */
  function setupInteraction() {
    renderer.domElement.addEventListener('pointerdown', function (event) {
      pointerDown = { x: event.clientX, y: event.clientY };
    });

    renderer.domElement.addEventListener('pointerup', function (event) {
      if (!pointerDown) return;
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      pointerDown = null;

      if (Math.hypot(dx, dy) > 6 || event.button !== 0) return;
      if (!interactive || !clickHandler) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, true);
      if (hits.length === 0) return;

      let object = hits[0].object;
      while (object && !object.userData.kind) object = object.parent;
      if (!object) return;

      const data = object.userData;
      const r = data.kind === 'square' ? data.r : data.r;
      const f = data.kind === 'square' ? data.f : data.f;
      if (typeof r !== 'number' || typeof f !== 'number') return;
      clickHandler(r, f);
    });
  }

  /* ------------------------------------------------------------
     RESIZE E LOOP
     ------------------------------------------------------------ */
  let lastAspect = 0;
  let animationFrameId = null;

  function resize() {
    if (!renderer || !containerEl) return;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    if (!w || !h) return;
    const aspect = w / Math.max(h, 1);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    /* Refaz o enquadramento quando o painel abre/fecha ou o aparelho gira. */
    if (!lastAspect || Math.abs(aspect - lastAspect) > 0.12) {
      lastAspect = aspect;
      resetCamera();
    } else {
      controls.update();
    }
  }

  function animate() {
    animationFrameId = null;
    if (!renderer || document.hidden) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    updateAnimations(dt);
    updateEffects(dt);
    controls.update();
    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (clock) clock.stop();
      return;
    }

    if (clock) clock.start();
    if (renderer && animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  /* ------------------------------------------------------------
     INICIALIZAÇÃO
     ------------------------------------------------------------ */
  function init(container) {
    if (renderer) return;
    containerEl = container;
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0f14, 20, 42);

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

    const compact = !!(global.matchMedia && global.matchMedia('(max-width: 720px)').matches);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 32;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI * 0.46;

    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a1410, 0.85));

    const keyLight = new THREE.DirectionalLight(0xfff2dd, 2.4);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.7);
    fillLight.position.set(-8, 7, -7);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x9ecbff, 1.1);
    rimLight.position.set(0, 6, -12);
    scene.add(rimLight);

    boardGroup = new THREE.Group();
    scene.add(boardGroup);

    lightSquareMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc6, roughness: 0.62, metalness: 0.02 });
    darkSquareMat = new THREE.MeshStandardMaterial({ color: 0x6b4a35, roughness: 0.68, metalness: 0.02 });
    frameMat = new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.62 });
    groundMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 1 });

    frameMesh = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, 9.2), frameMat);
    frameMesh.position.y = -0.29;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    boardGroup.add(frameMesh);

    groundMesh = new THREE.Mesh(new THREE.CircleGeometry(30, 64), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.55;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    squareMeshes = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const isLight = (r + f) % 2 === 1;
        const square = new THREE.Mesh(
          new THREE.BoxGeometry(0.97, 0.16, 0.97),
          isLight ? lightSquareMat : darkSquareMat
        );
        square.position.set(f - 3.5, -0.08, 3.5 - r);
        square.receiveShadow = true;
        square.userData = { kind: 'square', r: r, f: f };
        boardGroup.add(square);
        squareMeshes.push(square);
      }
    }

    buildLabels();

    pieceMaterials.w = new THREE.MeshPhysicalMaterial({ color: 0xf2e8d5, roughness: 0.38, metalness: 0.06 });
    pieceMaterials.b = new THREE.MeshPhysicalMaterial({ color: 0x3c4049, roughness: 0.44, metalness: 0.12 });

    piecesGroup = new THREE.Group();
    scene.add(piecesGroup);

    highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    effectsGroup = new THREE.Group();
    scene.add(effectsGroup);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    applyTheme(currentTheme);
    applySkin(currentSkin);
    resetCamera();
    resize();
    setupInteraction();

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (global.ResizeObserver) new global.ResizeObserver(resize).observe(container);

    animate();
  }

  /* ------------------------------------------------------------
     API PÚBLICA
     ------------------------------------------------------------ */
  global.Board3D = {
    THEMES: THEMES,
    SKINS: SKINS,
    init: init,
    setState: function (state, opts) {
      opts = opts || {};
      currentState = state;
      lastMove = opts.lastMove || null;
      selected = opts.selected || null;
      legalMoves = opts.legalMoves || [];
      checkSquare = opts.checkSquare || null;
      rebuildPieces(!!opts.animate);
      renderHighlights();
    },
    setTheme: applyTheme,
    setSkin: applySkin,
    setEffects: function (enabled) { effectsEnabled = !!enabled; },
    setOrientation: setOrientation,
    setInteractive: function (value) { interactive = !!value; },
    onSquareClick: function (cb) { clickHandler = cb; },
    playEffect: playEffect,
    resetCamera: resetCamera,
    getTheme: function () { return currentTheme; },
    getSkin: function () { return currentSkin; },
    getOrientation: function () { return orientation; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
