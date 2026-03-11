(function () {
  'use strict';
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;color:#c00;">Three.js required.</div>';
    return;
  }

  var TILE = 2.5;
  var LANES = 5;
  var WORLD_WIDTH = LANES * TILE;
  var STRIP_DEPTH = TILE;
  var PLAYER_HALF = 0.4;
  var STRIPS_AHEAD = 25;
  var STRIPS_BEHIND = 3;
  var LANE_OFFSET = (LANES - 1) * 0.5;

  function laneToX(lane) { return (lane - LANE_OFFSET) * TILE; }
  function rowToZ(row) { return -row * STRIP_DEPTH; }

  var scene, camera, renderer, clock;
  var playerMesh, playerLane = 2, playerRow = 0;
  var playerTargetX = 0, playerTargetZ = 0;
  var moveTime = 0, moveDuration = 0.2;
  var isMoving = false;
  var playerFacingY = 0;
  var score = 0;
  var gameOver = false;
  var started = false;
  var paused = false;
  var timeWhenPaused = 0;
  var strips = [];
  var stripMeshes = [];
  var carMeshes = [];
  var logMeshes = [];
  var trainMeshes = [];
  var cars = [];
  var logs = [];
  var ambientLight, dirLight;

  var canvas = document.getElementById('canvas');
  if (!canvas) return;

  function rand(a, b) {
    if (b === undefined) return a * Math.random();
    return a + Math.random() * (b - a);
  }
  function randInt(a, b) {
    return Math.floor(rand(a, b + 1));
  }

  function phong(color, opts) {
    opts = opts || {};
    return new THREE.MeshPhongMaterial({
      color: color,
      shininess: opts.shininess !== undefined ? opts.shininess : 25,
      specular: opts.specular !== undefined ? opts.specular : 0x444444,
      flatShading: opts.flatShading || false
    });
  }

  function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 35, 95);

    var w = Math.max(1, window.innerWidth || 800);
    var h = Math.max(1, window.innerHeight || 600);
    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
    camera.position.set(0, 12, 8);
    camera.lookAt(0, 0, -15);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var hemi = new THREE.HemisphereLight(0xb5e0ff, 0x6b8e5a, 0.55);
    scene.add(hemi);
    ambientLight = new THREE.AmbientLight(0xaaccff, 0.35);
    scene.add(ambientLight);
    dirLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    dirLight.position.set(12, 28, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    dirLight.shadow.bias = -0.0002;
    scene.add(dirLight);
  }

  function createPlayer() {
    var g = new THREE.Group();
    var white = phong(0xffffff, { shininess: 40 });
    var yolk = phong(0xf4d03f, { shininess: 50, specular: 0x332200 });
    var orange = phong(0xff6b35, { shininess: 30 });
    var skin = phong(0xffdbac, { shininess: 20 });
    var red = phong(0xcc2222, { shininess: 60, specular: 0x440000 });
    var black = phong(0x1a1a1a, { shininess: 80 });

    var body = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
      yolk
    );
    body.scale.set(1, 1.15, 0.9);
    body.position.y = 0.38;
    body.castShadow = true;
    g.add(body);

    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      skin
    );
    head.position.set(0, 0.95, 0.08);
    head.castShadow = true;
    g.add(head);

    var beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.22, 8),
      phong(0xf4a460, { shininess: 50 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.98, 0.28);
    g.add(beak);

    var comb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      red
    );
    comb.position.set(0, 1.18, -0.05);
    comb.scale.set(1.2, 1, 0.6);
    g.add(comb);
    var wattle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 5),
      red
    );
    wattle.position.set(0.08, 0.88, 0.2);
    g.add(wattle);
    var wattle2 = wattle.clone();
    wattle2.position.x = -0.08;
    g.add(wattle2);

    var eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 8),
      white
    );
    eyeWhite.position.set(0.14, 1.02, 0.2);
    g.add(eyeWhite);
    var pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      black
    );
    pupil.position.set(0.155, 1.02, 0.24);
    g.add(pupil);
    var eyeWhite2 = eyeWhite.clone();
    eyeWhite2.position.x = -0.14;
    g.add(eyeWhite2);
    var pupil2 = pupil.clone();
    pupil2.position.set(-0.155, 1.02, 0.24);
    g.add(pupil2);

    var wing = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      yolk
    );
    wing.rotation.z = -Math.PI / 2;
    wing.position.set(0.35, 0.4, 0);
    wing.scale.set(0.9, 1, 1.4);
    wing.castShadow = true;
    g.add(wing);
    var wing2 = wing.clone();
    wing2.position.x = -0.35;
    wing2.rotation.z = Math.PI / 2;
    g.add(wing2);

    var leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.2, 8),
      phong(0xf4a460, { shininess: 40 })
    );
    leg.position.set(0.15, 0.1, 0.08);
    leg.rotation.x = Math.PI / 2;
    g.add(leg);
    var foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.06),
      phong(0xf4a460)
    );
    foot.position.set(0.15, 0.08, 0.2);
    g.add(foot);
    var leg2 = leg.clone();
    leg2.position.set(-0.15, 0.1, 0.08);
    g.add(leg2);
    var foot2 = foot.clone();
    foot2.position.set(-0.15, 0.08, 0.2);
    g.add(foot2);

    g.rotation.y = Math.PI;
    scene.add(g);
    playerMesh = g;
    playerTargetX = laneToX(playerLane);
    playerTargetZ = rowToZ(playerRow);
    playerMesh.position.set(playerTargetX, 0, playerTargetZ);
  }

  function stripTypeAtRow(r) {
    var seed = (r * 7 + 11) % 100;
    if (seed < 38) return 'grass';
    if (seed < 62) return 'road';
    if (seed < 82) return 'water';
    return 'train';
  }

  function ensureStripsUpTo(endRow) {
    var start = strips.length ? strips[strips.length - 1].row + 1 : 0;
    for (var r = start; r <= endRow; r++) {
      var type = stripTypeAtRow(r);
      var strip = { row: r, type: type, cars: [], logs: [], trains: [] };
      if (type === 'road') {
        var numCars = randInt(0, 1);
        var used = {};
        for (var c = 0; c < numCars; c++) {
          var lane = randInt(0, LANES - 1);
          if (used[lane]) continue;
          used[lane] = true;
          strip.cars.push({
            lane: lane,
            length: rand() < 0.6 ? 1 : 2,
            speed: rand(3, 8) * (rand() < 0.5 ? 1 : -1),
            phase: rand(0, WORLD_WIDTH)
          });
        }
      }
      if (type === 'water') {
        for (var lane = 0; lane < LANES; lane++) {
          strip.logs.push({
            lane: lane,
            length: 1,
            speed: rand(2, 5) * (rand() < 0.5 ? 1 : -1),
            phase: rand(0, Math.PI * 2)
          });
        }
      }
      if (type === 'train') {
        strip.trains.push({
          length: randInt(3, 4),
          speed: rand(2.5, 5) * (rand() < 0.5 ? 1 : -1),
          phase: rand(0, Math.PI * 2)
        });
      }
      strips.push(strip);
      addMeshesForStrip(strip);
    }
  }

  function addMeshesForStrip(strip) {
    var c, L, t;
    for (c = 0; c < strip.cars.length; c++) {
      var cm = buildCarMesh(strip.cars[c], strip.row);
      scene.add(cm);
      carMeshes.push(cm);
    }
    for (L = 0; L < strip.logs.length; L++) {
      var lm = buildLogMesh(strip.logs[L]);
      scene.add(lm);
      logMeshes.push(lm);
    }
    for (t = 0; t < strip.trains.length; t++) {
      var tm = buildTrainMesh(strip.trains[t]);
      scene.add(tm);
      trainMeshes.push(tm);
    }
  }

  function buildStripMesh(strip) {
    var type = strip.type;
    var z = rowToZ(strip.row);
    var floor, mat, stripe;
    if (type === 'grass') {
      mat = phong(0x3d7c47, { shininess: 8, specular: 0x1a301a });
      floor = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD_WIDTH + 0.2, 0.25, STRIP_DEPTH + 0.2),
        mat
      );
    } else if (type === 'road') {
      mat = phong(0x2a2a2a, { shininess: 5, specular: 0x111111 });
      floor = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD_WIDTH + 0.2, 0.22, STRIP_DEPTH + 0.2),
        mat
      );
      var lineMat = phong(0xf1c40f, { shininess: 80, specular: 0x332200 });
      stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.24, STRIP_DEPTH + 0.3),
        lineMat
      );
      stripe.position.set(-WORLD_WIDTH * 0.5 - 0.05, 0.01, 0);
      floor.add(stripe);
      stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.24, STRIP_DEPTH + 0.3),
        lineMat
      );
      stripe.position.set(WORLD_WIDTH * 0.5 + 0.05, 0.01, 0);
      floor.add(stripe);
    } else if (type === 'train') {
      mat = phong(0x3d352a, { shininess: 5, specular: 0x111111 });
      floor = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD_WIDTH + 0.2, 0.22, STRIP_DEPTH + 0.2),
        mat
      );
      var railMat = phong(0x2a2a2a, { shininess: 30, specular: 0x444444 });
      var rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, STRIP_DEPTH + 0.4),
        railMat
      );
      rail.position.set(-0.4, 0.06, 0);
      floor.add(rail);
      rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, STRIP_DEPTH + 0.4),
        railMat
      );
      rail.position.set(0.4, 0.06, 0);
      floor.add(rail);
    } else {
      mat = new THREE.MeshPhongMaterial({
        color: 0x2567a8,
        shininess: 90,
        specular: 0x4488cc,
        transparent: true,
        opacity: 0.85
      });
      floor = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD_WIDTH + 0.2, 0.18, STRIP_DEPTH + 0.2),
        mat
      );
    }
    floor.position.set(0, -0.1, z - STRIP_DEPTH * 0.5);
    floor.receiveShadow = true;
    return floor;
  }

  function buildCarMesh(car, stripRow) {
    var group = new THREE.Group();
    var len = car.length * TILE * 0.9;
    var colors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c];
    var bodyColor = colors[Math.floor(Math.random() * colors.length)];
    var bodyMat = phong(bodyColor, { shininess: 60, specular: 0x333333 });
    var darkMat = phong(0x1a1a1a, { shininess: 10 });
    var windowMat = new THREE.MeshPhongMaterial({
      color: 0x223344,
      shininess: 120,
      specular: 0x6688aa,
      transparent: true,
      opacity: 0.7
    });
    var wheelMat = phong(0x222222, { shininess: 20 });
    var wheelR = 0.22;
    var wheelW = 0.12;
    var wheelGeom = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 12);
    var wheelPos = len * 0.35;
    var wheelZ = STRIP_DEPTH * 0.42;
    [1, -1].forEach(function (side) {
      var w1 = new THREE.Mesh(wheelGeom, wheelMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.set(wheelPos, wheelR + 0.02, side * wheelZ);
      w1.castShadow = true;
      group.add(w1);
      var w2 = new THREE.Mesh(wheelGeom, wheelMat);
      w2.rotation.z = Math.PI / 2;
      w2.position.set(-wheelPos, wheelR + 0.02, side * wheelZ);
      w2.castShadow = true;
      group.add(w2);
    });
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(len * 0.92, 0.38, STRIP_DEPTH * 0.72),
      bodyMat
    );
    body.position.y = 0.28;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    var cabin = new THREE.Mesh(
      new THREE.BoxGeometry(len * 0.5, 0.32, STRIP_DEPTH * 0.68),
      bodyMat
    );
    cabin.position.set(0, 0.48, 0);
    cabin.castShadow = true;
    group.add(cabin);
    var windshield = new THREE.Mesh(
      new THREE.BoxGeometry(len * 0.42, 0.2, STRIP_DEPTH * 0.6),
      windowMat
    );
    windshield.position.set(0, 0.62, 0);
    group.add(windshield);
    var headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      phong(0xffeedd, { shininess: 100, specular: 0xffffff })
    );
    headlight.position.set(len * 0.48, 0.26, STRIP_DEPTH * 0.38);
    group.add(headlight);
    headlight = headlight.clone();
    headlight.position.z = -STRIP_DEPTH * 0.38;
    group.add(headlight);
    group.castShadow = true;
    group.receiveShadow = true;
    return group;
  }

  function buildLogMesh(log) {
    var len = log.length * TILE;
    var group = new THREE.Group();
    var radius = 0.42;
    var barkMat = phong(0x4e342e, { shininess: 15, specular: 0x1a1510 });
    var darkBark = phong(0x3d2817, { shininess: 10 });
    var cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.08, len, 14),
      barkMat
    );
    cyl.rotation.z = Math.PI / 2;
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    group.add(cyl);
    var end = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 12),
      darkBark
    );
    end.rotation.y = Math.PI / 2;
    end.position.set(len * 0.5, 0, 0);
    group.add(end);
    end = end.clone();
    end.position.x = -len * 0.5;
    end.rotation.y = -Math.PI / 2;
    group.add(end);
    return group;
  }

  function buildTrainMesh(train) {
    var totalLen = train.length * TILE;
    var group = new THREE.Group();
    var darkMat = phong(0x1a1a1a, { shininess: 15 });
    var bodyMat = phong(0x333333, { shininess: 25, specular: 0x222222 });
    var redMat = phong(0x8b0000, { shininess: 40 });
    var cabW = TILE * 0.85;
    var cabH = 0.55;
    var cabD = STRIP_DEPTH * 0.75;
    var engine = new THREE.Mesh(
      new THREE.BoxGeometry(cabW, cabH, cabD),
      bodyMat
    );
    engine.position.set(-totalLen * 0.5 + cabW * 0.5, cabH * 0.5 + 0.15, 0);
    engine.castShadow = true;
    group.add(engine);
    var chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.35, 10),
      darkMat
    );
    chimney.position.set(-totalLen * 0.5 + cabW * 0.3, cabH + 0.35, 0);
    chimney.castShadow = true;
    group.add(chimney);
    var cab = new THREE.Mesh(
      new THREE.BoxGeometry(cabW * 0.6, cabH * 0.7, cabD * 0.9),
      redMat
    );
    cab.position.set(-totalLen * 0.5 + cabW * 0.85, cabH * 0.5 + 0.2, 0);
    cab.castShadow = true;
    group.add(cab);
    var carriageLen = TILE * 0.9;
    var numCars = train.length - 1;
    for (var i = 0; i < numCars; i++) {
      var car = new THREE.Mesh(
        new THREE.BoxGeometry(carriageLen, cabH * 0.9, cabD * 0.95),
        bodyMat
      );
      car.position.set(-totalLen * 0.5 + cabW + carriageLen * 0.5 + i * carriageLen, cabH * 0.45 + 0.15, 0);
      car.castShadow = true;
      group.add(car);
    }
    group.castShadow = true;
    group.receiveShadow = true;
    return group;
  }

  function rebuildWorld() {
    while (stripMeshes.length) {
      scene.remove(stripMeshes.pop());
    }
    while (carMeshes.length) {
      scene.remove(carMeshes.pop());
    }
    while (logMeshes.length) {
      scene.remove(logMeshes.pop());
    }
    while (trainMeshes.length) {
      scene.remove(trainMeshes.pop());
    }
    strips = [];
    var endRow = playerRow + STRIPS_AHEAD;
    ensureStripsUpTo(endRow);
    for (var i = 0; i < strips.length; i++) {
      var s = strips[i];
      if (s.row < playerRow - STRIPS_BEHIND) continue;
      var floor = buildStripMesh(s);
      scene.add(floor);
      stripMeshes.push(floor);
    }
  }

  function updateCarsAndLogs(time) {
    var i, car, log, strip, z, x, meshIdx;
    meshIdx = 0;
    for (i = 0; i < strips.length; i++) {
      strip = strips[i];
      if (strip.row < playerRow - STRIPS_BEHIND) continue;
      z = rowToZ(strip.row) - STRIP_DEPTH * 0.5;
      for (var c = 0; c < strip.cars.length; c++) {
        car = strip.cars[c];
        x = laneToX(car.lane) + TILE * Math.sin(time * car.speed * 0.5 + car.phase);
        if (carMeshes[meshIdx]) {
          carMeshes[meshIdx].position.set(x, 0.12, z);
          carMeshes[meshIdx].visible = true;
        }
        meshIdx++;
      }
    }
    while (meshIdx < carMeshes.length) {
      carMeshes[meshIdx].visible = false;
      meshIdx++;
    }

    meshIdx = 0;
    for (i = 0; i < strips.length; i++) {
      strip = strips[i];
      if (strip.row < playerRow - STRIPS_BEHIND) continue;
      z = rowToZ(strip.row) - STRIP_DEPTH * 0.5;
      for (var L = 0; L < strip.logs.length; L++) {
        log = strip.logs[L];
        x = laneToX(log.lane) + TILE * 0.4 * Math.sin(time * log.speed + log.phase);
        if (logMeshes[meshIdx]) {
          logMeshes[meshIdx].position.set(x, 0.5, z);
          logMeshes[meshIdx].visible = true;
        }
        meshIdx++;
      }
    }
    while (meshIdx < logMeshes.length) {
      logMeshes[meshIdx].visible = false;
      meshIdx++;
    }

    meshIdx = 0;
    for (i = 0; i < strips.length; i++) {
      strip = strips[i];
      if (strip.row < playerRow - STRIPS_BEHIND) continue;
      z = rowToZ(strip.row) - STRIP_DEPTH * 0.5;
      for (var t = 0; t < strip.trains.length; t++) {
        var train = strip.trains[t];
        x = WORLD_WIDTH * 0.45 * Math.sin(time * train.speed * 0.35 + train.phase);
        if (trainMeshes[meshIdx]) {
          trainMeshes[meshIdx].position.set(x, 0.12, z);
          trainMeshes[meshIdx].visible = true;
        }
        meshIdx++;
      }
    }
    while (meshIdx < trainMeshes.length) {
      trainMeshes[meshIdx].visible = false;
      meshIdx++;
    }
  }

  function createCarAndLogMeshes() {
    var i, strip, c, L;
    for (i = 0; i < strips.length; i++) {
      strip = strips[i];
      for (c = 0; c < strip.cars.length; c++) {
        var cm = buildCarMesh(strip.cars[c], strip.row);
        scene.add(cm);
        carMeshes.push(cm);
      }
      for (L = 0; L < strip.logs.length; L++) {
        var lm = buildLogMesh(strip.logs[L]);
        scene.add(lm);
        logMeshes.push(lm);
      }
    }
  }

  function getCurrentStrip() {
    var row = Math.round(-playerMesh.position.z / STRIP_DEPTH);
    for (var i = 0; i < strips.length; i++) {
      if (strips[i].row === row) return strips[i];
    }
    return null;
  }

  function checkCollision(time) {
    var px = playerMesh.position.x;
    var pz = playerMesh.position.z;
    var strip = getCurrentStrip();
    if (!strip) return false;

    if (strip.type === 'road') {
      for (var c = 0; c < strip.cars.length; c++) {
        var car = strip.cars[c];
        var cx = laneToX(car.lane) + TILE * Math.sin(time * car.speed * 0.5 + car.phase);
        var halfLen = (car.length * TILE * 0.9) * 0.5;
        if (Math.abs(px - cx) < halfLen + PLAYER_HALF) return true;
      }
    }

    if (strip.type === 'train') {
      for (var t = 0; t < strip.trains.length; t++) {
        var train = strip.trains[t];
        var tx = WORLD_WIDTH * 0.45 * Math.sin(time * train.speed * 0.35 + train.phase);
        var halfLen = (train.length * TILE) * 0.5;
        if (Math.abs(px - tx) < halfLen + PLAYER_HALF) return true;
      }
    }

    if (strip.type === 'water') {
      var onLog = false;
      for (var L = 0; L < strip.logs.length; L++) {
        var log = strip.logs[L];
        var lx = laneToX(log.lane) + TILE * 0.4 * Math.sin(time * log.speed + log.phase);
        var halfLog = (log.length * TILE) * 0.5;
        if (Math.abs(px - lx) < halfLog + PLAYER_HALF) {
          onLog = true;
          break;
        }
      }
      if (!onLog) return true;
    }
    return false;
  }

  function tryMove(dlane, drow) {
    if (gameOver || isMoving || !started) return;
    var newLane = playerLane + dlane;
    var newRow = playerRow + drow;
    if (newRow < 0) return;
    if (newLane < 0 || newLane >= LANES) return;
    playerLane = newLane;
    playerRow = newRow;
    if (drow > 0) score++;
    playerTargetX = laneToX(playerLane);
    playerTargetZ = rowToZ(playerRow);
    if (drow > 0) playerFacingY = Math.PI;
    else if (drow < 0) playerFacingY = 0;
    else if (dlane > 0) playerFacingY = Math.PI / 2;
    else if (dlane < 0) playerFacingY = -Math.PI / 2;
    isMoving = true;
    moveTime = 0;
    ensureStripsUpTo(playerRow + STRIPS_AHEAD);
  }

  function updateScoreUI() {
    var el = document.getElementById('scoreValue');
    var panel = document.getElementById('scorePanel');
    if (el) el.textContent = score;
    if (panel) panel.classList.add('visible');
  }

  function showGameOver() {
    gameOver = true;
    var go = document.getElementById('gameOver');
    var fs = document.getElementById('finalScore');
    if (fs) fs.textContent = score;
    if (go) go.classList.add('visible');
  }

  function hideUI() {
    var ui = document.getElementById('ui');
    if (ui) ui.style.display = 'none';
    updateScoreUI();
  }

  function resetGame() {
    gameOver = false;
    started = true;
    score = 0;
    playerLane = 2;
    playerRow = 0;
    strips = [];
    playerTargetX = laneToX(playerLane);
    playerTargetZ = rowToZ(playerRow);
    playerMesh.position.set(playerTargetX, 0, playerTargetZ);
    playerMesh.rotation.y = playerFacingY = Math.PI;
    playerMesh.scale.set(1, 1, 1);
    isMoving = false;
    paused = false;
    var po = document.getElementById('pausedOverlay');
    if (po) po.classList.remove('visible');
    rebuildWorld();
    var go = document.getElementById('gameOver');
    if (go) go.classList.remove('visible');
    updateScoreUI();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    var dt = clock.getDelta();
    var time = clock.getElapsedTime();

    var gameTime = paused ? timeWhenPaused : time;
    if (started && !gameOver && !paused) {
      if (isMoving) {
        moveTime += dt;
        var t = moveTime / moveDuration;
        playerMesh.position.x = playerMesh.position.x + (playerTargetX - playerMesh.position.x) * Math.min(1, dt / moveDuration * 5);
        playerMesh.position.z = playerMesh.position.z + (playerTargetZ - playerMesh.position.z) * Math.min(1, dt / moveDuration * 5);
        playerMesh.rotation.y += (playerFacingY - playerMesh.rotation.y) * Math.min(1, dt * 12);
        var hopScale = Math.sin(t * Math.PI);
        playerMesh.scale.set(1 - hopScale * 0.12, 1 + hopScale * 0.28, 1 - hopScale * 0.12);
        if (moveTime >= moveDuration) {
          playerMesh.position.x = playerTargetX;
          playerMesh.position.z = playerTargetZ;
          playerMesh.rotation.y = playerFacingY;
          playerMesh.scale.set(1, 1, 1);
          isMoving = false;
        }
      } else {
        playerMesh.scale.set(1, 1, 1);
      }
      updateCarsAndLogs(gameTime);
      if (checkCollision(gameTime)) showGameOver();
    } else if (started && !gameOver && paused) {
      updateCarsAndLogs(gameTime);
    }

    if (started && playerMesh) {
      var camZ = playerMesh.position.z + 10;
      var camX = playerMesh.position.x * 0.3;
      camera.position.lerp(new THREE.Vector3(camX, 10, camZ), 0.08);
      camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z - 5);
    }

    renderer.render(scene, camera);
  }

  function init() {
    createScene();
    createPlayer();
    ensureStripsUpTo(STRIPS_AHEAD);
    rebuildWorld();
    clock = new THREE.Clock();

    document.getElementById('startBtn').addEventListener('click', function () {
      hideUI();
      started = true;
      resetGame();
    });
    document.getElementById('restartBtn').addEventListener('click', resetGame);

    var keydown = {};
    document.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'p') {
        if (started && !gameOver) {
          paused = !paused;
          if (paused) timeWhenPaused = clock.getElapsedTime();
          var el = document.getElementById('pausedOverlay');
          if (el) el.classList.toggle('visible', paused);
        }
        e.preventDefault();
        return;
      }
      if (gameOver || paused) return;
      if (keydown[k]) return;
      keydown[k] = true;
      if (k === 'arrowup' || k === 'w') { tryMove(0, 1); e.preventDefault(); }
      if (k === 'arrowdown' || k === 's') { tryMove(0, -1); e.preventDefault(); }
      if (k === 'arrowleft' || k === 'a') { tryMove(-1, 0); e.preventDefault(); }
      if (k === 'arrowright' || k === 'd') { tryMove(1, 0); e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) {
      keydown[e.key.toLowerCase()] = false;
    });

    window.addEventListener('resize', function () {
      var w = Math.max(1, window.innerWidth || 800);
      var h = Math.max(1, window.innerHeight || 600);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    animate();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
