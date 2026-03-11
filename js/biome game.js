(function () {
  'use strict';
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;color:#c00;">Three.js failed to load. Check your connection or try again.</div>';
    return;
  }
  function startGame() {
  try {
  // —— Simplex-style 2D noise (deterministic, seedable) ——
  var PERM = new Uint8Array(512);
  var perm = new Uint8Array(256);
  var seed = 12345;
  for (var i = 0; i < 256; i++) perm[i] = i;
  for (var i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    var j = seed % (i + 1);
    var t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (var i = 0; i < 512; i++) PERM[i] = perm[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad2(hash, x, z) {
    var g = (hash & 1) ? hash & 2 ? -z : z : hash & 2 ? -x : x;
    return g;
  }

  function noise2D(x, z) {
    var X = Math.floor(x) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); z -= Math.floor(z);
    var u = fade(x), v = fade(z);
    var A = PERM[X] + Z, B = PERM[X + 1] + Z;
    return lerp(
      lerp(grad2(PERM[A], x, z), grad2(PERM[B], x - 1, z), u),
      lerp(grad2(PERM[A + 1], x, z - 1), grad2(PERM[B + 1], x - 1, z - 1), u),
      v
    ) * 0.5 + 0.5;
  }

  function octaveNoise(x, z, octaves, persistence) {
    var total = 0, freq = 1, amp = 1, maxAmp = 0;
    for (var i = 0; i < octaves; i++) {
      total += noise2D(x * freq, z * freq) * amp;
      maxAmp += amp;
      amp *= persistence;
      freq *= 2;
    }
    return total / maxAmp;
  }

  // —— Config ——
  var WORLD_SIZE = 580;
  var half = WORLD_SIZE / 2;
  var CHUNK_SIZE = 200;
  var SEGMENTS_PER_CHUNK = 40;
  var SEGMENTS = 145;
  var HEIGHT_SCALE = 28;
  var FLY_SPEED = 45;
  var LOOK_SENSITIVITY = 0.002;
  var PLAYER_HEIGHT = 1.75;
  var BIOME_CELL_W = 83;
  var BIOME_CELL_H = 116;

  function getBiomeValue(px, pz) {
    var cellX = ((Math.floor(px / BIOME_CELL_W) % 7) + 7) % 7;
    var cellZ = ((Math.floor(pz / BIOME_CELL_H) % 5) + 5) % 5;
    return cellX + cellZ * 7;
  }
  var BIOME_NAMES = ['Grassland', 'Forest', 'Desert', 'Mountains', 'Swamp', 'Ocean', 'Graveyard', 'Mangrove', 'Redrock', 'Taiga', 'Jungle', 'Forest', 'Gel Sea', 'Forest', 'Mushroom Forest', 'Badlands', 'Grassland', 'Grassland', 'Grassland', 'Grassland', 'Grassland', 'Redwood Forest', 'Elfin Woodland', 'Woodland', 'Maple Grove', 'Cherry Grove', 'Chaparral', 'Savanna', 'Cacti Forest', 'Grassland', 'Grassland', 'Grassland', 'Grassland', 'Grassland', 'Grassland'];
  var MOUNTAIN_HEIGHT = 58;
  var SNOW_LINE = 42;
  var SEA_FLOOR_Y = 8;
  var SWAMP_WATER_LEVEL = 10;
  var MANGROVE_WATER_LEVEL = 10;
  function isSwampWet(px, pz) {
    return octaveNoise(px * 0.028, pz * 0.028 + 333, 2, 0.5) > 0.5;
  }
  function isMangroveWet(px, pz) {
    return octaveNoise(px * 0.025, pz * 0.025 + 444, 2, 0.5) > 0.48;
  }
  var GEL_SEAFLOOR_Y = 8;
  var GEL_ISLAND_HEIGHT = 11.2;
  function isGelSeaIsland(px, pz) {
    return octaveNoise(px * 0.032, pz * 0.032 + 555, 3, 0.5) > 0.68;
  }
  function getTerrainHeight(worldX, worldZ) {
    var px = worldX + half;
    var pz = -worldZ + half;
    var biome = getBiomeValue(px, pz);
    if (biome === 5) return SEA_FLOOR_Y + (octaveNoise(px * 0.04, pz * 0.04, 2, 0.5) - 0.5) * 1.5;
    var h = octaveNoise(px * 0.015, pz * 0.015, 4, 0.5) * HEIGHT_SCALE;
    if (biome === 2) h += octaveNoise(px * 0.03, pz * 0.03, 2, 0.6) * 4;
    if (biome === 8) {
      h += octaveNoise(px * 0.025, pz * 0.025, 2, 0.6) * 2;
      var valley = octaveNoise(px * 0.006, pz * 0.006 + 200, 2, 0.5);
      if (valley < 0.5) h -= (0.5 - valley) * 18;
    }
    if (biome === 3) {
      var mn = octaveNoise(px * 0.0055, pz * 0.0055, 3, 0.6);
      h += Math.pow(mn, 1.55) * MOUNTAIN_HEIGHT;
    }
    if (biome === 4) {
      if (isSwampWet(px, pz)) h = SWAMP_WATER_LEVEL;
      else h = h * 0.82 + octaveNoise(px * 0.04, pz * 0.04, 2, 0.5) * 1.5;
    }
    if (biome === 7) h = MANGROVE_WATER_LEVEL;
    if (biome === 6) h = h * 0.72 + octaveNoise(px * 0.05, pz * 0.05, 2, 0.5) * 1.8;
    if (biome === 12) h = isGelSeaIsland(px, pz) ? GEL_ISLAND_HEIGHT : GEL_SEAFLOOR_Y;
    if (biome === 15) h += octaveNoise(px * 0.03, pz * 0.03 + 200, 2, 0.6) * 5;
    return h;
  }
  var GRASS_COLOR = new THREE.Color(0.32, 0.95, 0.28);
  var FOREST_GROUND = new THREE.Color(0.28, 0.55, 0.22);
  var DESERT_COLOR = new THREE.Color(0.92, 0.78, 0.15);
  var SWAMP_GREEN = new THREE.Color(0.12, 0.22, 0.14);
  var SWAMP_BROWN = new THREE.Color(0.22, 0.16, 0.10);
  var MANGROVE_COLOR = new THREE.Color(0.16, 0.26, 0.14);
  var GRAVEYARD_COLOR = new THREE.Color(0.22, 0.24, 0.26);
  var REDROCK_COLOR = new THREE.Color(0.72, 0.32, 0.22);
  var TAIGA_COLOR = new THREE.Color(0.18, 0.32, 0.22);
  var JUNGLE_COLOR = new THREE.Color(0.12, 0.38, 0.18);
  var MUSHROOM_FOREST_COLOR = new THREE.Color(0.22, 0.18, 0.28);
  var BADLANDS_COLOR = new THREE.Color(0.78, 0.58, 0.38);
  var REDWOOD_FOREST_COLOR = new THREE.Color(0.22, 0.20, 0.16);
  var ELFIN_WOODLAND_COLOR = new THREE.Color(0.28, 0.34, 0.26);
  var WOODLAND_COLOR = new THREE.Color(0.38, 0.52, 0.30);
  var MAPLE_GROVE_COLOR = new THREE.Color(0.42, 0.32, 0.22);
  var CHERRY_GROVE_COLOR = new THREE.Color(0.38, 0.30, 0.32);
  var CHAPARRAL_COLOR = new THREE.Color(0.52, 0.42, 0.28);
  var SAVANNA_COLOR = new THREE.Color(0.82, 0.72, 0.38);
  var CACTI_FOREST_COLOR = new THREE.Color(0.72, 0.62, 0.42);
  var GEL_ISLAND_COLOR = new THREE.Color(0.35, 0.28, 0.18);
  var GEL_SEAFLOOR_COLOR = new THREE.Color(0.12, 0.35, 0.18);
  var STONE_COLOR = new THREE.Color(0.52, 0.52, 0.54);
  var SNOW_COLOR = new THREE.Color(0.95, 0.97, 1.0);
  var SAND_SEAFLOOR = new THREE.Color(0.92, 0.85, 0.45);
  var GRASS_HIGHLIGHT = new THREE.Color(0.55, 0.82, 0.38);
  var DESERT_HIGHLIGHT = new THREE.Color(0.98, 0.88, 0.35);
  var TREE_TRUNK_COLOR = new THREE.Color(0.45, 0.32, 0.22);
  var TREE_LEAVES_COLOR = new THREE.Color(0.38, 0.72, 0.30);
  var TREE_SPACING = 9;
  var TREE_JITTER = 1.4;
  var TREE_COLLIDE_RADIUS = 2.5;
  var TRUNK_RADIUS = 0.6;
  var TRUNK_HEIGHT = 5;
  var PLAYER_RADIUS = 0.4;
  var treeColliders = [];
  var trunkColliders = [];

  // —— Scene ——
  var canvas = document.getElementById('canvas');
  if (!canvas) { document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;color:#c00;">Canvas not found.</div>'; return; }
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 320, 720);

  var w = Math.max(1, window.innerWidth || canvas.clientWidth || 800);
  var h = Math.max(1, window.innerHeight || canvas.clientHeight || 600);
  var camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 2000);
  camera.position.set(0, 80, 120);
  camera.lookAt(0, 20, -100);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x87ceeb, 1);
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // First-person hand and arm (straight: arm behind hand, both in line with punch)
  var handGroup = new THREE.Group();
  handGroup.scale.setScalar(2.2);
  var skinColor = 0xe8c4a0;
  var handMat = new THREE.MeshLambertMaterial({ color: skinColor });
  var forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.2, 8), handMat);
  forearm.rotation.x = -Math.PI / 2;
  forearm.position.set(0, 0, -0.12);
  handGroup.add(forearm);
  var palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.05), handMat);
  palm.position.set(0, 0, 0);
  handGroup.add(palm);
  for (var fi = 0; fi < 4; fi++) {
    var finger = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.025), handMat);
    finger.position.set(0.022 - fi * 0.018, -0.05 - 0.03, 0.028);
    handGroup.add(finger);
  }
  var thumb = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.022), handMat);
  thumb.position.set(0.045, 0.022, 0.028);
  handGroup.add(thumb);
  var heldItemGroup = new THREE.Group();
  heldItemGroup.position.set(0, 0, 0.04);
  var heldStick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.2, 8), new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
  heldStick.rotation.x = Math.PI / 2;
  heldStick.position.set(0, 0, 0.06);
  heldStick.visible = false;
  heldItemGroup.add(heldStick);
  var heldStone = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
  heldStone.position.set(0, 0, 0.05);
  heldStone.visible = false;
  heldItemGroup.add(heldStone);
  var heldApple = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshLambertMaterial({ color: 0xcc3333 }));
  heldApple.position.set(0, 0, 0.05);
  heldApple.visible = false;
  heldItemGroup.add(heldApple);
  handGroup.add(heldItemGroup);
  scene.add(handGroup);

  // Third-person player body — zombie shape (blob torso/head, arms, legs), upright posture, custom colors
  var playerBodyGroup = new THREE.Group();
  var bodySkinColor = 0xe8c4a0;
  var bodyShirtColor = 0x4a70aa;
  var bodyLegColor = 0x2a2a3a;
  var playerMat = function(c) { return new THREE.MeshLambertMaterial({ color: c }); };
  var playerTorso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), playerMat(bodyShirtColor));
  playerTorso.scale.set(0.9, 1.1, 0.95);
  playerTorso.position.y = 0.575;
  playerBodyGroup.add(playerTorso);
  var playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), playerMat(bodySkinColor));
  playerHead.scale.set(0.95, 0.95, 1);
  playerHead.position.y = 1.1;
  playerBodyGroup.add(playerHead);
  var playerEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), playerMat(0x2a1a1a));
  playerEyeL.position.set(-0.06, 1.14, 0.18);
  playerBodyGroup.add(playerEyeL);
  var playerEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), playerMat(0x2a1a1a));
  playerEyeR.position.set(0.06, 1.14, 0.18);
  playerBodyGroup.add(playerEyeR);
  var armGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.2, 8);
  var playerArmL = new THREE.Mesh(armGeo, playerMat(bodySkinColor));
  playerArmL.position.set(-0.16, 0.48, 0.12);
  playerBodyGroup.add(playerArmL);
  var playerArmR = new THREE.Mesh(armGeo.clone(), playerMat(bodySkinColor));
  playerArmR.position.set(0.16, 0.48, 0.12);
  playerBodyGroup.add(playerArmR);
  var handGeo = new THREE.SphereGeometry(0.055, 8, 6);
  var playerHandL = new THREE.Mesh(handGeo, playerMat(bodySkinColor));
  playerHandL.position.set(-0.16, 0.36, 0.2);
  playerBodyGroup.add(playerHandL);
  var playerHandR = new THREE.Mesh(handGeo.clone(), playerMat(bodySkinColor));
  playerHandR.position.set(0.16, 0.36, 0.2);
  playerBodyGroup.add(playerHandR);
  var legGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.32, 8);
  var playerLegL = new THREE.Mesh(legGeo, playerMat(bodyLegColor));
  playerLegL.position.set(-0.1, 0.16, 0.04);
  playerBodyGroup.add(playerLegL);
  var playerLegR = new THREE.Mesh(legGeo.clone(), playerMat(bodyLegColor));
  playerLegR.position.set(0.1, 0.16, 0.04);
  playerBodyGroup.add(playerLegR);
  var kneeGeo = new THREE.SphereGeometry(0.065, 6, 5);
  var playerKneeL = new THREE.Mesh(kneeGeo, playerMat(bodyLegColor));
  playerKneeL.position.set(-0.1, 0.02, 0.04);
  playerBodyGroup.add(playerKneeL);
  var playerKneeR = new THREE.Mesh(kneeGeo.clone(), playerMat(bodyLegColor));
  playerKneeR.position.set(0.1, 0.02, 0.04);
  playerBodyGroup.add(playerKneeR);
  playerBodyGroup.scale.setScalar(PLAYER_HEIGHT / 1.35);
  playerBodyGroup.visible = false;
  scene.add(playerBodyGroup);

  // Sun
  var sun = new THREE.DirectionalLight(0xfff5e6, 1.1);
  sun.position.set(120, 150, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  var d = 200;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -d;
  sun.shadow.camera.right = sun.shadow.camera.top = d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x6688aa, 0.5));

  function getTerrainColor(px, pz, h) {
    var biome = getBiomeValue(px, pz);
    var shade = 0.85 + (h / HEIGHT_SCALE) * 0.15;
    var c;
    if (biome === 0) c = GRASS_COLOR.clone().multiplyScalar(shade);
    else if (biome === 1) c = FOREST_GROUND.clone().multiplyScalar(shade);
    else if (biome === 2) c = DESERT_COLOR.clone().multiplyScalar(shade);
    else if (biome === 4) {
      var wet = isSwampWet(px, pz);
      var swampT = octaveNoise(px * 0.06, pz * 0.06 + 200, 2, 0.5);
      c = (swampT < 0.5 ? SWAMP_GREEN.clone() : SWAMP_BROWN.clone()).multiplyScalar(wet ? 0.72 : 0.82 + (octaveNoise(px * 0.08, pz * 0.08, 1, 0.5) - 0.5) * 0.2);
    }
    else if (biome === 5) c = SAND_SEAFLOOR.clone().multiplyScalar(0.9 + (octaveNoise(px * 0.1, pz * 0.1, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 6) c = GRAVEYARD_COLOR.clone().multiplyScalar(0.78 + (octaveNoise(px * 0.07, pz * 0.07, 1, 0.5) - 0.5) * 0.18);
    else if (biome === 7) c = MANGROVE_COLOR.clone().multiplyScalar(0.78 + (octaveNoise(px * 0.06, pz * 0.06 + 150, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 8) c = REDROCK_COLOR.clone().multiplyScalar(0.82 + (octaveNoise(px * 0.05, pz * 0.05 + 88, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 9) c = TAIGA_COLOR.clone().multiplyScalar(0.78 + (octaveNoise(px * 0.06, pz * 0.06 + 220, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 10) c = JUNGLE_COLOR.clone().multiplyScalar(0.75 + (octaveNoise(px * 0.07, pz * 0.07 + 180, 1, 0.5) - 0.5) * 0.22);
    else if (biome === 11) c = FOREST_GROUND.clone().multiplyScalar(shade);
    else if (biome === 12) c = (isGelSeaIsland(px, pz) ? GEL_ISLAND_COLOR : GEL_SEAFLOOR_COLOR).clone().multiplyScalar(0.82 + (octaveNoise(px * 0.08, pz * 0.08 + 100, 1, 0.5) - 0.5) * 0.18);
    else if (biome === 13) c = FOREST_GROUND.clone().multiplyScalar(shade);
    else if (biome === 14) c = MUSHROOM_FOREST_COLOR.clone().multiplyScalar(0.78 + (octaveNoise(px * 0.06, pz * 0.06 + 300, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 15) c = BADLANDS_COLOR.clone().multiplyScalar(0.8 + (octaveNoise(px * 0.06, pz * 0.06 + 111, 1, 0.5) - 0.5) * 0.22);
    else if (biome === 21) c = REDWOOD_FOREST_COLOR.clone().multiplyScalar(0.78 + (octaveNoise(px * 0.06, pz * 0.06 + 401, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 22) c = ELFIN_WOODLAND_COLOR.clone().multiplyScalar(0.8 + (octaveNoise(px * 0.06, pz * 0.06 + 402, 1, 0.5) - 0.5) * 0.18);
    else if (biome === 23) c = WOODLAND_COLOR.clone().multiplyScalar(0.82 + (octaveNoise(px * 0.06, pz * 0.06 + 403, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 24) c = MAPLE_GROVE_COLOR.clone().multiplyScalar(0.8 + (octaveNoise(px * 0.06, pz * 0.06 + 404, 1, 0.5) - 0.5) * 0.22);
    else if (biome === 25) c = CHERRY_GROVE_COLOR.clone().multiplyScalar(0.82 + (octaveNoise(px * 0.06, pz * 0.06 + 405, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 26) c = CHAPARRAL_COLOR.clone().multiplyScalar(0.82 + (octaveNoise(px * 0.05, pz * 0.05 + 406, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 27) c = SAVANNA_COLOR.clone().multiplyScalar(0.85 + (octaveNoise(px * 0.07, pz * 0.07 + 407, 1, 0.5) - 0.5) * 0.2);
    else if (biome === 28) c = CACTI_FOREST_COLOR.clone().multiplyScalar(0.82 + (octaveNoise(px * 0.05, pz * 0.05 + 408, 1, 0.5) - 0.5) * 0.2);
    else if ((biome >= 16 && biome <= 20) || (biome >= 29 && biome <= 34)) c = GRASS_COLOR.clone().multiplyScalar(shade);  // ex-Highlands → Grassland
    else {
      c = h >= SNOW_LINE ? SNOW_COLOR.clone() : STONE_COLOR.clone();
      c.multiplyScalar(0.92 + (h / (HEIGHT_SCALE + MOUNTAIN_HEIGHT)) * 0.12);
    }
    return c;
  }

  var terrainMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: false,
  });
  var terrainChunks = {};
  var CHUNK_LOAD_RADIUS = 2;
  var populateChunkContent = null;
  var spawnChunkAnimalsFn = null;
  function buildChunk(cx, cz) {
    var key = cx + ',' + cz;
    if (terrainChunks[key]) return;
    var wx = cx * CHUNK_SIZE;
    var wz = cz * CHUNK_SIZE;
    var geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, SEGMENTS_PER_CHUNK, SEGMENTS_PER_CHUNK);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = [];
    for (var i = 0; i < pos.count; i++) {
      var localX = pos.getX(i);
      var localZ = pos.getZ(i);
      var worldX = wx + CHUNK_SIZE / 2 + localX;
      var worldZ = wz + CHUNK_SIZE / 2 + localZ;
      var px = worldX + half;
      var pz = -worldZ + half;
      var h = getTerrainHeight(worldX, worldZ);
      pos.setY(i, h);
      var c = getTerrainColor(px, pz, h);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, terrainMat);
    mesh.receiveShadow = true;
    var group = new THREE.Group();
    group.position.set(wx + CHUNK_SIZE / 2, 0, wz + CHUNK_SIZE / 2);
    group.add(mesh);
    scene.add(group);
    var chunkData = { group: group, trunkColliders: [], treeColliders: [], animals: [], key: key };
    terrainChunks[key] = chunkData;
    if (populateChunkContent) populateChunkContent(cx, cz, chunkData);
    if (spawnChunkAnimalsFn) spawnChunkAnimalsFn(cx, cz, chunkData);
  }
  function updateChunks(px, pz) {
    var cx = Math.floor(px / CHUNK_SIZE);
    var cz = Math.floor(pz / CHUNK_SIZE);
    var toRemove = [];
    for (var k in terrainChunks) {
      var parts = k.split(',');
      var ccx = parseInt(parts[0], 10);
      var ccz = parseInt(parts[1], 10);
      if (Math.abs(ccx - cx) > CHUNK_LOAD_RADIUS || Math.abs(ccz - cz) > CHUNK_LOAD_RADIUS) toRemove.push(k);
    }
    for (var r = 0; r < toRemove.length; r++) {
      var cd = terrainChunks[toRemove[r]];
      if (!cd) continue;
      scene.remove(cd.group);
      for (var tc = 0; tc < cd.trunkColliders.length; tc++) {
        var idx = trunkColliders.indexOf(cd.trunkColliders[tc]);
        if (idx >= 0) trunkColliders.splice(idx, 1);
      }
      for (var sc = 0; sc < cd.treeColliders.length; sc++) {
        var idx2 = treeColliders.indexOf(cd.treeColliders[sc]);
        if (idx2 >= 0) treeColliders.splice(idx2, 1);
      }
      for (var a = 0; a < cd.animals.length; a++) {
        var ani = cd.animals[a];
        animalsGroup.remove(ani);
        var ai = animalList.indexOf(ani);
        if (ai >= 0) animalList.splice(ai, 1);
      }
      delete terrainChunks[toRemove[r]];
    }
    for (var dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
      for (var dz = -CHUNK_LOAD_RADIUS; dz <= CHUNK_LOAD_RADIUS; dz++) {
        buildChunk(cx + dx, cz + dz);
      }
    }
  }
  updateChunks(0, 0);

  // —— Prop geometries (per-chunk spawning) ——
  var trunkGeo = new THREE.CylinderGeometry(0.4, 0.55, 5, 6);
  var leavesGeo = new THREE.SphereGeometry(2.8, 8, 6);
  var trunkMat = new THREE.MeshLambertMaterial({ color: TREE_TRUNK_COLOR });
  var leavesMat = new THREE.MeshLambertMaterial({ color: TREE_LEAVES_COLOR });
  var chunkMinX = 0, chunkMaxX = 0, chunkMinZ = 0, chunkMaxZ = 0, ccX = 0, ccZ = 0;
  function addToChunk(cd, mesh, wx, wy, wz) {
    mesh.position.set(wx - ccX, wy, wz - ccZ);
    cd.group.add(mesh);
  }
  populateChunkContent = function (cx, cz, cd) {
    chunkMinX = cx * CHUNK_SIZE; chunkMaxX = (cx + 1) * CHUNK_SIZE;
    chunkMinZ = cz * CHUNK_SIZE; chunkMaxZ = (cz + 1) * CHUNK_SIZE;
    ccX = chunkMinX + CHUNK_SIZE / 2; ccZ = chunkMinZ + CHUNK_SIZE / 2;
    var startTx = Math.floor(chunkMinX / TREE_SPACING) * TREE_SPACING;
    var startTz = Math.floor(chunkMinZ / TREE_SPACING) * TREE_SPACING;
    for (var tx = startTx; tx < chunkMaxX; tx += TREE_SPACING) {
      for (var tz = startTz; tz < chunkMaxZ; tz += TREE_SPACING) {
        var px = tx + half, pz = -tz + half;
        if (getBiomeValue(px, pz) !== 1) continue;
        var jx = (noise2D(px * 0.7, pz * 0.7) - 0.5) * 2 * TREE_JITTER;
        var jz = (noise2D(px * 0.7 + 100, pz * 0.7 + 100) - 0.5) * 2 * TREE_JITTER;
        var wx = tx + jx, wz = tz + jz;
        if (wx < chunkMinX - 1 || wx > chunkMaxX + 1 || wz < chunkMinZ - 1 || wz > chunkMaxZ + 1) continue;
        var groundY = getTerrainHeight(wx, wz);
        var trunk = new THREE.Mesh(trunkGeo, trunkMat);
        addToChunk(cd, trunk, wx, groundY + 2.5, wz);
        trunk.castShadow = true; trunk.receiveShadow = true;
        var leavesY = groundY + 6.2;
        var leaves = new THREE.Mesh(leavesGeo, leavesMat);
        addToChunk(cd, leaves, wx, leavesY, wz);
        leaves.castShadow = true; leaves.receiveShadow = true;
        var tc = { x: wx, y: leavesY, z: wz, r: TREE_COLLIDE_RADIUS };
        var trc = { x: wx, z: wz, groundY: groundY, height: TRUNK_HEIGHT, r: TRUNK_RADIUS };
        cd.treeColliders.push(tc); cd.trunkColliders.push(trc);
        treeColliders.push(tc); trunkColliders.push(trc);
      }
    }
    // Taiga (biome 9)
    var TAIGA_TREE_SPACING = 8;
    var TAIGA_TRUNK_HEIGHT = 6;
    var TAIGA_TRUNK_RADIUS = 0.5;
    var taigaTrunkGeo = new THREE.CylinderGeometry(TAIGA_TRUNK_RADIUS * 0.6, TAIGA_TRUNK_RADIUS, TAIGA_TRUNK_HEIGHT, 6);
    var taigaConeGeo = new THREE.ConeGeometry(2.2, 5.5, 8);
    var taigaTrunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2e22 });
    var taigaLeavesMat = new THREE.MeshLambertMaterial({ color: 0x1e4a2a });
    for (var ttx = Math.floor(chunkMinX / TAIGA_TREE_SPACING) * TAIGA_TREE_SPACING; ttx < chunkMaxX; ttx += TAIGA_TREE_SPACING) {
      for (var ttz = Math.floor(chunkMinZ / TAIGA_TREE_SPACING) * TAIGA_TREE_SPACING; ttz < chunkMaxZ; ttz += TAIGA_TREE_SPACING) {
        var tpx = ttx + half, tpz = -ttz + half;
        if (getBiomeValue(tpx, tpz) !== 9) continue;
        var tjx = (noise2D(tpx * 0.6, tpz * 0.6) - 0.5) * 2.2, tjz = (noise2D(tpx * 0.6 + 77, tpz * 0.6 + 77) - 0.5) * 2.2;
        var twx = ttx + tjx, twz = ttz + tjz;
        if (twx < chunkMinX - 1 || twx > chunkMaxX + 1 || twz < chunkMinZ - 1 || twz > chunkMaxZ + 1) continue;
        var tGroundY = getTerrainHeight(twx, twz);
        var taigaTrunk = new THREE.Mesh(taigaTrunkGeo, taigaTrunkMat);
        addToChunk(cd, taigaTrunk, twx, tGroundY + TAIGA_TRUNK_HEIGHT / 2, twz);
        taigaTrunk.castShadow = true; taigaTrunk.receiveShadow = true;
        var taigaCone = new THREE.Mesh(taigaConeGeo, taigaLeavesMat);
        addToChunk(cd, taigaCone, twx, tGroundY + TAIGA_TRUNK_HEIGHT + 2.75, twz);
        taigaCone.castShadow = true; taigaCone.receiveShadow = true;
        var tc2 = { x: twx, y: tGroundY + TAIGA_TRUNK_HEIGHT + 2.75, z: twz, r: TREE_COLLIDE_RADIUS };
        var trc2 = { x: twx, z: twz, groundY: tGroundY, height: TAIGA_TRUNK_HEIGHT + 5.5, r: TRUNK_RADIUS };
        cd.treeColliders.push(tc2); cd.trunkColliders.push(trc2); treeColliders.push(tc2); trunkColliders.push(trc2);
      }
    }
    var JUNGLE_TREE_SPACING = 6;
    var JUNGLE_TRUNK_HEIGHT = 21;
    var JUNGLE_TRUNK_RADIUS = 0.55;
    var jungleTrunkGeo = new THREE.CylinderGeometry(JUNGLE_TRUNK_RADIUS * 0.7, JUNGLE_TRUNK_RADIUS, JUNGLE_TRUNK_HEIGHT, 6);
    var jungleCanopyGeo = new THREE.SphereGeometry(9.6, 10, 8);
    var jungleTrunkMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    var jungleLeavesMat = new THREE.MeshLambertMaterial({ color: 0x1a4a28 });
    for (var jtx = Math.floor(chunkMinX / JUNGLE_TREE_SPACING) * JUNGLE_TREE_SPACING; jtx < chunkMaxX; jtx += JUNGLE_TREE_SPACING) {
      for (var jtz = Math.floor(chunkMinZ / JUNGLE_TREE_SPACING) * JUNGLE_TREE_SPACING; jtz < chunkMaxZ; jtz += JUNGLE_TREE_SPACING) {
        var jpx = jtx + half, jpz = -jtz + half;
        if (getBiomeValue(jpx, jpz) !== 10) continue;
        var jjx = (noise2D(jpx * 0.55, jpz * 0.55) - 0.5) * 2.5, jjz = (noise2D(jpx * 0.55 + 99, jpz * 0.55 + 99) - 0.5) * 2.5;
        var jwx = jtx + jjx, jwz = jtz + jjz;
        if (jwx < chunkMinX - 1 || jwx > chunkMaxX + 1 || jwz < chunkMinZ - 1 || jwz > chunkMaxZ + 1) continue;
        var jGroundY = getTerrainHeight(jwx, jwz);
        var jungleTrunk = new THREE.Mesh(jungleTrunkGeo, jungleTrunkMat);
        addToChunk(cd, jungleTrunk, jwx, jGroundY + JUNGLE_TRUNK_HEIGHT / 2, jwz);
        jungleTrunk.castShadow = true; jungleTrunk.receiveShadow = true;
        var jungleCanopy = new THREE.Mesh(jungleCanopyGeo, jungleLeavesMat);
        addToChunk(cd, jungleCanopy, jwx, jGroundY + JUNGLE_TRUNK_HEIGHT + 4.8, jwz);
        jungleCanopy.castShadow = true; jungleCanopy.receiveShadow = true;
        var tc3 = { x: jwx, y: jGroundY + JUNGLE_TRUNK_HEIGHT + 4.8, z: jwz, r: TREE_COLLIDE_RADIUS };
        var trc3 = { x: jwx, z: jwz, groundY: jGroundY, height: JUNGLE_TRUNK_HEIGHT + 9.6, r: TRUNK_RADIUS };
        cd.treeColliders.push(tc3); cd.trunkColliders.push(trc3); treeColliders.push(tc3); trunkColliders.push(trc3);
      }
    }
    var MUSHROOM_SPACING = 6;
    var mushroomStemMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc });
    var mushroomCapMat = new THREE.MeshLambertMaterial({ color: 0xb82a1a });
    var mushroomCapBrownMat = new THREE.MeshLambertMaterial({ color: 0x6b3a2a });
    for (var mx = Math.floor(chunkMinX / MUSHROOM_SPACING) * MUSHROOM_SPACING; mx < chunkMaxX; mx += MUSHROOM_SPACING) {
      for (var mz = Math.floor(chunkMinZ / MUSHROOM_SPACING) * MUSHROOM_SPACING; mz < chunkMaxZ; mz += MUSHROOM_SPACING) {
        var mpx = mx + half, mpz = -mz + half;
        if (getBiomeValue(mpx, mpz) !== 14) continue;
        var mjx = (noise2D(mpx * 0.6, mpz * 0.6) - 0.5) * 2.5, mjz = (noise2D(mpx * 0.6 + 123, mpz * 0.6) - 0.5) * 2.5;
        var mwx = mx + mjx, mwz = mz + mjz;
        if (mwx < chunkMinX - 1 || mwx > chunkMaxX + 1 || mwz < chunkMinZ - 1 || mwz > chunkMaxZ + 1) continue;
        var mushGroundY = getTerrainHeight(mwx, mwz);
        var scale = 0.7 + noise2D(mpx * 2, mpz * 2) * 0.8;
        var stemH = 2.2 * scale, stemR = 0.35 * scale, capR = 1.4 * scale;
        var stem = new THREE.Mesh(new THREE.CylinderGeometry(stemR * 0.9, stemR, stemH, 8), mushroomStemMat);
        addToChunk(cd, stem, mwx, mushGroundY + stemH / 2, mwz);
        stem.castShadow = true; stem.receiveShadow = true;
        var cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), noise2D(mpx * 5, mpz * 5) > 0.5 ? mushroomCapMat : mushroomCapBrownMat);
        addToChunk(cd, cap, mwx, mushGroundY + stemH + capR * 0.4, mwz);
        cap.castShadow = true; cap.receiveShadow = true;
        var trcM = { x: mwx, z: mwz, groundY: mushGroundY, height: stemH + capR, r: stemR + 0.15 };
        cd.trunkColliders.push(trcM); trunkColliders.push(trcM);
      }
    }
    var hoodooColors = [0xc49a6c, 0xb88a5a, 0xa07848, 0x8b6b3a];
    var HOODOO_SPACING = 12;
    for (var hx = Math.floor(chunkMinX / HOODOO_SPACING) * HOODOO_SPACING; hx < chunkMaxX; hx += HOODOO_SPACING) {
      for (var hz = Math.floor(chunkMinZ / HOODOO_SPACING) * HOODOO_SPACING; hz < chunkMaxZ; hz += HOODOO_SPACING) {
        var hpx = hx + half, hpz = -hz + half;
        if (getBiomeValue(hpx, hpz) !== 15) continue;
        if (octaveNoise(hpx * 0.2, hpz * 0.2 + 777, 1, 0.5) > 0.62) continue;
        var hjx = (noise2D(hpx * 0.5, hpz * 0.5) - 0.5) * 6, hjz = (noise2D(hpx * 0.5 + 321, hpz * 0.5) - 0.5) * 6;
        var hwx = hx + hjx, hwz = hz + hjz;
        if (hwx < chunkMinX - 1 || hwx > chunkMaxX + 1 || hwz < chunkMinZ - 1 || hwz > chunkMaxZ + 1) continue;
        var hoodooGroundY = getTerrainHeight(hwx, hwz);
        var hoodooH = 3 + noise2D(hpx * 2, hpz * 2) * 5;
        var hoodooR = 0.4 + noise2D(hpx * 2 + 99, hpz * 2) * 0.35;
        var hoodoo = new THREE.Mesh(new THREE.CylinderGeometry(hoodooR * 0.4, hoodooR, hoodooH, 6), new THREE.MeshLambertMaterial({ color: hoodooColors[Math.floor(noise2D(hpx * 3, hpz * 3) * 4) % 4] }));
        addToChunk(cd, hoodoo, hwx, hoodooGroundY + hoodooH / 2, hwz);
        hoodoo.castShadow = true; hoodoo.receiveShadow = true;
      }
    }
    var NEW_BIOME_SPACING = 8;
    for (var nbx = Math.floor(chunkMinX / NEW_BIOME_SPACING) * NEW_BIOME_SPACING; nbx < chunkMaxX; nbx += NEW_BIOME_SPACING) {
      for (var nbz = Math.floor(chunkMinZ / NEW_BIOME_SPACING) * NEW_BIOME_SPACING; nbz < chunkMaxZ; nbz += NEW_BIOME_SPACING) {
      var nbpx = nbx + half, nbpz = -nbz + half;
      var b = getBiomeValue(nbpx, nbpz);
      if (b < 21 || b > 28) continue;
      var njx = (noise2D(nbpx * 0.6, nbpz * 0.6) - 0.5) * 2.5, njz = (noise2D(nbpx * 0.6 + 88, nbpz * 0.6) - 0.5) * 2.5;
      var nwx = nbx + njx, nwz = nbz + njz;
      if (nwx < chunkMinX - 1 || nwx > chunkMaxX + 1 || nwz < chunkMinZ - 1 || nwz > chunkMaxZ + 1) continue;
      var ngy = getTerrainHeight(nwx, nwz);
      if (b === 21) {
        var rwH = 18 + noise2D(nbpx * 2, nbpz * 2) * 6;
        var rwTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, rwH, 6), new THREE.MeshLambertMaterial({ color: 0x4a3020 }));
        addToChunk(cd, rwTrunk, nwx, ngy + rwH / 2, nwz);
        rwTrunk.castShadow = true;
        var rwCanopy = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), new THREE.MeshLambertMaterial({ color: 0x1a3a1a }));
        addToChunk(cd, rwCanopy, nwx, ngy + rwH + 1.2, nwz);
        rwCanopy.castShadow = true;
        var trcRw = { x: nwx, z: nwz, groundY: ngy, height: rwH + 2.2, r: 0.5 };
        cd.trunkColliders.push(trcRw); trunkColliders.push(trcRw);
      } else if (b === 22) {
        var elfH = 1.8 + noise2D(nbpx * 2, nbpz * 2) * 1;
        var elfTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, elfH, 6), new THREE.MeshLambertMaterial({ color: 0x3d3528 }));
        addToChunk(cd, elfTrunk, nwx, ngy + elfH / 2, nwz);
        var elfCone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 6), new THREE.MeshLambertMaterial({ color: 0x2a4a28 }));
        addToChunk(cd, elfCone, nwx, ngy + elfH + 0.9, nwz);
      } else if (b === 23) {
        var wdTrunk = new THREE.Mesh(trunkGeo, trunkMat);
        addToChunk(cd, wdTrunk, nwx, ngy + 2.5, nwz);
        wdTrunk.castShadow = true;
        var wdLeaves = new THREE.Mesh(leavesGeo, leavesMat);
        addToChunk(cd, wdLeaves, nwx, ngy + 6.2, nwz);
        var tcW = { x: nwx, y: ngy + 6.2, z: nwz, r: TREE_COLLIDE_RADIUS };
        var trcW = { x: nwx, z: nwz, groundY: ngy, height: TRUNK_HEIGHT, r: TRUNK_RADIUS };
        cd.treeColliders.push(tcW); cd.trunkColliders.push(trcW); treeColliders.push(tcW); trunkColliders.push(trcW);
      } else if (b === 24) {
        var mpTrunk = new THREE.Mesh(trunkGeo, trunkMat);
        addToChunk(cd, mpTrunk, nwx, ngy + 2.5, nwz);
        var mpLeaves = new THREE.Mesh(leavesGeo, new THREE.MeshLambertMaterial({ color: 0xc85a20 }));
        addToChunk(cd, mpLeaves, nwx, ngy + 6.2, nwz);
        var tcMp = { x: nwx, y: ngy + 6.2, z: nwz, r: TREE_COLLIDE_RADIUS };
        var trcMp = { x: nwx, z: nwz, groundY: ngy, height: TRUNK_HEIGHT, r: TRUNK_RADIUS };
        cd.treeColliders.push(tcMp); cd.trunkColliders.push(trcMp); treeColliders.push(tcMp); trunkColliders.push(trcMp);
      } else if (b === 25) {
        var chTrunk = new THREE.Mesh(trunkGeo, trunkMat);
        addToChunk(cd, chTrunk, nwx, ngy + 2.5, nwz);
        var chLeaves = new THREE.Mesh(leavesGeo, new THREE.MeshLambertMaterial({ color: 0xe8a0b0 }));
        addToChunk(cd, chLeaves, nwx, ngy + 6.2, nwz);
        var tcCh = { x: nwx, y: ngy + 6.2, z: nwz, r: TREE_COLLIDE_RADIUS };
        var trcCh = { x: nwx, z: nwz, groundY: ngy, height: TRUNK_HEIGHT, r: TRUNK_RADIUS };
        cd.treeColliders.push(tcCh); cd.trunkColliders.push(trcCh); treeColliders.push(tcCh); trunkColliders.push(trcCh);
      } else if (b === 26) {
        var chpBush = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 6), new THREE.MeshLambertMaterial({ color: 0x4a5a38 }));
        addToChunk(cd, chpBush, nwx, ngy + 0.6, nwz);
      } else if (b === 27) {
        var SAVANNA_TREE_SPACING = 24;
        if (((nbx % SAVANNA_TREE_SPACING) + SAVANNA_TREE_SPACING) % SAVANNA_TREE_SPACING !== 0 || ((nbz % SAVANNA_TREE_SPACING) + SAVANNA_TREE_SPACING) % SAVANNA_TREE_SPACING !== 0) continue;
        var savTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 4, 6), new THREE.MeshLambertMaterial({ color: 0x5a4a32 }));
        addToChunk(cd, savTrunk, nwx, ngy + 2, nwz);
        savTrunk.castShadow = true;
        var savCanopy = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x3a5a28 }));
        addToChunk(cd, savCanopy, nwx, ngy + 5.2, nwz);
        savCanopy.castShadow = true;
        var tcS = { x: nwx, y: ngy + 5.2, z: nwz, r: 2.5 };
        var trcS = { x: nwx, z: nwz, groundY: ngy, height: 6, r: 0.35 };
        cd.treeColliders.push(tcS); cd.trunkColliders.push(trcS); treeColliders.push(tcS); trunkColliders.push(trcS);
      } else if (b === 28) {
        var cacH = 5 + noise2D(nbpx * 2, nbpz * 2) * 4;
        var cacTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, cacH, 6), new THREE.MeshLambertMaterial({ color: 0x4a5a3a }));
        addToChunk(cd, cacTrunk, nwx, ngy + cacH / 2, nwz);
        cacTrunk.castShadow = true;
        var armL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x4a5a3a }));
        addToChunk(cd, armL, nwx - 0.5, ngy + cacH * 0.6, nwz);
        armL.rotation.z = 0.4;
        var armR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8, 6), new THREE.MeshLambertMaterial({ color: 0x4a5a3a }));
        addToChunk(cd, armR, nwx + 0.45, ngy + cacH * 0.5, nwz);
        armR.rotation.z = -0.35;
        var trcCac = { x: nwx, z: nwz, groundY: ngy, height: cacH, r: 0.55 };
        cd.trunkColliders.push(trcCac); trunkColliders.push(trcCac);
      }
    }
  };
  for (var pk in terrainChunks) {
    var pp = pk.split(',');
    populateChunkContent(parseInt(pp[0], 10), parseInt(pp[1], 10), terrainChunks[pk]);
  }

  // —— Graveyard: tombstones (biome 6 only), pass-through ——
  var graveyardGroup = new THREE.Group();
  var tombstoneMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
  var TOMB_SPACING = 7;
  var tombMargin = half - 4;
  for (var gx = -tombMargin; gx <= tombMargin; gx += TOMB_SPACING) {
    for (var gz = -tombMargin; gz <= tombMargin; gz += TOMB_SPACING) {
      var gpx = gx + half, gpz = -gz + half;
      if (getBiomeValue(gpx, gpz) !== 6) continue;
      if (octaveNoise(gpx * 0.3, gpz * 0.3 + 444, 1, 0.5) > 0.55) continue;
      var jx = (noise2D(gpx * 0.5, gpz * 0.5) - 0.5) * 3;
      var jz = (noise2D(gpx * 0.5 + 222, gpz * 0.5) - 0.5) * 3;
      var twx = gx + jx, twz = gz + jz;
      var tGroundY = getTerrainHeight(twx, twz);
      var slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.9), tombstoneMat);
      slab.position.set(twx, tGroundY + 0.04, twz);
      slab.rotation.y = (noise2D(gpx, gpz) - 0.5) * 0.8;
      graveyardGroup.add(slab);
      var headstone = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.12), tombstoneMat);
      headstone.position.set(twx + Math.sin(slab.rotation.y) * 0.2, tGroundY + 0.39, twz + Math.cos(slab.rotation.y) * 0.2);
      headstone.rotation.y = slab.rotation.y;
      graveyardGroup.add(headstone);
    }
  }
  scene.add(graveyardGroup);

  // —— Redrock (biome 8): Delicate Arch–style freestanding natural arches (single curved span) ——
  var REDROCK_ARCH_SPACING = 52;
  var archMat = new THREE.MeshLambertMaterial({ color: 0xb85c3a });
  var redrockArchGroup = new THREE.Group();
  var archMargin = half - 6;
  var delicateArchRadius = 10;
  var delicateArchTube = 2.4;
  var delicateArchGeo = new THREE.TorusGeometry(delicateArchRadius, delicateArchTube, 16, 24, Math.PI);
  for (var ax = -archMargin; ax <= archMargin; ax += REDROCK_ARCH_SPACING) {
    for (var az = -archMargin; az <= archMargin; az += REDROCK_ARCH_SPACING) {
      var apx = ax + half, apz = -az + half;
      if (getBiomeValue(apx, apz) !== 8) continue;
      if (octaveNoise(apx * 0.25, apz * 0.25 + 666, 1, 0.5) > 0.72) continue;
      var ajx = (noise2D(apx * 0.4, apz * 0.4) - 0.5) * 8;
      var ajz = (noise2D(apx * 0.4 + 111, apz * 0.4) - 0.5) * 8;
      var awx = ax + ajx, awz = az + ajz;
      if (awx < -half + 4 || awx > half - 4 || awz < -half + 4 || awz > half - 4) continue;
      var groundY = getTerrainHeight(awx, awz);
      var archRot = noise2D(apx, apz) * Math.PI * 2;
      var arch = new THREE.Mesh(delicateArchGeo, archMat);
      arch.rotation.y = archRot;
      arch.position.set(awx, groundY + delicateArchTube, awz);
      arch.castShadow = true;
      arch.receiveShadow = true;
      redrockArchGroup.add(arch);
    }
  }
  scene.add(redrockArchGroup);

  // —— Mangrove trees (biome 7 only): taller trunks, long aerial roots above water ——
  var MANGROVE_TRUNK_HEIGHT = 8;
  var MANGROVE_SPACING = 9;
  var mangroveTrunkGeo = new THREE.CylinderGeometry(0.38, 0.62, MANGROVE_TRUNK_HEIGHT, 6);
  var mangroveLeavesGeo = new THREE.SphereGeometry(3.2, 8, 6);
  var mangroveRootUpperGeo = new THREE.ConeGeometry(0.22, 2.4, 6);
  var mangroveRootLowerGeo = new THREE.ConeGeometry(0.28, 2.2, 6);
  var mangroveTrunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
  var mangroveLeavesMat = new THREE.MeshLambertMaterial({ color: 0x2d5a2e });
  var mangroveRootMat = new THREE.MeshLambertMaterial({ color: 0x3d2a18 });
  var mangroveGroup = new THREE.Group();
  var mMargin = half - 5;
  for (var mx = -mMargin; mx <= mMargin; mx += MANGROVE_SPACING) {
    for (var mz = -mMargin; mz <= mMargin; mz += MANGROVE_SPACING) {
      var mpx = mx + half, mpz = -mz + half;
      if (getBiomeValue(mpx, mpz) !== 7) continue;
      if (octaveNoise(mpx * 0.4, mpz * 0.4 + 555, 1, 0.5) > 0.52) continue;
      var mjx = (noise2D(mpx * 0.6, mpz * 0.6) - 0.5) * 2.2;
      var mjz = (noise2D(mpx * 0.6 + 88, mpz * 0.6) - 0.5) * 2.2;
      var mwx = mx + mjx, mwz = mz + mjz;
      if (mwx < -half + 3 || mwx > half - 3 || mwz < -half + 3 || mwz > half - 3) continue;
      var mGroundY = getTerrainHeight(mwx, mwz);
      var mTrunk = new THREE.Mesh(mangroveTrunkGeo, mangroveTrunkMat);
      mTrunk.position.set(mwx, mGroundY + MANGROVE_TRUNK_HEIGHT / 2, mwz);
      mTrunk.castShadow = true;
      mTrunk.receiveShadow = true;
      mangroveGroup.add(mTrunk);
      var mLeaves = new THREE.Mesh(mangroveLeavesGeo, mangroveLeavesMat);
      mLeaves.position.set(mwx, mGroundY + MANGROVE_TRUNK_HEIGHT + 1.4, mwz);
      mLeaves.castShadow = true;
      mLeaves.receiveShadow = true;
      mangroveGroup.add(mLeaves);
      for (var ri = 0; ri < 6; ri++) {
        var angle = (ri / 6) * Math.PI * 2 + noise2D(mpx + ri * 10, mpz) * 0.5;
        var tilt = 0.28 + (noise2D(mpx + ri * 7, mpz + 3) - 0.5) * 0.1;
        var cx = Math.cos(angle);
        var cz = Math.sin(angle);
        var upperLen = 2.4;
        var lowerLen = 2.2;
        var upperRoot = new THREE.Mesh(mangroveRootUpperGeo, mangroveRootMat);
        upperRoot.position.set(mwx + cx * upperLen * 0.5, mGroundY + 0.55 - upperLen * 0.5 * tilt, mwz + cz * upperLen * 0.5);
        upperRoot.rotation.x = tilt;
        upperRoot.rotation.z = -angle;
        upperRoot.castShadow = true;
        upperRoot.receiveShadow = true;
        mangroveGroup.add(upperRoot);
        var bend = 0.45;
        var upperEndX = mwx + cx * upperLen;
        var upperEndY = mGroundY + 0.55 - upperLen * tilt;
        var upperEndZ = mwz + cz * upperLen;
        var lowerRoot = new THREE.Mesh(mangroveRootLowerGeo, mangroveRootMat);
        lowerRoot.position.set(upperEndX + cx * lowerLen * 0.5, upperEndY - lowerLen * 0.5 * (tilt + bend), upperEndZ + cz * lowerLen * 0.5);
        lowerRoot.rotation.x = tilt + bend;
        lowerRoot.rotation.z = -angle;
        lowerRoot.castShadow = true;
        lowerRoot.receiveShadow = true;
        mangroveGroup.add(lowerRoot);
      }
      treeColliders.push({ x: mwx, y: mGroundY + MANGROVE_TRUNK_HEIGHT + 1.4, z: mwz, r: TREE_COLLIDE_RADIUS });
      trunkColliders.push({ x: mwx, z: mwz, groundY: mGroundY, height: MANGROVE_TRUNK_HEIGHT, r: TRUNK_RADIUS });
    }
  }
  scene.add(mangroveGroup);

  // —— Ocean: one merged water mesh (all ocean cells merged) so no gaps and no tiled look ——
  var WATER_LEVEL = 14;
  var waterDepth = WATER_LEVEL - SEA_FLOOR_Y;
  var WATER_CELL = 26;
  var waterMat = new THREE.MeshLambertMaterial({
    color: 0x1e90ff,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  var boxGeos = [];
  var d = WATER_CELL / 2;
  for (var cx = -half + d; cx <= half - d; cx += WATER_CELL) {
    for (var cz = -half + d; cz <= half - d; cz += WATER_CELL) {
      var apx = cx + half, apz = -cz + half;
      var isOcean = getBiomeValue(apx, apz) === 5 || getBiomeValue(apx - d, apz) === 5 ||
        getBiomeValue(apx + d, apz) === 5 || getBiomeValue(apx, apz - d) === 5 || getBiomeValue(apx, apz + d) === 5;
      if (!isOcean) continue;
      var cellGeo = new THREE.BoxGeometry(WATER_CELL + 1.5, waterDepth + 0.2, WATER_CELL + 1.5);
      cellGeo.translate(cx, SEA_FLOOR_Y + waterDepth / 2, cz);
      boxGeos.push(cellGeo);
    }
  }
  var mergedPos = [], mergedNorm = [], mergedIdx = [];
  var voff = 0;
  for (var gi = 0; gi < boxGeos.length; gi++) {
    var g = boxGeos[gi];
    var pos = g.attributes.position;
    var norm = g.attributes.normal;
    for (var v = 0; v < pos.count; v++) {
      mergedPos.push(pos.getX(v), pos.getY(v), pos.getZ(v));
      mergedNorm.push(norm.getX(v), norm.getY(v), norm.getZ(v));
    }
    var idx = g.index;
    if (idx) for (var tri = 0; tri < idx.count; tri++) mergedIdx.push(idx.getX(tri) + voff);
    else for (var tri = 0; tri < pos.count; tri++) mergedIdx.push(tri + voff);
    voff += pos.count;
  }
  var waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(mergedPos, 3));
  waterGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNorm, 3));
  waterGeo.setIndex(mergedIdx);
  waterGeo.computeBoundingSphere();
  var waterVolume = new THREE.Mesh(waterGeo, waterMat);
  scene.add(waterVolume);

  // —— Swamp: murky brown/green water in wet patches (walk-through shallow) ——
  var SWAMP_WATER_CELL = 12;
  var swampWaterDepth = 0.35;
  var swampWaterMat = new THREE.MeshLambertMaterial({
    color: 0x2a3320,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  var swampBoxGeos = [];
  var sd = SWAMP_WATER_CELL / 2;
  for (var scx = -half + sd; scx <= half - sd; scx += SWAMP_WATER_CELL) {
    for (var scz = -half + sd; scz <= half - sd; scz += SWAMP_WATER_CELL) {
      var apx = scx + half, apz = -scz + half;
      if (getBiomeValue(apx, apz) !== 4) continue;
      if (!isSwampWet(apx, apz)) continue;
      var cellGeo = new THREE.BoxGeometry(SWAMP_WATER_CELL + 0.5, swampWaterDepth, SWAMP_WATER_CELL + 0.5);
      cellGeo.translate(scx, SWAMP_WATER_LEVEL + swampWaterDepth / 2 + 0.08, scz);
      swampBoxGeos.push(cellGeo);
    }
  }
  var swampMergedPos = [], swampMergedNorm = [], swampMergedIdx = [];
  var svoff = 0;
  for (var sgi = 0; sgi < swampBoxGeos.length; sgi++) {
    var sg = swampBoxGeos[sgi];
    var spos = sg.attributes.position;
    var snorm = sg.attributes.normal;
    for (var v = 0; v < spos.count; v++) {
      swampMergedPos.push(spos.getX(v), spos.getY(v), spos.getZ(v));
      swampMergedNorm.push(snorm.getX(v), snorm.getY(v), snorm.getZ(v));
    }
    var sidx = sg.index;
    if (sidx) for (var tri = 0; tri < sidx.count; tri++) swampMergedIdx.push(sidx.getX(tri) + svoff);
    else for (var tri = 0; tri < spos.count; tri++) swampMergedIdx.push(tri + svoff);
    svoff += spos.count;
  }
  if (swampMergedPos.length > 0) {
    var swampWaterGeo = new THREE.BufferGeometry();
    swampWaterGeo.setAttribute('position', new THREE.Float32BufferAttribute(swampMergedPos, 3));
    swampWaterGeo.setAttribute('normal', new THREE.Float32BufferAttribute(swampMergedNorm, 3));
    swampWaterGeo.setIndex(swampMergedIdx);
    swampWaterGeo.computeBoundingSphere();
    var swampWaterVolume = new THREE.Mesh(swampWaterGeo, swampWaterMat);
    scene.add(swampWaterVolume);
  }

  // —— Mangrove: shallow water on floor (biome 7) so water up to tree trunks ——
  var MANGROVE_WATER_CELL = 14;
  var mangroveWaterDepth = 0.4;
  var mangroveWaterMat = new THREE.MeshLambertMaterial({
    color: 0x1e4a3a,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  var mangroveBoxGeos = [];
  var md = MANGROVE_WATER_CELL / 2;
  for (var mcx = -half + md; mcx <= half - md; mcx += MANGROVE_WATER_CELL) {
    for (var mcz = -half + md; mcz <= half - md; mcz += MANGROVE_WATER_CELL) {
      var mapx = mcx + half, mapz = -mcz + half;
      if (getBiomeValue(mapx, mapz) !== 7) continue;
      var mCellGeo = new THREE.BoxGeometry(MANGROVE_WATER_CELL + 0.5, mangroveWaterDepth, MANGROVE_WATER_CELL + 0.5);
      mCellGeo.translate(mcx, MANGROVE_WATER_LEVEL + mangroveWaterDepth / 2 + 0.06, mcz);
      mangroveBoxGeos.push(mCellGeo);
    }
  }
  var mangroveMergedPos = [], mangroveMergedNorm = [], mangroveMergedIdx = [];
  var mvo = 0;
  for (var mgi = 0; mgi < mangroveBoxGeos.length; mgi++) {
    var mg = mangroveBoxGeos[mgi];
    var mpos = mg.attributes.position;
    var mnorm = mg.attributes.normal;
    for (var v = 0; v < mpos.count; v++) {
      mangroveMergedPos.push(mpos.getX(v), mpos.getY(v), mpos.getZ(v));
      mangroveMergedNorm.push(mnorm.getX(v), mnorm.getY(v), mnorm.getZ(v));
    }
    var midx = mg.index;
    if (midx) for (var tri = 0; tri < midx.count; tri++) mangroveMergedIdx.push(midx.getX(tri) + mvo);
    else for (var tri = 0; tri < mpos.count; tri++) mangroveMergedIdx.push(tri + mvo);
    mvo += mpos.count;
  }
  if (mangroveMergedPos.length > 0) {
    var mangroveWaterGeo = new THREE.BufferGeometry();
    mangroveWaterGeo.setAttribute('position', new THREE.Float32BufferAttribute(mangroveMergedPos, 3));
    mangroveWaterGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mangroveMergedNorm, 3));
    mangroveWaterGeo.setIndex(mangroveMergedIdx);
    mangroveWaterGeo.computeBoundingSphere();
    var mangroveWaterVolume = new THREE.Mesh(mangroveWaterGeo, mangroveWaterMat);
    scene.add(mangroveWaterVolume);
  }

  // —— Gel sea (biome 12): slime water (same depth as ocean) only where not island ——
  var GEL_WATER_CELL = 14;
  var gelWaterDepth = WATER_LEVEL - GEL_SEAFLOOR_Y;
  var gelWaterMat = new THREE.MeshLambertMaterial({
    color: 0x3a8a4a,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  var gelBoxGeos = [];
  var gd = GEL_WATER_CELL / 2;
  for (var gcx = -half + gd; gcx <= half - gd; gcx += GEL_WATER_CELL) {
    for (var gcz = -half + gd; gcz <= half - gd; gcz += GEL_WATER_CELL) {
      var gpx = gcx + half, gpz = -gcz + half;
      if (getBiomeValue(gpx, gpz) !== 12) continue;
      if (isGelSeaIsland(gpx, gpz)) continue;
      var gCellGeo = new THREE.BoxGeometry(GEL_WATER_CELL + 0.5, gelWaterDepth, GEL_WATER_CELL + 0.5);
      gCellGeo.translate(gcx, GEL_SEAFLOOR_Y + gelWaterDepth / 2, gcz);
      gelBoxGeos.push(gCellGeo);
    }
  }
  var gelMergedPos = [], gelMergedNorm = [], gelMergedIdx = [];
  var gvo = 0;
  for (var ggi = 0; ggi < gelBoxGeos.length; ggi++) {
    var gg = gelBoxGeos[ggi];
    var gpos = gg.attributes.position;
    var gnorm = gg.attributes.normal;
    for (var v = 0; v < gpos.count; v++) {
      gelMergedPos.push(gpos.getX(v), gpos.getY(v), gpos.getZ(v));
      gelMergedNorm.push(gnorm.getX(v), gnorm.getY(v), gnorm.getZ(v));
    }
    var gidx = gg.index;
    if (gidx) for (var tri = 0; tri < gidx.count; tri++) gelMergedIdx.push(gidx.getX(tri) + gvo);
    else for (var tri = 0; tri < gpos.count; tri++) gelMergedIdx.push(tri + gvo);
    gvo += gpos.count;
  }
  if (gelMergedPos.length > 0) {
    var gelWaterGeo = new THREE.BufferGeometry();
    gelWaterGeo.setAttribute('position', new THREE.Float32BufferAttribute(gelMergedPos, 3));
    gelWaterGeo.setAttribute('normal', new THREE.Float32BufferAttribute(gelMergedNorm, 3));
    gelWaterGeo.setIndex(gelMergedIdx);
    gelWaterGeo.computeBoundingSphere();
    var gelWaterVolume = new THREE.Mesh(gelWaterGeo, gelWaterMat);
    scene.add(gelWaterVolume);
  }

  // —— Gel sea (biome 12): shrubs on mud islands ——
  var shrubGroup = new THREE.Group();
  var shrubMat = new THREE.MeshLambertMaterial({ color: 0x1e4a28 });
  var SHRUB_SPACING = 3.5;
  var shrubMargin = half - 4;
  for (var sx = -shrubMargin; sx <= shrubMargin; sx += SHRUB_SPACING) {
    for (var sz = -shrubMargin; sz <= shrubMargin; sz += SHRUB_SPACING) {
      var spx = sx + half, spz = -sz + half;
      if (getBiomeValue(spx, spz) !== 12) continue;
      if (!isGelSeaIsland(spx, spz)) continue;
      if (octaveNoise(spx * 0.5, spz * 0.5 + 333, 1, 0.5) > 0.62) continue;
      var sjx = (noise2D(spx * 0.6, spz * 0.6) - 0.5) * 1.5;
      var sjz = (noise2D(spx * 0.6 + 88, spz * 0.6 + 88) - 0.5) * 1.5;
      var swx = sx + sjx, swz = sz + sjz;
      var sGroundY = getTerrainHeight(swx, swz);
      var shrub = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), shrubMat);
      shrub.position.set(swx, sGroundY + 0.4, swz);
      shrub.scale.set(1, 1, 0.9 + noise2D(spx, spz) * 0.3);
      shrubGroup.add(shrub);
    }
  }
  scene.add(shrubGroup);

  // —— Swamp plants (reeds / vegetation): pass-through, no collision ——
  var reedsGroup = new THREE.Group();
  var reedMat = new THREE.MeshLambertMaterial({ color: 0x1a2a18, side: THREE.DoubleSide });
  var reedMatBrown = new THREE.MeshLambertMaterial({ color: 0x252015, side: THREE.DoubleSide });
  var REED_SPACING = 2.2;
  var reedMargin = half - 3;
  for (var rx = -reedMargin; rx <= reedMargin; rx += REED_SPACING) {
    for (var rz = -reedMargin; rz <= reedMargin; rz += REED_SPACING) {
      var rpx = rx + half, rpz = -rz + half;
      if (getBiomeValue(rpx, rpz) !== 4) continue;
      var wet = isSwampWet(rpx, rpz);
      var density = wet ? 0.72 : 0.38;
      if (octaveNoise(rpx * 0.4, rpz * 0.4 + 111, 1, 0.5) > density) continue;
      var jx = (noise2D(rpx * 0.8, rpz * 0.8) - 0.5) * 1.8;
      var jz = (noise2D(rpx * 0.8 + 50, rpz * 0.8) - 0.5) * 1.8;
      var rwx = rx + jx, rwz = rz + jz;
      var groundY = getTerrainHeight(rwx, rwz);
      var reedH = 0.5 + octaveNoise(rpx * 0.2, rpz * 0.2) * 1.1;
      var reedGeo = new THREE.PlaneGeometry(0.12, reedH);
      var reed = new THREE.Mesh(reedGeo, (noise2D(rpx, rpz) > 0.5 ? reedMat : reedMatBrown));
      reed.position.set(rwx, groundY + reedH / 2, rwz);
      reed.rotation.y = (noise2D(rpx + 100, rpz) - 0.5) * Math.PI;
      reedsGroup.add(reed);
      var reed2 = new THREE.Mesh(reedGeo.clone(), (noise2D(rpx + 200, rpz) > 0.5 ? reedMat : reedMatBrown));
      reed2.position.set(rwx + (noise2D(rpx, rpz + 100) - 0.5) * 0.4, groundY + reedH * 0.55, rwz + (noise2D(rpx + 150, rpz) - 0.5) * 0.4);
      reed2.rotation.y = (noise2D(rpx + 300, rpz) - 0.5) * Math.PI;
      reedsGroup.add(reed2);
    }
  }
  scene.add(reedsGroup);

  // —— Animals: legs, eyes, face, ears; human-scale world ——
  var ANIMAL_SPACING = 22;
  var animalsGroup = new THREE.Group();
  function animalMat(c) { return new THREE.MeshLambertMaterial({ color: c }); }
  function addLegs(g, bx, by, bz, bodyW, bodyD, legH, legW, color) {
    var legGeo = new THREE.CylinderGeometry(legW * 0.85, legW * 1.05, legH, 8);
    var positions = [[-bodyW, by - legH / 2, bz - bodyD], [bodyW, by - legH / 2, bz - bodyD], [-bodyW, by - legH / 2, bz + bodyD], [bodyW, by - legH / 2, bz + bodyD]];
    for (var i = 0; i < 4; i++) {
      var leg = new THREE.Mesh(legGeo, animalMat(color));
      leg.position.set(positions[i][0], positions[i][1], positions[i][2]);
      g.add(leg);
      var knee = new THREE.Mesh(new THREE.SphereGeometry(legW * 1.1, 6, 5), animalMat(color));
      knee.position.set(positions[i][0], positions[i][1] - legH * 0.45, positions[i][2]);
      g.add(knee);
    }
  }
  function addHumanLegs(g, by, legH, legW, color) {
    var legGeo = new THREE.CylinderGeometry(legW * 0.9, legW * 1.05, legH, 8);
    var leftLeg = new THREE.Mesh(legGeo, animalMat(color)); leftLeg.position.set(-0.1, by - legH / 2, 0.05); g.add(leftLeg);
    var rightLeg = new THREE.Mesh(legGeo.clone(), animalMat(color)); rightLeg.position.set(0.1, by - legH / 2, 0.05); g.add(rightLeg);
    var kneeGeo = new THREE.SphereGeometry(legW * 1.1, 6, 5);
    var leftKnee = new THREE.Mesh(kneeGeo, animalMat(color)); leftKnee.position.set(-0.1, by - legH * 0.45, 0.05); g.add(leftKnee);
    var rightKnee = new THREE.Mesh(kneeGeo.clone(), animalMat(color)); rightKnee.position.set(0.1, by - legH * 0.45, 0.05); g.add(rightKnee);
  }
  function addHumanArm(g, side, shoulderY, shoulderZ, color) {
    var sx = side * 0.16;
    var forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.18, 8), animalMat(color));
    forearm.position.set(sx, shoulderY - 0.09, shoulderZ);
    g.add(forearm);
    var palm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.04), animalMat(color));
    palm.position.set(sx, shoulderY - 0.2, shoulderZ);
    g.add(palm);
    for (var fi = 0; fi < 4; fi++) {
      var finger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.048, 0.02), animalMat(color));
      finger.position.set(sx + (0.018 - fi * 0.014) * side, shoulderY - 0.26, shoulderZ);
      g.add(finger);
    }
    var thumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.018), animalMat(color));
    thumb.position.set(sx + side * 0.036, shoulderY - 0.22, shoulderZ);
    g.add(thumb);
  }
  function addEyes(g, headX, headY, headZ, headR, color) {
    var eyeSize = headR * 0.28;
    var eyeGeo = new THREE.SphereGeometry(eyeSize, 10, 8);
    var eyeColor = color !== undefined ? color : 0x0d0d0d;
    var left = new THREE.Mesh(eyeGeo, animalMat(eyeColor));
    left.position.set(headX - headR * 0.38, headY + headR * 0.22, headZ + headR * 0.72);
    g.add(left);
    var right = new THREE.Mesh(eyeGeo, animalMat(eyeColor));
    right.position.set(headX + headR * 0.38, headY + headR * 0.22, headZ + headR * 0.72);
    g.add(right);
  }
  function makeAnimal(type) {
    var g = new THREE.Group();
    function blob(r, c, segW, segH) {
      segW = segW || 24; segH = segH || 18;
      return new THREE.Mesh(new THREE.SphereGeometry(r, segW, segH), animalMat(c));
    }
    var body, head, color, scale = 1, legH = 0.35, legW = 0.08, bodyW = 0.22, bodyD = 0.28;
    switch (type) {
      case 'pig':
        color = 0xffb6c1;
        var pigBarrel = blob(0.38, color); pigBarrel.scale.set(1.05, 0.72, 1.15); pigBarrel.position.set(0, 0.32, 0.08); g.add(pigBarrel);
        var pigShoulder = blob(0.32, color); pigShoulder.scale.set(0.95, 0.9, 0.85); pigShoulder.position.set(0, 0.35, 0.35); g.add(pigShoulder);
        var pigBelly = blob(0.28, color); pigBelly.scale.set(1.1, 0.65, 1.2); pigBelly.position.set(0, 0.26, -0.05); g.add(pigBelly);
        var pigHam = blob(0.3, color); pigHam.scale.set(0.9, 0.85, 0.95); pigHam.position.set(0, 0.3, -0.28); g.add(pigHam);
        head = blob(0.22, color, 20, 14); head.scale.set(0.9, 0.95, 1.1); head.position.set(0, 0.34, 0.52); g.add(head);
        var snout = blob(0.1, color, 14, 10); snout.position.set(0, 0.32, 0.72); g.add(snout);
        addEyes(g, 0, 0.38, 0.52, 0.16, 0x1a1a1a);
        var earL = blob(0.08, color, 10, 8); earL.scale.set(0.6, 1.15, 0.35); earL.position.set(-0.16, 0.46, 0.48); g.add(earL);
        var earR = blob(0.08, color, 10, 8); earR.scale.set(0.6, 1.15, 0.35); earR.position.set(0.16, 0.46, 0.48); g.add(earR);
        addLegs(g, 0, 0.33, 0, 0.2, 0.27, 0.25, 0.054, color); scale = 0.58; break;
      case 'cow':
        color = 0xf5f5f5;
        var cowBarrel = blob(0.38, color); cowBarrel.scale.set(1.02, 0.68, 1.28); cowBarrel.position.set(0, 0.48, 0.1); g.add(cowBarrel);
        var cowChest = blob(0.3, color); cowChest.scale.set(0.82, 0.72, 0.9); cowChest.position.set(0, 0.5, 0.38); g.add(cowChest);
        var cowBelly = blob(0.28, color); cowBelly.scale.set(1.05, 0.6, 1.1); cowBelly.position.set(0, 0.4, -0.12); g.add(cowBelly);
        var cowRump = blob(0.3, color); cowRump.scale.set(0.88, 0.78, 0.9); cowRump.position.set(0, 0.42, -0.35); g.add(cowRump);
        head = blob(0.2, 0x2d2d2d, 20, 14); head.scale.set(0.92, 0.9, 1.02); head.position.set(0, 0.45, 0.68); g.add(head);
        addEyes(g, 0, 0.49, 0.68, 0.19, 0x1a1a1a);
        var cowEarL = blob(0.07, 0x2d2d2d, 10, 8); cowEarL.scale.set(0.5, 0.95, 0.4); cowEarL.position.set(-0.18, 0.54, 0.64); g.add(cowEarL);
        var cowEarR = blob(0.07, 0x2d2d2d, 10, 8); cowEarR.scale.set(0.5, 0.95, 0.4); cowEarR.position.set(0.18, 0.54, 0.64); g.add(cowEarR);
        addLegs(g, 0, 0.5, 0, 0.26, 0.35, 0.46, 0.09, color); scale = 1.38; break;
      case 'bison':
        color = 0x5c4033;
        var bisHump = blob(0.4, color); bisHump.scale.set(0.85, 1.1, 0.75); bisHump.position.set(0, 0.62, 0.32); g.add(bisHump);
        var bisFront = blob(0.38, color); bisFront.scale.set(1.05, 0.9, 0.95); bisFront.position.set(0, 0.52, 0.2); g.add(bisFront);
        var bisBarrel = blob(0.35, color); bisBarrel.scale.set(1.05, 0.8, 1.15); bisBarrel.position.set(0, 0.48, -0.1); g.add(bisBarrel);
        var bisRear = blob(0.28, color); bisRear.scale.set(0.9, 0.75, 0.85); bisRear.position.set(0, 0.44, -0.38); g.add(bisRear);
        head = blob(0.22, color, 20, 14); head.scale.set(0.98, 0.96, 1.08); head.position.set(0, 0.5, 0.66); g.add(head);
        addEyes(g, 0, 0.53, 0.66, 0.21, 0x1a1a1a);
        var hornGeo = new THREE.CylinderGeometry(0.028, 0.052, 0.17, 8); var hornL = new THREE.Mesh(hornGeo, animalMat(0x3d2914)); hornL.rotation.z = -0.36; hornL.position.set(-0.16, 0.63, 0.64); g.add(hornL); var hornR = new THREE.Mesh(hornGeo, animalMat(0x3d2914)); hornR.rotation.z = 0.36; hornR.position.set(0.16, 0.63, 0.64); g.add(hornR);
        addLegs(g, 0, 0.53, 0, 0.27, 0.37, 0.48, 0.1, color); scale = 1.5; break;
      case 'camel':
        color = 0xd4a574;
        var camBarrel = blob(0.36, color); camBarrel.scale.set(1.02, 0.68, 1.28); camBarrel.position.set(0, 0.64, 0); g.add(camBarrel);
        var camBelly = blob(0.28, color); camBelly.scale.set(1.1, 0.6, 1.15); camBelly.position.set(0, 0.54, -0.15); g.add(camBelly);
        var hump = blob(0.38, color, 20, 14); hump.position.set(0, 1, 0); hump.scale.set(1, 1.05, 0.88); g.add(hump); g.userData.humpMesh = hump;
        var neckGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.5, 12); var neck = new THREE.Mesh(neckGeo, animalMat(color)); neck.rotation.x = 0.32; neck.position.set(0, 0.9, 0.56); g.add(neck);
        head = blob(0.2, color, 20, 14); head.scale.set(0.88, 0.92, 1.08); head.position.set(0, 0.98, 0.9); g.add(head);
        addEyes(g, 0, 1.02, 0.9, 0.19, 0x1a1a1a); addLegs(g, 0, 0.66, 0, 0.25, 0.33, 0.6, 0.088, color); scale = 1.82; break;
      case 'scorpion':
        color = 0x3d2914;
        body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), animalMat(color)); body.scale.set(1.12, 0.5, 1.35); body.position.y = 0.1; g.add(body);
        head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), animalMat(color)); head.position.set(0, 0.12, 0.4); g.add(head);
        addEyes(g, 0, 0.15, 0.4, 0.11, 0x0a0a0a);
        var armGeo = new THREE.CylinderGeometry(0.024, 0.032, 0.18, 6);
        var pincerGeo = new THREE.SphereGeometry(0.055, 8, 6);
        var armL = new THREE.Mesh(armGeo, animalMat(color)); armL.rotation.z = 0.38; armL.position.set(-0.07, 0.09, 0.5); g.add(armL);
        var pincerL = new THREE.Mesh(pincerGeo, animalMat(color)); pincerL.scale.set(0.8, 0.7, 1.35); pincerL.position.set(-0.11, 0.07, 0.65); g.add(pincerL);
        var armR = new THREE.Mesh(armGeo, animalMat(color)); armR.rotation.z = -0.38; armR.position.set(0.07, 0.09, 0.5); g.add(armR);
        var pincerR = new THREE.Mesh(pincerGeo, animalMat(color)); pincerR.scale.set(0.8, 0.7, 1.35); pincerR.position.set(0.11, 0.07, 0.65); g.add(pincerR);
        for (var ts = 0; ts < 5; ts++) {
          var seg = new THREE.Mesh(new THREE.SphereGeometry(0.052 - ts * 0.007, 8, 6), animalMat(color));
          seg.position.set(0, 0.05 - ts * 0.01, -0.33 - ts * 0.17); g.add(seg);
        }
        var legLen = 0.11; var legR = 0.016;
        for (var si = 0; si < 8; si++) {
          var leg = new THREE.Mesh(new THREE.CylinderGeometry(legR * 0.9, legR * 1.15, legLen, 6), animalMat(color));
          var side = (si % 2 === 0) ? -1 : 1; var zOff = 0.04 - (si * 0.09); var xOff = side * 0.13;
          leg.position.set(xOff, 0.03, zOff); leg.rotation.z = side * 0.48; g.add(leg);
        }
        scale = 0.22; break;
      case 'goat':
        color = 0xb0b8bc;
        var goatBarrel = blob(0.3, color); goatBarrel.scale.set(0.98, 0.75, 1.05); goatBarrel.position.set(0, 0.38, 0.05); g.add(goatBarrel);
        var goatChest = blob(0.24, color); goatChest.scale.set(0.9, 0.85, 0.95); goatChest.position.set(0, 0.38, 0.32); g.add(goatChest);
        var goatRump = blob(0.26, color); goatRump.scale.set(0.88, 0.8, 0.9); goatRump.position.set(0, 0.36, -0.28); g.add(goatRump);
        head = blob(0.18, color, 18, 12); head.scale.set(0.88, 0.92, 1.02); head.position.set(0, 0.4, 0.5); g.add(head);
        addEyes(g, 0, 0.44, 0.5, 0.16, 0x1a1a1a);
        var goatHornL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.038, 0.16, 6), animalMat(0x2d2d2d)); goatHornL.rotation.z = -0.48; goatHornL.position.set(-0.11, 0.52, 0.48); g.add(goatHornL); var goatHornR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.038, 0.16, 6), animalMat(0x2d2d2d)); goatHornR.rotation.z = 0.48; goatHornR.position.set(0.11, 0.52, 0.48); g.add(goatHornR);
        addLegs(g, 0, 0.4, 0, 0.17, 0.24, 0.3, 0.048, color); scale = 0.82; break;
      case 'llama':
        color = 0xf5e6d3;
        var llaBarrel = blob(0.36, color); llaBarrel.scale.set(1, 0.72, 1.18); llaBarrel.position.set(0, 0.56, 0); g.add(llaBarrel);
        var llaChest = blob(0.28, color); llaChest.scale.set(0.9, 0.82, 0.95); llaChest.position.set(0, 0.58, 0.38); g.add(llaChest);
        var llaRump = blob(0.3, color); llaRump.scale.set(0.92, 0.85, 0.95); llaRump.position.set(0, 0.54, -0.35); g.add(llaRump);
        var llamaNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.58, 12), animalMat(color)); llamaNeck.rotation.x = 0.38; llamaNeck.position.set(0, 0.82, 0.54); g.add(llamaNeck);
        head = blob(0.2, color, 20, 14); head.scale.set(0.92, 0.96, 1.05); head.position.set(0, 0.98, 0.78); g.add(head);
        addEyes(g, 0, 1.02, 0.78, 0.2, 0x1a1a1a); addLegs(g, 0, 0.58, 0, 0.22, 0.3, 0.54, 0.065, color); scale = 1.2; break;
      case 'bear':
        color = 0x4a3520;
        var bearChest = blob(0.38, color); bearChest.scale.set(0.95, 0.95, 0.98); bearChest.position.set(0, 0.52, 0.25); g.add(bearChest);
        var bearBarrel = blob(0.36, color); bearBarrel.scale.set(1.02, 0.88, 1.08); bearBarrel.position.set(0, 0.48, -0.08); g.add(bearBarrel);
        var bearRump = blob(0.32, color); bearRump.scale.set(0.9, 0.9, 0.92); bearRump.position.set(0, 0.46, -0.32); g.add(bearRump);
        head = blob(0.22, color, 20, 14); head.scale.set(0.96, 0.96, 1.04); head.position.set(0, 0.53, 0.56); g.add(head);
        var bearSnout = blob(0.1, 0x3d2914, 14, 10); bearSnout.position.set(0, 0.5, 0.7); g.add(bearSnout);
        addEyes(g, 0, 0.58, 0.56, 0.2, 0x1a1a1a);
        var bearEarL = blob(0.09, color, 10, 8); bearEarL.position.set(-0.19, 0.65, 0.5); g.add(bearEarL); var bearEarR = blob(0.09, color, 10, 8); bearEarR.position.set(0.19, 0.65, 0.5); g.add(bearEarR);
        addLegs(g, 0, 0.5, 0, 0.24, 0.3, 0.4, 0.11, color); scale = 1.02; break;
      case 'squirrel':
        color = 0xa67c00;
        var sqBody = blob(0.2, color); sqBody.scale.set(1.05, 0.95, 1.2); sqBody.position.set(0, 0.15, 0); g.add(sqBody);
        var sqChest = blob(0.16, color); sqChest.scale.set(0.9, 0.95, 0.9); sqChest.position.set(0, 0.16, 0.18); g.add(sqChest);
        head = blob(0.14, color, 16, 12); head.scale.set(0.9, 0.95, 1); head.position.set(0, 0.2, 0.3); g.add(head);
        addEyes(g, 0, 0.24, 0.3, 0.1, 0x1a1a1a);
        var sqEarL = blob(0.055, color, 10, 8); sqEarL.position.set(-0.09, 0.3, 0.26); g.add(sqEarL); var sqEarR = blob(0.055, color, 10, 8); sqEarR.position.set(0.09, 0.3, 0.26); g.add(sqEarR);
        var tailSq = blob(0.14, 0x6b4423, 16, 12); tailSq.scale.set(0.9, 1.1, 1.8); tailSq.position.set(0, 0.18, -0.4); g.add(tailSq);
        addLegs(g, 0, 0.16, 0, 0.09, 0.12, 0.12, 0.022, color); scale = 0.38; break;
      case 'fox':
        color = 0xe85c10;
        var foxBody = blob(0.26, color); foxBody.scale.set(1.02, 0.68, 1.15); foxBody.position.set(0, 0.28, 0.02); g.add(foxBody);
        var foxChest = blob(0.2, color); foxChest.scale.set(0.9, 0.85, 0.95); foxChest.position.set(0, 0.3, 0.28); g.add(foxChest);
        var foxRump = blob(0.22, color); foxRump.scale.set(0.88, 0.82, 0.9); foxRump.position.set(0, 0.26, -0.28); g.add(foxRump);
        head = blob(0.16, color, 18, 12); head.scale.set(0.88, 0.9, 1.1); head.position.set(0, 0.34, 0.46); g.add(head);
        var foxSnout = blob(0.06, 0xd46820, 12, 8); foxSnout.position.set(0, 0.32, 0.58); g.add(foxSnout);
        addEyes(g, 0, 0.38, 0.46, 0.14, 0x1a1a1a);
        var foxEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.16, 8), animalMat(color)); foxEarL.rotation.z = 0.18; foxEarL.position.set(-0.13, 0.48, 0.42); g.add(foxEarL); var foxEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.16, 8), animalMat(color)); foxEarR.rotation.z = -0.18; foxEarR.position.set(0.13, 0.48, 0.42); g.add(foxEarR);
        var tailFox = blob(0.15, 0xcc4400, 16, 12); tailFox.scale.set(0.7, 1, 1.65); tailFox.position.set(0, 0.26, -0.48); g.add(tailFox);
        addLegs(g, 0, 0.31, 0, 0.13, 0.18, 0.2, 0.038, color); scale = 0.58; break;
      case 'fish':
        color = 0x4a90d9;
        var fishBody = blob(0.2, color, 16, 12); fishBody.scale.set(0.9, 0.7, 1.8); fishBody.position.set(0, 0, 0); g.add(fishBody);
        var fishHead = blob(0.14, color, 12, 10); fishHead.position.set(0, 0, 0.22); g.add(fishHead);
        var tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 6), animalMat(color)); tailFin.rotation.x = Math.PI / 2; tailFin.position.set(0, 0, -0.28); g.add(tailFin);
        addEyes(g, 0, 0.06, 0.2, 0.1, 0x1a1a1a); scale = 0.85; break;
      case 'jellyfish':
        color = 0xe0c8f0;
        var bell = blob(0.4, color, 20, 14); bell.scale.set(1.15, 0.45, 1.15); bell.position.set(0, 0, 0); g.add(bell);
        var tentacleGeo = new THREE.CylinderGeometry(0.032, 0.06, 0.65, 6);
        for (var j = 0; j < 6; j++) {
          var ang = (j / 6) * Math.PI * 2;
          var t = new THREE.Mesh(tentacleGeo, animalMat(color)); t.position.set(0.2 * Math.cos(ang), -0.55, 0.2 * Math.sin(ang)); g.add(t);
        }
        scale = 1.35; break;
      case 'shark':
        color = 0x6b7280;
        var bellyColor = 0xf0f4f8;
        var shBody = blob(0.42, color, 20, 14); shBody.scale.set(0.85, 0.6, 2.2); shBody.position.set(0, 0, 0); g.add(shBody);
        var shBelly = blob(0.28, bellyColor, 16, 12); shBelly.scale.set(1.1, 0.35, 2.1); shBelly.position.set(0, -0.22, 0); g.add(shBelly);
        var shHead = blob(0.3, color, 16, 12); shHead.scale.set(0.9, 0.9, 1.15); shHead.position.set(0, 0, 0.5); g.add(shHead);
        var shSnout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 8), animalMat(color)); shSnout.rotation.x = Math.PI / 2; shSnout.position.set(0, 0, 0.72); g.add(shSnout);
        var dorsalFin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 6), animalMat(color)); dorsalFin.rotation.x = -Math.PI / 2; dorsalFin.position.set(0, 0.4, -0.1); g.add(dorsalFin);
        var tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 6), animalMat(color)); tailFin.rotation.x = Math.PI / 2; tailFin.position.set(0, 0, -0.68); g.add(tailFin);
        addEyes(g, 0, 0.1, 0.48, 0.18, 0x1a1a1a); scale = 1.48; break;
      case 'turtle':
        color = 0x2d5a3d;
        var shell = blob(0.32, color, 20, 14); shell.scale.set(1.15, 0.5, 1.25); shell.position.set(0, 0, 0); g.add(shell);
        var head = blob(0.12, 0x8b7355, 14, 10); head.scale.set(0.9, 0.9, 1.1); head.position.set(0, 0.08, 0.38); g.add(head);
        addEyes(g, 0, 0.12, 0.38, 0.08, 0x1a1a1a);
        var flipperGeo = new THREE.BoxGeometry(0.22, 0.06, 0.12);
        var fl = new THREE.Mesh(flipperGeo, animalMat(0x3d5a2d)); fl.position.set(-0.28, -0.08, 0.2); g.add(fl);
        var fr = new THREE.Mesh(flipperGeo, animalMat(0x3d5a2d)); fr.position.set(0.28, -0.08, 0.2); g.add(fr);
        var bl = new THREE.Mesh(flipperGeo, animalMat(0x3d5a2d)); bl.position.set(-0.26, -0.08, -0.25); g.add(bl);
        var br = new THREE.Mesh(flipperGeo, animalMat(0x3d5a2d)); br.position.set(0.26, -0.08, -0.25); g.add(br);
        scale = 0.95; break;
      case 'clam':
        color = 0xe8e4dc;
        var clamShell = blob(0.2, color, 16, 12); clamShell.scale.set(1.4, 0.5, 1.1); clamShell.position.set(0, 0.06, 0); g.add(clamShell);
        var clamInner = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), animalMat(0xf5f0e6)); clamInner.rotation.x = Math.PI / 2; clamInner.position.set(0, 0, 0.02); g.add(clamInner);
        scale = 0.55; break;
      case 'whale':
        color = 0xb8cce0;
        var wBody1 = blob(0.5, color, 24, 16); wBody1.scale.set(0.9, 0.55, 1.2); wBody1.position.set(0, 0, 0.5); g.add(wBody1);
        var wBody2 = blob(0.52, color, 24, 16); wBody2.scale.set(0.95, 0.58, 1.3); wBody2.position.set(0, 0, 0); g.add(wBody2);
        var wBody3 = blob(0.48, color, 24, 16); wBody3.scale.set(0.9, 0.55, 1.25); wBody3.position.set(0, 0, -0.55); g.add(wBody3);
        var wHead = blob(0.38, color, 20, 14); wHead.scale.set(0.85, 0.9, 1.1); wHead.position.set(0, 0, 0.95); g.add(wHead);
        var wDorsal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), animalMat(color)); wDorsal.rotation.x = -Math.PI / 2; wDorsal.position.set(0, 0.52, -0.25); g.add(wDorsal);
        var wTail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 6), animalMat(color)); wTail.rotation.x = Math.PI / 2; wTail.position.set(0, 0, -1.15); g.add(wTail);
        addEyes(g, 0, 0.08, 0.92, 0.2, 0x1a1a1a);
        var blowhole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 12), animalMat(0x1a252a)); blowhole.position.set(0, 0.55, 0.35); g.add(blowhole);
        var spoutJet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.2, 10), new THREE.MeshLambertMaterial({ color: 0xd8e8f5, transparent: true, opacity: 0.75, depthWrite: false })); spoutJet.position.set(0, 0.55 + 0.6, 0.35); spoutJet.scale.set(1, 0, 1); g.add(spoutJet); g.userData.spoutMesh = spoutJet;
        g.renderOrder = 1;
        scale = 8; break;
      case 'frog':
        color = 0x2d5a2d;
        var frogBody = blob(0.18, color, 16, 12); frogBody.scale.set(1.1, 0.7, 1.25); frogBody.position.set(0, 0.08, 0); g.add(frogBody);
        head = blob(0.12, color, 14, 10); head.scale.set(0.95, 0.9, 1.05); head.position.set(0, 0.12, 0.22); g.add(head);
        var frogEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), animalMat(0x1a1a1a)); frogEyeL.position.set(-0.1, 0.2, 0.2); g.add(frogEyeL);
        var frogEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), animalMat(0x1a1a1a)); frogEyeR.position.set(0.1, 0.2, 0.2); g.add(frogEyeR);
        var frontLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.1, 6), animalMat(color)); frontLegL.rotation.x = 0.4; frontLegL.position.set(-0.12, 0.06, 0.18); g.add(frontLegL);
        var frontLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.1, 6), animalMat(color)); frontLegR.rotation.x = 0.4; frontLegR.position.set(0.12, 0.06, 0.18); g.add(frontLegR);
        var hindLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.2, 6), animalMat(color)); hindLegL.rotation.x = -0.5; hindLegL.position.set(-0.14, 0.02, -0.18); g.add(hindLegL);
        var hindLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.2, 6), animalMat(color)); hindLegR.rotation.x = -0.5; hindLegR.position.set(0.14, 0.02, -0.18); g.add(hindLegR);
        scale = 0.95; break;
      case 'bobcat':
        color = 0xb8956e;
        var spotColor = 0x4a3520;
        var bobBody = blob(0.24, color); bobBody.scale.set(1.02, 0.72, 1.12); bobBody.position.set(0, 0.26, 0); g.add(bobBody);
        var bobChest = blob(0.18, color); bobChest.scale.set(0.9, 0.88, 0.9); bobChest.position.set(0, 0.28, 0.26); g.add(bobChest);
        var bobRump = blob(0.2, color); bobRump.scale.set(0.9, 0.85, 0.88); bobRump.position.set(0, 0.24, -0.26); g.add(bobRump);
        head = blob(0.15, color, 18, 12); head.scale.set(0.9, 0.92, 1.05); head.position.set(0, 0.32, 0.42); g.add(head);
        var bobSnout = blob(0.055, 0x8b7355, 12, 8); bobSnout.position.set(0, 0.3, 0.54); g.add(bobSnout);
        addEyes(g, 0, 0.36, 0.42, 0.12, 0x1a1a1a);
        var bobEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.065, 0.14, 8), animalMat(color)); bobEarL.rotation.z = 0.2; bobEarL.position.set(-0.12, 0.46, 0.38); g.add(bobEarL);
        var bobEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.065, 0.14, 8), animalMat(color)); bobEarR.rotation.z = -0.2; bobEarR.position.set(0.12, 0.46, 0.38); g.add(bobEarR);
        var bobTail = blob(0.1, 0x6b5344, 12, 10); bobTail.scale.set(0.9, 1, 0.85); bobTail.position.set(0, 0.22, -0.42); g.add(bobTail);
        addLegs(g, 0, 0.28, 0, 0.12, 0.16, 0.18, 0.034, color);
        var spotGeo = new THREE.SphereGeometry(0.04, 8, 6);
        var s1 = new THREE.Mesh(spotGeo, animalMat(spotColor)); s1.position.set(-0.14, 0.3, 0.08); g.add(s1);
        var s2 = new THREE.Mesh(spotGeo.clone(), animalMat(spotColor)); s2.position.set(0.16, 0.26, -0.02); g.add(s2);
        var s3 = new THREE.Mesh(spotGeo.clone(), animalMat(spotColor)); s3.position.set(-0.12, 0.22, -0.18); g.add(s3);
        var s4 = new THREE.Mesh(spotGeo.clone(), animalMat(spotColor)); s4.position.set(0.1, 0.28, 0.2); g.add(s4);
        var s5 = new THREE.Mesh(spotGeo.clone(), animalMat(spotColor)); s5.position.set(0.08, 0.2, -0.28); g.add(s5);
        var s6 = new THREE.Mesh(spotGeo.clone(), animalMat(spotColor)); s6.position.set(-0.18, 0.26, 0.22); g.add(s6);
        scale = 1.65; break;
      case 'heron':
        color = 0x7a8c7a;
        var heronBody = blob(0.16, color, 14, 10); heronBody.scale.set(0.9, 1.1, 1.2); heronBody.position.set(0, 0.42, 0); g.add(heronBody);
        var heronNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.38, 8), animalMat(color)); heronNeck.rotation.x = 0.35; heronNeck.position.set(0, 0.58, 0.28); g.add(heronNeck);
        head = blob(0.08, color, 12, 8); head.position.set(0, 0.72, 0.48); g.add(head);
        var heronBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 6), animalMat(0x2d2d2d)); heronBeak.rotation.x = -0.15; heronBeak.position.set(0, 0.7, 0.56); g.add(heronBeak);
        addEyes(g, 0, 0.74, 0.48, 0.06, 0x1a1a1a);
        var legGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.28, 6);
        var heronLegL = new THREE.Mesh(legGeo, animalMat(0x3d3d3d)); heronLegL.position.set(-0.06, 0.12, 0.08); g.add(heronLegL);
        var heronLegR = new THREE.Mesh(legGeo.clone(), animalMat(0x3d3d3d)); heronLegR.position.set(0.06, 0.12, 0.08); g.add(heronLegR);
        scale = 1.4; break;
      case 'leech':
        color = 0x2a1a1a;
        var leechBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.35, 10), animalMat(color)); leechBody.rotation.x = Math.PI / 2; leechBody.position.set(0, 0, 0); g.add(leechBody);
        var leechHead = blob(0.055, color, 10, 8); leechHead.scale.set(1, 1, 0.8); leechHead.position.set(0, 0, 0.18); g.add(leechHead);
        scale = 1.0; break;
      case 'alligator':
        color = 0x5a6b4a;
        var gatorBody = blob(0.28, color, 20, 14); gatorBody.scale.set(0.85, 0.55, 1.6); gatorBody.position.set(0, 0.18, 0); g.add(gatorBody);
        var gatorSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8), animalMat(color)); gatorSnout.rotation.x = Math.PI / 2; gatorSnout.position.set(0, 0.2, 0.42); g.add(gatorSnout);
        var gatorJaw = blob(0.06, 0x4a5a3a, 12, 8); gatorJaw.scale.set(1.2, 0.6, 1); gatorJaw.position.set(0, 0.16, 0.5); g.add(gatorJaw);
        addEyes(g, 0, 0.24, 0.32, 0.1, 0x1a1a1a);
        var gatorTail = blob(0.12, color, 14, 10); gatorTail.scale.set(0.8, 0.9, 2.2); gatorTail.position.set(0, 0.16, -0.52); g.add(gatorTail);
        addLegs(g, 0, 0.18, 0, 0.18, 0.22, 0.12, 0.045, color); scale = 1.95; break;
      case 'snake':
        color = 0x4a5a3a;
        var snakeSeg1 = blob(0.1, color, 12, 10); snakeSeg1.scale.set(1, 1, 1.2); snakeSeg1.position.set(0, 0.06, 0.12); g.add(snakeSeg1);
        var snakeSeg2 = blob(0.09, color, 12, 10); snakeSeg2.scale.set(1, 1, 1.1); snakeSeg2.position.set(0, 0.05, 0); g.add(snakeSeg2);
        var snakeSeg3 = blob(0.09, color, 12, 10); snakeSeg3.scale.set(1, 1, 1.1); snakeSeg3.position.set(0, 0.05, -0.12); g.add(snakeSeg3);
        var snakeHead = blob(0.11, color, 12, 10); snakeHead.scale.set(0.95, 0.9, 1.1); snakeHead.position.set(0, 0.06, 0.28); g.add(snakeHead);
        addEyes(g, 0, 0.08, 0.28, 0.06, 0x1a1a1a); scale = 2.2; break;
      case 'dragonfly':
        color = 0x2d5a6a;
        var dragonBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 8), animalMat(color)); dragonBody.rotation.x = Math.PI / 2; dragonBody.position.set(0, 0, 0); g.add(dragonBody);
        var dragonHead = blob(0.06, color, 10, 8); dragonHead.position.set(0, 0, 0.14); g.add(dragonHead);
        addEyes(g, 0, 0.02, 0.14, 0.04, 0x1a1a1a);
        var wingGeo = new THREE.PlaneGeometry(0.2, 0.08);
        var wingL = new THREE.Mesh(wingGeo, animalMat(0x88aacc)); wingL.position.set(-0.12, 0.02, 0); wingL.rotation.z = -0.3; g.add(wingL);
        var wingR = new THREE.Mesh(wingGeo.clone(), animalMat(0x88aacc)); wingR.position.set(0.12, 0.02, 0); wingR.rotation.z = 0.3; g.add(wingR);
        scale = 0.55; break;
      case 'zombie':
        color = 0x4a5a4a;
        var zbBody = blob(0.22, color, 16, 12); zbBody.scale.set(0.9, 1.1, 0.95); zbBody.position.set(0, 0.38, 0); g.add(zbBody);
        head = blob(0.16, color, 14, 10); head.scale.set(0.95, 0.95, 1); head.position.set(0, 0.52, 0.32); g.add(head);
        addEyes(g, 0, 0.54, 0.32, 0.1, 0x2a1a1a);
        addHumanArm(g, -1, 0.42, 0.15, color);
        addHumanArm(g, 1, 0.42, 0.15, color);
        addHumanLegs(g, 0.28, 0.3, 0.05, color); scale = 1.82; break;
      case 'skeleton':
        color = 0xe0d8c8;
        var skHead = blob(0.14, color, 12, 10); skHead.scale.set(0.9, 0.95, 1); skHead.position.set(0, 0.5, 0.3); g.add(skHead);
        addEyes(g, 0, 0.52, 0.3, 0.06, 0x1a1a1a);
        var skTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 8), animalMat(color)); skTorso.position.set(0, 0.32, 0.08); g.add(skTorso);
        addHumanArm(g, -1, 0.4, 0.12, color);
        addHumanArm(g, 1, 0.4, 0.12, color);
        addHumanLegs(g, 0.18, 0.28, 0.038, color); scale = 1.82; break;
      case 'crow':
        color = 0x0a0a0a;
        var crowBody = blob(0.12, color, 12, 10); crowBody.scale.set(1, 1.1, 1.2); crowBody.position.set(0, 0.14, 0); g.add(crowBody);
        head = blob(0.08, color, 10, 8); head.position.set(0, 0.2, 0.18); g.add(head);
        var crowBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), animalMat(0x2a2a2a)); crowBeak.rotation.x = -0.2; crowBeak.position.set(0, 0.18, 0.24); g.add(crowBeak);
        addEyes(g, 0, 0.22, 0.18, 0.05, 0x1a1a1a);
        var crowLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 6), animalMat(0x2a2a2a)); crowLegL.position.set(-0.04, 0.04, 0.06); g.add(crowLegL);
        var crowLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 6), animalMat(0x2a2a2a)); crowLegR.position.set(0.04, 0.04, 0.06); g.add(crowLegR);
        scale = 1.0; break;
      case 'bat':
        color = 0x2a2a2a;
        var batBody = blob(0.08, color, 10, 8); batBody.scale.set(0.9, 1.2, 1.1); batBody.position.set(0, 0.06, 0); g.add(batBody);
        var batHead = blob(0.06, color, 8, 6); batHead.position.set(0, 0.1, 0.1); g.add(batHead);
        addEyes(g, 0, 0.12, 0.1, 0.03, 0x1a1a1a);
        var batWingL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.1), animalMat(0x1a1a1a)); batWingL.position.set(-0.14, 0.06, 0); batWingL.rotation.z = 0.4; g.add(batWingL);
        var batWingR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.1), animalMat(0x1a1a1a)); batWingR.position.set(0.14, 0.06, 0); batWingR.rotation.z = -0.4; g.add(batWingR);
        scale = 0.85; break;
      case 'ghost':
        color = 0xd8e0e8;
        var ghostShape = blob(0.25, color, 12, 10); ghostShape.scale.set(0.9, 1.2, 0.6); ghostShape.position.set(0, 0.35, 0); g.add(ghostShape);
        var ghostHead = blob(0.14, color, 10, 8); ghostHead.position.set(0, 0.52, 0.15); g.add(ghostHead);
        addEyes(g, 0, 0.54, 0.15, 0.08, 0x4a4a5a);
        g.traverse(function (o) { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = 0.65; o.material.depthWrite = false; } });
        scale = 1.8; break;
      case 'wraith':
        color = 0x0a0a0a;
        var wrBody = blob(0.24, color, 12, 10); wrBody.scale.set(0.85, 1.15, 0.55); wrBody.position.set(0, 0.34, 0); g.add(wrBody);
        head = blob(0.13, color, 10, 8); head.position.set(0, 0.5, 0.14); g.add(head);
        addEyes(g, 0, 0.52, 0.14, 0.07, 0x4a4a5a); scale = 1.75; break;
      case 'arm':
        color = 0x8b7355;
        addHumanArm(g, 1, 0.08, -0.05, color);
        g.rotation.x = Math.PI / 2; g.rotation.z = -Math.PI / 2;
        scale = 1.4; break;
      case 'poltergeist':
        color = 0x2a6a2a;
        var polBody = blob(0.2, color, 10, 8); polBody.scale.set(0.9, 1.1, 0.5); polBody.position.set(0, 0.3, 0); g.add(polBody);
        var polHead = blob(0.12, color, 8, 6); polHead.position.set(0, 0.46, 0.1); g.add(polHead);
        addEyes(g, 0, 0.48, 0.1, 0.06, 0x1a3a1a);
        g.traverse(function (o) { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = 0.5; o.material.depthWrite = false; } });
        scale = 1.5; break;
      case 'phantom':
        color = 0x6a4a8a;
        var phShape = blob(0.24, color, 12, 10); phShape.scale.set(0.88, 1.18, 0.58); phShape.position.set(0, 0.34, 0); g.add(phShape);
        var phHead = blob(0.13, color, 10, 8); phHead.position.set(0, 0.5, 0.14); g.add(phHead);
        addEyes(g, 0, 0.52, 0.14, 0.07, 0x4a3a5a);
        g.traverse(function (o) { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = 0.6; o.material.depthWrite = false; } });
        scale = 1.75; break;
      case 'wisp':
        color = 0xe8e8c0;
        var wispSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), animalMat(color)); wispSphere.position.set(0, 0, 0); g.add(wispSphere);
        scale = 0.7; break;
      case 'moth':
        color = 0x6a5a4a;
        var mothBody = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8), animalMat(color)); mothBody.rotation.x = Math.PI / 2; mothBody.position.set(0, 0, 0); g.add(mothBody);
        var mothHead = blob(0.04, color, 8, 6); mothHead.position.set(0, 0, 0.1); g.add(mothHead);
        addEyes(g, 0, 0.01, 0.1, 0.025, 0x1a1a1a);
        var mothWingL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.08), animalMat(0x5a4a3a)); mothWingL.position.set(-0.1, 0.02, 0); mothWingL.rotation.z = 0.35; g.add(mothWingL);
        var mothWingR = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.08), animalMat(0x5a4a3a)); mothWingR.position.set(0.1, 0.02, 0); mothWingR.rotation.z = -0.35; g.add(mothWingR);
        scale = 0.8; break;
      case 'vampire':
        color = 0x0a0a0a;
        var vpBody = blob(0.22, color, 16, 12); vpBody.scale.set(0.9, 1.1, 0.95); vpBody.position.set(0, 0.38, 0); g.add(vpBody);
        head = blob(0.16, color, 14, 10); head.scale.set(0.95, 0.95, 1); head.position.set(0, 0.52, 0.32); g.add(head);
        addEyes(g, 0, 0.54, 0.32, 0.1, 0x2a1a1a);
        var vest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.06), animalMat(0xaa2020)); vest.position.set(0, 0.38, 0.14); g.add(vest);
        var fangGeo = new THREE.ConeGeometry(0.012, 0.06, 6);
        var fangL = new THREE.Mesh(fangGeo, animalMat(0xf5f0e8)); fangL.rotation.x = Math.PI; fangL.position.set(-0.04, 0.5, 0.38); g.add(fangL);
        var fangR = new THREE.Mesh(fangGeo.clone(), animalMat(0xf5f0e8)); fangR.rotation.x = Math.PI; fangR.position.set(0.04, 0.5, 0.38); g.add(fangR);
        var capeMat = new THREE.MeshLambertMaterial({ color: 0x2a0a0a, side: THREE.DoubleSide });
        var cape = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), capeMat); cape.position.set(0, 0.32, -0.28); cape.rotation.x = 0.15; g.add(cape);
        addHumanArm(g, -1, 0.42, 0.15, color);
        addHumanArm(g, 1, 0.42, 0.15, color);
        addHumanLegs(g, 0.28, 0.3, 0.05, color); scale = 2.3; break;
      case 'blackcat':
        color = 0x0a0a0a;
        var catBody = blob(0.2, color); catBody.scale.set(1, 0.7, 1.2); catBody.position.set(0, 0.2, 0); g.add(catBody);
        head = blob(0.12, color, 14, 10); head.position.set(0, 0.28, 0.28); g.add(head);
        addEyes(g, 0, 0.3, 0.28, 0.08, 0x2a2a2a);
        var catEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.05, 0.1, 8), animalMat(color)); catEarL.rotation.z = 0.2; catEarL.position.set(-0.08, 0.38, 0.24); g.add(catEarL);
        var catEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.05, 0.1, 8), animalMat(color)); catEarR.rotation.z = -0.2; catEarR.position.set(0.08, 0.38, 0.24); g.add(catEarR);
        var catTail = blob(0.06, color, 10, 8); catTail.scale.set(0.8, 1, 1.8); catTail.position.set(0, 0.18, -0.35); g.add(catTail);
        addLegs(g, 0, 0.2, 0, 0.08, 0.12, 0.14, 0.025, color); scale = 1.2; break;
      case 'wolf':
        color = 0x4a4a4a;
        var wolfBody = blob(0.26, color); wolfBody.scale.set(1, 0.72, 1.2); wolfBody.position.set(0, 0.28, 0); g.add(wolfBody);
        head = blob(0.16, color, 16, 12); head.scale.set(0.9, 0.95, 1.05); head.position.set(0, 0.34, 0.4); g.add(head);
        var wolfSnout = blob(0.05, 0x3a3a3a, 10, 8); wolfSnout.position.set(0, 0.32, 0.52); g.add(wolfSnout);
        addEyes(g, 0, 0.38, 0.4, 0.1, 0x1a1a1a);
        var wolfEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.06, 0.14, 8), animalMat(color)); wolfEarL.rotation.z = 0.25; wolfEarL.position.set(-0.12, 0.46, 0.36); g.add(wolfEarL);
        var wolfEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.06, 0.14, 8), animalMat(color)); wolfEarR.rotation.z = -0.25; wolfEarR.position.set(0.12, 0.46, 0.36); g.add(wolfEarR);
        var wolfTail = blob(0.1, color, 12, 10); wolfTail.scale.set(0.7, 1, 1.4); wolfTail.position.set(0, 0.24, -0.42); g.add(wolfTail);
        addLegs(g, 0, 0.28, 0, 0.12, 0.16, 0.22, 0.04, color); scale = 1.5; break;
      case 'mudskipper':
        color = 0x4a5a3a;
        var mudBody = blob(0.14, color, 14, 10); mudBody.scale.set(0.85, 0.5, 1.6); mudBody.position.set(0, 0.04, 0); g.add(mudBody);
        var mudHead = blob(0.1, color, 12, 8); mudHead.scale.set(1, 0.9, 1.1); mudHead.position.set(0, 0.05, 0.2); g.add(mudHead);
        var mudEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), animalMat(0x1a1a1a)); mudEyeL.position.set(-0.06, 0.12, 0.18); g.add(mudEyeL);
        var mudEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), animalMat(0x1a1a1a)); mudEyeR.position.set(0.06, 0.12, 0.18); g.add(mudEyeR);
        var pecL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 6), animalMat(color)); pecL.rotation.x = 0.4; pecL.position.set(-0.12, 0.02, 0.08); g.add(pecL);
        var pecR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 6), animalMat(color)); pecR.rotation.x = 0.4; pecR.position.set(0.12, 0.02, 0.08); g.add(pecR);
        var mudTail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), animalMat(color)); mudTail.rotation.x = Math.PI / 2; mudTail.position.set(0, 0.02, -0.22); g.add(mudTail);
        scale = 1.0; break;
      case 'tiger':
        color = 0xe07830;
        var tigerBody = blob(0.28, color); tigerBody.scale.set(1, 0.7, 1.25); tigerBody.position.set(0, 0.3, 0); g.add(tigerBody);
        var tigerChest = blob(0.2, color); tigerChest.scale.set(0.9, 0.9, 0.9); tigerChest.position.set(0, 0.32, 0.3); g.add(tigerChest);
        var tigerRump = blob(0.22, color); tigerRump.scale.set(0.9, 0.85, 0.9); tigerRump.position.set(0, 0.26, -0.3); g.add(tigerRump);
        head = blob(0.18, color, 18, 12); head.scale.set(0.92, 0.95, 1.08); head.position.set(0, 0.36, 0.5); g.add(head);
        var tigerSnout = blob(0.06, 0x8b7355, 12, 8); tigerSnout.position.set(0, 0.32, 0.62); g.add(tigerSnout);
        addEyes(g, 0, 0.38, 0.5, 0.11, 0x1a1a1a);
        var tigerEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.14, 8), animalMat(color)); tigerEarL.rotation.z = 0.22; tigerEarL.position.set(-0.14, 0.5, 0.44); g.add(tigerEarL);
        var tigerEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.14, 8), animalMat(color)); tigerEarR.rotation.z = -0.22; tigerEarR.position.set(0.14, 0.5, 0.44); g.add(tigerEarR);
        var tigerTail = blob(0.08, color, 12, 10); tigerTail.scale.set(0.8, 1, 1.8); tigerTail.position.set(0, 0.24, -0.5); g.add(tigerTail);
        var stripeColor = 0x1a1a1a;
        var stGeo = new THREE.SphereGeometry(0.03, 6, 5);
        for (var si = 0; si < 8; si++) { var st = new THREE.Mesh(stGeo, animalMat(stripeColor)); st.position.set((si % 2 ? 1 : -1) * 0.18, 0.28 + (si * 0.02), -0.15 + si * 0.08); g.add(st); }
        addLegs(g, 0, 0.3, 0, 0.14, 0.2, 0.22, 0.04, color); scale = PLAYER_HEIGHT / 0.57; break;
      case 'capybara':
        color = 0x4a3520;
        var capBody = blob(0.28, color); capBody.scale.set(0.78, 1.05, 0.88); capBody.position.set(0, 0.34, 0); g.add(capBody);
        var capBelly = blob(0.22, color); capBelly.scale.set(0.85, 0.7, 0.9); capBelly.position.set(0, 0.26, -0.08); g.add(capBelly);
        head = blob(0.16, color, 18, 12); head.scale.set(0.9, 0.95, 1); head.position.set(0, 0.38, 0.4); g.add(head);
        addEyes(g, 0, 0.42, 0.4, 0.09, 0x1a1a1a);
        var capEarL = blob(0.055, color, 10, 8); capEarL.position.set(-0.1, 0.46, 0.36); g.add(capEarL);
        var capEarR = blob(0.055, color, 10, 8); capEarR.position.set(0.1, 0.46, 0.36); g.add(capEarR);
        addLegs(g, 0, 0.34, 0, 0.14, 0.2, 0.26, 0.045, color); scale = 1.6; break;
      case 'snail':
        color = 0xc4a574;
        var shellSnail = blob(0.12, color, 16, 12); shellSnail.scale.set(1.1, 0.85, 1.15); shellSnail.position.set(0, 0.06, 0); g.add(shellSnail);
        var snailFoot = blob(0.08, 0x8b7355, 12, 10); snailFoot.scale.set(1.2, 0.5, 1.3); snailFoot.position.set(0, 0.02, 0.14); g.add(snailFoot);
        var snailEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), animalMat(0x1a1a1a)); snailEyeL.position.set(-0.05, 0.1, 0.18); g.add(snailEyeL);
        var snailEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), animalMat(0x1a1a1a)); snailEyeR.position.set(0.05, 0.1, 0.18); g.add(snailEyeR);
        scale = 0.65; break;
      case 'gilamonster':
        color = 0xd87830;
        var gilaBody = blob(0.26, color, 16, 12); gilaBody.scale.set(1.1, 0.6, 1.4); gilaBody.position.set(0, 0.12, 0); g.add(gilaBody);
        var gilaHead = blob(0.14, color, 14, 10); gilaHead.scale.set(0.95, 0.9, 1.1); gilaHead.position.set(0, 0.14, 0.28); g.add(gilaHead);
        addEyes(g, 0, 0.18, 0.28, 0.09, 0x1a1a1a);
        var bandColor = 0x1a1a1a;
        for (var gi = 0; gi < 5; gi++) { var band = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), animalMat(bandColor)); band.position.set((gi % 2 ? 1 : -1) * 0.16, 0.12 + gi * 0.02, -0.08 + gi * 0.1); g.add(band); }
        addLegs(g, 0, 0.12, 0, 0.12, 0.16, 0.1, 0.04, color); scale = 1.6; break;
      case 'roadrunner':
        color = 0x8b7355;
        var rrBody = blob(0.2, color, 14, 10); rrBody.scale.set(0.9, 1, 1.3); rrBody.position.set(0, 0.38, 0); g.add(rrBody);
        head = blob(0.1, color, 12, 8); head.position.set(0, 0.48, 0.32); g.add(head);
        addEyes(g, 0, 0.5, 0.32, 0.08, 0x1a1a1a);
        var rrBeak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 6), animalMat(0x2d2d2d)); rrBeak.rotation.x = -0.15; rrBeak.position.set(0, 0.46, 0.42); g.add(rrBeak);
        var rrCrest = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 6), animalMat(color)); rrCrest.rotation.z = -0.3; rrCrest.position.set(0.04, 0.56, 0.3); g.add(rrCrest);
        var rrTail = blob(0.08, 0x6b5344, 12, 10); rrTail.scale.set(0.8, 1, 2); rrTail.position.set(0, 0.34, -0.35); g.add(rrTail);
        var rrLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.28, 6), animalMat(0x3d3d3d)); rrLegL.position.set(-0.08, 0.14, 0.06); g.add(rrLegL);
        var rrLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.28, 6), animalMat(0x3d3d3d)); rrLegR.position.set(0.08, 0.14, 0.06); g.add(rrLegR);
        scale = 1.5; break;
      case 'coyote':
        color = 0x8b7a6a;
        var coyBody = blob(0.28, color); coyBody.scale.set(1, 0.7, 1.25); coyBody.position.set(0, 0.3, 0); g.add(coyBody);
        var coyChest = blob(0.2, color); coyChest.scale.set(0.9, 0.9, 0.9); coyChest.position.set(0, 0.32, 0.28); g.add(coyChest);
        var coyRump = blob(0.22, color); coyRump.scale.set(0.9, 0.85, 0.9); coyRump.position.set(0, 0.26, -0.3); g.add(coyRump);
        head = blob(0.18, color, 18, 12); head.scale.set(0.92, 0.95, 1.08); head.position.set(0, 0.36, 0.48); g.add(head);
        var coySnout = blob(0.06, 0x6b5a4a, 12, 8); coySnout.position.set(0, 0.32, 0.6); g.add(coySnout);
        addEyes(g, 0, 0.38, 0.48, 0.11, 0x1a1a1a);
        var coyEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.14, 8), animalMat(color)); coyEarL.rotation.z = 0.22; coyEarL.position.set(-0.14, 0.5, 0.42); g.add(coyEarL);
        var coyEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.14, 8), animalMat(color)); coyEarR.rotation.z = -0.22; coyEarR.position.set(0.14, 0.5, 0.42); g.add(coyEarR);
        var coyTail = blob(0.1, 0x6b5a4a, 12, 10); coyTail.scale.set(0.75, 1, 1.6); coyTail.position.set(0, 0.24, -0.48); g.add(coyTail);
        addLegs(g, 0, 0.3, 0, 0.14, 0.2, 0.22, 0.04, color); scale = 1.55; break;
      case 'armadillo':
        color = 0x7a6a5a;
        var armBody = blob(0.28, color); armBody.scale.set(1.05, 0.55, 1.2); armBody.position.set(0, 0.14, 0); g.add(armBody);
        for (var ai = 0; ai < 6; ai++) { var band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 8), animalMat(0x5a4a3a)); band.position.set(0, 0.14, -0.22 + ai * 0.1); g.add(band); }
        head = blob(0.12, color, 14, 10); head.scale.set(0.9, 0.9, 1.1); head.position.set(0, 0.16, 0.28); g.add(head);
        addEyes(g, 0, 0.2, 0.28, 0.06, 0x1a1a1a);
        var armSnout = blob(0.05, 0x6b5a4a, 10, 8); armSnout.position.set(0, 0.14, 0.4); g.add(armSnout);
        var armEarL = blob(0.04, color, 8, 6); armEarL.position.set(-0.08, 0.22, 0.24); g.add(armEarL);
        var armEarR = blob(0.04, color, 8, 6); armEarR.position.set(0.08, 0.22, 0.24); g.add(armEarR);
        addLegs(g, 0, 0.14, 0, 0.14, 0.18, 0.12, 0.035, color); scale = 1.5; break;
      case 'jackrabbit':
        color = 0xa89078;
        var jrBody = blob(0.22, color); jrBody.scale.set(1, 0.7, 1.15); jrBody.position.set(0, 0.22, 0); g.add(jrBody);
        head = blob(0.14, color, 16, 12); head.scale.set(0.9, 0.95, 1.05); head.position.set(0, 0.28, 0.32); g.add(head);
        addEyes(g, 0, 0.32, 0.32, 0.1, 0x1a1a1a);
        var jrEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.06, 0.28, 8), animalMat(color)); jrEarL.rotation.z = 0.15; jrEarL.position.set(-0.1, 0.46, 0.26); g.add(jrEarL);
        var jrEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.06, 0.28, 8), animalMat(color)); jrEarR.rotation.z = -0.15; jrEarR.position.set(0.1, 0.46, 0.26); g.add(jrEarR);
        addLegs(g, 0, 0.24, 0, 0.1, 0.14, 0.2, 0.03, color); scale = 1.45; break;
      case 'parrot':
        color = 0xe84848;
        var parBody = blob(0.12, color, 12, 10); parBody.scale.set(0.9, 1, 1.2); parBody.position.set(0, 0.22, 0); g.add(parBody);
        head = blob(0.08, color, 10, 8); head.position.set(0, 0.28, 0.18); g.add(head);
        addEyes(g, 0, 0.3, 0.18, 0.05, 0x1a1a1a);
        var parBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 6), animalMat(0xf5c842)); parBeak.rotation.x = -0.2; parBeak.position.set(0, 0.26, 0.24); g.add(parBeak);
        var parTail = blob(0.06, 0x2a8a2a, 8, 6); parTail.scale.set(0.6, 1, 1.8); parTail.position.set(0, 0.2, -0.22); g.add(parTail);
        var parWingL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), animalMat(color)); parWingL.scale.set(0.5, 1.2, 1.5); parWingL.position.set(-0.14, 0.22, 0); g.add(parWingL);
        var parWingR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), animalMat(color)); parWingR.scale.set(0.5, 1.2, 1.5); parWingR.position.set(0.14, 0.22, 0); g.add(parWingR);
        scale = 1.1; break;
      case 'monkey':
        color = 0x6b5344;
        var monBody = blob(0.2, color); monBody.scale.set(0.95, 1, 1.1); monBody.position.set(0, 0.28, 0); g.add(monBody);
        head = blob(0.14, color, 16, 12); head.scale.set(0.95, 1, 1.05); head.position.set(0, 0.38, 0.28); g.add(head);
        addEyes(g, 0, 0.4, 0.28, 0.07, 0x1a1a1a);
        var monEarL = blob(0.045, color, 8, 6); monEarL.position.set(-0.1, 0.42, 0.22); g.add(monEarL);
        var monEarR = blob(0.045, color, 8, 6); monEarR.position.set(0.1, 0.42, 0.22); g.add(monEarR);
        addLegs(g, 0, 0.28, 0, 0.12, 0.18, 0.2, 0.035, color); scale = 1.2; break;
      case 'jaguar':
        color = 0x2a2a2a;
        var jagBody = blob(0.28, color); jagBody.scale.set(1, 0.7, 1.25); jagBody.position.set(0, 0.3, 0); g.add(jagBody);
        var jagChest = blob(0.2, color); jagChest.scale.set(0.9, 0.9, 0.9); jagChest.position.set(0, 0.32, 0.3); g.add(jagChest);
        var jagRump = blob(0.22, color); jagRump.scale.set(0.9, 0.85, 0.9); jagRump.position.set(0, 0.26, -0.3); g.add(jagRump);
        head = blob(0.18, color, 18, 12); head.scale.set(0.92, 0.95, 1.08); head.position.set(0, 0.36, 0.5); g.add(head);
        var jagSnout = blob(0.06, 0x4a4a4a, 12, 8); jagSnout.position.set(0, 0.32, 0.62); g.add(jagSnout);
        addEyes(g, 0, 0.38, 0.5, 0.11, 0xf5e6a0);
        var jagEarL = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.14, 8), animalMat(color)); jagEarL.rotation.z = 0.22; jagEarL.position.set(-0.14, 0.5, 0.44); g.add(jagEarL);
        var jagEarR = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.07, 0.14, 8), animalMat(color)); jagEarR.rotation.z = -0.22; jagEarR.position.set(0.14, 0.5, 0.44); g.add(jagEarR);
        var jagTail = blob(0.08, color, 12, 10); jagTail.scale.set(0.8, 1, 1.8); jagTail.position.set(0, 0.24, -0.5); g.add(jagTail);
        var spotColor = 0x4a3a2a;
        var spotGeo = new THREE.SphereGeometry(0.025, 6, 5);
        for (var ji = 0; ji < 6; ji++) { var spot = new THREE.Mesh(spotGeo, animalMat(spotColor)); spot.position.set((ji % 2 ? 1 : -1) * 0.16, 0.28 + ji * 0.02, -0.12 + ji * 0.12); g.add(spot); }
        addLegs(g, 0, 0.3, 0, 0.14, 0.2, 0.22, 0.04, color); scale = 1.4; break;
      case 'slimeblob':
        color = 0x3a8a4a;
        var sbBody = blob(0.22, color, 12, 10); sbBody.scale.set(1.1, 0.95, 1.15); sbBody.position.set(0, 0, 0); g.add(sbBody);
        g.traverse(function(o) { if (o.material) { o.material.transparent = true; o.material.opacity = 0.82; } });
        scale = PLAYER_HEIGHT / 0.42; break;
      case 'tadpole':
        color = 0x2a4a2a;
        var tadBody = blob(0.08, color, 10, 8); tadBody.scale.set(1.2, 0.9, 1.4); tadBody.position.set(0, 0, 0); g.add(tadBody);
        var tadTail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), animalMat(color)); tadTail.rotation.x = Math.PI / 2; tadTail.position.set(0, 0, -0.18); g.add(tadTail);
        addEyes(g, 0, 0.04, 0.08, 0.03, 0x1a1a1a);
        scale = 0.9; break;
      case 'gelseafish':
        color = 0x6b5344;
        var gsfBody = blob(0.18, color, 14, 10); gsfBody.scale.set(0.9, 0.65, 1.6); gsfBody.position.set(0, 0, 0); g.add(gsfBody);
        var gsfHead = blob(0.12, color, 10, 8); gsfHead.position.set(0, 0, 0.2); g.add(gsfHead);
        var gsfTail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), animalMat(color)); gsfTail.rotation.x = Math.PI / 2; gsfTail.position.set(0, 0, -0.3); g.add(gsfTail);
        var gsfTooth = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.18, 6), animalMat(0xf5f5f5)); gsfTooth.rotation.x = -0.4; gsfTooth.position.set(0, 0.02, 0.32); g.add(gsfTooth);
        addEyes(g, 0, 0.05, 0.18, 0.06, 0x1a1a1a);
        scale = 0.95; break;
      case 'gelstrider':
        color = 0x4a6b3a;
        var gsBody = blob(0.28, color, 16, 12); gsBody.scale.set(0.95, 0.85, 1.15); gsBody.position.set(0, 0.5, 0); g.add(gsBody);
        var gsChest = blob(0.2, color); gsChest.scale.set(0.9, 0.9, 0.9); gsChest.position.set(0, 0.52, 0.28); g.add(gsChest);
        head = blob(0.18, color, 16, 12); head.scale.set(0.9, 0.95, 1.1); head.position.set(0, 0.58, 0.5); g.add(head);
        addEyes(g, 0, 0.62, 0.5, 0.1, 0x1a1a1a);
        var gsSnout = blob(0.06, 0x3a5a2a, 10, 8); gsSnout.position.set(0, 0.56, 0.62); g.add(gsSnout);
        var gsTail = blob(0.08, color, 12, 10); gsTail.scale.set(0.7, 1, 2); gsTail.position.set(0, 0.48, -0.45); g.add(gsTail);
        var gsLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), animalMat(color)); gsLegL.rotation.x = 0.3; gsLegL.position.set(-0.12, 0.22, 0.08); g.add(gsLegL);
        var gsLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), animalMat(color)); gsLegR.rotation.x = 0.3; gsLegR.position.set(0.12, 0.22, 0.08); g.add(gsLegR);
        scale = PLAYER_HEIGHT / 0.58; break;
      default: body = blob(0.35, 0x888888); body.position.y = 0.3; g.add(body); addLegs(g, 0, 0.3, 0, 0.2, 0.25, 0.25, 0.06, 0x888888); break;
    }
    g.scale.setScalar(scale);
    return g;
  }
  var biomeAnimals = {
    0: ['pig', 'cow', 'cow', 'cow', 'bison', 'bison'],
    1: ['bear', 'squirrel', 'squirrel', 'squirrel', 'fox', 'fox'],
    2: ['camel', 'scorpion'],
    3: ['goat', 'llama'],
    4: ['frog', 'frog', 'frog', 'frog', 'frog', 'heron', 'heron', 'leech', 'leech', 'alligator', 'snake', 'snake', 'dragonfly', 'dragonfly', 'dragonfly'],
    5: ['fish', 'fish', 'fish', 'jellyfish', 'jellyfish', 'shark', 'turtle', 'turtle', 'clam', 'clam', 'whale', 'whale', 'whale'],
    6: ['zombie', 'zombie', 'skeleton', 'skeleton', 'crow', 'crow', 'bat', 'bat', 'ghost', 'wraith', 'phantom', 'arm', 'arm', 'poltergeist', 'wisp', 'wisp', 'moth', 'moth', 'vampire', 'blackcat', 'blackcat', 'wolf', 'wolf'],
    7: ['mudskipper', 'mudskipper', 'mudskipper', 'mudskipper', 'mudskipper', 'mudskipper', 'mudskipper', 'tiger', 'capybara', 'capybara', 'snake', 'snake', 'snail', 'snail'],
    8: ['gilamonster', 'gilamonster', 'roadrunner', 'roadrunner', 'coyote', 'coyote', 'armadillo', 'armadillo', 'jackrabbit', 'jackrabbit'],
    9: ['bear', 'bear', 'wolf', 'wolf', 'squirrel', 'squirrel', 'squirrel', 'fox', 'fox'],
    10: ['snake', 'snake', 'frog', 'frog', 'parrot', 'parrot', 'monkey', 'monkey', 'jaguar', 'jaguar'],
    11: ['bear', 'squirrel', 'squirrel', 'fox', 'fox'],
    12: ['frog', 'frog', 'frog', 'slimeblob', 'slimeblob', 'tadpole', 'tadpole', 'tadpole', 'gelseafish', 'gelseafish', 'gelstrider', 'gelstrider'],
    13: ['bear', 'squirrel', 'fox', 'fox'],
    14: ['snail', 'snail', 'snail', 'frog', 'frog', 'moth', 'moth', 'moth', 'squirrel', 'squirrel'],
    15: ['coyote', 'coyote', 'roadrunner', 'roadrunner', 'gilamonster', 'jackrabbit', 'armadillo'],
    21: ['bear', 'squirrel', 'squirrel', 'fox', 'fox', 'bison'],
    22: ['squirrel', 'squirrel', 'squirrel', 'fox', 'moth', 'moth'],
    23: ['pig', 'bear', 'squirrel', 'squirrel', 'fox', 'fox'],
    24: ['squirrel', 'squirrel', 'bear', 'fox', 'fox'],
    25: ['squirrel', 'squirrel', 'fox', 'fox', 'moth'],
    26: ['coyote', 'jackrabbit', 'roadrunner', 'gilamonster', 'snake'],
    27: ['cow', 'cow', 'bison', 'bison', 'camel', 'camel'],
    28: ['camel', 'scorpion', 'gilamonster', 'roadrunner', 'jackrabbit']
  };
  var animalList = [];
  var ANIMAL_RADIUS = 0.6;
  var scorpionStingRedUntil = 0;
  var worldBoundsMin = -half + 3, worldBoundsMax = half - 3;
  var animalTypeColors = { pig: 0xffb6c1, cow: 0xf5f5f5, bison: 0x5c4033, camel: 0xd4a574, scorpion: 0x3d2914, goat: 0xb0b8bc, llama: 0xf5e6d3, bear: 0x4a3520, squirrel: 0xa67c00, fox: 0xe85c10, fish: 0x4a90d9, jellyfish: 0xe0c8f0, shark: 0x6b7280, turtle: 0x2d5a3d, clam: 0xe8e4dc, whale: 0xb8cce0, frog: 0x2d5a2d, bobcat: 0xb8956e, heron: 0x7a8c7a, leech: 0x2a1a1a, alligator: 0x5a6b4a, snake: 0x4a5a3a, dragonfly: 0x2d5a6a, zombie: 0x4a5a4a, skeleton: 0xe0d8c8, crow: 0x0a0a0a, bat: 0x2a2a2a, ghost: 0xd8e0e8, wraith: 0x0a0a0a, phantom: 0x6a4a8a, arm: 0x8b7355, poltergeist: 0x2a6a2a, wisp: 0xe8e8c0, moth: 0x6a5a4a, vampire: 0xe0c8b8, blackcat: 0x0a0a0a, wolf: 0x4a4a4a, mudskipper: 0x4a5a3a, tiger: 0xe07830, capybara: 0x4a3520, snail: 0xc4a574, gilamonster: 0xd87830, roadrunner: 0x8b7355, coyote: 0x8b7a6a, armadillo: 0x7a6a5a, jackrabbit: 0xa89078, parrot: 0xe84848, monkey: 0x6b5344, jaguar: 0x2a2a2a, slimeblob: 0x3a8a4a, tadpole: 0x2a4a2a, gelseafish: 0x6b5344, gelstrider: 0x4a6b3a };
  spawnChunkAnimalsFn = function (cx, cz, cd) {
    var cMinX = cx * CHUNK_SIZE, cMaxX = (cx + 1) * CHUNK_SIZE;
    var cMinZ = cz * CHUNK_SIZE, cMaxZ = (cz + 1) * CHUNK_SIZE;
    for (var ax = Math.floor(cMinX / ANIMAL_SPACING) * ANIMAL_SPACING; ax < cMaxX; ax += ANIMAL_SPACING) {
      for (var az = Math.floor(cMinZ / ANIMAL_SPACING) * ANIMAL_SPACING; az < cMaxZ; az += ANIMAL_SPACING) {
        var apx = ax + half;
        var apz = -az + half;
        var biome = getBiomeValue(apx, apz);
        var list = biomeAnimals[biome];
        if (!list || list.length === 0) continue;
        var jx = (noise2D(apx * 0.5, apz * 0.5) - 0.5) * 6;
        var jz = (noise2D(apx * 0.5 + 77, apz * 0.5 + 33) - 0.5) * 6;
        var wx = ax + jx;
        var wz = az + jz;
        if (wx < cMinX - 4 || wx > cMaxX + 4 || wz < cMinZ - 4 || wz > cMaxZ + 4) continue;
      var cell = Math.floor(apx * 0.12) * 11 + Math.floor(apz * 0.17) * 7 + Math.floor(noise2D(apx * 0.25, apz * 0.25) * 15);
      var choice = list[Math.abs(cell) % list.length];
      if (choice === 'whale') {
        var hasWhale = false;
        for (var w = 0; w < animalList.length; w++) { if (animalList[w].userData.type === 'whale') { hasWhale = true; break; } }
        if (hasWhale) continue;
      }
      if (choice === 'leech' && biome === 4 && !isSwampWet(apx, apz)) continue;
      if (choice === 'leech' && biome === 7 && !isMangroveWet(apx, apz)) continue;
      var gelOnIsland = biome === 12 && isGelSeaIsland(wx + half, -wz + half);
      if (biome === 12 && gelOnIsland && choice !== 'frog') continue;
      if (biome === 12 && !gelOnIsland && choice === 'frog') continue;
      var animal = makeAnimal(choice);
      var groundY = getTerrainHeight(wx, wz);
      if (biome === 5) animal.position.set(wx, choice === 'clam' ? groundY : SEA_FLOOR_Y + 0.8 + Math.random() * (WATER_LEVEL - SEA_FLOOR_Y - 1.2), wz);
      else if (choice === 'leech') animal.position.set(wx, (biome === 7 ? MANGROVE_WATER_LEVEL : SWAMP_WATER_LEVEL) + 0.1, wz);
      else if (biome === 12 && (choice === 'slimeblob' || choice === 'tadpole' || choice === 'gelseafish')) animal.position.set(wx, GEL_SEAFLOOR_Y + 1.2 + Math.random() * (WATER_LEVEL - GEL_SEAFLOOR_Y - 1.8), wz);
      else if (biome === 12 && choice === 'gelstrider') animal.position.set(wx, WATER_LEVEL, wz);
      else animal.position.set(wx, groundY, wz);
      animal.rotation.y = noise2D(apx * 3, apz * 3) * Math.PI * 2;
      animal.userData.type = choice;
      animal.userData.state = 'walk';
      animal.userData.timer = Math.random() * 4;
      animal.userData.dirX = (Math.random() - 0.5) * 2;
      animal.userData.dirZ = (Math.random() - 0.5) * 2;
      animal.userData.speed = 0;
      animal.userData.underSand = 0;
      animal.userData.homeBiome = biome;
      animal.userData.health = 3;
      animal.userData.originalColor = animalTypeColors[choice] || 0x888888;
      animalsGroup.add(animal);
      animalList.push(animal);
      cd.animals.push(animal);
    }
  }
  };
  for (var ak in terrainChunks) {
    var ap = ak.split(',');
    spawnChunkAnimalsFn(parseInt(ap[0], 10), parseInt(ap[1], 10), terrainChunks[ak]);
  }
  var hasWhale = false;
  for (var w = 0; w < animalList.length; w++) { if (animalList[w].userData.type === 'whale') { hasWhale = true; break; } }
  if (!hasWhale) {
    var whaleSpawned = false;
    for (var gx = -half + 60; gx <= half - 60 && !whaleSpawned; gx += 35) {
      for (var gz = -half + 60; gz <= half - 60 && !whaleSpawned; gz += 35) {
        var apx = gx + half, apz = -gz + half;
        if (getBiomeValue(apx, apz) !== 5) continue;
        var whale = makeAnimal('whale');
        whale.position.set(gx, SEA_FLOOR_Y + 1 + Math.random() * (WATER_LEVEL - SEA_FLOOR_Y - 1.5), gz);
        whale.rotation.y = Math.random() * Math.PI * 2;
        whale.userData.type = 'whale';
        whale.userData.state = 'walk';
        whale.userData.timer = Math.random() * 4;
        whale.userData.dirX = (Math.random() - 0.5) * 2;
        whale.userData.dirZ = (Math.random() - 0.5) * 2;
        whale.userData.speed = 0;
        whale.userData.underSand = 0;
        whale.userData.homeBiome = 5;
        whale.userData.health = 3;
        whale.userData.originalColor = 0xb8cce0;
        whale.visible = true;
        animalsGroup.add(whale);
        animalList.push(whale);
        whaleSpawned = true;
      }
    }
  }
  scene.add(animalsGroup);

  function spawnOneInBiome(biome) {
    var list = biomeAnimals[biome];
    if (!list || list.length === 0) return null;
    var attempt = 0;
    while (attempt++ < 40) {
      var wx = worldBoundsMin + Math.random() * (worldBoundsMax - worldBoundsMin);
      var wz = worldBoundsMin + Math.random() * (worldBoundsMax - worldBoundsMin);
      var apx = wx + half, apz = -wz + half;
      if (getBiomeValue(apx, apz) !== biome) continue;
      var gelOnIslandRespawn = biome === 12 && isGelSeaIsland(apx, apz);
      var groundY = getTerrainHeight(wx, wz);
      var choice = list[Math.floor(Math.random() * list.length)];
      if (biome === 12 && gelOnIslandRespawn && choice !== 'frog') continue;
      if (biome === 12 && !gelOnIslandRespawn && choice === 'frog') continue;
      if (choice === 'whale') {
        var hasWhale = false;
        for (var w = 0; w < animalList.length; w++) { if (animalList[w].userData.type === 'whale') { hasWhale = true; break; } }
        if (hasWhale) continue;
      }
      if (choice === 'leech' && biome === 4 && !isSwampWet(apx, apz)) continue;
      if (choice === 'leech' && biome === 7 && !isMangroveWet(apx, apz)) continue;
      var animal = makeAnimal(choice);
      if (biome === 5) animal.position.set(wx, choice === 'clam' ? groundY : SEA_FLOOR_Y + 0.8 + Math.random() * (WATER_LEVEL - SEA_FLOOR_Y - 1.2), wz);
      else if (choice === 'leech') animal.position.set(wx, (biome === 7 ? MANGROVE_WATER_LEVEL : SWAMP_WATER_LEVEL) + 0.1, wz);
      else if (biome === 12 && (choice === 'slimeblob' || choice === 'tadpole' || choice === 'gelseafish')) animal.position.set(wx, GEL_SEAFLOOR_Y + 1.2 + Math.random() * (WATER_LEVEL - GEL_SEAFLOOR_Y - 1.8), wz);
      else if (biome === 12 && choice === 'gelstrider') animal.position.set(wx, WATER_LEVEL, wz);
      else animal.position.set(wx, groundY, wz);
      animal.rotation.y = Math.random() * Math.PI * 2;
      animal.userData.type = choice;
      animal.userData.state = 'walk';
      animal.userData.timer = Math.random() * 4;
      animal.userData.dirX = (Math.random() - 0.5) * 2;
      animal.userData.dirZ = (Math.random() - 0.5) * 2;
      animal.userData.speed = 0;
      animal.userData.underSand = 0;
      animal.userData.homeBiome = biome;
      animal.userData.health = 3;
      animal.userData.originalColor = animalTypeColors[choice] || 0x888888;
      animalsGroup.add(animal);
      animalList.push(animal);
      return animal;
    }
    return null;
  }

  function setAnimalColor(animal, hex) {
    animal.traverse(function (o) { if (o.isMesh && o.material) o.material.color.setHex(hex); });
  }
  function saveAnimalColors(animal) {
    var list = [];
    animal.traverse(function (o) { if (o.isMesh && o.material) list.push(o.material.color.getHex()); });
    return list;
  }
  function restoreAnimalColors(animal, list) {
    var idx = 0;
    animal.traverse(function (o) { if (o.isMesh && o.material && list[idx] !== undefined) { o.material.color.setHex(list[idx]); idx++; } });
  }

  function getBaseSpeed(type) {
    var speeds = { pig: 4, cow: 1.5, bison: 3.2, camel: 1.2, scorpion: 6, llama: 4, bear: 2.5, goat: 4, squirrel: 10, fox: 5, fish: 3.5, jellyfish: 1.2, shark: 5.5, turtle: 1.8, clam: 0, whale: 2, frog: 3.5, bobcat: 5, heron: 1.2, leech: 1.5, alligator: 2.5, snake: 4, dragonfly: 8, zombie: 1.8, skeleton: 2.8, crow: 2.5, bat: 6, ghost: 1.5, wraith: 1.8, phantom: 1.6, arm: 1.2, poltergeist: 2.2, wisp: 3, moth: 5, vampire: 2.2, blackcat: 3.5, wolf: 4.5, mudskipper: 2.5, tiger: 3.5, capybara: 2, snail: 0.6, gilamonster: 2, roadrunner: 4.5, coyote: 4, armadillo: 2.2, jackrabbit: 5.5, parrot: 5, monkey: 4.5, jaguar: 3.8, slimeblob: 3.5, tadpole: 2.5, gelseafish: 3.2, gelstrider: 4.5 };
    return speeds[type] || 2;
  }

  function pushAnimalFromTrees(animal, r) {
    var px = animal.position.x, pz = animal.position.z;
    for (var i = 0; i < trunkColliders.length; i++) {
      var t = trunkColliders[i];
      var dx = px - t.x, dz = pz - t.z;
      var distXZ = Math.sqrt(dx * dx + dz * dz);
      var minDist = t.r + r;
      if (distXZ < minDist && distXZ > 0.0001) {
        var push = minDist - distXZ;
        px += (dx / distXZ) * push;
        pz += (dz / distXZ) * push;
      }
    }
    animal.position.x = px;
    animal.position.z = pz;
  }

  function updateAnimals(dt) {
    dt = Math.max(dt, 0.012);
    var now = Date.now() / 1000;
    var toRemove = [], toAdd = [];
    for (var i = 0; i < animalList.length; i++) {
      var animal = animalList[i];
      var u = animal.userData;
      if (u.flashUntil) {
        if (now < u.flashUntil) {
          if (!u.savedColors) u.savedColors = saveAnimalColors(animal);
          setAnimalColor(animal, 0xff4444);
        } else {
          if (u.savedColors) restoreAnimalColors(animal, u.savedColors);
          u.savedColors = undefined; u.flashUntil = undefined;
        }
      }
      var px = animal.position.x, pz = animal.position.z;
      var apx = px + half, apz = -pz + half;
      var currentBiome = getBiomeValue(apx, apz);
      var groundY = getTerrainHeight(px, pz);

      if (currentBiome === 5 && u.homeBiome !== 5) {
        u.state = 'dead';
        if (u.deathTime === undefined) u.deathTime = now;
        u.fellOff = true;
        animal.rotation.x += dt * 2.8;
        animal.position.y -= dt * 8;
        if (now - u.deathTime > 1.6) {
          toRemove.push(animal);
          toAdd.push(u.homeBiome);
        }
        continue;
      }
      if (u.homeBiome === 5 && currentBiome !== 5) {
        u.state = 'dead';
        if (u.deathTime === undefined) u.deathTime = now;
        u.fellOff = true;
        animal.rotation.x += dt * 2.8;
        animal.position.y -= dt * 8;
        if (now - u.deathTime > 1.6) {
          toRemove.push(animal);
          toAdd.push(5);
        }
        continue;
      }
      if (px < worldBoundsMin || px > worldBoundsMax || pz < worldBoundsMin || pz > worldBoundsMax || animal.position.y < groundY - 15) {
        u.state = 'dead';
        if (u.deathTime === undefined) u.deathTime = now;
        u.fellOff = true;
        animal.rotation.x += dt * 2.8;
        animal.position.y -= dt * 8;
        if (now - u.deathTime > 1.6) {
          toRemove.push(animal);
          toAdd.push(u.homeBiome);
        }
        continue;
      }
      if (u.state === 'dead') {
        if (u.deathTime === undefined) u.deathTime = now;
        animal.rotation.x += dt * 2.8;
        if (u.fellOff) animal.position.y -= dt * 8;
        if (now - u.deathTime > 1.6) {
          toRemove.push(animal);
          toAdd.push(u.homeBiome);
        }
        continue;
      }

      var speedMult = (u.type === 'scorpion') ? 2.5 : 1.4;
      var baseSpeed = getBaseSpeed(u.type) * dt * speedMult;
      var dx = u.dirX || 1, dz = u.dirZ || 0;
      u.timer += dt;

      if (u.type === 'pig') {
        if (u.state === 'roll') {
          u.speed = 0;
          if (u.timer > 1.2) { u.state = 'walk'; u.timer = 0; }
        } else {
          u.speed = baseSpeed;
          if (u.timer > 4 && Math.random() < 0.06) { u.state = 'roll'; u.timer = 0; }
          else if (u.timer > 6) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'cow') {
        var bearNear = false;
        for (var b = 0; b < animalList.length; b++) {
          var o = animalList[b];
          if (o.userData.type !== 'bear') continue;
          var d = Math.hypot(o.position.x - px, o.position.z - pz);
          if (d < 12) { bearNear = true; break; }
        }
        if (bearNear && (Math.abs(px - worldBoundsMin) < 15 || Math.abs(px - worldBoundsMax) < 15 || Math.abs(pz - worldBoundsMin) < 15 || Math.abs(pz - worldBoundsMax) < 15))
          u.speed = baseSpeed * 2.5;
        else if (u.state === 'graze') {
          u.speed = 0;
          if (u.timer > 2.5) { u.state = 'walk'; u.timer = 0; }
        } else {
          u.speed = baseSpeed * 0.6;
          if (currentBiome === 0 && u.timer > 6 && Math.random() < 0.03) { u.state = 'graze'; u.timer = 0; }
          else if (u.timer > 8) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'bison') {
        var cx = 0, cz = 0, count = 0;
        for (var b = 0; b < animalList.length; b++) {
          var o = animalList[b];
          if (o.userData.type !== 'bison' || o === animal) continue;
          var d = Math.hypot(o.position.x - px, o.position.z - pz);
          if (d < 18 && d > 0.1) { cx += o.position.x; cz += o.position.z; count++; }
        }
        if (count > 0) {
          cx /= count; cz /= count;
          dx = dx + (cx - px) * 0.015;
          dz = dz + (cz - pz) * 0.015;
        }
        if (u.state === 'graze') {
          u.speed = 0;
          if (u.timer > 2) { u.state = 'walk'; u.timer = 0; }
        } else {
          u.speed = baseSpeed;
          if (currentBiome === 0 && u.timer > 5 && Math.random() < 0.025) { u.state = 'graze'; u.timer = 0; }
          else if (u.timer > 6) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'camel') {
        if (u.state === 'lick') {
          u.speed = 0;
          if (!u.humpScale) u.humpScale = 1;
          u.humpScale = Math.min(1.35, u.humpScale + dt * 0.8);
          if (animal.userData.humpMesh) animal.userData.humpMesh.scale.set(1, u.humpScale, 0.88);
          if (u.timer > 1.5) { u.state = 'walk'; u.timer = 0; }
        } else {
          u.speed = baseSpeed * 0.5;
          if (u.humpScale !== undefined && u.humpScale > 1.05) u.humpScale = Math.max(1.05, u.humpScale - dt * 0.04);
          if (animal.userData.humpMesh) {
            var s = (u.humpScale !== undefined ? u.humpScale : 1.05);
            animal.userData.humpMesh.scale.set(1, s, 0.88);
          }
          if (u.timer > 10 + Math.random() * 8 && Math.random() < 0.02) { u.state = 'lick'; u.timer = 0; }
          else if (u.timer > 12) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'scorpion') {
        if (u.state === 'under') {
          u.underSand += dt;
          if (u.underSand > 10) { u.state = 'walk'; u.underSand = 0; animal.position.y = getTerrainHeight(px, pz); animal.visible = true; }
          continue;
        }
        for (var sc = 0; sc < animalList.length; sc++) {
          var oc = animalList[sc];
          if (oc.userData.type === 'camel' && oc.userData.state !== 'dead') {
            var dc = Math.hypot(oc.position.x - px, oc.position.z - pz);
            if (dc < 1.5 && Math.random() < 0.004) { oc.userData.state = 'dead'; oc.userData.deathTime = now; break; }
          }
        }
        u.speed = baseSpeed * 1.2;
        if (currentBiome === 2 && u.timer > 8 && Math.random() < 0.015) { u.state = 'under'; u.underSand = 0; animal.visible = false; animal.position.y -= 2; u.timer = 0; continue; }
        var distToPlayer = Math.hypot(camera.position.x - px, camera.position.z - pz);
        if (distToPlayer < 2.5 && Math.random() < 0.008) scorpionStingRedUntil = now + 1;
        u.timer += dt * 2;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'llama' || u.type === 'goat' || u.type === 'fox') {
        if (u.type === 'fox') {
          for (var f = 0; f < animalList.length; f++) {
            var os = animalList[f];
            if (os.userData.type === 'squirrel' && os.userData.state !== 'dead') {
              var ds = Math.hypot(os.position.x - px, os.position.z - pz);
              if (ds < 1.4) { os.userData.state = 'dead'; os.userData.deathTime = now; break; }
            }
          }
        }
        u.speed = baseSpeed;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'bear') {
        if (u.state === 'sleep') {
          u.speed = 0;
          if (u.timer > 3) { u.state = 'walk'; u.timer = 0; }
        } else if (u.state === 'hunt') {
          u.speed = baseSpeed * 1.8;
          if (u.timer > 2) { u.state = 'walk'; u.timer = 0; }
        } else {
          for (var b = 0; b < animalList.length; b++) {
            var other = animalList[b];
            var ty = other.userData.type;
            if ((ty === 'squirrel' || ty === 'fox') && other.userData.state !== 'dead') {
              var d = Math.hypot(other.position.x - px, other.position.z - pz);
              if (d < 1.8) { other.userData.state = 'dead'; other.userData.deathTime = now; u.state = 'hunt'; u.timer = 0; break; }
            }
          }
          u.speed = baseSpeed;
          if (u.timer > 15 && Math.random() < 0.02) { u.state = 'sleep'; u.timer = 0; }
          else if (u.timer > 8) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'squirrel') {
        u.speed = baseSpeed;
        if (u.timer > 3) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'frog') {
        u.speed = baseSpeed;
        if (u.timer > 2.5) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'bobcat') {
        u.speed = baseSpeed;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'heron') {
        if (u.state === 'stand') {
          u.speed = 0;
          if (u.timer > 2.5) { u.state = 'walk'; u.timer = 0; }
        } else {
          u.speed = baseSpeed;
          if (u.timer > 5 && Math.random() < 0.15) { u.state = 'stand'; u.timer = 0; }
          else if (u.timer > 6) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'leech') {
        u.speed = baseSpeed;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'alligator') {
        if (u.state === 'lunge') {
          u.speed = baseSpeed * 2.2;
          if (u.timer > 0.8) { u.state = 'walk'; u.timer = 0; }
        } else {
          u.speed = baseSpeed;
          if (u.timer > 6 && Math.random() < 0.04) { u.state = 'lunge'; u.timer = 0; }
          else if (u.timer > 8) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'snake') {
        u.speed = baseSpeed;
        if (u.timer > 3) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'slimeblob') {
        u.speed = baseSpeed;
        if (u.state === 'jump') { /* y handled below */ } else {
          if (u.timer > 2.5 + Math.random() * 3 && Math.random() < 0.07) { u.state = 'jump'; u.jumpStartTime = now; u.timer = 0; }
          if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'tadpole' || u.type === 'gelseafish' || u.type === 'gelstrider') {
        u.speed = baseSpeed;
        if (u.timer > 3) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'dragonfly') {
        u.speed = baseSpeed;
        if (u.timer > 2) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'zombie') {
        u.speed = baseSpeed;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'skeleton') {
        u.speed = baseSpeed;
        if (u.timer > 3.5) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'crow' || u.type === 'blackcat' || u.type === 'wolf' || u.type === 'vampire' || u.type === 'arm') {
        u.speed = baseSpeed;
        if (u.timer > 3.5) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'bat' || u.type === 'moth' || u.type === 'parrot') {
        u.speed = baseSpeed;
        if (u.timer > 2.5) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'ghost' || u.type === 'wraith' || u.type === 'phantom' || u.type === 'poltergeist' || u.type === 'wisp') {
        u.speed = baseSpeed;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'fish') {
        u.speed = baseSpeed;
        if (u.timer > 4) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'jellyfish') {
        u.speed = baseSpeed;
        var distToPlayerJ = Math.hypot(camera.position.x - px, camera.position.z - pz);
        if (distToPlayerJ < 2.5 && Math.abs(camera.position.y - animal.position.y) < 2.2 && Math.random() < 0.01) scorpionStingRedUntil = now + 1;
        if (u.timer > 6) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'turtle') {
        u.speed = baseSpeed;
        if (u.timer > 7) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      } else if (u.type === 'clam') {
        u.speed = 0;
      } else if (u.type === 'whale') {
        if (u.state === 'blow') {
          u.speed = 0;
        } else {
          u.speed = baseSpeed;
          if (u.blowTimer === undefined) u.blowTimer = now + 10 + Math.random() * 10;
          if (now >= u.blowTimer) { u.state = 'blow'; u.blowStartTime = now; u.blowTimer = undefined; }
          if (u.timer > 8) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else if (u.type === 'shark') {
        var playerInOcean = getBiomeValue(camera.position.x + half, -camera.position.z + half) === 5;
        var distToPlayer = Math.hypot(camera.position.x - px, camera.position.z - pz);
        if (playerInOcean && distToPlayer < 20 && distToPlayer > 0.5) {
          dx = (camera.position.x - px) / distToPlayer;
          dz = (camera.position.z - pz) / distToPlayer;
          u.speed = baseSpeed * 2.2;
          if (distToPlayer < 2.2 && Math.abs(camera.position.y - animal.position.y) < 2 && Math.random() < 0.012) scorpionStingRedUntil = now + 1.2;
        } else {
          u.speed = baseSpeed;
          for (var sf = 0; sf < animalList.length; sf++) {
            var other = animalList[sf];
            if (other.userData.type === 'fish' && other.userData.state !== 'dead') {
              var df = Math.hypot(other.position.x - px, other.position.z - pz);
              if (df < 2.8) { other.userData.state = 'dead'; other.userData.deathTime = now; u.speed = baseSpeed * 1.5; dx = (other.position.x - px) / (df || 0.001); dz = (other.position.z - pz) / (df || 0.001); break; }
            }
          }
          if (u.timer > 5) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
        }
      } else {
        u.speed = baseSpeed;
        if (u.timer > 5) { u.timer = 0; dx = (Math.random() - 0.5) * 2; dz = (Math.random() - 0.5) * 2; }
      }

      if (currentBiome !== u.homeBiome) {
        dx = dx * 0.2 - u.dirX * 1.4;
        dz = dz * 0.2 - u.dirZ * 1.4;
      }
      var len = Math.sqrt(dx * dx + dz * dz) || 1;
      u.dirX = dx / len;
      u.dirZ = dz / len;
      var moveSpeed = (typeof u.speed === 'number' && u.speed >= 0) ? u.speed : baseSpeed;
      animal.position.x += u.dirX * moveSpeed;
      animal.position.z += u.dirZ * moveSpeed;
      var nextApx = animal.position.x + half, nextApz = -animal.position.z + half;
      if (getBiomeValue(nextApx, nextApz) === 4 && u.homeBiome !== 4) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 6 && u.homeBiome !== 6) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 7 && u.homeBiome !== 7) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 8 && u.homeBiome !== 8) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 9 && u.homeBiome !== 9) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 10 && u.homeBiome !== 10) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 11 && u.homeBiome !== 11) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 12 && u.homeBiome !== 12) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 13 && u.homeBiome !== 13) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 14 && u.homeBiome !== 14) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 15 && u.homeBiome !== 15) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (getBiomeValue(nextApx, nextApz) === 21 && u.homeBiome !== 21) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 22 && u.homeBiome !== 22) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 23 && u.homeBiome !== 23) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 24 && u.homeBiome !== 24) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 25 && u.homeBiome !== 25) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 26 && u.homeBiome !== 26) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 27 && u.homeBiome !== 27) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (getBiomeValue(nextApx, nextApz) === 28 && u.homeBiome !== 28) { animal.position.x -= u.dirX * moveSpeed; animal.position.z -= u.dirZ * moveSpeed; }
      if (u.type === 'frog' && u.homeBiome === 12 && !isGelSeaIsland(nextApx, nextApz)) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      var gelCreature = u.type === 'slimeblob' || u.type === 'tadpole' || u.type === 'gelseafish' || u.type === 'gelstrider';
      if (gelCreature && u.homeBiome === 12 && isGelSeaIsland(nextApx, nextApz)) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (u.type === 'leech' && u.homeBiome === 4 && !isSwampWet(nextApx, nextApz)) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (u.type === 'leech' && u.homeBiome === 7 && !isMangroveWet(nextApx, nextApz)) {
        animal.position.x -= u.dirX * moveSpeed;
        animal.position.z -= u.dirZ * moveSpeed;
      }
      if (u.type === 'clam') {
        animal.position.y = getTerrainHeight(animal.position.x, animal.position.z);
      } else if (u.type === 'whale') {
        var spoutMesh = animal.userData.spoutMesh;
        if (u.state === 'blow') {
          var blowElapsed = now - u.blowStartTime;
          if (blowElapsed < 0.5 && spoutMesh) spoutMesh.scale.y = Math.min(1.2, blowElapsed / 0.5 * 1.2);
          else if (blowElapsed >= 2.6 && blowElapsed < 3.2 && spoutMesh) spoutMesh.scale.y = Math.max(0, 1.2 * (1 - (blowElapsed - 2.6) / 0.6));
          else if (blowElapsed >= 3.2 && spoutMesh) spoutMesh.scale.y = 0;
          if (blowElapsed < 1.2) {
            animal.position.y = Math.min(WATER_LEVEL + 0.4, animal.position.y + dt * 3.5);
          } else if (blowElapsed < 4.5) {
            animal.position.y = Math.max(SEA_FLOOR_Y + (WATER_LEVEL - SEA_FLOOR_Y) * 0.52, animal.position.y - dt * 2.5);
          } else {
            u.state = 'walk';
            u.blowTimer = now + 10 + Math.random() * 10;
            if (spoutMesh) spoutMesh.scale.y = 0;
          }
        } else {
          if (spoutMesh) spoutMesh.scale.y = 0;
          var whaleSwimMid = SEA_FLOOR_Y + (WATER_LEVEL - SEA_FLOOR_Y) * 0.52;
          var whaleBob = Math.sin(u.timer * 0.7) * 0.25;
          animal.position.y = Math.max(SEA_FLOOR_Y + 0.8, Math.min(WATER_LEVEL - 0.5, whaleSwimMid + whaleBob));
        }
      } else if (u.type === 'fish' || u.type === 'jellyfish' || u.type === 'shark' || u.type === 'turtle') {
        var swimMid = SEA_FLOOR_Y + (WATER_LEVEL - SEA_FLOOR_Y) * (u.type === 'jellyfish' ? 0.55 : u.type === 'shark' ? 0.4 : u.type === 'turtle' ? 0.5 : 0.45);
        var bob = Math.sin(u.timer * (u.type === 'jellyfish' ? 1.4 : u.type === 'shark' ? 1.2 : u.type === 'turtle' ? 0.9 : 2.2)) * (u.type === 'jellyfish' ? 0.5 : u.type === 'shark' ? 0.25 : u.type === 'turtle' ? 0.2 : 0.35);
        animal.position.y = Math.max(SEA_FLOOR_Y + 0.4, Math.min(WATER_LEVEL - 0.4, swimMid + bob));
      } else if (u.type === 'slimeblob' && u.homeBiome === 12) {
        if (u.state === 'jump' && u.jumpStartTime !== undefined) {
          var jumpEl = now - u.jumpStartTime;
          if (jumpEl > 0.65) { u.state = 'swim'; u.jumpStartTime = undefined; }
          var jumpT = Math.min(1, jumpEl / 0.3);
          var jumpH = jumpT < 0.5 ? jumpT * 2 : 2 - (jumpT - 0.5) * 2;
          animal.position.y = WATER_LEVEL - 0.2 + jumpH * 2.5;
        } else {
          var sbMid = GEL_SEAFLOOR_Y + (WATER_LEVEL - GEL_SEAFLOOR_Y) * 0.5;
          var sbBob = Math.sin(u.timer * 1.8) * 0.4;
          animal.position.y = Math.max(GEL_SEAFLOOR_Y + 0.5, Math.min(WATER_LEVEL - 0.3, sbMid + sbBob));
        }
      } else if ((u.type === 'tadpole' || u.type === 'gelseafish') && u.homeBiome === 12) {
        var gelSwimMid = GEL_SEAFLOOR_Y + (WATER_LEVEL - GEL_SEAFLOOR_Y) * (u.type === 'tadpole' ? 0.5 : 0.45);
        var gelBob = Math.sin(u.timer * 2) * 0.35;
        animal.position.y = Math.max(GEL_SEAFLOOR_Y + 0.4, Math.min(WATER_LEVEL - 0.4, gelSwimMid + gelBob));
      } else if (u.type === 'gelstrider' && u.homeBiome === 12) {
        animal.position.y = WATER_LEVEL;
      } else if (u.type === 'leech') {
        animal.position.y = SWAMP_WATER_LEVEL + 0.08 + Math.sin(u.timer * 2) * 0.04;
      } else if (u.type === 'dragonfly' || u.type === 'bat' || u.type === 'moth' || u.type === 'parrot') {
        animal.position.y = getTerrainHeight(animal.position.x, animal.position.z) + (u.type === 'bat' ? 1.5 : u.type === 'moth' ? 1 : u.type === 'parrot' ? 1.8 : 1.2);
      } else if (u.type === 'ghost' || u.type === 'wraith' || u.type === 'phantom' || u.type === 'poltergeist') {
        animal.position.y = getTerrainHeight(animal.position.x, animal.position.z) + 0.6;
      } else if (u.type === 'wisp') {
        animal.position.y = getTerrainHeight(animal.position.x, animal.position.z) + 0.4 + Math.sin(u.timer * 2) * 0.15;
      } else if (u.type !== 'scorpion' || u.state !== 'under') {
        animal.position.y = getTerrainHeight(animal.position.x, animal.position.z);
        if (u.type === 'goat') {
          var nextY = getTerrainHeight(animal.position.x, animal.position.z);
          var steep = Math.abs(nextY - groundY) / (dt * u.speed + 0.001);
          if (steep < 3) animal.position.y = nextY;
        }
      }
      pushAnimalFromTrees(animal, ANIMAL_RADIUS);
      animal.position.x = Math.max(worldBoundsMin, Math.min(worldBoundsMax, animal.position.x));
      animal.position.z = Math.max(worldBoundsMin, Math.min(worldBoundsMax, animal.position.z));
      animal.rotation.y = Math.atan2(u.dirX, u.dirZ);
    }

    for (var r = 0; r < toRemove.length; r++) {
      animalsGroup.remove(toRemove[r]);
      var idx = animalList.indexOf(toRemove[r]);
      if (idx !== -1) animalList.splice(idx, 1);
    }
    for (var a = 0; a < toAdd.length; a++) spawnOneInBiome(toAdd[a]);
  }

  function resolveTreeCollisions(pos) {
    var px = pos.x, py = pos.y, pz = pos.z;
    for (var iter = 0; iter < 4; iter++) {
      for (var i = 0; i < trunkColliders.length; i++) {
        var t = trunkColliders[i];
        if (py < t.groundY || py > t.groundY + t.height) continue;
        var dx = px - t.x, dz = pz - t.z;
        var distXZ = Math.sqrt(dx * dx + dz * dz);
        var minDist = t.r + PLAYER_RADIUS;
        if (distXZ < minDist && distXZ > 0.0001) {
          var push = minDist - distXZ;
          px += (dx / distXZ) * push;
          pz += (dz / distXZ) * push;
        }
      }
      for (var j = 0; j < treeColliders.length; j++) {
        var s = treeColliders[j];
        var dx = px - s.x, dy = py - s.y, dz = pz - s.z;
        var distSq = dx * dx + dy * dy + dz * dz;
        var minDist = s.r + PLAYER_RADIUS;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          var dist = Math.sqrt(distSq);
          var push = minDist - dist;
          px += (dx / dist) * push;
          py += (dy / dist) * push;
          pz += (dz / dist) * push;
        }
      }
    }
    pos.set(px, py, pz);
  }

  // —— First-person / third-person controls ——
  var pitch = -0.35, yaw = 0;
  var move = { forward: 0, right: 0, up: 0 };
  var pointerLocked = false;
  var promptEl = document.getElementById('prompt');
  var flyingEnabled = true;
  var lastSpaceTime = 0;
  var DOUBLE_TAP_MS = 400;
  var thirdPerson = false;
  var THIRD_PERSON_DISTANCE = 5.5;
  var punchActive = false, punchTimer = 0, punchCooldownUntil = 0;
  var PUNCH_DURATION = 0.25;
  var PUNCH_REACH = 2.8;
  var handRestZ = -0.35;
  var handPunchZ = -0.65;
  var handZOffset = handRestZ;
  var playerPos = new THREE.Vector3();

  // —— Loadout (hotbar) and inventory ——
  var HOTBAR_SLOTS = 5;
  var MAX_INVENTORY = 24;
  var loadout = [];
  var inventory = [];
  var selectedSlot = 0;
  var inventoryOpen = false;
  for (var s = 0; s < HOTBAR_SLOTS; s++) loadout[s] = null;
  function addToInventory(id, name, count) {
    if (!id || !name || count < 1) return;
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === id) { inventory[i].count += count; updateLoadoutUI(); return; }
    }
    if (inventory.length >= MAX_INVENTORY) return;
    inventory.push({ id: id, name: name, count: count });
    updateLoadoutUI();
  }
  function removeFromInventory(index, count) {
    if (index < 0 || index >= inventory.length) return null;
    count = count || 1;
    var item = inventory[index];
    if (item.count <= count) {
      var removed = inventory.splice(index, 1)[0];
      removed.count = count;
      updateLoadoutUI();
      return removed;
    }
    item.count -= count;
    updateLoadoutUI();
    return { id: item.id, name: item.name, count: count };
  }
  function equipToSlot(invIndex, slot) {
    if (slot < 0 || slot >= HOTBAR_SLOTS || invIndex < 0 || invIndex >= inventory.length) return;
    var item = inventory[invIndex];
    var existing = loadout[slot];
    if (existing && existing.id === item.id) {
      var space = 99 - existing.count;
      var take = Math.min(space, item.count);
      if (take < 1) return;
      loadout[slot].count += take;
      removeFromInventory(invIndex, take);
    } else {
      var one = removeFromInventory(invIndex, 1);
      if (one) {
        if (existing) addToInventory(existing.id, existing.name, existing.count);
        loadout[slot] = one;
      }
    }
    updateLoadoutUI();
  }
  function updateLoadoutUI() {
    var hotbarEl = document.getElementById('hotbar');
    var invListEl = document.getElementById('inventoryList');
    var invPanelEl = document.getElementById('inventoryPanel');
    if (!hotbarEl) return;
    hotbarEl.innerHTML = '';
    for (var i = 0; i < HOTBAR_SLOTS; i++) {
      var slot = document.createElement('div');
      slot.className = 'slot' + (i === selectedSlot ? ' selected' : '');
      var ld = loadout[i];
      slot.textContent = ld ? (ld.name.substring(0, 2) + (ld.count > 1 ? '×' + ld.count : '')) : '—';
      hotbarEl.appendChild(slot);
    }
    if (invListEl && invPanelEl) {
      invListEl.innerHTML = '';
      for (var j = 0; j < inventory.length; j++) {
        var it = inventory[j];
        var div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = it.name.substring(0, 6) + (it.count > 1 ? '<span class="count">×' + it.count + '</span>' : '');
        div.dataset.index = j;
        div.onclick = function () {
          var idx = parseInt(this.dataset.index, 10);
          equipToSlot(idx, selectedSlot);
          refreshInventoryList();
        };
        invListEl.appendChild(div);
      }
    }
  }
  function refreshInventoryList() {
    var invListEl = document.getElementById('inventoryList');
    if (!invListEl) return;
    invListEl.innerHTML = '';
    for (var j = 0; j < inventory.length; j++) {
      var it = inventory[j];
      var div = document.createElement('div');
      div.className = 'inv-item';
      div.innerHTML = it.name.substring(0, 6) + (it.count > 1 ? '<span class="count">×' + it.count + '</span>' : '');
      div.dataset.index = j;
      div.onclick = (function (idx) { return function () { equipToSlot(idx, selectedSlot); refreshInventoryList(); }; })(j);
      invListEl.appendChild(div);
    }
  }
  addToInventory('stick', 'Stick', 2);
  addToInventory('stone', 'Stone', 1);
  addToInventory('apple', 'Apple', 3);
  updateLoadoutUI();

  var useMessageUntil = 0;
  function useMessage(msg) {
    var el = document.getElementById('useMessage');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    useMessageUntil = Date.now() / 1000 + 1.5;
  }

  canvas.addEventListener('click', function () {
    if (pointerLocked) return;
    canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockerror', function () {
    if (promptEl) promptEl.textContent = 'Click the game area to play (browser may block pointer lock in some cases)';
  });

  var crosshairEl = document.getElementById('crosshair');
  document.addEventListener('pointerlockchange', function () {
    pointerLocked = document.pointerLockElement === canvas;
    if (pointerLocked) playerPos.copy(camera.position);
    promptEl.style.visibility = pointerLocked ? 'hidden' : 'visible';
    if (crosshairEl) crosshairEl.style.display = pointerLocked ? 'block' : 'none';
  });
  if (crosshairEl) crosshairEl.style.display = 'none';

  document.addEventListener('keydown', function (e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': move.forward = 1; break;
      case 'KeyS': case 'ArrowDown': move.forward = -1; break;
      case 'KeyA': case 'ArrowLeft': move.right = -1; break;
      case 'KeyD': case 'ArrowRight': move.right = 1; break;
      case 'KeyQ':
        var now = Date.now();
        if (now - lastSpaceTime < DOUBLE_TAP_MS) {
          flyingEnabled = !flyingEnabled;
          move.up = 0;
          lastSpaceTime = 0;
        } else {
          lastSpaceTime = now;
          if (flyingEnabled) move.up = 1;
        }
        e.preventDefault();
        break;
      case 'Space':
        if (flyingEnabled) move.up = 1;
        e.preventDefault();
        break;
      case 'ShiftLeft': case 'ShiftRight':
        if (flyingEnabled) move.up = -1;
        e.preventDefault();
        break;
      case 'KeyB':
        var t = Date.now() / 1000;
        if (!punchActive && t >= punchCooldownUntil) {
          var equipped = loadout[selectedSlot];
          if (equipped && equipped.id === 'apple') {
            equipped.count--;
            if (equipped.count <= 0) loadout[selectedSlot] = null;
            punchCooldownUntil = t + 0.5;
            useMessage('Ate apple');
            updateLoadoutUI();
          } else {
            punchActive = true;
            punchTimer = 0;
            punchHitDone = false;
          }
        }
        e.preventDefault();
        break;
      case 'KeyJ':
        thirdPerson = !thirdPerson;
        e.preventDefault();
        break;
      case 'KeyI':
        inventoryOpen = !inventoryOpen;
        var ip = document.getElementById('inventoryPanel');
        if (ip) ip.classList.toggle('open', inventoryOpen);
        if (inventoryOpen) {
          document.exitPointerLock();
          refreshInventoryList();
        }
        e.preventDefault();
        break;
      case 'Digit1': selectedSlot = 0; updateLoadoutUI(); e.preventDefault(); break;
      case 'Digit2': selectedSlot = 1; updateLoadoutUI(); e.preventDefault(); break;
      case 'Digit3': selectedSlot = 2; updateLoadoutUI(); e.preventDefault(); break;
      case 'Digit4': selectedSlot = 3; updateLoadoutUI(); e.preventDefault(); break;
      case 'Digit5': selectedSlot = 4; updateLoadoutUI(); e.preventDefault(); break;
    }
  });

  document.addEventListener('keyup', function (e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': move.forward = 0; break;
      case 'KeyS': case 'ArrowDown': move.forward = 0; break;
      case 'KeyA': case 'ArrowLeft': move.right = 0; break;
      case 'KeyD': case 'ArrowRight': move.right = 0; break;
      case 'KeyQ': case 'Space': case 'ShiftLeft': case 'ShiftRight': move.up = 0; break;
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (!pointerLocked) return;
    yaw -= e.movementX * LOOK_SENSITIVITY;
    pitch -= e.movementY * LOOK_SENSITIVITY;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
  });

  var clock = new THREE.Clock();
  var stingOverlay = document.getElementById('stingOverlay');
  var punchHitDone = false;
  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.1);
    var now = Date.now() / 1000;
    updateAnimals(dt);

    if (punchActive) {
      punchTimer += dt;
      var phase = punchTimer / PUNCH_DURATION;
      if (phase < 0.5) {
        handZOffset = handRestZ + (handPunchZ - handRestZ) * (phase * 2);
      } else {
        handZOffset = handPunchZ + (handRestZ - handPunchZ) * ((phase - 0.5) * 2);
      }
      if (punchTimer >= 0.06 && punchTimer < 0.14 && !punchHitDone) {
        punchHitDone = true;
        var cosP = Math.cos(pitch), sinP = Math.sin(pitch);
        var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        var forward = new THREE.Vector3(-sinY * cosP, sinP, -cosY * cosP);
        var camPos = (thirdPerson ? playerPos : camera.position).clone();
        var bestAnimal = null, bestDist = PUNCH_REACH + 1;
        for (var i = 0; i < animalList.length; i++) {
          var a = animalList[i];
          if (a.userData.state === 'dead') continue;
          var toA = new THREE.Vector3(a.position.x - camPos.x, a.position.y - camPos.y, a.position.z - camPos.z);
          var dist = toA.length();
          if (dist > PUNCH_REACH) continue;
          toA.normalize();
          if (forward.dot(toA) < 0.5) continue;
          if (dist < bestDist) { bestDist = dist; bestAnimal = a; }
        }
        if (bestAnimal) {
          bestAnimal.userData.health = (bestAnimal.userData.health || 3) - 1;
          bestAnimal.userData.flashUntil = now + 0.25;
          if (!bestAnimal.userData.originalColor) bestAnimal.userData.originalColor = animalTypeColors[bestAnimal.userData.type] || 0x888888;
          if (bestAnimal.userData.health <= 0) {
            bestAnimal.userData.state = 'dead';
            bestAnimal.userData.deathTime = now;
          }
        }
      }
      if (punchTimer >= PUNCH_DURATION) {
        punchActive = false;
        punchTimer = 0;
        punchCooldownUntil = now + 0.35;
        punchHitDone = false;
        handZOffset = handRestZ;
      }
    } else {
      handZOffset = handRestZ;
    }

    handGroup.visible = !thirdPerson;
    handGroup.position.copy(thirdPerson ? playerPos : camera.position);
    handGroup.quaternion.copy(camera.quaternion);
    playerBodyGroup.visible = thirdPerson && pointerLocked;
    if (playerBodyGroup.visible) {
      playerBodyGroup.position.set(playerPos.x, playerPos.y - PLAYER_HEIGHT, playerPos.z);
      playerBodyGroup.rotation.y = yaw;
    }
    handGroup.translateX(0.15);
    handGroup.translateY(-0.15);
    handGroup.translateZ(handZOffset);

    var equipped = loadout[selectedSlot];
    var isFists = !equipped;
    // handGroup children: 0=forearm, 1=palm, 2-5=fingers, 6=thumb, 7=heldItemGroup
    if (isFists) {
      handGroup.children[0].visible = true;
      palm.visible = true;
      thumb.visible = true;
      for (var fp = 0; fp < 4; fp++) handGroup.children[2 + fp].visible = true;
      heldStick.visible = false;
      heldStone.visible = false;
      heldApple.visible = false;
    } else {
      handGroup.children[0].visible = false;
      palm.visible = false;
      thumb.visible = false;
      for (var fp2 = 0; fp2 < 4; fp2++) handGroup.children[2 + fp2].visible = false;
      heldStick.visible = equipped.id === 'stick';
      heldStone.visible = equipped.id === 'stone';
      heldApple.visible = equipped.id === 'apple';
    }

    if (stingOverlay) {
      if (scorpionStingRedUntil > now) {
        stingOverlay.style.display = 'block';
        stingOverlay.style.opacity = '0.5';
      } else {
        stingOverlay.style.display = 'none';
        stingOverlay.style.opacity = '0';
      }
    }
    var useMsgEl = document.getElementById('useMessage');
    if (useMsgEl && now > useMessageUntil) useMsgEl.style.display = 'none';
    var biomeHudEl = document.getElementById('biomeHud');
    if (biomeHudEl) {
      var hudPx = playerPos.x + half, hudPz = -playerPos.z + half;
      var currentBiome = getBiomeValue(hudPx, hudPz);
      biomeHudEl.textContent = BIOME_NAMES[currentBiome] || 'Unknown';
      biomeHudEl.classList.toggle('visible', pointerLocked);
    }
    if (pointerLocked) {
      var speed = FLY_SPEED * dt;
      var cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      var forward = new THREE.Vector3(-sinY * cosP, sinP, -cosY * cosP);
      var right = new THREE.Vector3(cosY, 0, -sinY);
      playerPos.addScaledVector(forward, move.forward * speed);
      playerPos.addScaledVector(right, move.right * speed);
      if (flyingEnabled) playerPos.y += move.up * speed;
      var floorY = getTerrainHeight(playerPos.x, playerPos.z) + PLAYER_HEIGHT;
      if (playerPos.y < floorY) playerPos.y = floorY;
      resolveTreeCollisions(playerPos);
      updateChunks(playerPos.x, playerPos.z);
      if (thirdPerson) {
        var horForward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        camera.position.copy(playerPos).addScaledVector(horForward, -THIRD_PERSON_DISTANCE).y += 1.8;
        camera.lookAt(playerPos.x, playerPos.y + 0.9, playerPos.z);
      } else {
        camera.position.copy(playerPos);
        camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      }
    } else {
      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    }
    renderer.render(scene, camera);
  }
  renderer.render(scene, camera);
  animate();

  window.addEventListener('resize', function () {
    var w = Math.max(1, window.innerWidth || 800);
    var h = Math.max(1, window.innerHeight || 600);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  }
  catch (err) {
    console.error('Game failed to load:', err);
    document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;color:#c00;">Game failed to load. Open the browser console (F12) for details.<br><br>' + err.message + '</div>';
  }
  }
  if (document.readyState === 'complete') startGame();
  else window.addEventListener('load', startGame);
})();
