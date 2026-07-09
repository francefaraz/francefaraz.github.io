/* ============================================================
   MUNEER.CORE v3 — hero: Core Abstraction Layer as a living
   3D routing scene. Brass core, orbiting bank-core nodes,
   cyan transaction packets travelling curved routes.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------------- Boot screen ---------------- */
  var boot = document.getElementById("boot");
  var bootFill = document.getElementById("boot-fill");
  var bootStatus = document.getElementById("boot-status");
  var bootMsgs = ["routing request…", "mapping fields…", "handshaking cores…", "session established ✓"];

  function finishBoot() {
    if (boot) boot.classList.add("done");
  }

  if (prefersReduced || !bootFill) {
    finishBoot();
  } else {
    var step = 0;
    var bootTimer = setInterval(function () {
      step++;
      bootFill.style.width = Math.min(step * 25, 100) + "%";
      bootStatus.textContent = bootMsgs[Math.min(step - 1, bootMsgs.length - 1)];
      if (step >= 4) {
        clearInterval(bootTimer);
        setTimeout(finishBoot, 350);
      }
    }, 260);
    /* Safety: never trap the visitor on the loader */
    setTimeout(finishBoot, 2600);
  }

  /* ---------------- Nav ---------------- */
  var nav = document.getElementById("nav");
  var navLinks = document.getElementById("nav-links");
  var navToggle = document.getElementById("nav-toggle");

  window.addEventListener("scroll", function () {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------------- Reveals + counters ---------------- */
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  if (hasGsap && !prefersReduced) {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll(".reveal").forEach(function (el) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
        onComplete: function () { el.classList.add("shown"); }
      });
    });

    /* Hero title lines slide up on load */
    gsap.from(".hero-title .line", {
      yPercent: 110,
      duration: 1.1,
      stagger: 0.12,
      ease: "power4.out",
      delay: prefersReduced ? 0 : 1.2
    });

    /* Stat counters */
    document.querySelectorAll(".stat-num").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
        onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; },
        onComplete: function () { el.textContent = target + suffix; }
      });
    });
  } else {
    /* Fallback: show everything */
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("shown"); });
    document.querySelectorAll(".stat-num").forEach(function (el) {
      el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------------- Three.js core-routing scene ---------------- */
  var canvas = document.getElementById("core-canvas");
  if (typeof THREE === "undefined" || !canvas || prefersReduced) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; /* no WebGL — page works fine without it */
  }

  var BRASS = 0xe8b34b;
  var CYAN = 0x5fd4e8;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05080f, 0.035);

  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 13);

  var root = new THREE.Group();
  /* Push the scene right on desktop so hero copy owns the left */
  root.position.x = window.innerWidth > 880 ? 4.2 : 0;
  scene.add(root);

  /* --- Central core: nested wireframe icosahedra --- */
  var coreOuter = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.1, 1),
    new THREE.MeshBasicMaterial({ color: BRASS, wireframe: true, transparent: true, opacity: 0.55 })
  );
  var coreInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 0),
    new THREE.MeshBasicMaterial({ color: BRASS, wireframe: true, transparent: true, opacity: 0.9 })
  );
  var coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf7d98a, transparent: true, opacity: 0.95 })
  );
  root.add(coreOuter, coreInner, coreGlow);

  /* --- Orbit ring --- */
  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.6, 0.012, 8, 120),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = Math.PI / 2.3;
  root.add(ring);

  /* --- Bank-core nodes on the ring + routes to center --- */
  var NODE_COUNT = 6; /* Fiserv, Symitar, Finxact, Corelation, FIS IBS, Q2 */
  var nodes = [];
  var routes = [];

  for (var i = 0; i < NODE_COUNT; i++) {
    var angle = (i / NODE_COUNT) * Math.PI * 2;
    var pos = new THREE.Vector3(Math.cos(angle) * 4.6, 0, Math.sin(angle) * 4.6);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2.3 - Math.PI / 2);

    var node = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.9 })
    );
    node.position.copy(pos);
    root.add(node);
    nodes.push(node);

    /* Curved route from node to core */
    var mid = pos.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 1.6 * (i % 2 ? 1 : -1), 0));
    var curve = new THREE.QuadraticBezierCurve3(pos.clone(), mid, new THREE.Vector3(0, 0, 0));
    var lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    var line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18 })
    );
    root.add(line);
    routes.push(curve);
  }

  /* --- Transaction packets travelling the routes --- */
  var PACKETS = 14;
  var packets = [];
  var packetGeo = new THREE.SphereGeometry(0.07, 8, 8);
  for (var p = 0; p < PACKETS; p++) {
    var mat = new THREE.MeshBasicMaterial({
      color: p % 3 === 0 ? BRASS : CYAN,
      transparent: true,
      opacity: 0.9
    });
    var mesh = new THREE.Mesh(packetGeo, mat);
    var route = routes[p % routes.length];
    packets.push({
      mesh: mesh,
      curve: route,
      t: Math.random(),
      speed: 0.0025 + Math.random() * 0.0045,
      dir: p % 2 === 0 ? 1 : -1
    });
    root.add(mesh);
  }

  /* --- Ambient dust field --- */
  var DUST = 320;
  var dustGeo = new THREE.BufferGeometry();
  var dustPos = new Float32Array(DUST * 3);
  for (var d = 0; d < DUST; d++) {
    dustPos[d * 3] = (Math.random() - 0.5) * 34;
    dustPos[d * 3 + 1] = (Math.random() - 0.5) * 20;
    dustPos[d * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0x7a8699, size: 0.035, transparent: true, opacity: 0.55 })
  );
  scene.add(dust);

  /* --- Interaction state --- */
  var mouseX = 0, mouseY = 0, scrollN = 0;

  document.addEventListener("mousemove", function (e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener("scroll", function () {
    var max = document.body.scrollHeight - window.innerHeight;
    scrollN = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    root.position.x = window.innerWidth > 880 ? 4.2 : 0;
  });

  /* --- Render loop (paused when tab hidden) --- */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;

    var t = clock.getElapsedTime();

    coreOuter.rotation.y = t * 0.18;
    coreOuter.rotation.x = t * 0.07;
    coreInner.rotation.y = -t * 0.32;
    coreInner.rotation.z = t * 0.12;
    coreGlow.scale.setScalar(1 + Math.sin(t * 2.2) * 0.12);
    ring.rotation.z = t * 0.05;

    nodes.forEach(function (n, idx) {
      n.rotation.y = t * 0.8 + idx;
      n.position.y += Math.sin(t * 1.4 + idx * 1.1) * 0.0015;
    });

    packets.forEach(function (pk) {
      pk.t += pk.speed * pk.dir;
      if (pk.t > 1) pk.t = 0;
      if (pk.t < 0) pk.t = 1;
      var point = pk.curve.getPoint(pk.t);
      pk.mesh.position.copy(point);
      pk.mesh.material.opacity = 0.35 + Math.sin(pk.t * Math.PI) * 0.6;
    });

    dust.rotation.y = t * 0.012;

    /* Mouse parallax + scroll drift */
    root.rotation.y += (mouseX * 0.22 - root.rotation.y) * 0.04;
    root.rotation.x += (mouseY * 0.14 - root.rotation.x) * 0.04;
    camera.position.y = 0.6 - scrollN * 2.2;
    camera.position.z = 13 + scrollN * 3.5;

    /* Fade the scene as content takes over */
    canvas.style.opacity = String(Math.max(0.16, 1 - scrollN * 1.7));

    renderer.render(scene, camera);
  }

  animate();
})();
