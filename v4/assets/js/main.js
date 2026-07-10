/* ============================================================
   MUNEER.BUILD v4 — hero scene: a builder's galaxy.
   A spiral of particles (ideas) with floating wireframe
   artifacts (the things built from them), drifting in orbit.
   Graceful fallbacks: no WebGL, no CDN, reduced motion.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------------- Boot screen ---------------- */
  var boot = document.getElementById("boot");
  var bootFill = document.getElementById("boot-fill");
  var bootStatus = document.getElementById("boot-status");
  var bootMsgs = ["collecting ideas…", "compiling universe…", "rendering orbits…", "deployed ✓"];

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
        setTimeout(finishBoot, 320);
      }
    }, 240);
    /* Safety net: never trap the visitor on the loader */
    setTimeout(finishBoot, 2400);
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

  function showEverything() {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("shown"); });
    document.querySelectorAll(".orbit-num[data-count]").forEach(function (el) {
      el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
    });
  }

  if (hasGsap && !prefersReduced) {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll(".reveal").forEach(function (el) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
        onComplete: function () { el.classList.add("shown"); }
      });
    });

    gsap.from(".hero-title .line", {
      yPercent: 115,
      duration: 1.05,
      stagger: 0.12,
      ease: "power4.out",
      delay: 1.15
    });

    document.querySelectorAll(".orbit-num[data-count]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.5,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 92%" },
        onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; },
        onComplete: function () { el.textContent = target + suffix; }
      });
    });
  } else {
    showEverything();
  }

  /* ---------------- Three.js galaxy ---------------- */
  var canvas = document.getElementById("space-canvas");
  if (typeof THREE === "undefined" || !canvas || prefersReduced) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; /* no WebGL — the page is fully usable without it */
  }

  var MINT = 0x4ae8b5;
  var MAGENTA = 0xe36bd6;
  var ICE = 0xeaf2f5;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060b14, 0.028);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 1.2, 14);

  var universe = new THREE.Group();
  scene.add(universe);

  /* --- Galaxy spiral: three particle arms in mint / magenta / ice --- */
  function makeArm(count, color, size, twist) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = 2 + Math.pow(Math.random(), 0.7) * 16;
      var angle = r * 0.42 + twist + (Math.random() - 0.5) * 0.7;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * (0.5 + r * 0.16);
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      color: color, size: size, transparent: true, opacity: 0.62,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
  }

  var armA = makeArm(900, MINT, 0.05, 0);
  var armB = makeArm(900, MAGENTA, 0.05, Math.PI * 0.66);
  var armC = makeArm(700, ICE, 0.035, Math.PI * 1.33);
  universe.add(armA, armB, armC);

  /* --- Galactic core glow --- */
  var core = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xbdf5e2, transparent: true, opacity: 0.9 })
  );
  universe.add(core);

  /* --- Floating artifacts: the things a builder ships --- */
  var artifactSpecs = [
    { geo: new THREE.TorusKnotGeometry(0.9, 0.24, 72, 10), color: MINT,    pos: [-6.5,  2.4, -2], speed: 0.28 }, /* platforms */
    { geo: new THREE.IcosahedronGeometry(1.0, 0),          color: MAGENTA, pos: [ 6.8,  1.6, -3], speed: 0.36 }, /* apps */
    { geo: new THREE.OctahedronGeometry(0.8, 0),           color: ICE,     pos: [ 4.6, -2.6,  1], speed: 0.44 }, /* AI */
    { geo: new THREE.BoxGeometry(1.1, 1.1, 1.1),           color: MINT,    pos: [-4.8, -2.2,  2], speed: 0.32 }, /* games */
    { geo: new THREE.TetrahedronGeometry(0.7, 0),          color: MAGENTA, pos: [ 0.4,  3.6, -5], speed: 0.5  }  /* experiments */
  ];
  var artifacts = artifactSpecs.map(function (s) {
    var m = new THREE.Mesh(
      s.geo,
      new THREE.MeshBasicMaterial({ color: s.color, wireframe: true, transparent: true, opacity: 0.5 })
    );
    m.position.set(s.pos[0], s.pos[1], s.pos[2]);
    m.userData.speed = s.speed;
    m.userData.baseY = s.pos[1];
    universe.add(m);
    return m;
  });

  /* --- Shooting stars --- */
  var STARS = 5;
  var shooters = [];
  var shooterGeo = new THREE.SphereGeometry(0.05, 6, 6);
  for (var sIdx = 0; sIdx < STARS; sIdx++) {
    var sm = new THREE.Mesh(shooterGeo, new THREE.MeshBasicMaterial({
      color: ICE, transparent: true, opacity: 0
    }));
    shooters.push({ mesh: sm, t: Math.random() * 8, dir: new THREE.Vector3(), from: new THREE.Vector3() });
    scene.add(sm);
  }
  function resetShooter(sh) {
    sh.from.set((Math.random() - 0.5) * 26, 6 + Math.random() * 4, -6 + Math.random() * 4);
    sh.dir.set((Math.random() - 0.5) * 2, -1, 0).normalize();
    sh.t = -Math.random() * 9; /* wait before launching */
  }
  shooters.forEach(resetShooter);

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
  });

  /* --- Render loop (idle when tab hidden) --- */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;

    var t = clock.getElapsedTime();
    var dt = clock.getDelta ? 0.016 : 0.016;

    universe.rotation.y = t * 0.03;
    core.scale.setScalar(1 + Math.sin(t * 1.8) * 0.15);

    artifacts.forEach(function (a, i) {
      a.rotation.x = t * a.userData.speed;
      a.rotation.y = t * a.userData.speed * 0.7;
      a.position.y = a.userData.baseY + Math.sin(t * 0.7 + i * 1.4) * 0.35;
    });

    shooters.forEach(function (sh) {
      sh.t += 0.016;
      if (sh.t < 0) { sh.mesh.material.opacity = 0; return; }
      var d = sh.t * 9;
      if (d > 26) { resetShooter(sh); return; }
      sh.mesh.position.copy(sh.from).addScaledVector(sh.dir, d);
      sh.mesh.material.opacity = Math.max(0, 0.9 - d / 26);
    });

    /* Mouse parallax + scroll dolly */
    universe.rotation.x += (mouseY * 0.1 - universe.rotation.x) * 0.04;
    universe.rotation.z += (mouseX * 0.05 - universe.rotation.z) * 0.04;
    camera.position.z = 14 - scrollN * 5;
    camera.position.y = 1.2 + scrollN * 2.4;
    camera.lookAt(0, 0, 0);

    /* Hand the stage to the content as the visitor reads */
    canvas.style.opacity = String(Math.max(0.12, 0.82 - scrollN * 1.4));

    renderer.render(scene, camera);
  }

  animate();
})();
