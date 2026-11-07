/* Xadrez 3D - cena Three.js encapsulada (temas, skins e efeitos) */
(function (global) {
  'use strict';

  const C = global.Chess;

  const REFERENCE_MODEL_URL = new URL('legacy/game/assets/ChessGLB.glb', document.baseURI).href;
  const REFERENCE_THREE_ADDONS = 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/';

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
    christmas: {
      label: 'Natal',
      bg: 0x071521,
      light: 0xeaf2ef,
      dark: 0x285247,
      frame: 0x463024,
      accent: '#e5b95c',
      accent2: '#dc6470',
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
    christmas: {
      label: 'Natal',
      w: { color: 0xfff0d5, roughness: 0.27, metalness: 0.22, emissive: 0x5b3a0a, emissiveIntensity: 0.045 },
      b: { color: 0xa32639, roughness: 0.27, metalness: 0.2, emissive: 0x3b0812, emissiveIntensity: 0.09 },
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
  let referenceThree = null;
  let referencePieceTemplates = null;
  let referencePieceLoadPromise = null;
  let christmasGoldMat = null;
  let christmasPineMat = null;
  let christmasSnowMat = null;
  let christmasRedMat = null;
  let christmasLightMat = null;
  let christmasTrunkMat = null;
  let christmasDecorGroup = null;
  let christmasBoardGroup = null;
  let snowPoints = null;
  let snowAttribute = null;
  let snowPositions = null;
  let snowDriftTime = 0;

  let squareMeshes = [];
  let pickables = [];
  let raycaster = null;
  let pointer = null;
  let pointerDown = null;

  let clickHandler = null;
  let interactive = true;
  let currentState = null;
  let renderedBoardSnapshot = null;
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

  function createReferenceMaterial(sourceMaterial, conf) {
    const source = sourceMaterial || {};
    const material = new referenceThree.MeshPhysicalMaterial({
      color: conf.color,
      map: source.map || null,
      normalMap: source.normalMap || null,
      roughnessMap: source.roughnessMap || null,
      metalnessMap: source.metalnessMap || null,
      aoMap: source.aoMap || null,
      alphaMap: source.alphaMap || null,
      emissiveMap: source.emissiveMap || null,
      emissive: conf.emissive || 0x000000,
      roughness: conf.roughness != null ? conf.roughness : 0.4,
      metalness: conf.metalness != null ? conf.metalness : 0,
      transmission: conf.transmission || 0,
      thickness: conf.thickness || 0,
      opacity: conf.opacity != null ? conf.opacity : 1,
      transparent: Boolean(
        (conf.transmission || 0) > 0 ||
        (conf.opacity != null && conf.opacity < 1) ||
        source.transparent
      ),
      side: source.side != null ? source.side : referenceThree.FrontSide,
      clearcoat: source.clearcoat != null ? source.clearcoat : 0.55,
      clearcoatRoughness: source.clearcoatRoughness != null ? source.clearcoatRoughness : 0.16,
    });
    if (source.name) material.name = source.name;
    return material;
  }

  function applyReferencePieceSkin(piece) {
    if (!referenceThree || !piece || !piece.traverse) return;
    const skin = SKINS[currentSkin] || SKINS.classic;
    piece.traverse(function (obj) {
      if (!obj.isMesh || !obj.userData.referencePiecePart) return;
      const conf = skin[obj.userData.referencePieceColor] || skin.w;
      const source = obj.userData.referenceSourceMaterial;
      const previous = obj.material;
      obj.material = Array.isArray(source)
        ? source.map(function (material) { return createReferenceMaterial(material, conf); })
        : createReferenceMaterial(source, conf);
      if (Array.isArray(previous)) previous.forEach(function (material) { material.dispose(); });
      else if (previous) previous.dispose();
    });
  }

  function createReferencePiece(type, color) {
    const template = referencePieceTemplates && referencePieceTemplates[color + ':' + type];
    if (!template || !referenceThree) return null;

    const group = new referenceThree.Group();
    const conf = (SKINS[currentSkin] || SKINS.classic)[color] || SKINS.classic[color];
    const material = Array.isArray(template.material)
      ? template.material.map(function (source) { return createReferenceMaterial(source, conf); })
      : createReferenceMaterial(template.material, conf);
    const mesh = new referenceThree.Mesh(template.geometry.clone(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.referencePiecePart = true;
    mesh.userData.referencePieceColor = color;
    mesh.userData.referenceSourceMaterial = template.material;
    group.add(mesh);
    group.userData = { kind: 'piece', type: type, color: color, referenceModel: true };
    return group;
  }

  function loadReferencePieceModels() {
    if (referencePieceLoadPromise) return referencePieceLoadPromise;

    referencePieceLoadPromise = (async function () {
      const modules = await Promise.all([
        import('three'),
        import(REFERENCE_THREE_ADDONS + 'loaders/GLTFLoader.js'),
        import(REFERENCE_THREE_ADDONS + 'loaders/DRACOLoader.js'),
      ]);
      referenceThree = modules[0];
      const GLTFLoader = modules[1].GLTFLoader;
      const DRACOLoader = modules[2].DRACOLoader;

      const draco = new DRACOLoader();
      draco.setDecoderPath(REFERENCE_THREE_ADDONS + 'libs/draco/gltf/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);

      const gltf = await loader.loadAsync(REFERENCE_MODEL_URL);
      const model = gltf.scene;
      model.position.set(0, -1, 0);
      model.updateMatrixWorld(true);

      const typeNames = {
        pawn: 'p',
        rook: 'r',
        knight: 'n',
        bishop: 'b',
        queen: 'q',
        king: 'k',
      };
      const targetHeights = {
        p: 0.72,
        r: 0.91,
        n: 0.92,
        b: 0.96,
        q: 1.04,
        k: 1.1,
      };
      const templates = {};

      model.traverse(function (node) {
        if (!node.isMesh || !node.name || !node.name.includes('Piece')) return;

        const parts = node.name.split('_');
        if (parts.length < 2) return;

        const sideName = (parts[0].split('-')[0] || '').toLowerCase();
        const color = sideName === 'white' ? 'w' : sideName === 'black' ? 'b' : null;
        const type = typeNames[(parts[1] || '').toLowerCase()];
        if (!color || !type) return;

        const key = color + ':' + type;
        if (templates[key] || !node.geometry || !node.geometry.attributes.position) return;

        const geometry = node.geometry.clone();
        geometry.applyMatrix4(node.matrixWorld);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        const bounds = geometry.boundingBox;
        const size = bounds.getSize(new referenceThree.Vector3());
        if (!size.y || !Number.isFinite(size.y)) {
          geometry.dispose();
          return;
        }

        const center = bounds.getCenter(new referenceThree.Vector3());
        const footprint = Math.max(size.x, size.z);
        const heightScale = targetHeights[type] / size.y;
        const widthScale = footprint > 0.78 ? 0.78 / footprint : heightScale;
        const scale = Math.min(heightScale, widthScale);

        geometry.translate(-center.x, -bounds.min.y, -center.z);
        geometry.scale(scale, scale, scale);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        templates[key] = {
          geometry: geometry,
          material: node.material,
        };
      });

      const templateCount = Object.keys(templates).length;
      if (templateCount < 6) {
        Object.keys(templates).forEach(function (key) { templates[key].geometry.dispose(); });
        throw new Error('O arquivo 3D não contém modelos de peças reconhecíveis.');
      }

      referencePieceTemplates = templates;
      console.info('[3dXess] Modelos 3D de referência carregados:', templateCount);

      if (currentState && currentState.board && piecesGroup) {
        renderedBoardSnapshot = null;
        rebuildPieces(false, null);
        renderedBoardSnapshot = snapshotBoard(currentState.board);
        renderHighlights();
      }
      return templateCount;
    })().catch(function (error) {
      console.warn('[3dXess] Não foi possível carregar os modelos 3D externos; usando as peças originais.', error);
      return null;
    });

    return referencePieceLoadPromise;
  }

  function createPiece(type, color) {
    let group = createReferencePiece(type, color);
    if (!group) {
      const mat = pieceMaterials[color];
      if (type === 'p') group = buildPawn(mat);
      else if (type === 'r') group = buildRook(mat);
      else if (type === 'n') group = buildKnight(mat);
      else if (type === 'b') group = buildBishop(mat);
      else if (type === 'q') group = buildQueen(mat);
      else group = buildKing(mat);

      group.scale.setScalar(1.15);
      group.userData = { kind: 'piece', type: type, color: color, referenceModel: false };
    }

    syncPieceTrim(group);
    return group;
  }

  function syncPieceTrim(piece) {
    if (!piece) return;
    const existing = piece.getObjectByName('christmas-trim');
    if (existing) {
      piece.remove(existing);
      existing.traverse(function (child) {
        if (child.geometry) child.geometry.dispose();
      });
    }
    if (currentSkin !== 'christmas' || piece.userData.kind !== 'piece' || !christmasGoldMat) return;

    const trim = new THREE.Group();
    trim.name = 'christmas-trim';

    function addGoldBand(radius, thickness, height) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(radius, thickness, 10, 40),
        christmasGoldMat
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = height;
      band.castShadow = true;
      band.receiveShadow = true;
      trim.add(band);
    }

    // An external base ring stays visible instead of being buried inside the piece base.
    addGoldBand(0.275, 0.018, 0.075);

    const type = piece.userData.type;
    if (type === 'n') {
      // A second collar gives the knight a visible gold detail beneath its head.
      addGoldBand(0.19, 0.016, 0.18);
    } else if (type === 'r') {
      // The rook receives a band around the upper tower.
      addGoldBand(0.225, 0.017, 0.525);
    } else if (type === 'q' || type === 'k') {
      // Queen and king have two collars, including one below the crown.
      addGoldBand(0.17, 0.016, 0.25);
      addGoldBand(0.18, 0.017, 0.665);
    }

    piece.add(trim);
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
     CENÁRIO DE NATAL
     ------------------------------------------------------------ */
  function addWinterTree(parent, x, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, -0.53, z);
    tree.scale.setScalar(scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.38, 10), christmasTrunkMat);
    trunk.position.y = 0.19;
    trunk.castShadow = true;
    tree.add(trunk);

    const layers = [
      { radius: 0.76, height: 0.92, y: 0.62 },
      { radius: 0.59, height: 0.82, y: 1.06 },
      { radius: 0.42, height: 0.7, y: 1.47 },
    ];
    layers.forEach(function (layer, index) {
      const branch = new THREE.Mesh(
        new THREE.ConeGeometry(layer.radius, layer.height, 12),
        christmasPineMat
      );
      branch.position.y = layer.y;
      branch.castShadow = true;
      branch.receiveShadow = true;
      tree.add(branch);

      const snowCount = 7;
      for (let i = 0; i < snowCount; i++) {
        const angle = (i / snowCount) * Math.PI * 2 + index * 0.24;
        const radius = layer.radius * 0.72;
        const flake = new THREE.Mesh(
          new THREE.SphereGeometry(0.065 - index * 0.008, 8, 6),
          christmasSnowMat
        );
        flake.position.set(
          Math.cos(angle) * radius,
          layer.y - layer.height * 0.17,
          Math.sin(angle) * radius
        );
        tree.add(flake);
      }

      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + index * 0.52;
        const ornament = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 12, 10),
          (i + index) % 2 === 0 ? christmasRedMat : christmasGoldMat
        );
        const radius = layer.radius * 0.78;
        ornament.position.set(
          Math.cos(angle) * radius,
          layer.y - layer.height * 0.06,
          Math.sin(angle) * radius
        );
        ornament.castShadow = true;
        tree.add(ornament);
      }
    });

    const cablePoints = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const angle = t * Math.PI * 5.5;
      const radius = 0.69 * (1 - t * 0.78);
      cablePoints.push(new THREE.Vector3(Math.cos(angle) * radius, 0.34 + t * 1.48, Math.sin(angle) * radius));
    }
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 80, 0.014, 5, false),
      christmasGoldMat
    );
    tree.add(cable);

    for (let i = 2; i < 62; i += 4) {
      const point = cablePoints[i];
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 8, 6),
        christmasLightMat
      );
      bulb.position.copy(point);
      tree.add(bulb);
    }

    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), christmasGoldMat);
    star.position.y = 2.0;
    star.rotation.y = Math.PI / 4;
    star.castShadow = true;
    tree.add(star);

    parent.add(tree);
    return tree;
  }

  function addSnowGlobe(parent, x, z, scale) {
    const globe = new THREE.Group();
    globe.position.set(x, -0.53, z);
    globe.scale.setScalar(scale);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.22, 32),
      christmasPineMat
    );
    base.position.y = 0.13;
    base.castShadow = true;
    globe.add(base);

    const baseBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.045, 32),
      christmasGoldMat
    );
    baseBand.position.y = 0.23;
    globe.add(baseBand);

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 32, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0xdcefff,
        roughness: 0.06,
        metalness: 0.04,
        transmission: 0.78,
        thickness: 0.24,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    glass.position.y = 0.82;
    globe.add(glass);

    const miniature = new THREE.Group();
    miniature.position.set(0, 0.28, 0);
    miniature.scale.setScalar(0.28);
    [
      { radius: 0.76, height: 0.92, y: 0.62 },
      { radius: 0.59, height: 0.82, y: 1.06 },
      { radius: 0.42, height: 0.7, y: 1.47 },
    ].forEach(function (layer) {
      const branch = new THREE.Mesh(
        new THREE.ConeGeometry(layer.radius, layer.height, 10),
        christmasPineMat
      );
      branch.position.y = layer.y;
      miniature.add(branch);
    });
    const topper = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), christmasGoldMat);
    topper.position.y = 2.0;
    miniature.add(topper);
    globe.add(miniature);

    for (let i = 0; i < 12; i++) {
      const flake = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 6, 5),
        christmasSnowMat
      );
      const angle = i * 2.399;
      const radius = 0.18 + (i % 3) * 0.1;
      flake.position.set(Math.cos(angle) * radius, 0.54 + (i % 4) * 0.16, Math.sin(angle) * radius);
      globe.add(flake);
    }

    parent.add(globe);
  }

  function addGift(parent, x, z, color, scale) {
    const gift = new THREE.Group();
    gift.position.set(x, -0.52, z);
    gift.scale.setScalar(scale);
    const wrapping = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.12 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.62), wrapping);
    box.position.y = 0.21;
    box.castShadow = true;
    box.receiveShadow = true;
    gift.add(box);

    const ribbonX = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.64), christmasGoldMat);
    ribbonX.position.y = 0.22;
    gift.add(ribbonX);
    const ribbonZ = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.1), christmasGoldMat);
    ribbonZ.position.y = 0.22;
    gift.add(ribbonZ);
    const bowLeft = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI), christmasGoldMat);
    bowLeft.position.set(-0.1, 0.48, 0);
    bowLeft.rotation.z = Math.PI / 2;
    gift.add(bowLeft);
    const bowRight = bowLeft.clone();
    bowRight.position.x = 0.1;
    bowRight.rotation.z = -Math.PI / 2;
    gift.add(bowRight);
    parent.add(gift);
  }

  function buildChristmasEnvironment(compact, lowPower) {
    christmasGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf0c96c,
      emissive: 0x80551a,
      emissiveIntensity: 0.18,
      roughness: 0.2,
      metalness: 0.68,
    });
    christmasPineMat = new THREE.MeshStandardMaterial({ color: 0x123d31, roughness: 0.78, metalness: 0.02 });
    christmasSnowMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fa, roughness: 0.92 });
    christmasRedMat = new THREE.MeshStandardMaterial({ color: 0xb73543, roughness: 0.28, metalness: 0.35 });
    christmasLightMat = new THREE.MeshStandardMaterial({
      color: 0xffe4a0,
      emissive: 0xffc75e,
      emissiveIntensity: 1.15,
      roughness: 0.22,
    });
    christmasTrunkMat = new THREE.MeshStandardMaterial({ color: 0x593a29, roughness: 0.9 });

    christmasDecorGroup = new THREE.Group();
    scene.add(christmasDecorGroup);
    addWinterTree(christmasDecorGroup, -6.15, -5.7, 1.0);
    addWinterTree(christmasDecorGroup, 6.15, -5.8, 0.82);
    addSnowGlobe(christmasDecorGroup, -5.9, 2.2, 0.9);
    addSnowGlobe(christmasDecorGroup, 5.9, 2.0, 0.82);
    addGift(christmasDecorGroup, -5.25, -4.45, 0x9d2f3d, 0.95);
    addGift(christmasDecorGroup, 5.25, -4.5, 0x1e684e, 0.85);
    christmasDecorGroup.visible = false;

    christmasBoardGroup = new THREE.Group();
    const snowEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f8fa, roughness: 0.9 });
    const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(9.05, 0.065, 0.16), snowEdgeMaterial);
    frontEdge.position.set(0, -0.008, 4.48);
    christmasBoardGroup.add(frontEdge);
    const backEdge = frontEdge.clone();
    backEdge.position.z = -4.48;
    christmasBoardGroup.add(backEdge);
    const sideEdgeGeometry = new THREE.BoxGeometry(0.16, 0.065, 8.8);
    const leftEdge = new THREE.Mesh(sideEdgeGeometry, snowEdgeMaterial);
    leftEdge.position.set(-4.48, -0.008, 0);
    christmasBoardGroup.add(leftEdge);
    const rightEdge = leftEdge.clone();
    rightEdge.position.x = 4.48;
    christmasBoardGroup.add(rightEdge);
    boardGroup.add(christmasBoardGroup);
    christmasBoardGroup.visible = false;

    const count = lowPower ? 88 : compact ? 144 : 260;
    snowPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const offset = i * 3;
      snowPositions[offset] = (Math.random() - 0.5) * 20;
      snowPositions[offset + 1] = Math.random() * 10;
      snowPositions[offset + 2] = (Math.random() - 0.5) * 18;
    }
    const snowGeometry = new THREE.BufferGeometry();
    snowAttribute = new THREE.BufferAttribute(snowPositions, 3);
    snowGeometry.setAttribute('position', snowAttribute);
    snowPoints = new THREE.Points(
      snowGeometry,
      new THREE.PointsMaterial({
        color: 0xf4f8ff,
        size: compact ? 0.07 : 0.055,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    snowPoints.visible = false;
    scene.add(snowPoints);
  }

  function updateSnow(dt) {
    if (!snowPoints || !snowPoints.visible || prefersReducedMotion()) return;
    snowDriftTime += dt;
    for (let i = 0; i < snowPositions.length; i += 3) {
      snowPositions[i + 1] -= dt * (0.85 + (i % 7) * 0.035);
      snowPositions[i] += Math.sin(snowDriftTime * 0.8 + i * 0.17) * dt * 0.12;
      if (snowPositions[i + 1] < -0.65) {
        snowPositions[i] = (Math.random() - 0.5) * 20;
        snowPositions[i + 1] = 8 + Math.random() * 3;
        snowPositions[i + 2] = (Math.random() - 0.5) * 18;
      }
    }
    snowAttribute.needsUpdate = true;
  }

  /* ------------------------------------------------------------
     TEMAS E SKINS
     ------------------------------------------------------------ */
  function applyTheme(name) {
    const t = THEMES[name] || THEMES.classic;
    currentTheme = name in THEMES ? name : 'classic';

    scene.background = new THREE.Color(t.bg);
    scene.fog.color.set(t.bg);
    scene.fog.near = currentTheme === 'christmas' ? 17 : 20;
    scene.fog.far = currentTheme === 'christmas' ? 48 : 42;
    if (christmasDecorGroup) christmasDecorGroup.visible = currentTheme === 'christmas';
    if (christmasBoardGroup) christmasBoardGroup.visible = currentTheme === 'christmas';
    if (snowPoints) snowPoints.visible = currentTheme === 'christmas';
    lightSquareMat.color.set(t.light);
    darkSquareMat.color.set(t.dark);
    frameMat.color.set(t.frame);
    groundMat.color.set(t.bg);

    highlightMaterials.selected.color.set(t.accent2 || 0x38bdf8);
    highlightMaterials.move.color.set(t.accent || 0x34d399);

    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-2', t.accent2);
    document.documentElement.dataset.boardTheme = currentTheme;

    // O tema natalino inclui obrigatoriamente o acabamento vermelho/dourado.
    // Não depende de uma skin antiga salva nas configurações do usuário.
    if (currentTheme === 'christmas') applySkin('christmas');
  }

  function applySkin(name) {
    const effectiveSkin = currentTheme === 'christmas'
      ? 'christmas'
      : (name in SKINS ? name : 'classic');
    const s = SKINS[effectiveSkin];
    currentSkin = effectiveSkin;

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

    if (piecesGroup) {
      piecesGroup.children.forEach(function (piece) {
        if (piece.userData && piece.userData.referenceModel) applyReferencePieceSkin(piece);
        syncPieceTrim(piece);
      });
    }
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
  function boardsMatch(snapshot, board) {
    if (!snapshot || !board) return false;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const a = snapshot[r] && snapshot[r][f];
        const b = board[r] && board[r][f];
        if (!a !== !b) return false;
        if (a && (a.type !== b.type || a.color !== b.color)) return false;
      }
    }
    return true;
  }

  function snapshotBoard(board) {
    return board.map(function (row) {
      return row.map(function (piece) {
        return piece ? { type: piece.type, color: piece.color } : null;
      });
    });
  }

  function disposePieceObject(piece) {
    piece.traverse(function (obj) {
      if (!obj.isMesh) return;
      if (obj.geometry) obj.geometry.dispose();
      if ((obj.userData.motionOwnedMaterial || obj.userData.referencePiecePart) && obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(function (mat) { mat.dispose(); });
        else obj.material.dispose();
      }
    });
  }

  function clonePieceMaterials(piece) {
    piece.traverse(function (obj) {
      if (!obj.isMesh || !obj.material) return;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map(function (mat) {
          const clone = mat.clone();
          clone.transparent = true;
          clone.depthWrite = false;
          clone.opacity = 1;
          return clone;
        });
        obj.material.forEach(function (mat) { mat.needsUpdate = true; });
      } else {
        obj.material = obj.material.clone();
        obj.material.transparent = true;
        obj.material.depthWrite = false;
        obj.material.opacity = 1;
        obj.material.needsUpdate = true;
      }
      obj.userData.motionOwnedMaterial = true;
    });
  }

  function pathHasPiece(board, from, to, enPassant) {
    if (!board || !from || !to) return false;

    const dr = to.r - from.r;
    const df = to.f - from.f;
    const absR = Math.abs(dr);
    const absF = Math.abs(df);

    // En passant: a peça capturada fica ao lado do destino, não nele.
    if (enPassant && board[from.r] && board[from.r][to.f]) return true;

    // Movimentos em linha reta ou diagonal: verifica as casas intermediárias.
    if (dr === 0 || df === 0 || absR === absF) {
      const steps = Math.max(absR, absF);
      const stepR = Math.sign(dr);
      const stepF = Math.sign(df);

      for (let i = 1; i < steps; i++) {
        const r = from.r + stepR * i;
        const f = from.f + stepF * i;
        if (board[r] && board[r][f]) return true;
      }
    }

    // No movimento em L do cavalo, verifica as duas casas tocadas
    // pela trajetória entre os centros das casas inicial e final.
    if (absR === 2 && absF === 1) {
      const middleRank = from.r + Math.sign(dr);
      const candidates = [
        { r: middleRank, f: from.f },
        { r: middleRank, f: to.f },
      ];
      if (candidates.some(function (square) {
        return !!(board[square.r] && board[square.r][square.f]);
      })) return true;
    } else if (absR === 1 && absF === 2) {
      const middleFile = from.f + Math.sign(df);
      const candidates = [
        { r: from.r, f: middleFile },
        { r: to.r, f: middleFile },
      ];
      if (candidates.some(function (square) {
        return !!(board[square.r] && board[square.r][square.f]);
      })) return true;
    }

    // Uma peça no destino também é um obstáculo (captura).
    return !!(board[to.r] && board[to.r][to.f]);
  }

  function rebuildPieces(animate, previousBoard) {
    if (!piecesGroup) return;
    for (const child of piecesGroup.children.slice()) {
      piecesGroup.remove(child);
      disposePieceObject(child);
    }

    animations.length = 0;
    if (!currentState) {
      refreshPickables();
      return;
    }

    const board = currentState.board;
    const moveSpecs = [];
    if (animate && lastMove && lastMove.from && lastMove.to) {
      moveSpecs.push({
        from: lastMove.from,
        to: lastMove.to,
        delay: 0,
        jump: pathHasPiece(previousBoard, lastMove.from, lastMove.to, lastMove.enPassant),
      });

      if (lastMove.castle && previousBoard) {
        const kingSide = lastMove.to.f > lastMove.from.f;
        const rookFrom = { r: lastMove.from.r, f: kingSide ? 7 : 0 };
        const rookTo = { r: lastMove.from.r, f: kingSide ? 5 : 3 };
        const oldRook = previousBoard[rookFrom.r] && previousBoard[rookFrom.r][rookFrom.f];
        const newRook = board[rookTo.r] && board[rookTo.r][rookTo.f];
        if (oldRook && oldRook.type === 'r' && newRook &&
            newRook.type === 'r' && newRook.color === oldRook.color) {
          moveSpecs.push({
            from: rookFrom,
            to: rookTo,
            delay: 0.035,
            jump: pathHasPiece(previousBoard, rookFrom, rookTo, false),
          });
        }
      }
    }

    const movedByTarget = new Map();
    moveSpecs.forEach(function (spec) {
      movedByTarget.set(spec.to.r + ':' + spec.to.f, spec);
    });

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) continue;

        const piece = createPiece(p.type, p.color);
        piece.userData.r = r;
        piece.userData.f = f;
        const target = squareToWorld(r, f);
        piece.position.copy(target);

        const spec = movedByTarget.get(r + ':' + f);
        if (spec) {
          const from = squareToWorld(spec.from.r, spec.from.f);
          const distance = Math.hypot(target.x - from.x, target.z - from.z);
          const baseScale = piece.scale.clone();
          const baseRotation = piece.rotation.clone();
          piece.position.copy(from);
          animations.push({
            type: 'move',
            obj: piece,
            from: from,
            to: target.clone(),
            t: 0,
            delay: spec.delay || 0,
            dur: 0.34 + Math.min(distance * 0.015, 0.1),
            height: 1.05 + Math.min(distance * 0.06, 0.42),
            jump: !!spec.jump,
            baseScale: baseScale,
            baseRotation: baseRotation,
          });
        }

        piecesGroup.add(piece);
      }
    }

    /* A peça capturada continua visível por alguns frames: ela perde
       opacidade e sai do caminho enquanto a peça atacante aterrissa. */
    if (animate && previousBoard && lastMove && lastMove.from && lastMove.to) {
      const captureSquare = lastMove.enPassant
        ? { r: lastMove.from.r, f: lastMove.to.f }
        : lastMove.to;
      const captured = previousBoard[captureSquare.r] &&
        previousBoard[captureSquare.r][captureSquare.f];

      if (captured) {
        const ghost = createPiece(captured.type, captured.color);
        ghost.userData = {
          kind: 'capture-ghost',
          effectGhost: true,
        };
        ghost.position.copy(squareToWorld(captureSquare.r, captureSquare.f));
        clonePieceMaterials(ghost);
        piecesGroup.add(ghost);

        const push = lastMove.from.f < lastMove.to.f ? 1 : -1;
        animations.push({
          type: 'capture',
          obj: ghost,
          t: 0,
          dur: 0.27,
          origin: ghost.position.clone(),
          drift: new THREE.Vector3(push * 0.19, -0.12, 0.06),
          baseScale: ghost.scale.clone(),
          baseRotation: ghost.rotation.clone(),
        });
      }
    }

    refreshPickables();
  }

  function refreshPickables() {
    const pieces = piecesGroup
      ? piecesGroup.children.filter(function (piece) { return !piece.userData.effectGhost; })
      : [];
    pickables = squareMeshes.concat(pieces);
  }

  function playIntro() {
    if (!piecesGroup || prefersReducedMotion()) return;
    animations.length = 0;

    piecesGroup.children.forEach(function (piece) {
      if (piece.userData.kind !== 'piece') return;
      const basePosition = piece.position.clone();
      const baseScale = piece.scale.clone();
      piece.position.y = basePosition.y + 1.35;
      piece.scale.copy(baseScale).multiplyScalar(0.84);
      animations.push({
        type: 'intro',
        obj: piece,
        t: 0,
        delay: Math.abs(3.5 - piece.userData.f) * 0.018 +
          (piece.userData.r === 0 || piece.userData.r === 7 ? 0.055 : 0),
        dur: 0.46,
        basePosition: basePosition,
        baseScale: baseScale,
        baseRotation: piece.rotation.clone(),
      });
    });
  }

  function prefersReducedMotion() {
    return !!(global.matchMedia &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function updateAnimations(dt) {
    for (let i = animations.length - 1; i >= 0; i--) {
      const a = animations[i];
      a.t += dt;
      if (a.t < (a.delay || 0)) continue;

      const elapsed = a.t - (a.delay || 0);
      const k = Math.min(elapsed / a.dur, 1);
      const eased = k < 0.5
        ? 4 * k * k * k
        : 1 - Math.pow(-2 * k + 2, 3) / 2;

      if (a.type === 'move') {
        const arc = a.jump ? Math.sin(Math.PI * k) : 0;
        const dx = a.to.x - a.from.x;
        const dz = a.to.z - a.from.z;
        a.obj.position.set(
          a.from.x + dx * eased,
          a.from.y + (a.to.y - a.from.y) * eased + arc * a.height,
          a.from.z + dz * eased
        );

        if (a.jump) {
          const distance = Math.max(1, Math.hypot(dx, dz));
          a.obj.rotation.x = a.baseRotation.x - (dz / distance) * arc * 0.055;
          a.obj.rotation.z = a.baseRotation.z + (dx / distance) * arc * 0.055;

          if (k > 0.84) {
            const landing = (k - 0.84) / 0.16;
            const squash = Math.sin(Math.PI * landing) * 0.055;
            a.obj.scale.set(
              a.baseScale.x * (1 + squash),
              a.baseScale.y * (1 - squash * 1.3),
              a.baseScale.z * (1 + squash)
            );
          } else {
            a.obj.scale.copy(a.baseScale).multiplyScalar(1 + arc * 0.025);
          }
        } else {
          // Caminho livre: deslocamento contínuo, sem salto, inclinação ou impacto.
          a.obj.rotation.copy(a.baseRotation);
          a.obj.scale.copy(a.baseScale);
        }

        if (k >= 1) {
          a.obj.position.copy(a.to);
          a.obj.rotation.copy(a.baseRotation);
          a.obj.scale.copy(a.baseScale);
        }
      } else if (a.type === 'capture') {
        const fade = 1 - eased;
        a.obj.position.set(
          a.origin.x + a.drift.x * eased,
          a.origin.y + a.drift.y * eased + Math.sin(Math.PI * k) * 0.05,
          a.origin.z + a.drift.z * eased
        );
        a.obj.rotation.z = a.baseRotation.z + 0.42 * eased;
        a.obj.scale.copy(a.baseScale).multiplyScalar(1 - eased * 0.36);
        a.obj.traverse(function (obj) {
          if (!obj.isMesh || !obj.userData.motionOwnedMaterial || !obj.material) return;
          if (Array.isArray(obj.material)) {
            obj.material.forEach(function (mat) { mat.opacity = fade; });
          } else {
            obj.material.opacity = fade;
          }
        });
      } else if (a.type === 'intro') {
        const bounce = Math.sin(Math.PI * k);
        a.obj.position.copy(a.basePosition);
        a.obj.position.y += (1 - eased) * 1.35 + bounce * 0.07;
        const scale = 0.84 + eased * 0.16 + bounce * 0.035;
        a.obj.scale.copy(a.baseScale).multiplyScalar(scale);
        a.obj.rotation.copy(a.baseRotation);
      }

      if (k >= 1) {
        if (a.type === 'capture') {
          piecesGroup.remove(a.obj);
          disposePieceObject(a.obj);
        }
        animations.splice(i, 1);
      }
    }
  }

  /* ------------------------------------------------------------
     EFEITOS ESPECIAIS
     ------------------------------------------------------------ */
  function playEffect(kind, r, f) {
    if (!effectsEnabled || !effectsGroup) return;
    const p = squareToWorld(r, f);

    if (kind === 'capture' || kind === 'explosion' || kind === 'promotion') {
      const count = kind === 'explosion' ? 26 : kind === 'promotion' ? 12 : 9;
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: kind === 'explosion' ? 0xfb7185 : kind === 'promotion' ? 0x86efac : 0xd7bd80,
          transparent: true,
          opacity: 1,
        });
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 8, 6), mat);
        m.position.copy(p).add(new THREE.Vector3(0, kind === 'promotion' ? 0.52 : 0.35, 0));
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

    if (kind === 'check' || kind === 'explosion' || kind === 'promotion') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.32, 40),
        new THREE.MeshBasicMaterial({
          color: kind === 'promotion' ? 0x86efac : 0xef4444, transparent: true, opacity: 0.95,
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
  let isActive = true;

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
    if (!renderer || document.hidden || !isActive) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    updateAnimations(dt);
    updateEffects(dt);
    updateSnow(dt);
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

    if (!isActive) return;
    if (clock) clock.start();
    if (renderer && animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  function setActive(value) {
    isActive = !!value;
    if (!renderer) return;

    if (!isActive && animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      return;
    }

    if (isActive && !document.hidden && animationFrameId === null) {
      resize();
      if (clock) clock.start();
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
    const memory = Number(global.navigator && global.navigator.deviceMemory) || 0;
    const cores = Number(global.navigator && global.navigator.hardwareConcurrency) || 0;
    const lowPower = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
    renderer = new THREE.WebGLRenderer({
      antialias: !lowPower && !compact,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : compact ? 1.25 : 1.5));
    renderer.shadowMap.enabled = !lowPower;
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
    keyLight.castShadow = !lowPower;
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

    // Carrega apenas a geometria das peças; tabuleiro, regras e controles permanecem locais.
    loadReferencePieceModels();

    highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    effectsGroup = new THREE.Group();
    scene.add(effectsGroup);

    buildChristmasEnvironment(compact, lowPower);

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
    setActive: setActive,
    setState: function (state, opts) {
      opts = opts || {};
      const nextBoard = state && state.board;
      const previousBoard = renderedBoardSnapshot;
      const boardChanged = !boardsMatch(previousBoard, nextBoard);
      currentState = state;
      lastMove = opts.lastMove || null;
      selected = opts.selected || null;
      legalMoves = opts.legalMoves || [];
      checkSquare = opts.checkSquare || null;

      if (boardChanged) {
        rebuildPieces(!!opts.animate && !prefersReducedMotion(), previousBoard);
        renderedBoardSnapshot = nextBoard ? snapshotBoard(nextBoard) : null;
      }
      renderHighlights();
    },
    setTheme: applyTheme,
    setSkin: applySkin,
    setEffects: function (enabled) { effectsEnabled = !!enabled; },
    playIntro: playIntro,
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
