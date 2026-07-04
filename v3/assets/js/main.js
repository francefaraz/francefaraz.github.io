/* ============================================================
   Muneer v3 — particle morph engine
   One Three.js point cloud, fixed behind the page, morphs
   between shapes as each section scrolls into view:
   sphere → helix → torus knot → converging grid.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.body.classList.add("no-motion");

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- loader ---------------- */
  var loader = document.getElementById("loader");
  var loaderFill = document.querySelector(".loader-fill");
  var fakeProgress = 0;
  var loaderTimer = setInterval(function () {
    fakeProgress = Math.min(fakeProgress + Math.random() * 22, 92);
    loaderFill.style.width = fakeProgress + "%";
  }, 120);

  window.addEventListener("load", function () {
    clearInterval(loaderTimer);
    loaderFill.style.width = "100%";
    setTimeout(function () { loader.classList.add("done"); }, 350);
  });
  // Safety: never trap the user behind the loader.
  setTimeout(function () { loader.classList.add("done"); }, 5000);

  /* ---------------- three.js stage ---------------- */
  var canvas = document.getElementById("stage");
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e0b16, 0.055);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 11);

  var isMobile = window.innerWidth < 640;
  var COUNT = isMobile ? 3500 : 7000;

  /* ------- shape generators (each returns COUNT*3 floats) ------- */
  function makeSphere() {
    var arr = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      // Fibonacci sphere for even coverage
      var t = i / COUNT;
      var phi = Math.acos(1 - 2 * t);
      var theta = Math.PI * (1 + Math.sqrt(5)) * i;
      var r = 4.2 + (Math.random() - 0.5) * 0.35;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }

  function makeHelix() {
    var arr = new Float32Array(COUNT * 3);
    var strands = 2;
    for (var i = 0; i < COUNT; i++) {
      var strand = i % strands;
      var t = (i / COUNT) * Math.PI * 6; // 3 full twists
      var y = (i / COUNT) * 11 - 5.5;
      var phase = strand * Math.PI;
      var r = 2.6;
      arr[i * 3] = r * Math.cos(t + phase) + (Math.random() - 0.5) * 0.25;
      arr[i * 3 + 1] = y + (Math.random() - 0.5) * 0.25;
      arr[i * 3 + 2] = r * Math.sin(t + phase) + (Math.random() - 0.5) * 0.25;
    }
    return arr;
  }

  function makeKnot() {
    var arr = new Float32Array(COUNT * 3);
    // p=2, q=3 torus knot, points scattered around the tube
    for (var i = 0; i < COUNT; i++) {
      var t = (i / COUNT) * Math.PI * 2;
      var p = 2, q = 3;
      var rCore = 2 + Math.cos(q * t);
      var x = rCore * Math.cos(p * t);
      var y = rCore * Math.sin(p * t);
      var z = Math.sin(q * t);
      var jitter = 0.38;
      arr[i * 3] = x * 1.5 + (Math.random() - 0.5) * jitter;
      arr[i * 3 + 1] = y * 1.5 + (Math.random() - 0.5) * jitter;
      arr[i * 3 + 2] = z * 1.5 + (Math.random() - 0.5) * jitter;
    }
    return arr;
  }

  function makeGrid() {
    var arr = new Float32Array(COUNT * 3);
    var side = Math.ceil(Math.sqrt(COUNT));
    for (var i = 0; i < COUNT; i++) {
      var gx = i % side;
      var gz = Math.floor(i / side);
      var x = (gx / side - 0.5) * 13;
      var z = (gz / side - 0.5) * 13;
      arr[i * 3] = x;
      arr[i * 3 + 1] = Math.sin(x * 0.9) * Math.cos(z * 0.9) * 1.1 - 1.5;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }

  var targets = {
    sphere: makeSphere(),
    helix: makeHelix(),
    knot: makeKnot(),
    grid: makeGrid()
  };

  /* ------- point cloud ------- */
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(targets.sphere); // start as sphere
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Soft round sprite so points glow instead of rendering as squares
  function makeSprite() {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  var material = new THREE.PointsMaterial({
    size: isMobile ? 0.09 : 0.065,
    map: makeSprite(),
    color: new THREE.Color(0xe39b3f),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  var points = new THREE.Points(geometry, material);
  var group = new THREE.Group();
  group.add(points);
  scene.add(group);

  /* ------- faint violet starfield for depth ------- */
  var starGeo = new THREE.BufferGeometry();
  var starCount = isMobile ? 300 : 700;
  var starPos = new Float32Array(starCount * 3);
  for (var s = 0; s < starCount; s++) {
    starPos[s * 3] = (Math.random() - 0.5) * 60;
    starPos[s * 3 + 1] = (Math.random() - 0.5) * 40;
    starPos[s * 3 + 2] = -10 - Math.random() * 30;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.08, color: 0x8e86c6, transparent: true, opacity: 0.5,
    map: material.map, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(stars);

  /* ------- morphing ------- */
  var morph = { t: 1 };
  var fromArr = new Float32Array(positions);
  var toArr = targets.sphere;
  var currentShape = "sphere";
  var shapeColors = {
    sphere: 0xe39b3f, // copper
    helix: 0xefb968,  // lighter amber
    knot: 0xe0842f,   // deeper ember
    grid: 0xc9a2ff    // violet finale
  };

  function morphTo(shape) {
    if (shape === currentShape || !targets[shape]) return;
    currentShape = shape;
    fromArr.set(positions);
    toArr = targets[shape];
    if (reduceMotion) {
      positions.set(toArr);
      geometry.attributes.position.needsUpdate = true;
      material.color.setHex(shapeColors[shape]);
      return;
    }
    gsap.killTweensOf(morph);
    morph.t = 0;
    gsap.to(morph, {
      t: 1, duration: 1.6, ease: "power3.inOut",
      onUpdate: function () {
        var t = morph.t;
        for (var i = 0; i < positions.length; i++) {
          positions[i] = fromArr[i] + (toArr[i] - fromArr[i]) * t;
        }
        geometry.attributes.position.needsUpdate = true;
      }
    });
    var c = new THREE.Color(shapeColors[shape]);
    gsap.to(material.color, { r: c.r, g: c.g, b: c.b, duration: 1.6, ease: "power2.inOut" });
  }

  /* ------- mouse parallax ------- */
  var mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  /* ------- render loop ------- */
  var clock = new THREE.Clock();
  function tick() {
    var t = clock.getElapsedTime();
    if (!reduceMotion) {
      group.rotation.y = t * 0.08 + mouse.x * 0.25;
      group.rotation.x = Math.sin(t * 0.05) * 0.1 + mouse.y * 0.15;
      stars.rotation.y = t * 0.01;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- scroll: morph per section ---------------- */
  document.querySelectorAll(".panel[data-shape]").forEach(function (panel) {
    ScrollTrigger.create({
      trigger: panel,
      start: "top 55%",
      end: "bottom 55%",
      onEnter: function () { morphTo(panel.dataset.shape); setActive(panel.id); },
      onEnterBack: function () { morphTo(panel.dataset.shape); setActive(panel.id); }
    });
  });

  /* camera pulls back slightly over the whole page */
  if (!reduceMotion) {
    gsap.to(camera.position, {
      z: 14,
      ease: "none",
      scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: 1.2 }
    });
  }

  /* ---------------- reveals ---------------- */
  if (!reduceMotion) {
    document.querySelectorAll(".panel").forEach(function (panel) {
      var items = panel.querySelectorAll(".reveal");
      if (!items.length) return;
      gsap.to(items, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12,
        scrollTrigger: { trigger: panel, start: "top 70%" }
      });
    });
  }

  /* ---------------- nav ---------------- */
  var navLinks = document.querySelectorAll(".nav-link");
  function setActive(id) {
    navLinks.forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("href") === "#" + id);
    });
  }
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-links");
  navToggle.addEventListener("click", function () { navMenu.classList.toggle("open"); });
  navLinks.forEach(function (l) {
    l.addEventListener("click", function () { navMenu.classList.remove("open"); });
  });

  /* ---------------- counters ---------------- */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var end = parseInt(el.dataset.count, 10);
    if (reduceMotion) { el.textContent = end; return; }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
      onUpdate: function () { el.textContent = Math.round(obj.v); }
    });
  });

  /* ---------------- 3D tilt cards ---------------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".tilt").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateY: px * 14, rotateX: -py * 12,
          transformPerspective: 900, duration: 0.4, ease: "power2.out"
        });
      });
      card.addEventListener("mouseleave", function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
      });
    });

    /* magnetic buttons */
    document.querySelectorAll(".magnetic").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - r.left - r.width / 2) * 0.25,
          y: (e.clientY - r.top - r.height / 2) * 0.25,
          duration: 0.3
        });
      });
      btn.addEventListener("mouseleave", function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ---------------- copy email ---------------- */
  var copyBtn = document.getElementById("copy-mail");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText("skmuneer47208@gmail.com").then(function () {
        copyBtn.className = "bx bx-check";
        setTimeout(function () { copyBtn.className = "bx bx-copy"; }, 1600);
      });
    });
  }
})();
